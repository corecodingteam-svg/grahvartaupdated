import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// Thin, crash-safe wrapper around Firebase Analytics.
///
/// Every call is a no-op when Firebase failed to initialise (e.g. a build
/// without google-services.json / GoogleService-Info.plist), so analytics can
/// never take the app down. Call sites don't need to await anything.
class AnalyticsService {
  AnalyticsService._();
  static final AnalyticsService instance = AnalyticsService._();

  FirebaseAnalytics? _fa;

  /// Navigator observer that logs a `screen_view` for every page route.
  final AnalyticsRouteObserver observer = AnalyticsRouteObserver();

  /// Wallet top-up amounts keyed by order id, so `purchase` can report value.
  final Map<String, double> _pendingOrders = {};

  /// Call once, right after `Firebase.initializeApp()` succeeds.
  Future<void> init({String? app}) async {
    try {
      if (Firebase.apps.isEmpty) return;
      _fa = FirebaseAnalytics.instance;
      await _fa!.setAnalyticsCollectionEnabled(!kDebugMode || _debugCollection);
      if (app != null) await _fa!.setUserProperty(name: 'app_variant', value: app);
    } catch (e) {
      debugPrint('[Analytics] init failed (non-fatal): $e');
      _fa = null;
    }
  }

  /// Set `--dart-define=ANALYTICS_IN_DEBUG=true` to send events from debug builds.
  static const bool _debugCollection = bool.fromEnvironment('ANALYTICS_IN_DEBUG');

  void _run(String what, Future<void> Function(FirebaseAnalytics fa) fn) {
    final fa = _fa;
    if (fa == null) return;
    fn(fa).catchError((Object e) => debugPrint('[Analytics] $what failed: $e'));
  }

  // ── Identity ─────────────────────────────────────────────────
  void setUser({required String id, String? role}) => _run('setUser', (fa) async {
        await fa.setUserId(id: id);
        if (role != null) await fa.setUserProperty(name: 'user_role', value: role);
      });

  void clearUser() => _run('clearUser', (fa) async {
        await fa.setUserId(id: null);
        await fa.setUserProperty(name: 'user_role', value: null);
      });

  // ── Standard events ──────────────────────────────────────────
  void logLogin({String method = 'email'}) => _run('login', (fa) => fa.logLogin(loginMethod: method));

  void logSignUp({String method = 'email'}) => _run('sign_up', (fa) => fa.logSignUp(signUpMethod: method));

  void logScreen(String name) => _run('screen_view', (fa) => fa.logScreenView(screenName: name, screenClass: name));

  /// Wallet top-up started (Razorpay order created).
  void logBeginCheckout({required double amount, String? orderId}) {
    if (orderId != null) _pendingOrders[orderId] = amount;
    _run('begin_checkout', (fa) => fa.logBeginCheckout(value: amount, currency: 'INR'));
  }

  /// Wallet top-up verified and credited.
  void logPurchase({String? orderId, double? amount, String itemName = 'wallet_recharge'}) {
    final value = amount ?? (orderId != null ? _pendingOrders.remove(orderId) : null);
    _run('purchase', (fa) => fa.logPurchase(
          currency: 'INR',
          value: value,
          transactionId: orderId,
          items: [AnalyticsEventItem(itemName: itemName, itemCategory: 'wallet', price: value, quantity: 1)],
        ));
  }

  // ── Custom events ────────────────────────────────────────────
  /// Generic custom event. Names: snake_case, ≤40 chars. Param values must be
  /// String or num; anything else is stringified, nulls are dropped.
  void log(String name, [Map<String, Object?> params = const {}]) {
    final clean = <String, Object>{};
    params.forEach((k, v) {
      if (v == null) return;
      clean[k] = (v is num || v is String) ? v : v.toString();
    });
    _run(name, (fa) => fa.logEvent(name: name, parameters: clean.isEmpty ? null : clean));
  }
}

/// Logs a `screen_view` for every [PageRoute] push/replace/pop.
///
/// Most routes in this app are unnamed `MaterialPageRoute`s, so the screen
/// name falls back to the page widget's class name (e.g. `WalletScreen`).
class AnalyticsRouteObserver extends RouteObserver<PageRoute<dynamic>> {
  void _send(Route<dynamic>? route) {
    if (route is! PageRoute) return;
    final name = _screenName(route);
    if (name != null) AnalyticsService.instance.logScreen(name);
  }

  String? _screenName(PageRoute<dynamic> route) {
    final named = route.settings.name;
    if (named != null && named.isNotEmpty) return named == '/' ? 'Home' : named;
    try {
      final ctx = route.navigator?.context;
      if (ctx == null) return null;
      Widget? page;
      if (route is MaterialPageRoute) {
        page = route.builder(ctx);
      } else if (route is PageRouteBuilder) {
        page = route.pageBuilder(ctx, kAlwaysCompleteAnimation, kAlwaysDismissedAnimation);
      }
      return page?.runtimeType.toString();
    } catch (_) {
      return null;
    }
  }

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    _send(route);
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    _send(newRoute);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPop(route, previousRoute);
    if (route is PageRoute) _send(previousRoute);
  }
}

/// Firebase options for Flutter **web** builds only (Android/iOS read
/// google-services.json / GoogleService-Info.plist). Supply them at build time:
///   flutter build web --dart-define=FIREBASE_WEB_API_KEY=... \
///     --dart-define=FIREBASE_WEB_APP_ID=... --dart-define=FIREBASE_WEB_MEASUREMENT_ID=G-...
/// Returns null on mobile, or on web when not configured (init then fails
/// gracefully and analytics stays off).
FirebaseOptions? get firebaseWebOptions {
  if (!kIsWeb) return null;
  const apiKey = String.fromEnvironment('FIREBASE_WEB_API_KEY');
  const appId = String.fromEnvironment('FIREBASE_WEB_APP_ID');
  if (apiKey.isEmpty || appId.isEmpty) return null;
  return const FirebaseOptions(
    apiKey: apiKey,
    appId: appId,
    messagingSenderId: '84896359635',
    projectId: 'grahvarta-astrology',
    authDomain: 'grahvarta-astrology.firebaseapp.com',
    storageBucket: 'grahvarta-astrology.firebasestorage.app',
    measurementId: String.fromEnvironment('FIREBASE_WEB_MEASUREMENT_ID'),
  );
}
