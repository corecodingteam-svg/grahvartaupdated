// End-to-end smoke test for the astrologer app against a TEST backend (never production):
//
//   flutter test integration_test/e2e_smoke_test.dart -d <device> \
//     --dart-define=API_HOST=http://127.0.0.1:3300 \
//     --dart-define=QA_EMAIL=<approved astrologer> --dart-define=QA_PASSWORD=<password>
//
// Prints one "RESULT|<TC ID>|<Pass/Fail>|<details>" line per workbook case.
import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:grahvarta_astrology/main.dart' as app;
import 'package:grahvarta_astrology/services/api_service.dart';
import 'package:grahvarta_astrology/screens/astrologer/astrologer_main_screen.dart';
import 'package:grahvarta_astrology/screens/astrologer/astrologer_earnings_screen.dart';

const _email = String.fromEnvironment('QA_EMAIL');
const _password = String.fromEnvironment('QA_PASSWORD');

// ignore: avoid_print
void _result(String id, bool ok, String details) => print('RESULT|$id|${ok ? 'Pass' : 'Fail'}|$details');

Future<bool> _waitFor(WidgetTester t, Finder f, {Duration timeout = const Duration(seconds: 15)}) async {
  final end = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(end)) {
    await t.pump(const Duration(milliseconds: 250));
    if (f.evaluate().isNotEmpty) return true;
  }
  return false;
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('astrologer app: login → dashboard → earnings', (t) async {
    expect(ApiService.apiHost.contains('api.grahvarta.com'), isFalse, reason: 'Run against a test backend only');
    (await SharedPreferences.getInstance()).clear();
    await const FlutterSecureStorage().deleteAll();

    app.main();
    final signIn = find.widgetWithText(ElevatedButton, 'Sign In');
    await _waitFor(t, find.text('Skip').hitTestable(), timeout: const Duration(seconds: 8));
    if (find.text('Skip').hitTestable().evaluate().isNotEmpty) await t.tap(find.text('Skip').hitTestable());
    final login = await _waitFor(t, signIn);
    _result('AA-AUTH-01', login, 'fresh install → onboarding → astrologer login screen (no role choice needed)=$login');

    final fields = find.byType(TextFormField);
    await t.enterText(fields.at(0), _email);
    await t.enterText(fields.at(1), 'wrong-pass-123');
    FocusManager.instance.primaryFocus?.unfocus();
    await t.pump(const Duration(milliseconds: 400));
    await t.ensureVisible(signIn);
    await t.tap(signIn);
    final err = await _waitFor(t, find.textContaining('Invalid credentials'), timeout: const Duration(seconds: 10));
    _result('AA-AUTH-03', err, 'wrong password → "Invalid credentials" shown=$err');

    await t.ensureVisible(fields.at(1));
    await t.pump(const Duration(milliseconds: 300));
    await t.enterText(fields.at(1), _password);
    // Close the keyboard and bring the button on screen (the error banner pushes it down)
    FocusManager.instance.primaryFocus?.unfocus();
    await t.pump(const Duration(milliseconds: 400));
    await t.ensureVisible(signIn);
    await t.pump(const Duration(milliseconds: 300));
    await t.tap(signIn);
    final dash = await _waitFor(t, find.byType(AstrologerMainScreen), timeout: const Duration(seconds: 20));
    for (var i = 0; i < 12; i++) {
      await t.pump(const Duration(milliseconds: 250));
    }
    if (!dash) {
      final texts = find.byType(Text).evaluate().map((e) => (e.widget as Text).data).whereType<String>().take(25).join(' | ');
      _result('AA-AUTH-02', false, 'after login the screen shows: $texts');
      return;
    }
    _result('AA-AUTH-02', dash, 'approved astrologer login → astrologer dashboard=$dash');
    _result('AA-DSH-01', dash && t.takeException() == null, 'dashboard rendered without errors=$dash');

    app.navigatorKey.currentState!.push(MaterialPageRoute(builder: (_) => const AstrologerEarningsScreen()));
    final earn = await _waitFor(t, find.text('Earnings & Wallet'));
    for (var i = 0; i < 12; i++) {
      await t.pump(const Duration(milliseconds: 250));
    }
    final withdraw = find.textContaining(RegExp('withdraw', caseSensitive: false)).evaluate().length;
    _result('AA-ERN-09', earn && withdraw == 0, 'Earnings & Wallet opened=$earn; withdrawal UI elements found=$withdraw');
  });
}
