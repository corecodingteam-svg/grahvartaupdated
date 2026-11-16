import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme.dart';
import '../api_service.dart';
import '../device_id.dart';
import 'registration_screen.dart';
import 'dashboard_screen.dart';

class PhoneScreen extends StatefulWidget {
  const PhoneScreen({super.key});
  @override
  State<PhoneScreen> createState() => _PhoneScreenState();
}

class _PhoneScreenState extends State<PhoneScreen> {
  final _phoneCtrl = TextEditingController();
  String? _error;
  bool _checking = false;

  Future<void> _continue() async {
    final digits = _phoneCtrl.text.trim();
    if (digits.length != 10 || !RegExp(r'^[6-9]\d{9}$').hasMatch(digits)) {
      setState(() => _error = 'Enter a valid 10-digit mobile number');
      return;
    }
    final phone = '+91$digits';

    // If already registered on this phone, go to dashboard
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('agent_phone');
    if (!mounted) return;
    if (saved == phone) {
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => DashboardScreen(phone: phone)));
      return;
    }

    // Otherwise ask the server: an existing application can only be opened from
    // the device it was registered on (also restores access after a reinstall).
    setState(() { _checking = true; _error = null; });
    try {
      final deviceId = await DeviceId.get();
      final existing = await ApiService.getApplicationStatus(phone, deviceId: deviceId);
      if (!mounted) return;
      if (existing == null) {
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => RegistrationScreen(phone: phone)));
      } else if (existing['device_match'] == false) {
        setState(() => _error = 'This number was registered from a different device. Please use that device to check your application.');
      } else {
        await prefs.setString('agent_phone', phone);
        await prefs.setString('agent_name', existing['name'] as String? ?? '');
        await prefs.setString('agent_token', existing['token_no'] as String? ?? '');
        if (!mounted) return;
        Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => DashboardScreen(phone: phone)));
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  @override
  void dispose() { _phoneCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const SizedBox(height: 40),
              Image.asset('assets/images/logo_hiring.png', width: 132, height: 132),
              const SizedBox(height: 24),
              const Text('Grahvarta', style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: AppColors.primary)),
              const SizedBox(height: 6),
              const Text('Agent Onboarding', style: TextStyle(fontSize: 15, color: AppColors.textSecondary)),
              const SizedBox(height: 48),
              const Align(
                alignment: Alignment.centerLeft,
                child: Text('Enter your mobile number', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _phoneCtrl,
                keyboardType: TextInputType.phone,
                maxLength: 10,
                style: const TextStyle(color: AppColors.textPrimary),
                onSubmitted: (_) => _continue(),
                decoration: InputDecoration(
                  prefixText: '+91  ',
                  prefixStyle: TextStyle(color: AppColors.textSecondary),
                  labelText: 'Mobile Number',
                  counterText: '',
                ),
              ),
              if (_error != null) ...[
                const SizedBox(height: 8),
                Text(_error!, style: const TextStyle(color: AppColors.error, fontSize: 13)),
              ],
              const SizedBox(height: 28),
              ElevatedButton(
                onPressed: _checking ? null : _continue,
                child: _checking
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Continue'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
