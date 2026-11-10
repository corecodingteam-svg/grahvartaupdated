// Store screenshots for the GrahVarta onboarding app.
//   flutter run -d <simulator> -t store_screenshots/main.dart
// All data below is fictional sample data.

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:agent_onboarding/main.dart' show AgentOnboardingApp;
import 'package:agent_onboarding/screens/dashboard_screen.dart';

import 'shot_kit.dart';

final navKey = GlobalKey<NavigatorState>();

MockApi buildMock() {
  final m = MockApi();
  m.get('/api/hirings/status', ok({
    'name': 'Meera Iyer', 'token_no': 'GV-2026-1042', 'status': 'round2', 'phone': '+919876543210',
    'email': 'meera@example.com', 'profile_picture_url': null, 'admin_notes': null,
    'languages': ['English', 'Tamil', 'Hindi'], 'skills': ['Tarot', 'Numerology'],
    'created_at': ago(60 * 24 * 9),
  }));
  return m;
}

void main() => runMocked(buildMock(), () async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove('agent_phone');

  final shots = [
    Shot('01_phone', () async => enterText(0, '9876543210')),
    Shot('02_personal', () async {
      await tapText('Continue');
      await wait(1200);
      await enterText(0, 'Meera Iyer');
      await tapText('Date of Birth *');
      await wait(900);
      await tapText('OK');
      await wait(600);
      await tapText('Female');
    }),
    Shot('03_expertise', () async {
      await tapText('Next');
      await wait(900);
      for (final s in ['English', 'Tamil', 'Hindi', 'Tarot', 'Numerology', 'Vedic Astrology']) {
        await tapText(s);
        await wait(150);
      }
    }),
    Shot('04_profile', () async {
      await tapText('Next');
      await wait(900);
      await tapText('Android');
      for (var i = 0; i < 3; i++) {
        await enterText(i, '');
      }
      await enterText(0, 'meera@example.com');
      await enterText(1, 'Tarot reader and numerologist with 9 years of experience helping clients with love, career and life decisions.');
    }),
    Shot('05_status', () async {
      navKey.currentState!.pushReplacement(
          MaterialPageRoute(builder: (_) => const DashboardScreen(phone: '+919876543210')));
    }, settleMs: 3000),
  ];

  runApp(_Root(navKey));
  await runShots(shots, startDelayMs: 4000);
});

/// Same app, with a navigator key the harness can drive.
class _Root extends StatelessWidget {
  final GlobalKey<NavigatorState> k;
  const _Root(this.k);
  @override
  Widget build(BuildContext context) {
    final app = const AgentOnboardingApp().build(context) as MaterialApp;
    return MaterialApp(
      navigatorKey: k,
      title: app.title,
      debugShowCheckedModeBanner: false,
      theme: app.theme,
      home: app.home,
    );
  }
}
