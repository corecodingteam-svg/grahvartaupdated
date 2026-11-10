// Store screenshots for the GrahVarta astrologer app.
//   flutter run -d <simulator> -t store_screenshots/main.dart
// All data below is fictional sample data.

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:grahvarta_astrology/main.dart' show AstroTalkApp, navigatorKey;
import 'package:grahvarta_astrology/screens/astrologer/astrologer_earnings_screen.dart';
import 'package:grahvarta_astrology/screens/astrologer/astrologer_own_profile_screen.dart';
import 'package:grahvarta_astrology/screens/astrologer/astrologer_user_thread_screen.dart';

import 'shot_kit.dart';

const me = {
  'id': 'a1', 'user_id': 'u_a1', 'display_name': 'Acharya Raghav Sharma', 'avatar_url': null,
  'bio': 'Vedic astrologer with 18 years of practice in kundli analysis, marriage timing and career guidance.',
  'experience_years': 18, 'languages': ['Hindi', 'English', 'Sanskrit'],
  'specializations': ['Vedic', 'Kundli', 'Marriage', 'Career'], 'expertise_areas': ['Vedic', 'Kundli', 'Marriage', 'Career'],
  'per_minute_rate_chat': 25, 'per_minute_rate_call': 30, 'per_minute_rate_video': 40,
  'rating': 4.9, 'review_count': 2140, 'total_consultations': 18450,
  'is_online': true, 'is_available': true, 'approval_status': 'approved',
};

Map<String, dynamic> _c(String id, String user, String type, String status, int mins, num rate, int agoMin, {bool online = false}) => {
      'id': id, 'user_id': 'cu_$id', 'user_name': user, 'user': {'id': 'cu_$id', 'name': user}, 'user_online': online,
      'type': type, 'status': status, 'duration_seconds': mins * 60, 'total_amount': mins * rate,
      'per_minute_rate': rate, 'created_at': ago(agoMin), 'started_at': ago(agoMin), 'ended_at': ago(agoMin - mins),
    };

final consultations = [
  _c('c1', 'Ananya Gupta', 'chat', 'active', 8, 25, 8, online: true),
  _c('c2', 'Rohit Kumar', 'call', 'completed', 18, 30, 55),
  _c('c3', 'Priya Singh', 'video', 'completed', 22, 40, 140),
  _c('c4', 'Vikram Mehta', 'chat', 'completed', 12, 25, 260),
  _c('c5', 'Sneha Patil', 'chat', 'completed', 15, 25, 60 * 20),
  _c('c6', 'Arjun Nair', 'call', 'completed', 25, 30, 60 * 26),
  _c('c7', 'Kavya Reddy', 'chat', 'completed', 9, 25, 60 * 30),
];

MockApi buildMock() {
  final m = MockApi();
  m.get('/api/auth/profile', ok({
    'id': 'u_a1', 'email': 'raghav@example.com', 'name': 'Acharya Raghav Sharma', 'role': 'astrologer',
    'date_of_birth': '1978-03-02', 'birth_place': 'Varanasi',
  }));
  m.get('/api/astrologers/me/dashboard', ok({
    'astrologer': me,
    'stats': {'total': 18450, 'total_revenue': 482600, 'avg_duration': 960, 'today': 14},
    'recent_consultations': consultations.where((c) => c['status'] == 'completed').toList(),
  }));
  m.get('/api/astrologers/consultations/history', ok(consultations));
  m.get('/api/astrologers/threads', ok([
    {'user_id': 'cu_c1', 'user_name': 'Ananya Gupta', 'last_message': 'That helps a lot! Any good dates to accept?', 'last_message_at': ago(9), 'unread_count': 1},
    {'user_id': 'cu_c2', 'user_name': 'Rohit Kumar', 'last_message': 'Thank you Acharya ji 🙏', 'last_message_at': ago(50), 'unread_count': 0},
    {'user_id': 'cu_c3', 'user_name': 'Priya Singh', 'last_message': 'Our families are relieved. Booking a follow-up.', 'last_message_at': ago(130), 'unread_count': 2},
    {'user_id': 'cu_c4', 'user_name': 'Vikram Mehta', 'last_message': 'Will try the remedy from Saturday.', 'last_message_at': ago(250), 'unread_count': 0},
    {'user_id': 'cu_c5', 'user_name': 'Sneha Patil', 'last_message': 'Is Thursday good for the griha pravesh?', 'last_message_at': ago(60 * 20), 'unread_count': 0},
    {'user_id': 'cu_c6', 'user_name': 'Arjun Nair', 'last_message': 'Got it, thanks!', 'last_message_at': ago(60 * 26), 'unread_count': 0},
  ]));
  m.get(r'/api/astrologers/threads/.*/messages', {'success': true, 'has_more': false, 'messages': [
    {'id': 'm0', 'message_type': 'session_start', 'created_at': ago(14)},
    {'id': 'm1', 'sender_role': 'astrologer', 'created_at': ago(13), 'message':
        'Namaste Ananya 🙏 I have your birth details — 14 Aug 1996, 6:45 AM, Jaipur. What would you like to ask today?'},
    {'id': 'm2', 'sender_role': 'user', 'created_at': ago(12), 'message':
        'I have two job offers and need to decide this month. Which one suits me better?'},
    {'id': 'm3', 'sender_role': 'astrologer', 'created_at': ago(10), 'message':
        'Your Virgo ascendant with Jupiter in the 10th house favours roles with long-term growth over a quick salary jump.'},
    {'id': 'm4', 'sender_role': 'user', 'created_at': ago(9), 'message': 'That helps a lot! Any good dates to accept?'},
  ]});
  m.get('/api/astrologers/me/wallet', ok({
    'wallet': {'balance': 38450, 'total_earned': 482600},
    'stats': {'this_month': 41200},
  }));
  m.get('/api/astrologers/me/transactions', ok([
    for (final c in consultations.where((c) => c['status'] == 'completed'))
      {'amount': (c['total_amount'] as num) * 0.8, 'type': c['type'], 'user_name': c['user_name'],
       'duration_seconds': c['duration_seconds'], 'created_at': c['created_at']},
  ]));
  m.get('/api/withdrawal', ok([
    {'id': 'w1', 'amount': 25000, 'status': 'completed', 'created_at': '28 Oct 2026'},
    {'id': 'w2', 'amount': 30000, 'status': 'completed', 'created_at': '14 Oct 2026'},
  ]));
  m.get('/api/live/sessions', ok([
    {'id': 'l1', 'astrologer_id': 'a1', 'astrologer_name': 'Acharya Raghav Sharma', 'title': 'Saturn transit 2027 — what changes',
     'description': 'Live Q&A on the upcoming Saturn transit.', 'status': 'scheduled', 'viewer_count': 0,
     'scheduled_at': DateTime.now().add(const Duration(hours: 5)).toUtc().toIso8601String()},
    {'id': 'l2', 'astrologer_id': 'a1', 'astrologer_name': 'Acharya Raghav Sharma', 'title': 'Diwali muhurat & remedies',
     'status': 'ended', 'viewer_count': 2310, 'total_tips': 4200, 'started_at': ago(60 * 24 * 3)},
    {'id': 'l3', 'astrologer_id': 'a1', 'astrologer_name': 'Acharya Raghav Sharma', 'title': 'Marriage yogas in your kundli',
     'status': 'ended', 'viewer_count': 1860, 'total_tips': 3100, 'started_at': ago(60 * 24 * 9)},
  ]));
  m.get('/api/live/community', ok([
    {'id': 'p1', 'astrologer_name': 'Acharya Raghav Sharma', 'is_verified': true, 'category': 'tips', 'likes_count': 342, 'comments_count': 48, 'created_at': ago(90),
     'content': 'Mercury turns direct this week — a good time to restart stalled conversations and sign pending documents.'},
    {'id': 'p2', 'astrologer_name': 'Meera Iyer', 'is_verified': true, 'category': 'tarot', 'likes_count': 215, 'comments_count': 31, 'created_at': ago(600),
     'content': 'Card of the day: The Star ⭐ — hope and renewal. Take one small step toward a dream you set aside.'},
    {'id': 'p3', 'author_name': 'Riya', 'author_sign': 'Pisces', 'category': 'experience', 'likes_count': 87, 'comments_count': 12, 'created_at': ago(240),
     'content': 'My kundli matching session cleared so many doubts for both our families. Grateful 🙏'},
  ]));
  m.get('/api/live/notifications', ok([]));
  return m;
}

void push(Widget w) {
  navigatorKey.currentState!.push(MaterialPageRoute(builder: (_) => w));
}
Future<void> pop() async {
  navigatorKey.currentState!.pop();
}

void main() => runMocked(buildMock(), () async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  await prefs.setBool('onboarding_done', true);
  await const FlutterSecureStorage().write(key: 'auth_token', value: 'store-screenshot');

  final shots = [
    Shot('01_dashboard', () async {}, settleMs: 500),
    Shot('02_sessions', () async => tapText('Sessions')),
    Shot('03_chats', () async => tapText('Chats')),
    Shot('04_thread', () async => push(const AstrologerUserThreadScreen(userId: 'cu_c1', userName: 'Ananya Gupta')), teardown: pop),
    Shot('05_earnings', () async => push(const AstrologerEarningsScreen()), teardown: pop),
    Shot('06_live', () async => tapText('Live')),
    Shot('07_community', () async => tapText('Community')),
    Shot('08_profile', () async => push(const AstrologerOwnProfileScreen()), teardown: pop),
  ];

  runApp(const AstroTalkApp());
  await runShots(shots, startDelayMs: 7000);
});
