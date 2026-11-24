import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'theme.dart';
import 'screens/phone_screen.dart';
import 'screens/dashboard_screen.dart';
import 'analytics_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  // Crash-guarded: the app works without Firebase (analytics just stays off).
  try {
    await Firebase.initializeApp(options: firebaseWebOptions);
    await AnalyticsService.instance.init(app: 'agent_onboarding');
  } catch (e) {
    debugPrint('Firebase init failed (non-fatal): $e');
  }
  runApp(const AgentOnboardingApp());
}

class AgentOnboardingApp extends StatelessWidget {
  const AgentOnboardingApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Agent Onboarding',
    debugShowCheckedModeBanner: false,
    theme: buildTheme(),
    navigatorObservers: [AnalyticsService.instance.observer],
    home: const _Splash(),
  );
}

class _Splash extends StatefulWidget {
  const _Splash();
  @override
  State<_Splash> createState() => _SplashState();
}

class _SplashState extends State<_Splash> {
  @override
  void initState() {
    super.initState();
    _decide();
  }

  Future<void> _decide() async {
    final prefs = await SharedPreferences.getInstance();
    final phone = prefs.getString('agent_phone');
    if (!mounted) return;
    Navigator.pushReplacement(
      context,
      MaterialPageRoute(
        builder: (_) => phone != null
            ? DashboardScreen(phone: phone)
            : const PhoneScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => const Scaffold(
    backgroundColor: AppColors.background,
    body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
  );
}
