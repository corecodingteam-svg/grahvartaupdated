// Screen-level E2E checks for the user app against a TEST backend (never production).
//
//   flutter test integration_test/e2e_screens_test.dart -d <device> \
//     --dart-define=API_HOST=http://127.0.0.1:3300 \
//     --dart-define=QA_EMAIL=<user with ₹0 balance> --dart-define=QA_PASSWORD=<password> \
//     --dart-define=QA_ASTRO=<display name of an online astrologer, chat rate ₹10>
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
const _astro = String.fromEnvironment('QA_ASTRO');

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

Future<void> _settle(WidgetTester t, [int ms = 2000]) async {
  for (var i = 0; i < ms ~/ 250; i++) {
    await t.pump(const Duration(milliseconds: 250));
  }
}

Future<void> _tapVisible(WidgetTester t, Finder f) async {
  await t.ensureVisible(f.first);
  await t.pump(const Duration(milliseconds: 300));
  await t.tap(f.first);
}

Future<void> _back(WidgetTester t) async {
  final nav = t.state<NavigatorState>(find.byType(Navigator).last);
  nav.maybePop();
  await _settle(t, 1200);
}

Brightness _brightness(WidgetTester t) => Theme.of(t.element(find.byType(Scaffold).last)).brightness;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('user app screens', (t) async {
    expect(ApiService.apiHost.contains('api.grahvarta.com'), isFalse, reason: 'Run against a test backend only');

    // ── Expired / invalid token at launch → Login ──
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    await prefs.setBool('onboarding_done', true);
    const storage = FlutterSecureStorage();
    await storage.deleteAll();
    await storage.write(key: 'auth_token', value: 'expired.or.revoked.token');
    app.main();
    final toLogin = await _waitFor(t, find.widgetWithText(ElevatedButton, 'Sign In'), timeout: const Duration(seconds: 20));
    final tokenCleared = await storage.read(key: 'auth_token') == null;
    _result('UA-LCH-05', toLogin && tokenCleared, 'invalid stored token → splash → Login=$toLogin; token cleared=$tokenCleared');

    // ── Login ──
    final fields = find.byType(TextFormField);
    await t.enterText(fields.at(0), _email);
    await t.enterText(fields.at(1), _password);
    FocusManager.instance.primaryFocus?.unfocus();
    await _settle(t, 500);
    await _tapVisible(t, find.widgetWithText(ElevatedButton, 'Sign In'));
    await _waitFor(t, find.byIcon(Icons.people_rounded), timeout: const Duration(seconds: 20));
    await _settle(t);

    // ── Marketplace list + profile + low balance (1-minute rule) ──
    await t.tap(find.byIcon(Icons.people_rounded).last);
    final listed = await _waitFor(t, find.text(_astro));
    final rate = find.textContaining('₹10').evaluate().isNotEmpty;
    _result('UA-MKT-01', listed && rate, 'Astrologers tab lists "$_astro"=$listed with per-minute rate shown=$rate');

    if (listed) {
      await _tapVisible(t, find.text(_astro));
      final profile = await _waitFor(t, find.textContaining('Chat Now'));
      final reviews = find.textContaining('review', findRichText: true).evaluate().isNotEmpty || find.text('No reviews yet').evaluate().isNotEmpty;
      _result('UA-MKT-03', profile && reviews, 'profile opened: "Chat Now" button=$profile, reviews section=$reviews');
      if (profile) {
        await _tapVisible(t, find.textContaining('Chat Now'));
        final dialog = await _waitFor(t, find.textContaining('Minimum ₹10 required (1 min'), timeout: const Duration(seconds: 8));
        _result('UA-CHT-02', dialog, '₹0 balance → Chat Now → "Minimum ₹10 required (1 min @ ₹10/min)" dialog=$dialog (1-minute rule)');
        await _back(t); // close dialog
      }
      await _back(t); // close profile
    }

    // ── Home → Wallet ──
    await t.tap(find.byIcon(Icons.home_rounded).last);
    await _settle(t);
    await _tapVisible(t, find.text('Wallet'));
    final wallet = await _waitFor(t, find.textContaining('₹0'));
    _result('UA-WAL-01', wallet, 'Home → Wallet shows balance ₹0 for the new account=$wallet');
    await _back(t);

    // ── Kundli: Free Kundli without date of birth ──
    await t.tap(find.byIcon(Icons.auto_awesome).last);
    await _settle(t);
    if (await _waitFor(t, find.text('Free Kundli'), timeout: const Duration(seconds: 6))) {
      await _tapVisible(t, find.text('Free Kundli'));
      await _waitFor(t, find.textContaining('Generate Kundli'));
      await _tapVisible(t, find.textContaining('Generate Kundli'));
      final dobMsg = await _waitFor(t, find.text('Please select date of birth'), timeout: const Duration(seconds: 5));
      _result('UA-KUN-02', dobMsg, 'Generate without date of birth → "Please select date of birth"=$dobMsg');
      await _back(t);
    } else {
      _result('UA-KUN-02', false, 'Free Kundli entry not found on the Kundli tab');
    }

    // ── Profile ──
    await t.tap(find.byIcon(Icons.home_rounded).last);
    await _settle(t);
    await t.tap(find.byType(CircleAvatar).first);
    final prof = await _waitFor(t, find.text('Family Members'));

    // Privacy, Help, version
    await _tapVisible(t, find.text('Privacy'));
    final privacy = await _waitFor(t, find.textContaining('birth details', findRichText: true), timeout: const Duration(seconds: 5));
    await _back(t);
    await _tapVisible(t, find.text('Help & Support'));
    final help = await _waitFor(t, find.textContaining('support@grahvarta.com'), timeout: const Duration(seconds: 5));
    final versionOk = await _waitFor(t, find.textContaining('3.1.4'), timeout: const Duration(seconds: 5));
    final stale = find.text('1.0.0').evaluate().isNotEmpty;
    _result('UA-PRF-02', privacy && help && versionOk && !stale,
        'Privacy opens=$privacy (contact support@grahvarta.com); Help & Support → support email shown=$help; App Version shows 3.1.4=$versionOk (stale 1.0.0=$stale)');

    // Theme toggle
    final b0 = _brightness(t);
    await _tapVisible(t, find.byType(Switch));
    await _settle(t, 1000);
    final b1 = _brightness(t);
    await _tapVisible(t, find.byType(Switch));
    await _settle(t, 1000);
    final themeErr = t.takeException();
    final signOutVisible = find.text('Sign Out').hitTestable().evaluate().isNotEmpty;
    _result('UA-HOME-05', b0 != b1 && _brightness(t) == b0 && themeErr == null && signOutVisible,
        'theme switch: $b0 → $b1 → back to ${_brightness(t)}; framework errors=${themeErr ?? 'none'}; app bar Sign Out still tappable=$signOutVisible');

    // Language → Hindi → back to English
    await _tapVisible(t, find.text('Language'));
    await _waitFor(t, find.text('हिंदी'));
    await t.tap(find.text('हिंदी').last);
    final hindi = await _waitFor(t, find.text('साइन आउट'), timeout: const Duration(seconds: 5));
    final translated = ['परिवार के सदस्य', 'चैट इतिहास', 'लाइट थीम', 'दोस्तों को Grahvarta पर आमंत्रित करें'].where((x) => find.text(x).evaluate().isEmpty).toList();
    await _tapVisible(t, find.byIcon(Icons.language));
    await _waitFor(t, find.text('English'));
    await t.tap(find.text('English').last);
    final english = await _waitFor(t, find.text('Sign Out'), timeout: const Duration(seconds: 5));
    _result('UA-HOME-06', hindi && translated.isEmpty && english,
        'Language → हिंदी: "Sign Out" became "साइन आउट"=$hindi; profile labels untranslated=${translated.isEmpty ? 'none' : translated.join(', ')}; back to English=$english');

    // Family member without relationship
    await _tapVisible(t, find.text('Family Members'));
    await _waitFor(t, find.text('Add Member'));
    await t.tap(find.text('Add Member').first);
    await _waitFor(t, find.text('Add Family Member'));
    final saveBtn = find.widgetWithText(ElevatedButton, 'Add Member');
    await _tapVisible(t, saveBtn);
    final relMsg = await _waitFor(t, find.text('Relationship is required'), timeout: const Duration(seconds: 5));
    _result('UA-FAM-03', relMsg, 'Add Member with empty form → "Relationship is required" shown=$relMsg (plus name/date/place messages)');
    await _back(t);
    await _back(t);

    // Sign out
    if (!prof) await t.tap(find.byType(CircleAvatar).first);
    await _waitFor(t, find.text('Sign Out'));
    await t.tap(find.text('Sign Out').first);
    await _settle(t, 800);
    if (find.text('Sign Out').evaluate().length > 1) await t.tap(find.text('Sign Out').last); // confirm dialog
    final out = await _waitFor(t, find.widgetWithText(ElevatedButton, 'Sign In'), timeout: const Duration(seconds: 10));
    final tokenGone = await storage.read(key: 'auth_token') == null;
    _result('UA-AUTH-10', out && tokenGone, 'Sign Out → Login screen=$out; stored token removed=$tokenGone');
  });
}
