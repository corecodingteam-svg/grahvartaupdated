import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'analytics_service.dart';

class ApiService {
  /// Backend host. Production by default; point a test build elsewhere with
  /// `--dart-define=API_HOST=http://127.0.0.1:3300`.
  static const String apiHost = String.fromEnvironment('API_HOST', defaultValue: 'https://api.grahvarta.com');
  static const String _base = '$apiHost/api';

  static Future<String> uploadPhoto(File file) async {
    try {
      final req = http.MultipartRequest('POST', Uri.parse('$_base/hirings/upload-photo'));
      req.files.add(await http.MultipartFile.fromPath('photo', file.path));
      final res = await req.send().timeout(const Duration(seconds: 30));
      final bodyStr = await res.stream.bytesToString();
      final body = jsonDecode(bodyStr);
      if (res.statusCode != 200) throw body['message'] ?? 'Upload failed';
      return body['data']['url'] as String;
    } on Exception catch (e) {
      final msg = e.toString();
      if (msg.contains('SocketException') || msg.contains('Connection') || msg.contains('host lookup')) {
        throw 'No internet connection. Please check your network and try again.';
      }
      if (msg.contains('TimeoutException')) {
        throw 'Upload timed out. Please try again on a faster connection.';
      }
      rethrow;
    }
  }

  static Future<Map<String, dynamic>> _post(String path, Map<String, dynamic> data, {int okStatus = 200}) async {
    final http.Response r;
    try {
      r = await http
          .post(Uri.parse('$_base$path'), headers: {'Content-Type': 'application/json'}, body: jsonEncode(data))
          .timeout(const Duration(seconds: 30));
    } on Exception {
      throw 'Unable to connect. Please check your internet connection.';
    }
    Map<String, dynamic> body;
    try {
      body = jsonDecode(r.body) as Map<String, dynamic>;
    } catch (_) {
      throw 'Something went wrong. Please try again.';
    }
    if (r.statusCode != okStatus) throw body['message'] ?? 'Request failed';
    return body;
  }

  /// Step 1: emails a 5-digit code. Throws the server message on conflict
  /// (number / email / device already registered) or rate limit.
  static Future<void> sendEmailOtp({required String email, required String phone, required String deviceId}) async {
    await _post('/hirings/send-otp', {'email': email, 'phone': phone, 'device_id': deviceId});
    AnalyticsService.instance.log('otp_sent');
  }

  /// Verifies the emailed code. Returns either
  ///   {mode: 'register', verification_token: …}  → new agent, continue to registration
  ///   {mode: 'login', application: {name, phone, token_no}} → returning agent
  static Future<Map<String, dynamic>> verifyEmailOtp({required String email, required String otp}) async {
    final body = await _post('/hirings/verify-otp', {'email': email, 'otp': otp});
    final data = Map<String, dynamic>.from(body['data'] as Map);
    if (data['mode'] == 'login') {
      AnalyticsService.instance.logLogin(method: 'email_otp');
    } else {
      AnalyticsService.instance.log('otp_verified_new_agent');
    }
    return data;
  }

  /// "Write to Us": sends the message to Grahvarta (admin panel + support@grahvarta.com).
  static Future<void> sendSupportMessage({required String phone, required String deviceId, required String message}) async {
    await _post('/hirings/messages', {'phone': phone, 'device_id': deviceId, 'message': message}, okStatus: 201);
    AnalyticsService.instance.log('support_message_sent');
  }

  /// The agent's earlier messages with any replies from Grahvarta (newest first).
  static Future<List<Map<String, dynamic>>> getSupportMessages({required String phone, required String deviceId}) async {
    try {
      final r = await http
          .get(Uri.parse('$_base/hirings/messages?phone=${Uri.encodeComponent(phone)}&device_id=${Uri.encodeComponent(deviceId)}'))
          .timeout(const Duration(seconds: 20));
      if (r.statusCode != 200) return [];
      final body = jsonDecode(r.body) as Map<String, dynamic>;
      return List<Map<String, dynamic>>.from(((body['data'] as List?) ?? []).map((e) => Map<String, dynamic>.from(e as Map)));
    } catch (_) {
      return [];
    }
  }

  static Future<Map<String, dynamic>> submitApplication(Map<String, dynamic> data) async {
    final body = await _post('/hirings/apply', data, okStatus: 201);
    AnalyticsService.instance.logSignUp(method: 'email_otp');
    AnalyticsService.instance.log('application_submitted');
    return body['data'] as Map<String, dynamic>;
  }

  static Future<Map<String, dynamic>?> getApplicationStatus(String phone, {String? deviceId}) async {
    try {
      final q = 'phone=${Uri.encodeComponent(phone)}${deviceId != null ? '&device_id=${Uri.encodeComponent(deviceId)}' : ''}';
      final r = await http.get(Uri.parse('$_base/hirings/status?$q'));
      final body = jsonDecode(r.body);
      if (r.statusCode == 404) return null; // Application not submitted yet
      if (r.statusCode != 200) throw body['message'] ?? 'Failed to load status';
      return body['data'] as Map<String, dynamic>;
    } on Exception {
      throw 'Unable to connect. Please check your internet connection.';
    }
  }
}
