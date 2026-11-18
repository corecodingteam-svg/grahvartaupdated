import 'dart:convert';
import 'dart:io';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';
import '../services/chat_crypto.dart';

// --------------- State ---------------

class ChatState {
  final bool loading;
  final bool isEnded;
  final bool isPeerTyping;
  final int elapsed;
  final List<Map<String, dynamic>> messages;

  const ChatState({
    this.loading = true,
    this.isEnded = false,
    this.isPeerTyping = false,
    this.elapsed = 0,
    this.messages = const [],
  });

  ChatState copyWith({
    bool? loading,
    bool? isEnded,
    bool? isPeerTyping,
    int? elapsed,
    List<Map<String, dynamic>>? messages,
  }) =>
      ChatState(
        loading: loading ?? this.loading,
        isEnded: isEnded ?? this.isEnded,
        isPeerTyping: isPeerTyping ?? this.isPeerTyping,
        elapsed: elapsed ?? this.elapsed,
        messages: messages ?? this.messages,
      );
}

// --------------- Cubit ---------------

class ChatCubit extends Cubit<ChatState> {
  final String consultationId;
  final String? userId;

  ChatCubit({required this.consultationId, this.userId}) : super(const ChatState());

  /// The user's public key for end-to-end encryption; null if they are on an
  /// older app version without encrypted chat (messages then go unencrypted).
  String? peerKey;
  bool get e2e => peerKey != null && ChatCrypto.instance.isReady;
  Map<String, dynamic>? _lastSent; // resent once if a key changed mid-chat

  /// True once the astrologer has said anything in this consultation
  /// (used so the automatic welcome message is sent only once).
  bool astrologerHasSpoken = false;

  Future<void> refreshPeerKey() async {
    peerKey = await ChatCrypto.instance.peerKey(consultationId);
  }

  void _send(Map<String, dynamic> payload, {String? plain, String plainType = 'text'}) {
    if (e2e) {
      _lastSent = payload;
      SocketService.instance.sendMessage(consultationId, ChatCrypto.instance.seal(payload, peerKey!), type: 'e2e');
    } else if (plain != null) {
      SocketService.instance.sendMessage(consultationId, plain, type: plainType);
    }
  }

  /// Called when the server says a chat key changed: reload keys and resend the last message once.
  Future<void> onKeyStale() async {
    final last = _lastSent;
    _lastSent = null;
    await ChatCrypto.instance.status();
    await refreshPeerKey();
    if (last != null && e2e) {
      SocketService.instance.sendMessage(consultationId, ChatCrypto.instance.seal(last, peerKey!), type: 'e2e');
    }
  }

  Future<void> loadHistory() async {
    final msgs = <Map<String, dynamic>>[];
    await refreshPeerKey().catchError((_) {});

    if (userId != null && userId!.isNotEmpty) {
      try {
        final data = await ApiService.getAstrologerUserMessages(userId!);
        final old = List<dynamic>.from(data['messages'] ?? []);
        if (old.isNotEmpty) {
          msgs.addAll(old.map((m) {
            final map = ChatCrypto.instance.decodeRow(m as Map);
            map['type'] = map['message_type'] ?? map['type'] ?? 'text';
            return map;
          }));
          msgs.add({'sender_type': 'system', 'content': '─── Current session ───', 'created_at': DateTime.now().toIso8601String()});
        }
      } catch (_) {}
    }

    try {
      final current = await ApiService.getAstrologerConsultationMessages(consultationId);
      astrologerHasSpoken = current.any((m) => (m as Map)['sender_type'] == 'astrologer');
      msgs.addAll(current.map((m) {
        final map = ChatCrypto.instance.decodeRow(m as Map);
        map['type'] = map['message_type'] ?? map['type'] ?? 'text';
        return map;
      }));
      emit(state.copyWith(loading: false, messages: List.from(msgs)));
    } catch (_) {
      emit(state.copyWith(loading: false, messages: List.from(msgs)));
    }
  }

  void addMessage(Map<String, dynamic> msg) {
    emit(state.copyWith(messages: [...state.messages, ChatCrypto.instance.decodeRow(msg)]));
  }

  void updateBillingTick(int seconds) {
    emit(state.copyWith(elapsed: seconds));
  }

  void setPeerTyping(bool typing) {
    emit(state.copyWith(isPeerTyping: typing));
  }

  void setEnded() {
    emit(state.copyWith(isEnded: true));
  }

  void sendTextMessage(String text) {
    if (text.isEmpty || state.isEnded) return;
    astrologerHasSpoken = true;
    SocketService.instance.sendTypingStop(consultationId);
    _send({'t': 'text', 'b': text}, plain: text);
    addMessage({
      'sender_type': 'astrologer',
      'content': text,
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  Future<void> uploadAndSendImage(File imageFile) async {
    final localId = 'uploading_${DateTime.now().millisecondsSinceEpoch}';
    addMessage({
      'id': localId,
      'sender_type': 'astrologer',
      'content': '',
      'type': 'image_uploading',
      'created_at': DateTime.now().toIso8601String(),
    });

    try {
      final encrypted = e2e;
      Map<String, dynamic>? payload;
      String url;
      if (encrypted) {
        final ext = imageFile.path.split('.').last.toLowerCase();
        payload = await ChatCrypto.instance.uploadEncryptedImage(
            await imageFile.readAsBytes(), ext == 'png' ? 'image/png' : 'image/jpeg');
        url = jsonEncode(payload);
      } else {
        url = await ApiService.uploadChatImage(imageFile);
      }
      final updated = List<Map<String, dynamic>>.from(state.messages);
      final idx = updated.indexWhere((m) => m['id'] == localId);
      if (idx != -1) {
        updated[idx] = {
          'id': localId,
          'sender_type': 'astrologer',
          'content': url,
          'type': encrypted ? 'e2e_image' : 'image',
          'created_at': DateTime.now().toIso8601String(),
        };
      }
      emit(state.copyWith(messages: updated));
      if (encrypted) {
        _send(payload!);
      } else {
        SocketService.instance.sendMessage(consultationId, url, type: 'image');
      }
    } catch (_) {
      final updated = List<Map<String, dynamic>>.from(state.messages);
      final idx = updated.indexWhere((m) => m['id'] == localId);
      if (idx != -1) {
        updated[idx] = {
          'sender_type': 'astrologer',
          'content': '⚠️ Image failed to send',
          'type': 'text',
          'created_at': DateTime.now().toIso8601String(),
        };
      }
      emit(state.copyWith(messages: updated));
    }
  }
}
