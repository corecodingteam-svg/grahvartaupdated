import 'dart:io';
import 'dart:math';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Stable per-device identifier used to enforce "one registration per device".
///
/// * Android: Settings.Secure.ANDROID_ID via a platform channel (MainActivity.kt) —
///   survives uninstall/reinstall of the app.
/// * iOS (and Android fallback): a random UUID kept in the Keychain /
///   secure storage — on iOS the Keychain also survives reinstalls.
class DeviceId {
  static const _channel = MethodChannel('grahvarta/device');
  static const _storage = FlutterSecureStorage();
  static const _key = 'grahvarta_device_id';
  static String? _cached;

  static String get platform => Platform.isIOS ? 'ios' : Platform.isAndroid ? 'android' : Platform.operatingSystem;

  static Future<String> get() async {
    if (_cached != null) return _cached!;
    if (Platform.isAndroid) {
      try {
        final id = await _channel.invokeMethod<String>('getDeviceId');
        if (id != null && id.isNotEmpty) return _cached = 'android:$id';
      } catch (_) {/* fall through to stored id */}
    }
    try {
      final existing = await _storage.read(key: _key);
      if (existing != null && existing.isNotEmpty) return _cached = existing;
      final generated = '$platform:${_uuid()}';
      await _storage.write(key: _key, value: generated);
      return _cached = generated;
    } catch (_) {
      return _cached = '$platform:${_uuid()}';
    }
  }

  static String _uuid() {
    final r = Random.secure();
    final b = List<int>.generate(16, (_) => r.nextInt(256));
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    final h = b.map((x) => x.toRadixString(16).padLeft(2, '0')).join();
    return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}';
  }
}
