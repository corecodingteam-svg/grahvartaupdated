import 'dart:async';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme.dart';
import '../api_service.dart';
import '../device_id.dart';
import 'registration_screen.dart';
import 'dashboard_screen.dart';

/// First screen: mobile + email, verified with a 5-digit code sent to the email.
/// New agents continue to registration; returning agents (same mobile, email
/// and device) go straight to their dashboard.
class PhoneScreen extends StatefulWidget {
  const PhoneScreen({super.key});
  @override
  State<PhoneScreen> createState() => _PhoneScreenState();
}

class _PhoneScreenState extends State<PhoneScreen> {
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  String? _error;
  bool _sending = false;
  bool _verifying = false;
  bool _otpSent = false;
  String? _sentFor; // "<phone>|<email>" the code was sent for
  int _resendIn = 0;
  Timer? _timer;

  static final _emailRe = RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]{2,}$');
  String get _phone => '+91${_phoneCtrl.text.trim()}';
  String get _email => _emailCtrl.text.trim().toLowerCase();

  @override
  void dispose() {
    _timer?.cancel();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  String? _validate() {
    if (!RegExp(r'^[6-9]\d{9}$').hasMatch(_phoneCtrl.text.trim())) return 'Enter a valid 10-digit mobile number';
    if (!_emailRe.hasMatch(_email)) return 'Enter a valid email address';
    return null;
  }

  /// Changing the number or email after a code was sent means a new code is needed.
  void _onContactChanged(String _) {
    if (_otpSent && _sentFor != '$_phone|$_email') {
      _timer?.cancel();
      setState(() { _otpSent = false; _otpCtrl.clear(); _resendIn = 0; _error = null; });
    } else if (_error != null) {
      setState(() => _error = null);
    }
  }

  Future<void> _sendCode() async {
    final err = _validate();
    if (err != null) { setState(() => _error = err); return; }
    FocusScope.of(context).unfocus();
    setState(() { _sending = true; _error = null; });
    try {
      await ApiService.sendEmailOtp(email: _email, phone: _phone, deviceId: await DeviceId.get());
      if (!mounted) return;
      _otpCtrl.clear();
      setState(() { _otpSent = true; _sentFor = '$_phone|$_email'; });
      _startTimer();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  void _startTimer() {
    _timer?.cancel();
    setState(() => _resendIn = 60);
    _timer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) { t.cancel(); return; }
      setState(() => _resendIn--);
      if (_resendIn <= 0) t.cancel();
    });
  }

  Future<void> _verify() async {
    final otp = _otpCtrl.text.trim();
    if (!RegExp(r'^\d{5}$').hasMatch(otp)) { setState(() => _error = 'Enter the 5-digit code'); return; }
    if (_verifying) return;
    setState(() { _verifying = true; _error = null; });
    try {
      final result = await ApiService.verifyEmailOtp(email: _email, otp: otp);
      if (!mounted) return;
      if (result['mode'] == 'login') {
        final app = Map<String, dynamic>.from(result['application'] as Map);
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('agent_phone', _phone);
        await prefs.setString('agent_name', app['name'] as String? ?? '');
        await prefs.setString('agent_token', app['token_no'] as String? ?? '');
        if (!mounted) return;
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => DashboardScreen(phone: _phone)));
      } else {
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => RegistrationScreen(
          phone: _phone,
          email: _email,
          verificationToken: result['verification_token'] as String,
        )));
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _verifying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final busy = _sending || _verifying;
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 32),
              Image.asset('assets/images/logo_hiring.png', width: 120, height: 120),
              const SizedBox(height: 20),
              const Text('Grahvarta', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.primary)),
              const SizedBox(height: 6),
              const Text('Agent Onboarding', style: TextStyle(fontSize: 15, color: AppColors.textSecondary)),
              const SizedBox(height: 36),
              const Align(
                alignment: Alignment.centerLeft,
                child: Text('Enter your mobile number and email', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
              ),
              const SizedBox(height: 4),
              const Align(
                alignment: Alignment.centerLeft,
                child: Text('We will email you a 5-digit code to verify it\'s you', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                enabled: !busy,
                style: const TextStyle(color: AppColors.textPrimary),
                onChanged: _onContactChanged,
                decoration: const InputDecoration(
                  prefixText: '+91  ',
                  prefixStyle: TextStyle(color: AppColors.textSecondary),
                  labelText: 'Mobile Number',
                  prefixIcon: Icon(Icons.phone_android_outlined),
                  counterText: '',
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: _emailCtrl,
                keyboardType: TextInputType.emailAddress,
                autocorrect: false,
                enabled: !busy,
                style: const TextStyle(color: AppColors.textPrimary),
                onChanged: _onContactChanged,
                onSubmitted: (_) { if (!_otpSent) _sendCode(); },
                decoration: const InputDecoration(labelText: 'Email Address', prefixIcon: Icon(Icons.email_outlined)),
              ),
              if (_otpSent) ...[
                const SizedBox(height: 18),
                Align(
                  alignment: Alignment.centerLeft,
                  child: Text('Enter the code sent to $_email', style: const TextStyle(fontSize: 13, color: AppColors.textSecondary)),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _otpCtrl,
                  keyboardType: TextInputType.number,
                  maxLength: 5,
                  autofocus: true,
                  enabled: !_verifying,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 22, letterSpacing: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  onChanged: (v) { if (v.length == 5) _verify(); },
                  decoration: const InputDecoration(hintText: '•••••', counterText: ''),
                ),
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: (_resendIn > 0 || busy) ? null : _sendCode,
                    child: Text(_resendIn > 0 ? 'Resend code in ${_resendIn}s' : 'Resend code'),
                  ),
                ),
              ],
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: const TextStyle(color: AppColors.error, fontSize: 13), textAlign: TextAlign.center),
              ],
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: busy ? null : (_otpSent ? _verify : _sendCode),
                child: busy
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : Text(_otpSent ? 'Verify & Continue' : 'Send verification code'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
