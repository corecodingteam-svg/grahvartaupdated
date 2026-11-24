import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'analytics_service.dart';
import '../models/user.dart';
import '../models/astrologer.dart';
import '../models/family_member.dart';
import '../models/report.dart';

class ApiService {
  /// Backend host. Production by default; point a test build elsewhere with
  /// `--dart-define=API_HOST=http://127.0.0.1:3300`.
  static const String apiHost = String.fromEnvironment('API_HOST', defaultValue: 'https://api.grahvarta.com');
  static const String baseUrl = '$apiHost/api';
  static const String socketUrl = apiHost;
  static const _storage = FlutterSecureStorage();

  /// Full URL for a photo/media path from the server. Some records store a
  /// server-relative path ("/uploads/..."); image loaders need an absolute URL.
  static String? mediaUrl(dynamic v) {
    if (v is! String || v.trim().isEmpty) return null;
    if (v.startsWith('http://') || v.startsWith('https://')) return v;
    if (v.startsWith('/')) return '$socketUrl$v';
    return null;
  }

  static Future<String?> getToken() => _storage.read(key: 'auth_token');
  static Future<void> saveToken(String t) => _storage.write(key: 'auth_token', value: t);
  static Future<void> clearToken() => _storage.delete(key: 'auth_token');

  static Future<Map<String, String>> _headers({bool auth = false}) async {
    final h = {'Content-Type': 'application/json'};
    if (auth) {
      final t = await getToken();
      if (t != null) h['Authorization'] = 'Bearer $t';
    }
    return h;
  }

  static Future<Map<String, dynamic>> _handle(http.Response r) async {
    // Guard against HTML error pages / empty responses (nginx 502, 503, etc.)
    final body = r.body.trim();
    if (body.isEmpty) {
      throw ApiException('Server returned empty response (${r.statusCode})', r.statusCode);
    }
    if (!body.startsWith('{') && !body.startsWith('[')) {
      // Server returned HTML — likely a 502 Bad Gateway or nginx error page
      throw ApiException('Server error (${r.statusCode}): API server may be down or misconfigured', r.statusCode);
    }
    Map<String, dynamic> data;
    try {
      data = jsonDecode(body) as Map<String, dynamic>;
    } catch (_) {
      throw ApiException('Invalid response format (${r.statusCode})', r.statusCode);
    }
    if (r.statusCode >= 200 && r.statusCode < 300) return data;
    throw ApiException(data['message'] ?? 'Request failed', r.statusCode);
  }

  // ── Auth ──────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> register({required String email, required String password, required String name, String? dateOfBirth, String? timeOfBirth, String? birthPlace}) async {
    final r = await http.post(Uri.parse('$baseUrl/auth/register'), headers: await _headers(), body: jsonEncode({'email': email, 'password': password, 'name': name, 'date_of_birth': dateOfBirth, 'time_of_birth': timeOfBirth, 'birth_place': birthPlace}));
    return _handle(r);
  }

  static Future<Map<String, dynamic>> login(String email, String password, {String loginAs = 'user'}) async {
    final r = await http.post(Uri.parse('$baseUrl/auth/login'), headers: await _headers(), body: jsonEncode({'email': email, 'password': password, 'login_as': loginAs}));
    return _handle(r);
  }

  static Future<User> getProfile() async {
    final r = await http.get(Uri.parse('$baseUrl/auth/profile'), headers: await _headers(auth: true));
    return User.fromJson((await _handle(r))['data']);
  }

  static Future<void> changePassword(String currentPassword, String newPassword) async {
    final r = await http.post(Uri.parse('$baseUrl/auth/change-password'),
        headers: await _headers(auth: true),
        body: jsonEncode({'current_password': currentPassword, 'new_password': newPassword}));
    await _handle(r);
  }

  static Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    final r = await http.put(Uri.parse('$baseUrl/auth/profile'), headers: await _headers(auth: true), body: jsonEncode(data));
    return _handle(r);
  }

  static Future<Map<String, dynamic>> uploadAvatar(File imageFile) async {
    final token = await getToken();
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/auth/avatar'));
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    request.files.add(await http.MultipartFile.fromPath('avatar', imageFile.path));
    final streamed = await request.send();
    final r = await http.Response.fromStream(streamed);
    return _handle(r);
  }

  static Future<String> uploadChatImage(File imageFile) async {
    final token = await getToken();
    final request = http.MultipartRequest('POST', Uri.parse('$baseUrl/consultations/upload-image'));
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    request.files.add(await http.MultipartFile.fromPath('image', imageFile.path));
    final streamed = await request.send();
    final r = await http.Response.fromStream(streamed);
    final data = await _handle(r);
    return (data['data']?['url'] ?? data['url']) as String;
  }

  // ── Dashboard ─────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getDashboard() async {
    final r = await http.get(Uri.parse('$baseUrl/dashboard'), headers: await _headers(auth: true));
    return _handle(r);
  }

  // ── Horoscope ─────────────────────────────────────────────────
  static Future<Horoscope> getMyHoroscope({String period = 'daily'}) async {
    final r = await http.get(Uri.parse('$baseUrl/horoscope/my?period=$period'), headers: await _headers(auth: true));
    return Horoscope.fromJson((await _handle(r))['data']);
  }

  static Future<Horoscope> getHoroscope(String sign, String period) async {
    final r = await http.get(Uri.parse('$baseUrl/horoscope/$sign/$period'), headers: await _headers(auth: true));
    return Horoscope.fromJson((await _handle(r))['data']);
  }

  static Future<List<dynamic>> getZodiacSigns() async {
    final r = await http.get(Uri.parse('$baseUrl/horoscope/signs'), headers: await _headers());
    return (await _handle(r))['data'] as List;
  }

  static Future<Map<String, dynamic>> getCompatibility(String s1, String s2) async {
    final r = await http.get(Uri.parse('$baseUrl/horoscope/compatibility/$s1/$s2'), headers: await _headers(auth: true));
    return _handle(r);
  }

  // ── Birth Chart & Transits ────────────────────────────────────
  static Future<Map<String, dynamic>> getBirthChart() async {
    final r = await http.get(Uri.parse('$baseUrl/birth-chart'), headers: await _headers(auth: true));
    return _handle(r);
  }

  static Future<List<Transit>> getTransits({String? category}) async {
    final r = await http.get(Uri.parse('$baseUrl/transits${category != null ? "?category=$category" : ""}'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => Transit.fromJson(e)).toList();
  }

  // ── Audio & Courses ───────────────────────────────────────────
  static Future<List<AudioContent>> getAudioContent({String? category}) async {
    final r = await http.get(Uri.parse('$baseUrl/audio${category != null ? "?category=$category" : ""}'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => AudioContent.fromJson(e)).toList();
  }

  static Future<List<Course>> getCourses() async {
    final r = await http.get(Uri.parse('$baseUrl/courses'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => Course.fromJson(e)).toList();
  }

  static Future<List<dynamic>> getAffirmations() async {
    final r = await http.get(Uri.parse('$baseUrl/affirmations'), headers: await _headers(auth: true));
    return (await _handle(r))['data'] as List;
  }

  // ── Astrologers ───────────────────────────────────────────────
  static Future<List<Astrologer>> getAstrologers({String? specialization, String? sort, bool? onlineOnly, int page = 1}) async {
    final params = <String, String>{'page': '$page', 'limit': '20'};
    if (specialization != null) params['specialization'] = specialization;
    if (sort != null) params['sort'] = sort;
    if (onlineOnly == true) params['online_only'] = 'true';
    final uri = Uri.parse('$baseUrl/astrologers').replace(queryParameters: params);
    final r = await http.get(uri, headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => Astrologer.fromJson(e)).toList();
  }

  static Future<Astrologer> getAstrologer(String id) async {
    final r = await http.get(Uri.parse('$baseUrl/astrologers/$id'), headers: await _headers(auth: true));
    return Astrologer.fromJson((await _handle(r))['data']);
  }

  static Future<List<Review>> getAstrologerReviews(String id) async {
    final r = await http.get(Uri.parse('$baseUrl/astrologers/$id/reviews'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => Review.fromJson(e)).toList();
  }

  static Future<void> submitReview(String astrologerId, int rating, String text, String consultationId) async {
    final r = await http.post(Uri.parse('$baseUrl/astrologers/$astrologerId/reviews'), headers: await _headers(auth: true), body: jsonEncode({'rating': rating, 'review_text': text, 'consultation_id': consultationId}));
    await _handle(r);
  }

  static Future<void> endConsultation(String consultationId) async {
    final r = await http.patch(Uri.parse('$baseUrl/consultations/$consultationId/end'), headers: await _headers(auth: true));
    await _handle(r);
  }

  static Future<List<Consultation>> getConsultationHistory() async {
    final r = await http.get(Uri.parse('$baseUrl/astrologers/consultations/history'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => Consultation.fromJson(e)).toList();
  }

  // ── Wallet ────────────────────────────────────────────────────
  static Future<WalletData> getWallet() async {
    final r = await http.get(Uri.parse('$baseUrl/wallet'), headers: await _headers(auth: true));
    return WalletData.fromJson((await _handle(r))['data']);
  }

  static Future<Map<String, dynamic>> getWalletStats() async {
    final r = await http.get(Uri.parse('$baseUrl/wallet/stats'), headers: await _headers(auth: true));
    return _handle(r);
  }

  static Future<List<WalletTransaction>> getTransactions() async {
    final r = await http.get(Uri.parse('$baseUrl/wallet/transactions'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => WalletTransaction.fromJson(e)).toList();
  }

  static Future<Map<String, dynamic>> createAddMoneyOrder(double amount) async {
    final r = await http.post(Uri.parse('$baseUrl/wallet/add-money/order'), headers: await _headers(auth: true), body: jsonEncode({'amount': amount}));
    final res = await _handle(r);
    AnalyticsService.instance.logBeginCheckout(amount: amount, orderId: res['data']?['order_id']?.toString());
    return res;
  }

  static Future<WalletData> verifyAndCredit(Map<String, dynamic> payload) async {
    final r = await http.post(Uri.parse('$baseUrl/wallet/add-money/verify'), headers: await _headers(auth: true), body: jsonEncode(payload));
    final wallet = WalletData.fromJson((await _handle(r))['data']);
    AnalyticsService.instance.logPurchase(orderId: payload['order_id']?.toString());
    return wallet;
  }

  static Future<List<SubscriptionPlan>> getSubscriptionPlans() async {
    final r = await http.get(Uri.parse('$baseUrl/wallet/plans'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => SubscriptionPlan.fromJson(e)).toList();
  }

  static Future<void> purchaseSubscription(String planId) async {
    final r = await http.post(Uri.parse('$baseUrl/wallet/subscribe'), headers: await _headers(auth: true), body: jsonEncode({'plan_id': planId}));
    await _handle(r);
    AnalyticsService.instance.log('purchase_subscription', {'plan_id': planId});
  }

  // ── Agora ─────────────────────────────────────────────────────
  static Future<Map<String, dynamic>> getAgoraToken(String channel, {int uid = 0}) async {
    final r = await http.get(Uri.parse('$baseUrl/agora/token?channel=$channel&uid=$uid'), headers: await _headers(auth: true));
    return await _handle(r);
  }

  // ── Live & Community ──────────────────────────────────────────
  static Future<List<LiveSession>> getLiveSessions() async {
    final r = await http.get(Uri.parse('$baseUrl/live/sessions'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => LiveSession.fromJson(e)).toList();
  }

  static Future<List<CommunityPost>> getCommunityPosts({String? category}) async {
    final r = await http.get(Uri.parse('$baseUrl/live/community${category != null ? "?category=$category" : ""}'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => CommunityPost.fromJson(e)).toList();
  }

  static Future<void> toggleLike(String postId) async {
    final r = await http.post(Uri.parse('$baseUrl/live/community/$postId/like'), headers: await _headers(auth: true));
    await _handle(r);
  }

  static Future<void> createPost(String content, {String? category, String? zodiacSign}) async {
    final r = await http.post(Uri.parse('$baseUrl/live/community'), headers: await _headers(auth: true), body: jsonEncode({'content': content, 'category': category, 'zodiac_sign': zodiacSign}));
    await _handle(r);
  }

  // ── Notifications ─────────────────────────────────────────────
  static Future<List<dynamic>> getNotifications() async {
    final r = await http.get(Uri.parse('$baseUrl/live/notifications'), headers: await _headers(auth: true));
    return (await _handle(r))['data'] as List;
  }

  static Future<void> markAllNotificationsRead() async {
    final r = await http.patch(Uri.parse('$baseUrl/live/notifications/read-all'), headers: await _headers(auth: true));
    await _handle(r);
  }

  static Future<void> registerPushToken(String token, String platform) async {
    final r = await http.post(Uri.parse('$baseUrl/live/push-token'), headers: await _headers(auth: true), body: jsonEncode({'token': token, 'platform': platform, 'app_type': 'astrologer_app'}));
    await _handle(r);
  }

  // ── Reports ───────────────────────────────────────────────────
  static Future<bool> getReportFreeStatus() async {
    final r = await http.get(Uri.parse('$baseUrl/reports/free-status'), headers: await _headers(auth: true));
    return (await _handle(r))['data']['free_used'] as bool;
  }

  static Future<Map<String, dynamic>> getReportCredits() async {
    final r = await http.get(Uri.parse('$baseUrl/reports/credits'), headers: await _headers(auth: true));
    return (await _handle(r))['data'] as Map<String, dynamic>;
  }

  static Future<List<Report>> getReports() async {
    final r = await http.get(Uri.parse('$baseUrl/reports'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => Report.fromJson(e)).toList();
  }

  static Future<ReportUnlockStatus> checkUnlockStatus(String reportId, {String? familyMemberId}) async {
    final params = familyMemberId != null ? '?family_member_id=$familyMemberId' : '';
    final r = await http.get(Uri.parse('$baseUrl/reports/$reportId/unlock-status$params'), headers: await _headers(auth: true));
    return ReportUnlockStatus.fromJson((await _handle(r))['data']);
  }

  static Future<Map<String, dynamic>> unlockReport(String reportId, {String? familyMemberId, String language = 'English'}) async {
    final r = await http.post(Uri.parse('$baseUrl/reports/unlock'), headers: await _headers(auth: true),
        body: jsonEncode({'report_id': reportId, if (familyMemberId != null) 'family_member_id': familyMemberId, 'language': language}));
    final res = await _handle(r);
    AnalyticsService.instance.log('unlock_report', {'report_id': reportId, 'language': language, 'for_family_member': familyMemberId != null ? 'yes' : 'no'});
    return res;
  }

  static Future<ReportUnlock> getReportDetail(String unlockId) async {
    final r = await http.get(Uri.parse('$baseUrl/reports/unlocked/$unlockId'), headers: await _headers(auth: true));
    return ReportUnlock.fromJson((await _handle(r))['data']);
  }

  static Future<List<ReportUnlock>> getUnlockedReports() async {
    final r = await http.get(Uri.parse('$baseUrl/reports/unlocked'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => ReportUnlock.fromJson(e)).toList();
  }

  static Future<void> submitReportReview(String reportId, int rating, String reviewText) async {
    final r = await http.post(Uri.parse('$baseUrl/reports/review'), headers: await _headers(auth: true),
        body: jsonEncode({'report_id': reportId, 'rating': rating, 'review_text': reviewText}));
    await _handle(r);
  }

  static Future<List<ReportPlan>> getReportPlans() async {
    final r = await http.get(Uri.parse('$baseUrl/reports/plans'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => ReportPlan.fromJson(e)).toList();
  }

  static Future<Map<String, dynamic>> purchaseReportPlan(String planName) async {
    final r = await http.post(Uri.parse('$baseUrl/reports/plans/purchase'), headers: await _headers(auth: true),
        body: jsonEncode({'plan_name': planName}));
    final res = await _handle(r);
    AnalyticsService.instance.log('purchase_report_plan', {'plan_name': planName});
    return res;
  }

  // ── Astrologer Self (dashboard, register, availability) ──────
  static Future<Map<String, dynamic>> getAstrologerDashboard() async {
    final r = await http.get(Uri.parse('$baseUrl/astrologers/me/dashboard'), headers: await _headers(auth: true));
    return _handle(r);
  }

  static Future<Map<String, dynamic>> registerAsAstrologer(Map<String, dynamic> data) async {
    final r = await http.post(Uri.parse('$baseUrl/astrologers/register'), headers: await _headers(auth: true), body: jsonEncode(data));
    final res = await _handle(r);
    AnalyticsService.instance.log('astrologer_registration_submitted');
    return res;
  }

  static Future<void> updateAvailability(bool isAvailable) async {
    final r = await http.patch(Uri.parse('$baseUrl/astrologers/availability'), headers: await _headers(auth: true), body: jsonEncode({'is_available': isAvailable}));
    await _handle(r);
    AnalyticsService.instance.log(isAvailable ? 'astrologer_go_online' : 'astrologer_go_offline');
  }

  /// Master switch and/or per-channel switches. Only non-null values are sent.
  static Future<Map<String, dynamic>> updateChannelAvailability({bool? online, bool? chat, bool? call, bool? video}) async {
    final r = await http.patch(
      Uri.parse('$baseUrl/astrologers/availability'),
      headers: await _headers(auth: true),
      body: jsonEncode({
        if (online != null) 'is_available': online,
        if (chat != null) 'is_chat_available': chat,
        if (call != null) 'is_call_available': call,
        if (video != null) 'is_video_available': video,
      }),
    );
    return Map<String, dynamic>.from((await _handle(r))['data'] ?? {});
  }

  // ── Blocked users ─────────────────────────────────────────────
  static Future<List<Map<String, dynamic>>> getBlockedUsers() async {
    final r = await http.get(Uri.parse('$baseUrl/astrologers/me/blocked-users'), headers: await _headers(auth: true));
    return List<Map<String, dynamic>>.from(((await _handle(r))['data'] as List? ?? []).map((e) => Map<String, dynamic>.from(e)));
  }

  /// Returns ids of consultations with this user that are still active (to end them).
  static Future<List<String>> blockUser(String userId, {String? reason}) async {
    final r = await http.post(
      Uri.parse('$baseUrl/astrologers/me/blocked-users/$userId'),
      headers: await _headers(auth: true),
      body: jsonEncode({if (reason != null && reason.isNotEmpty) 'reason': reason}),
    );
    final body = await _handle(r);
    return List<String>.from((body['active_consultation_ids'] as List? ?? []).map((e) => e.toString()));
  }

  static Future<void> unblockUser(String userId) async {
    final r = await http.delete(Uri.parse('$baseUrl/astrologers/me/blocked-users/$userId'), headers: await _headers(auth: true));
    await _handle(r);
  }

  // ── Call transcript ───────────────────────────────────────────
  static Future<Map<String, dynamic>> getConsultationTranscript(String consultationId) async {
    final r = await http.get(Uri.parse('$baseUrl/astrologers/consultations/$consultationId/transcript'), headers: await _headers(auth: true));
    return Map<String, dynamic>.from((await _handle(r))['data'] ?? {});
  }

  static Future<List<dynamic>> getAstrologerTransactions() async {
    final r = await http.get(Uri.parse('$baseUrl/astrologers/me/transactions'), headers: await _headers(auth: true));
    return (await _handle(r))['data'] as List;
  }

  static Future<Map<String, dynamic>> getAstrologerWallet() async {
    final r = await http.get(Uri.parse('$baseUrl/astrologers/me/wallet'), headers: await _headers(auth: true));
    return _handle(r);
  }

  static Future<Map<String, dynamic>> createLiveSession(Map<String, dynamic> data) async {
    final r = await http.post(Uri.parse('$baseUrl/live/sessions'), headers: await _headers(auth: true), body: jsonEncode(data));
    return _handle(r);
  }

  static Future<void> startLiveSession(String id) async {
    final r = await http.patch(Uri.parse('$baseUrl/live/sessions/$id/start'), headers: await _headers(auth: true));
    await _handle(r);
  }

  static Future<void> endLiveSession(String id) async {
    final r = await http.patch(Uri.parse('$baseUrl/live/sessions/$id/end'), headers: await _headers(auth: true));
    await _handle(r);
  }

  static Future<void> deletePost(String postId) async {
    final r = await http.delete(Uri.parse('$baseUrl/live/community/$postId'), headers: await _headers(auth: true));
    await _handle(r);
  }

  static Future<List<dynamic>> getPostComments(String postId) async {
    final r = await http.get(Uri.parse('$baseUrl/live/community/$postId/comments'), headers: await _headers(auth: true));
    return (await _handle(r))['data'] as List;
  }

  static Future<void> addComment(String postId, String content) async {
    final r = await http.post(Uri.parse('$baseUrl/live/community/$postId/comments'), headers: await _headers(auth: true), body: jsonEncode({'content': content}));
    await _handle(r);
  }

  static Future<List<dynamic>> getAstrologerConsultations({String? status, int page = 1}) async {
    final r = await http.get(Uri.parse('$baseUrl/astrologers/consultations/history'), headers: await _headers(auth: true));
    final data = (await _handle(r))['data'] as List;
    if (status == null) return data;
    return data.where((c) => c['status'] == status).toList();
  }

  static Future<List<dynamic>> getAstrologerConsultationMessages(String consultationId) async {
    final r = await http.get(Uri.parse('$baseUrl/astrologers/consultations/$consultationId/messages'), headers: await _headers(auth: true));
    return (await _handle(r))['data'] as List;
  }

  // ── Family Members ────────────────────────────────────────────
  static Future<List<FamilyMember>> getFamilyMembers() async {
    final r = await http.get(Uri.parse('$baseUrl/family-members'), headers: await _headers(auth: true));
    return ((await _handle(r))['data'] as List).map((e) => FamilyMember.fromJson(e)).toList();
  }

  static Future<FamilyMember> createFamilyMember(Map<String, dynamic> data) async {
    final r = await http.post(Uri.parse('$baseUrl/family-members'), headers: await _headers(auth: true), body: jsonEncode(data));
    return FamilyMember.fromJson((await _handle(r))['data']);
  }

  static Future<FamilyMember> updateFamilyMember(String id, Map<String, dynamic> data) async {
    final r = await http.patch(Uri.parse('$baseUrl/family-members/$id'), headers: await _headers(auth: true), body: jsonEncode(data));
    return FamilyMember.fromJson((await _handle(r))['data']);
  }

  static Future<void> deleteFamilyMember(String id) async {
    final r = await http.delete(Uri.parse('$baseUrl/family-members/$id'), headers: await _headers(auth: true));
    await _handle(r);
  }

  // ── Chat Threads (astrologer-wise history) ──────────────────────
  static Future<List<dynamic>> getChatThreads() async {
    final r = await http.get(Uri.parse('$baseUrl/threads'), headers: await _headers(auth: true));
    final data = await _handle(r);
    // Accept both 'threads' and 'data' keys from the backend
    final list = data['threads'] ?? data['data'] ?? data['thread_list'] ?? [];
    return List<dynamic>.from(list);
  }

  static Future<Map<String, dynamic>> getThreadMessages(String astrologerId, {String? before, int limit = 50}) async {
    var url = '$baseUrl/threads/$astrologerId/messages?limit=$limit';
    if (before != null) url += '&before=${Uri.encodeComponent(before)}';
    final r = await http.get(Uri.parse(url), headers: await _headers(auth: true));
    return await _handle(r);
  }

  // ── Astrologer Chat Threads (user-wise history) ─────────────────
  static Future<List<dynamic>> getAstrologerChatThreads() async {
    final r = await http.get(Uri.parse('$baseUrl/astrologers/threads'), headers: await _headers(auth: true));
    final data = await _handle(r);
    final list = data['threads'] ?? data['data'] ?? [];
    return List<dynamic>.from(list);
  }

  static Future<Map<String, dynamic>> getAstrologerUserMessages(String userId, {String? before, int limit = 50}) async {
    var url = '$baseUrl/astrologers/threads/$userId/messages?limit=$limit';
    if (before != null) url += '&before=${Uri.encodeComponent(before)}';
    final r = await http.get(Uri.parse(url), headers: await _headers(auth: true));
    return await _handle(r);
  }

  // ── Astrologer tools ──────────────────────────────────────────
  static Future<Map<String, dynamic>> getChatSettings() async {
    final r = await http.get(Uri.parse('$baseUrl/astrologers/me/chat-settings'), headers: await _headers(auth: true));
    return _handle(r);
  }

  static Future<Map<String, dynamic>> updateWelcome({required bool enabled, required String message}) async {
    final r = await http.put(Uri.parse('$baseUrl/astrologers/me/welcome'), headers: await _headers(auth: true),
        body: jsonEncode({'welcome_enabled': enabled, 'welcome_message': message}));
    return _handle(r);
  }

  static Future<Map<String, dynamic>> saveRemedy({String? id, required String title, required String body}) async {
    final payload = jsonEncode({'title': title, 'body': body});
    final r = id == null
        ? await http.post(Uri.parse('$baseUrl/astrologers/me/remedies'), headers: await _headers(auth: true), body: payload)
        : await http.put(Uri.parse('$baseUrl/astrologers/me/remedies/$id'), headers: await _headers(auth: true), body: payload);
    return _handle(r);
  }

  static Future<Map<String, dynamic>> deleteRemedy(String id) async {
    final r = await http.delete(Uri.parse('$baseUrl/astrologers/me/remedies/$id'), headers: await _headers(auth: true));
    return _handle(r);
  }

  static Future<Map<String, dynamic>> getNotificationPrefs() async {
    final r = await http.get(Uri.parse('$baseUrl/astrologers/me/notification-prefs'), headers: await _headers(auth: true));
    return _handle(r);
  }

  static Future<Map<String, dynamic>> updateNotificationPrefs(Map<String, dynamic> prefs) async {
    final r = await http.put(Uri.parse('$baseUrl/astrologers/me/notification-prefs'), headers: await _headers(auth: true), body: jsonEncode(prefs));
    return _handle(r);
  }

  static Future<Map<String, dynamic>> getSchedule() async {
    final r = await http.get(Uri.parse('$baseUrl/astrologers/me/schedule'), headers: await _headers(auth: true));
    return _handle(r);
  }

  static Future<Map<String, dynamic>> updateSchedule(Map<String, dynamic> schedule) async {
    final r = await http.put(Uri.parse('$baseUrl/astrologers/me/schedule'), headers: await _headers(auth: true), body: jsonEncode({'schedule': schedule}));
    return _handle(r);
  }

  static Future<Map<String, dynamic>> getPerformance(int days) async {
    final r = await http.get(Uri.parse('$baseUrl/astrologers/me/performance?days=$days'), headers: await _headers(auth: true));
    return _handle(r);
  }
}

class ApiException implements Exception {
  final String message;
  final int statusCode;
  ApiException(this.message, this.statusCode);
  @override
  String toString() => message;
}
