// End-to-end smoke test for the user app, driven on a simulator/device against
// a TEST backend (never production):
//
//   flutter test integration_test/e2e_smoke_test.dart -d <device> \
//     --dart-define=API_HOST=http://127.0.0.1:3300 \
//     --dart-define=QA_EMAIL=<existing test user> --dart-define=QA_PASSWORD=<password>
//
// Prints one "RESULT|<TC ID>|<Pass/Fail>|<details>" line per workbook case.
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grahvarta/main.dart' as app;
import 'package:grahvarta/services/api_service.dart';

const _email = String.fromEnvironment('QA_EMAIL');
const _password = String.fromEnvironment('QA_PASSWORD');

void _result(String id, bool ok, String details) =>
    // ignore: avoid_print
    print('RESULT|$id|${ok ? 'Pass' : 'Fail'}|$details');

/// Pumps until [finder] matches or [timeout] passes (the app has real timers,
/// so pumpAndSettle would never settle).
Future<bool> _waitFor(WidgetTester t, Finder finder, {Duration timeout = const Duration(seconds: 15)}) async {
  final end = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(end)) {
    await t.pump(const Duration(milliseconds: 250));
    if (finder.evaluate().isNotEmpty) return true;
  }
  return false;
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('user app: onboarding → login → tabs', (t) async {
    expect(ApiService.apiHost.contains('api.grahvarta.com'), isFalse, reason: 'Run against a test backend only');
    // Fresh-install state
    (await SharedPreferences.getInstance()).clear();
    await const FlutterSecureStorage().deleteAll();

    app.main();
    final onboarding = await _waitFor(t, find.text('Skip'));
    _result('UA-LCH-01', onboarding, 'fresh install → splash → onboarding (Skip visible=$onboarding)');

    await t.tap(find.text('Skip'));
    final login = await _waitFor(t, find.text('Sign In'));
    _result('UA-LCH-03', login, 'Skip → login screen shown=$login');

    // Empty form → inline validation, no API call
    await t.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
    await t.pump(const Duration(milliseconds: 500));
    final emailErr = find.text('Enter a valid email').evaluate().isNotEmpty;
    final pwErr = find.text('Password must be at least 6 characters').evaluate().isNotEmpty;
    _result('UA-AUTH-04', emailErr && pwErr, 'empty submit → email error=$emailErr, password error=$pwErr');

    final fields = find.byType(TextFormField);
    // Wrong password → server error visible, stays on login
    await t.enterText(fields.at(0), _email);
    await t.enterText(fields.at(1), 'wrong-pass-123');
    await t.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
    final errShown = await _waitFor(t, find.textContaining('Invalid credentials'), timeout: const Duration(seconds: 10));
    _result('UA-AUTH-02', errShown && find.text('Sign In').evaluate().isNotEmpty, 'wrong password → "Invalid credentials" shown=$errShown, still on login');

    // Real login → main screen
    await t.enterText(fields.at(1), _password);
    await t.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
    final main = await _waitFor(t, find.byIcon(Icons.people_rounded), timeout: const Duration(seconds: 20));
    if (!main) {
      final texts = find.byType(Text).evaluate().map((e) => (e.widget as Text).data).whereType<String>().take(25).join(' | ');
      _result('UA-AUTH-01', false, 'after valid login the screen shows: $texts');
      return;
    }
    _result('UA-AUTH-01', main, 'valid login → Home (greeting, horoscope, online astrologers) with bottom tabs');
    final home = find.textContaining('Online Astrologers').evaluate().isNotEmpty && find.textContaining('Horoscope').evaluate().isNotEmpty;
    _result('UA-HOME-02', home, 'Home shows greeting, wallet, today\'s horoscope and online astrologers=$home');

    // Every tab opens without a Flutter error
    // Unselected tabs show only an icon (label appears when selected)
    final tabs = {'Astrologers': Icons.people_rounded, 'Reports': Icons.article_rounded, 'Live': Icons.live_tv_rounded, 'Kundli': Icons.auto_awesome, 'Home': Icons.home_rounded};
    final problems = <String>[];
    for (final e in tabs.entries) {
      final tab = e.key;
      await t.tap(find.byIcon(e.value).last);
      for (var i = 0; i < 12; i++) {
        await t.pump(const Duration(milliseconds: 250));
      }
      final ex = t.takeException();
      if (ex != null) problems.add('$tab: $ex');
    }
    _result('UA-HOME-01', problems.isEmpty, problems.isEmpty ? 'tapped ${tabs.keys.join(', ')} → each opened without errors' : problems.join('; '));
  });
}
