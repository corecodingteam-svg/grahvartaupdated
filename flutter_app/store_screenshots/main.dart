// Store screenshots for the GrahVarta user app.
//   flutter run -d <simulator> -t store_screenshots/main.dart
// All data below is fictional sample data.

import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:grahvarta/main.dart' show AstroTalkApp, navigatorKey;
import 'package:grahvarta/models/astrologer.dart';
import 'package:grahvarta/screens/birth_chart/birth_chart_screen.dart';
import 'package:grahvarta/screens/consultation/thread_screen.dart';
import 'package:grahvarta/screens/home/main_screen.dart' show mainTabNotifier;
import 'package:grahvarta/screens/kundli/kundli_matching_screen.dart';
import 'package:grahvarta/screens/marketplace/astrologer_profile_screen.dart';
import 'package:grahvarta/screens/transits/transits_screen.dart';
import 'package:grahvarta/screens/wallet/wallet_screen.dart';

import 'shot_kit.dart';

final astrologers = [
  _astro('a1', 'Acharya Raghav Sharma', 18, ['Hindi', 'English', 'Sanskrit'], ['Vedic', 'Kundli', 'Marriage'], 25, 30, 40, 4.9, 2140, 18450,
      'Vedic astrologer with 18 years of practice in kundli analysis, marriage timing and career guidance. Known for clear, practical remedies.'),
  _astro('a2', 'Meera Iyer', 9, ['English', 'Tamil', 'Hindi'], ['Tarot', 'Love', 'Relationships'], 18, 22, 30, 4.8, 1320, 9620,
      'Intuitive tarot reader helping with love, relationships and life decisions.'),
  _astro('a3', 'Pandit Devendra Joshi', 22, ['Hindi', 'Gujarati'], ['Vedic', 'Muhurat', 'Puja'], 30, 35, 45, 4.9, 3010, 26800,
      'Traditional jyotish and muhurat specialist from Ujjain.'),
  _astro('a4', 'Dr. Kavita Rao', 12, ['English', 'Kannada', 'Telugu'], ['Numerology', 'Career', 'Finance'], 20, 25, 35, 4.7, 980, 7400,
      'Numerologist and career coach focused on finance and business timing.'),
  _astro('a5', 'Aarav Malhotra', 7, ['Hindi', 'Punjabi', 'English'], ['Vastu', 'KP System'], 15, 20, 28, 4.6, 640, 4100,
      'Vastu consultant for homes and offices, KP system practitioner.'),
  _astro('a6', 'Sunita Verma', 15, ['Hindi', 'Marathi'], ['Vedic', 'Health', 'Family'], 22, 28, 38, 4.8, 1510, 12300,
      'Guidance on health, family harmony and wellbeing.'),
];

Map<String, dynamic> _astro(String id, String name, int exp, List<String> langs, List<String> spec, num chat, num call,
        num video, double rating, int reviews, int consults, String bio) =>
    {
      'id': id, 'user_id': 'u_$id', 'display_name': name, 'bio': bio, 'avatar_url': null,
      'experience_years': exp, 'languages': langs, 'specializations': spec, 'expertise_areas': spec,
      'per_minute_rate_chat': chat, 'per_minute_rate_call': call, 'per_minute_rate_video': video,
      'total_consultations': consults, 'rating': rating, 'review_count': reviews,
      'is_online': true, 'is_verified': true, 'is_available': true, 'queue_count': 0,
    };

MockApi buildMock() {
  final m = MockApi();
  m.get('/api/auth/profile', ok({
    'id': 'me', 'email': 'ananya@example.com', 'name': 'Ananya Gupta', 'avatar_url': null,
    'date_of_birth': '1996-08-14', 'time_of_birth': '06:45', 'birth_place': 'Jaipur, Rajasthan',
    'sun_sign': 'Leo', 'moon_sign': 'Taurus', 'rising_sign': 'Virgo', 'subscription_plan': 'free',
  }));
  m.get('/api/dashboard', ok({'unread_notifications': 2}));
  m.get(r'/api/horoscope/.*', ok({
    'zodiac_sign': 'Leo', 'period_type': 'daily',
    'content': 'The Moon in your tenth house puts career matters in focus today. A conversation with a senior '
        'opens a door you have been waiting for — speak with confidence. In love, small gestures matter more than grand plans. '
        'Evening is a good time for family and rest.',
    'love_score': 84, 'friendship_score': 78, 'work_score': 91, 'lucky_number': 7, 'lucky_color': 'Gold',
  }));
  m.get('/api/astrologers', ok(astrologers));
  m.get(r'/api/astrologers/a\d', ok(astrologers.first));
  m.get(r'/api/astrologers/a\d/reviews', ok([
    {'id': 'r1', 'user_name': 'Priya S.', 'rating': 5, 'created_at': ago(60 * 26),
     'review_text': 'Very insightful kundli matching session before our marriage. Explained every koota patiently.'},
    {'id': 'r2', 'user_name': 'Rohit K.', 'rating': 5, 'created_at': ago(60 * 72),
     'review_text': 'Gave me so much clarity about my career path. Practical remedies, no jargon.'},
    {'id': 'r3', 'user_name': 'Neha', 'rating': 4, 'created_at': ago(60 * 24 * 6),
     'review_text': 'Quick, honest and supportive guidance during a tough time.'},
  ]));
  m.get(r'/api/threads/.*/messages', {'success': true, 'has_more': false, 'messages': [
    {'id': 'm0', 'message_type': 'session_start', 'created_at': ago(14)},
    {'id': 'm1', 'sender_role': 'astrologer', 'created_at': ago(13), 'message':
        'Namaste Ananya 🙏 I have your birth details — 14 Aug 1996, 6:45 AM, Jaipur. What would you like to ask today?'},
    {'id': 'm2', 'sender_role': 'user', 'created_at': ago(12), 'message':
        'I have two job offers and need to decide this month. Which one suits me better?'},
    {'id': 'm3', 'sender_role': 'astrologer', 'created_at': ago(10), 'message':
        'Your Virgo ascendant with Jupiter in the 10th house favours roles with long-term growth over a quick salary jump. '
        'Saturn is supportive for stable organisations until mid-2027.'},
    {'id': 'm4', 'sender_role': 'user', 'created_at': ago(9), 'message': 'That helps a lot! Any good dates to accept?'},
    {'id': 'm5', 'sender_role': 'astrologer', 'created_at': ago(8), 'message':
        'Thursday the 6th after 11 AM is auspicious — Pushya nakshatra. Wishing you success ✨'},
  ]});
  m.get('/api/birth-chart', ok({
    'sun_sign': 'Leo', 'moon_sign': 'Taurus', 'ascendant': 'Virgo', 'moon_nakshatra': 'Rohini',
    'planets': [
      {'name': 'Sun', 'symbol': 'Su', 'sign': 'Leo', 'nakshatra': 'Magha', 'house': 12},
      {'name': 'Moon', 'symbol': 'Mo', 'sign': 'Taurus', 'nakshatra': 'Rohini', 'house': 9},
      {'name': 'Mars', 'symbol': 'Ma', 'sign': 'Gemini', 'nakshatra': 'Ardra', 'house': 10},
      {'name': 'Mercury', 'symbol': 'Me', 'sign': 'Virgo', 'nakshatra': 'Hasta', 'house': 1},
      {'name': 'Jupiter', 'symbol': 'Ju', 'sign': 'Gemini', 'nakshatra': 'Punarvasu', 'house': 10},
      {'name': 'Venus', 'symbol': 'Ve', 'sign': 'Cancer', 'nakshatra': 'Pushya', 'house': 11},
      {'name': 'Saturn', 'symbol': 'Sa', 'sign': 'Pisces', 'nakshatra': 'Revati', 'house': 7},
      {'name': 'Rahu', 'symbol': 'Ra', 'sign': 'Virgo', 'nakshatra': 'Chitra', 'house': 1},
      {'name': 'Ketu', 'symbol': 'Ke', 'sign': 'Pisces', 'nakshatra': 'Uttara Bhadrapada', 'house': 7},
    ],
  }));
  m.get('/api/transits', ok([
    {'id': 't1', 'planet': 'Jupiter', 'aspect': 'trine', 'target_planet': 'Sun', 'zodiac_sign': 'Cancer', 'category': 'career', 'intensity': 'high',
     'description': 'Expansion in career and recognition. A good window to ask for growth.'},
    {'id': 't2', 'planet': 'Venus', 'aspect': 'conjunction', 'target_planet': 'Moon', 'zodiac_sign': 'Libra', 'category': 'love', 'intensity': 'medium',
     'description': 'Warmth in relationships; favourable for meeting family or making plans together.'},
    {'id': 't3', 'planet': 'Saturn', 'aspect': 'square', 'target_planet': 'Mars', 'zodiac_sign': 'Pisces', 'category': 'health', 'intensity': 'medium',
     'description': 'Pace yourself — steady routines beat bursts of effort this week.'},
    {'id': 't4', 'planet': 'Mercury', 'aspect': 'sextile', 'target_planet': 'Jupiter', 'zodiac_sign': 'Scorpio', 'category': 'finance', 'intensity': 'low',
     'description': 'Clear thinking for paperwork, contracts and investments.'},
  ]));
  m.get('/api/wallet', ok({'id': 'w1', 'balance': 1250, 'currency': 'INR', 'total_added': 3000, 'total_spent': 1750}));
  m.get('/api/wallet/stats', ok({'total_added': 3000, 'total_spent': 1750}));
  m.get('/api/wallet/transactions', ok([
    {'id': 'x1', 'type': 'debit', 'amount': 300, 'description': 'Chat with Acharya Raghav Sharma · 12 min', 'status': 'success', 'created_at': ago(15)},
    {'id': 'x2', 'type': 'credit', 'amount': 1000, 'description': 'Added via UPI', 'status': 'success', 'created_at': ago(60 * 5)},
    {'id': 'x3', 'type': 'debit', 'amount': 420, 'description': 'Call with Pandit Devendra Joshi · 12 min', 'status': 'success', 'created_at': ago(60 * 30)},
    {'id': 'x4', 'type': 'debit', 'amount': 180, 'description': 'Chat with Meera Iyer · 10 min', 'status': 'success', 'created_at': ago(60 * 75)},
    {'id': 'x5', 'type': 'credit', 'amount': 2000, 'description': 'Added via card', 'status': 'success', 'created_at': ago(60 * 24 * 6)},
  ]));
  m.get('/api/wallet/recharge-offers', ok([
    {'id': 1, 'amount': 100, 'bonus_percent': 0, 'label': ''},
    {'id': 2, 'amount': 250, 'bonus_percent': 5, 'label': ''},
    {'id': 3, 'amount': 500, 'bonus_percent': 10, 'label': 'Popular'},
    {'id': 4, 'amount': 1000, 'bonus_percent': 15, 'label': ''},
    {'id': 5, 'amount': 2000, 'bonus_percent': 20, 'label': 'Best value'},
    {'id': 6, 'amount': 5000, 'bonus_percent': 25, 'label': ''},
  ]));
  m.get('/api/live/sessions', ok([
    {'id': 'l1', 'astrologer_id': 'a3', 'astrologer_name': 'Pandit Devendra Joshi', 'title': 'Diwali muhurat & remedies Q&A',
     'description': 'Ask about auspicious timings for the festive season.', 'status': 'live', 'viewer_count': 1284, 'total_tips': 3450, 'started_at': ago(25)},
    {'id': 'l2', 'astrologer_id': 'a2', 'astrologer_name': 'Meera Iyer', 'title': 'Weekly tarot reading for all signs',
     'status': 'live', 'viewer_count': 642, 'total_tips': 1280, 'started_at': ago(10)},
    {'id': 'l3', 'astrologer_id': 'a1', 'astrologer_name': 'Acharya Raghav Sharma', 'title': 'Saturn transit 2027 — what changes',
     'status': 'scheduled', 'viewer_count': 0, 'scheduled_at': DateTime.now().add(const Duration(hours: 5)).toUtc().toIso8601String()},
  ]));
  m.get('/api/live/community', ok([
    {'id': 'p1', 'astrologer_name': 'Acharya Raghav Sharma', 'is_verified': true, 'category': 'tips', 'likes_count': 342, 'comments_count': 48, 'created_at': ago(90),
     'content': 'Mercury turns direct this week — a good time to restart stalled conversations and sign pending documents.'},
    {'id': 'p2', 'author_name': 'Riya', 'author_sign': 'Pisces', 'category': 'experience', 'likes_count': 87, 'comments_count': 12, 'created_at': ago(240),
     'content': 'My kundli matching session cleared so many doubts for both our families. Grateful 🙏'},
    {'id': 'p3', 'astrologer_name': 'Meera Iyer', 'is_verified': true, 'category': 'tarot', 'likes_count': 215, 'comments_count': 31, 'created_at': ago(600),
     'content': 'Card of the day: The Star ⭐ — hope and renewal. Take one small step toward a dream you set aside.'},
  ]));
  m.get('/api/live/notifications', ok([]));
  m.get('/api/reports', ok([
    {'id': 'rp1', 'name': 'Career & Finance Report', 'category': 'career', 'icon': '💼', 'avg_rating': 4.8, 'unlock_count': 12400,
     'description': 'Your career path, best periods for growth and money matters.', 'inclusions': ['10th house analysis', 'Dasha timeline', 'Remedies']},
    {'id': 'rp2', 'name': 'Marriage & Love Report', 'category': 'love', 'icon': '💞', 'avg_rating': 4.9, 'unlock_count': 18200,
     'description': 'Relationship patterns, marriage timing and compatibility.', 'inclusions': ['7th house', 'Venus & Jupiter', 'Manglik check']},
    {'id': 'rp3', 'name': 'Yearly Forecast 2027', 'category': 'yearly', 'icon': '📅', 'avg_rating': 4.7, 'unlock_count': 9100,
     'description': 'Month-by-month outlook for the year ahead.', 'inclusions': ['Monthly highlights', 'Transits', 'Lucky dates']},
    {'id': 'rp4', 'name': 'Health & Wellbeing Report', 'category': 'health', 'icon': '🌿', 'avg_rating': 4.6, 'unlock_count': 5300,
     'description': 'Planetary influences on health with lifestyle tips.', 'inclusions': ['6th house', 'Ayurvedic tips']},
  ]));
  m.get('/api/reports/credits', ok({'free_used': false, 'plan_credits': 0, 'wallet_balance': 1250}));
  m.get('/api/reports/free-status', ok({'free_used': false}));
  m.get('/api/family-members', ok([]));
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

  final a = Astrologer.fromJson(astrologers.first);
  final shots = [
    Shot('01_home', () async {}, settleMs: 500),
    Shot('02_astrologers', () async => mainTabNotifier.value = 1),
    Shot('03_profile', () async => push(AstrologerProfileScreen(astrologer: a)), teardown: pop),
    Shot('04_chat', () async => push(ThreadScreen(astrologerId: a.id, astrologerName: a.displayName, rating: a.rating)), teardown: pop),
    Shot('05_kundli', () async => push(const BirthChartScreen()), teardown: pop),
    Shot('06_matching', () async {
      push(const KundliMatchingScreen());
      await wait(1200);
      await enterText(0, 'Rahul');
      await enterText(1, 'Ananya');
      await tapText('Date of Birth', index: 0);
      await wait(900);
      await tapText('8');
      await tapText('OK');
      await wait(700);
      await tapText('Date of Birth', index: 0);
      await wait(900);
      await tapText('21');
      await tapText('OK');
      await wait(700);
      await tapText('Match Kundli', contains: true);
    }, teardown: pop),
    Shot('07_transits', () async => push(const TransitsScreen()), teardown: pop),
    Shot('08_wallet', () async => push(const WalletScreen()), teardown: pop),
    Shot('09_live', () async => mainTabNotifier.value = 3),
    Shot('10_reports', () async => mainTabNotifier.value = 2),
  ];

  runApp(const AstroTalkApp());
  await runShots(shots, startDelayMs: 7000);
});
