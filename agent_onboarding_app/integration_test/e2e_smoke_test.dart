// End-to-end smoke test for the agent onboarding app against a TEST backend whose
// emails are captured by Mailpit (never production):
//
//   flutter test integration_test/e2e_smoke_test.dart -d <device> \
//     --dart-define=API_HOST=http://127.0.0.1:3300 --dart-define=MAILPIT=http://127.0.0.1:18025
//
// Prints one "RESULT|<TC ID>|<Pass/Fail>|<details>" line per workbook case.
import 'dart:convert';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:integration_test/integration_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:agent_onboarding/main.dart' as app;
import 'package:agent_onboarding/api_service.dart';

const _mailpit = String.fromEnvironment('MAILPIT');

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

Future<String?> _otpFor(String email) async {
  for (var i = 0; i < 20; i++) {
    final s = jsonDecode((await http.get(Uri.parse('$_mailpit/api/v1/search?query=${Uri.encodeComponent('to:$email')}'))).body);
    final msgs = (s['messages'] as List?) ?? [];
    if (msgs.isNotEmpty) {
      final m = jsonDecode((await http.get(Uri.parse('$_mailpit/api/v1/message/${msgs.first['ID']}'))).body);
      final code = RegExp(r'\b(\d{5})\b').firstMatch((m['Text'] ?? '') as String)?.group(1);
      if (code != null) return code;
    }
    await Future.delayed(const Duration(milliseconds: 400));
  }
  return null;
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('agent app: phone/email → OTP → registration', (t) async {
    expect(ApiService.apiHost.contains('api.grahvarta.com'), isFalse, reason: 'Run against a test backend only');
    (await SharedPreferences.getInstance()).clear();

    app.main();
    final first = await _waitFor(t, find.text('Enter your mobile number and email'));
    _result('AG-LCH-01', first, 'fresh install → splash → mobile/email screen=$first');

    final mobile = find.widgetWithText(TextField, 'Mobile Number');
    final emailF = find.widgetWithText(TextField, 'Email Address');
    final send = find.widgetWithText(ElevatedButton, 'Send verification code');

    await t.enterText(mobile, '12345');
    await t.enterText(emailF, 'agent@example.com');
    await t.tap(send);
    await t.pump(const Duration(milliseconds: 400));
    final mErr = find.text('Enter a valid 10-digit mobile number').evaluate().isNotEmpty;
    _result('AG-OTP-02', mErr, 'mobile "12345" → "Enter a valid 10-digit mobile number" shown=$mErr');

    final phone = '9${(Random().nextInt(900000000) + 100000000)}';
    final email = 'sim.agent.${DateTime.now().millisecondsSinceEpoch}@local.test';
    await t.enterText(mobile, phone);
    await t.enterText(emailF, 'abc@');
    await t.tap(send);
    await t.pump(const Duration(milliseconds: 400));
    final eErr = find.text('Enter a valid email address').evaluate().isNotEmpty;
    _result('AG-OTP-03', eErr, 'email "abc@" → "Enter a valid email address" shown=$eErr');

    await t.enterText(emailF, email);
    await t.tap(send);
    final otpStep = await _waitFor(t, find.textContaining('Enter the code sent to'));
    final code = await _otpFor(email);
    _result('AG-OTP-01', otpStep && code != null, 'valid mobile + email → code step shown=$otpStep; 5-digit code emailed=${code != null}');

    await t.enterText(find.byWidgetPredicate((w) => w is TextField && w.decoration?.hintText == '•••••'), code ?? '00000');
    await t.tap(find.widgetWithText(ElevatedButton, 'Verify & Continue'));
    final reg = await _waitFor(t, find.text('Agent Registration'), timeout: const Duration(seconds: 20));
    _result('AG-OTP-04', reg, 'correct code → Agent Registration form=$reg');
  });
}
