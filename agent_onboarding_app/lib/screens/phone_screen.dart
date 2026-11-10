import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme.dart';
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

  Future<void> _continue() async {
    final digits = _phoneCtrl.text.trim();
    if (digits.length != 10 || !RegExp(r'^\d{10}$').hasMatch(digits)) {
      setState(() => _error = 'Enter a valid 10-digit mobile number');
      return;
    }
    final phone = '+91$digits';

    // If already registered, go to dashboard
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('agent_phone');
    if (!mounted) return;

    if (saved == phone) {
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => DashboardScreen(phone: phone)));
    } else {
      Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => RegistrationScreen(phone: phone)));
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
                onPressed: _continue,
                child: const Text('Continue'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
