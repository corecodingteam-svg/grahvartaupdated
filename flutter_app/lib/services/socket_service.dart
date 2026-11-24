import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'api_service.dart';
import 'analytics_service.dart';

class SocketService {
  static SocketService? _instance;
  static SocketService get instance => _instance ??= SocketService._();
  SocketService._();

  IO.Socket? _socket;
  VoidCallback? _onReconnect;
  bool get isConnected => _socket?.connected ?? false;

  /// Live connection state — true while the realtime connection is up.
  /// The astrologer's "Online" only reaches users while this is true.
  final ValueNotifier<bool> connection = ValueNotifier<bool>(false);

  /// Make sure a connection exists and is up; safe to call often (heartbeat,
  /// app resume). Never gives up — fixes sockets that stayed dead after the
  /// phone slept or the network dropped for a while.
  Future<void> ensureConnected() async {
    if (_socket == null) {
      await connect(role: _role, onReconnect: _onReconnect);
    } else if (!(_socket!.connected)) {
      _socket!.connect();
    }
  }

  String _role = 'user';

  // Every registered listener, kept for the lifetime of the app so it survives
  // reset() (a new socket object) and is attached to whichever socket is current.
  final Map<String, List<Function(dynamic)>> _handlers = {};
  final Map<String, Set<Function(dynamic)>> _persistent = {};

  Future<void> connect({VoidCallback? onConnected, VoidCallback? onReconnect, String role = 'user'}) async {
    _role = role;
    _onReconnect = onReconnect;
    final token = await ApiService.getToken();
    if (token == null) return;

    if (isConnected) {
      _socket!.emit('set_role', {'role': _role});
      onConnected?.call();
      return;
    }

    if (_socket != null) {
      _socket!.once('connect', (_) {
        _socket!.emit('set_role', {'role': _role});
        onConnected?.call();
      });
      _socket!.connect();
      return;
    }

    _socket = IO.io(
      ApiService.socketUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .enableReconnection()
          .setReconnectionAttempts(1 << 30) // keep retrying for as long as the app runs
          .setReconnectionDelay(2000)
          .setReconnectionDelayMax(10000)
          .setAuth({'token': token})
          .setTimeout(30000)
          .build(),
    );

    // Attach every listener registered so far (including ones from before a reset)
    _handlers.forEach((event, handlers) {
      for (final h in handlers) {
        _socket!.on(event, h);
      }
    });

    _socket!.onConnect((_) {
      debugPrint('Socket connected as $_role');
      connection.value = true;
      _socket!.emit('set_role', {'role': _role});
      onConnected?.call();
    });

    _socket!.on('reconnect', (_) {
      debugPrint('Socket reconnected as $_role');
      _socket!.emit('set_role', {'role': _role});
      _onReconnect?.call();
    });

    _socket!.onDisconnect((reason) {
      debugPrint('Socket disconnected: $reason');
      connection.value = false;
      // A server-initiated disconnect is not retried automatically by socket.io
      if (reason == 'io server disconnect') Future.delayed(const Duration(seconds: 2), () => _socket?.connect());
    });
    _socket!.onConnectError((e) => debugPrint('Socket connect error: $e'));
    _socket!.on('connect_timeout', (_) => debugPrint('Socket connect timeout'));

    _socket!.connect();
  }

  void disconnect() => _socket?.disconnect();

  /// Drops the current socket (e.g. after a consultation) and opens a fresh one,
  /// keeping app-wide listeners such as live astrologer presence.
  void reset() {
    _socket?.dispose();
    _socket = null;
    connection.value = false;
    Future.microtask(() => connect(role: _role));
  }

  void emit(String event, dynamic data) => _socket?.emit(event, data);

  /// Register an event listener. Safe to call before [connect]; listeners are
  /// kept across reconnects and resets. [persistent] listeners (app-wide ones
  /// such as the incoming-request popup or live presence) are not removed by
  /// a screen calling [off] for the same event — only by [offHandler].
  void on(String event, Function(dynamic) handler, {bool persistent = false}) {
    _handlers.putIfAbsent(event, () => []).add(handler);
    if (persistent) _persistent.putIfAbsent(event, () => {}).add(handler);
    _socket?.on(event, handler);
  }

  /// Marks an already registered listener as persistent (see [on]).
  void markPersistent(String event, Function(dynamic) handler) =>
      _persistent.putIfAbsent(event, () => {}).add(handler);

  /// Removes this event's screen-level listeners; persistent ones stay.
  void off(String event) {
    _socket?.off(event);
    final keep = _persistent[event] ?? const {};
    _handlers[event]?.removeWhere((h) => !keep.contains(h));
    for (final h in keep) {
      _socket?.on(event, h);
    }
  }

  /// Remove one specific handler (other listeners for the same event stay).
  void offHandler(String event, Function(dynamic) handler) {
    _socket?.off(event, handler);
    _handlers[event]?.remove(handler);
    _persistent[event]?.remove(handler);
  }

  // ── Consultation ──────────────────────────────────────────────
  void requestConsultation(String astrologerId, String type) {
    emit('request_consultation', {'astrologer_id': astrologerId, 'type': type});
    AnalyticsService.instance.log('request_consultation', {'astrologer_id': astrologerId, 'consultation_type': type});
  }

  /// Cancel a request whose id isn't known yet (user left before it was confirmed).
  void cancelRequest(String astrologerId) {
    emit('cancel_request', {'astrologer_id': astrologerId});
    AnalyticsService.instance.log('cancel_consultation_request', {'astrologer_id': astrologerId});
  }

  void endConsultation(String consultationId) {
    emit('end_consultation', {'consultation_id': consultationId});
    AnalyticsService.instance.log('end_consultation', {'consultation_id': consultationId, 'ended_by': 'user'});
  }

  void sendMessage(String consultationId, String content, {String type = 'text'}) {
    emit('send_message', {'consultation_id': consultationId, 'content': content, 'message_type': type});
  }

  void sendTypingStart(String consultationId) => emit('typing_start', {'consultation_id': consultationId});
  void sendTypingStop(String consultationId) => emit('typing_stop', {'consultation_id': consultationId});

  // ── WebRTC ────────────────────────────────────────────────────
  void sendOffer(String consultationId, dynamic sdp) {
    emit('webrtc_offer', {'consultation_id': consultationId, 'sdp': sdp});
  }

  void sendAnswer(String consultationId, dynamic sdp) {
    emit('webrtc_answer', {'consultation_id': consultationId, 'sdp': sdp});
  }

  void sendIceCandidate(String consultationId, dynamic candidate) {
    emit('webrtc_ice_candidate', {'consultation_id': consultationId, 'candidate': candidate});
  }

  // ── Live ──────────────────────────────────────────────────────
  void joinLive(String sessionId) {
    emit('join_live', {'session_id': sessionId});
    AnalyticsService.instance.log('join_live', {'session_id': sessionId});
  }
  void leaveLive(String sessionId) => emit('leave_live', {'session_id': sessionId});
  void sendLiveChat(String sessionId, String message) => emit('live_chat', {'session_id': sessionId, 'message': message});
  void sendTip(String sessionId, double amount, String message) {
    emit('send_tip', {'session_id': sessionId, 'amount': amount, 'message': message});
    AnalyticsService.instance.log('send_tip', {'session_id': sessionId, 'value': amount, 'currency': 'INR'});
  }

  void joinConsultation(String consultationId) => emit('join_consultation', {'consultation_id': consultationId});

  // ── Astrologer ────────────────────────────────────────────────
  void acceptConsultation(String consultationId) {
    emit('accept_consultation', {'consultation_id': consultationId});
    AnalyticsService.instance.log('accept_consultation', {'consultation_id': consultationId});
  }
  void rejectConsultation(String consultationId) {
    emit('reject_consultation', {'consultation_id': consultationId});
    AnalyticsService.instance.log('reject_consultation', {'consultation_id': consultationId});
  }
  void astrologerEndConsultation(String consultationId) {
    emit('end_consultation', {'consultation_id': consultationId});
    AnalyticsService.instance.log('end_consultation', {'consultation_id': consultationId, 'ended_by': 'astrologer'});
  }
}
