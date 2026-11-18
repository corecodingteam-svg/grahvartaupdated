// The astrologer's welcome message and saved remedies (stored on the server).
import 'package:flutter/foundation.dart';
import 'api_service.dart';

class Remedy {
  final String id;
  final String title;
  final String body;
  const Remedy({required this.id, required this.title, required this.body});
  factory Remedy.fromJson(Map<String, dynamic> j) =>
      Remedy(id: j['id'].toString(), title: (j['title'] ?? '') as String, body: (j['body'] ?? '') as String);
}

class ChatTools {
  final bool welcomeEnabled;
  final String welcomeMessage;
  final List<Remedy> remedies;
  const ChatTools({this.welcomeEnabled = false, this.welcomeMessage = '', this.remedies = const []});
}

class ChatToolsService {
  ChatToolsService._();
  static final ChatToolsService instance = ChatToolsService._();

  final ValueNotifier<ChatTools> tools = ValueNotifier(const ChatTools());
  bool _loaded = false;

  Future<ChatTools> load({bool force = false}) async {
    if (_loaded && !force) return tools.value;
    final r = await ApiService.getChatSettings();
    final d = Map<String, dynamic>.from(r['data'] as Map);
    tools.value = ChatTools(
      welcomeEnabled: d['welcome_enabled'] == true,
      welcomeMessage: (d['welcome_message'] ?? '') as String,
      remedies: (d['remedies'] as List? ?? []).map((e) => Remedy.fromJson(Map<String, dynamic>.from(e as Map))).toList(),
    );
    _loaded = true;
    return tools.value;
  }

  Future<void> saveWelcome(bool enabled, String message) async {
    await ApiService.updateWelcome(enabled: enabled, message: message);
    final t = tools.value;
    tools.value = ChatTools(welcomeEnabled: enabled, welcomeMessage: message, remedies: t.remedies);
  }

  Future<void> saveRemedy({String? id, required String title, required String body}) async {
    await ApiService.saveRemedy(id: id, title: title, body: body);
    await load(force: true);
  }

  Future<void> deleteRemedy(String id) async {
    await ApiService.deleteRemedy(id);
    await load(force: true);
  }

  /// Welcome text with placeholders filled in: {name} = the user's first name.
  static String fillWelcome(String template, {required String userName, required String astrologerName}) {
    final first = userName.trim().split(RegExp(r'\s+')).first;
    return template
        .replaceAll('{name}', first.isEmpty ? 'there' : first)
        .replaceAll('{astrologer}', astrologerName);
  }
}
