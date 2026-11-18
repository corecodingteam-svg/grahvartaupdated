// Ringtones and vibration for incoming chat/call requests and new chat
// messages, chosen by the astrologer under Settings → Sounds & vibration.
// Choices are saved on the server (so push notifications on Android use the
// same ringtone through matching notification channels) and cached locally.
import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:just_audio/just_audio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:vibration/vibration.dart';

import 'api_service.dart';

class SoundOption {
  final String id;
  final String label;
  const SoundOption(this.id, this.label);
}

class SoundPref {
  final String sound;
  final bool vibrate;
  const SoundPref(this.sound, this.vibrate);
  SoundPref copyWith({String? sound, bool? vibrate}) => SoundPref(sound ?? this.sound, vibrate ?? this.vibrate);
  Map<String, dynamic> toJson() => {'sound': sound, 'vibrate': vibrate};
}

enum SoundCategory { chatRequest, callRequest, message }

extension SoundCategoryKey on SoundCategory {
  String get key => switch (this) {
        SoundCategory.chatRequest => 'chat_request',
        SoundCategory.callRequest => 'call_request',
        SoundCategory.message => 'message',
      };
}

class SoundService {
  SoundService._();
  static final SoundService instance = SoundService._();

  static const ringtones = [
    SoundOption('classic', 'Classic ring'),
    SoundOption('temple_bell', 'Temple bell'),
    SoundOption('soft_chime', 'Soft chime'),
    SoundOption('marimba', 'Marimba'),
    SoundOption('digital', 'Digital beep'),
    SoundOption('silent', 'Silent'),
  ];
  static const messageTones = [
    SoundOption('ding', 'Ding'),
    SoundOption('pop', 'Pop'),
    SoundOption('chime', 'Chime'),
    SoundOption('silent', 'Silent'),
  ];
  static const _defaults = {
    SoundCategory.chatRequest: SoundPref('classic', true),
    SoundCategory.callRequest: SoundPref('classic', true),
    SoundCategory.message: SoundPref('ding', true),
  };
  static const _cacheKey = 'astro_sound_prefs';

  final ValueNotifier<Map<SoundCategory, SoundPref>> prefs = ValueNotifier(Map.of(_defaults));
  final AudioPlayer _ring = AudioPlayer();
  final AudioPlayer _short = AudioPlayer();
  Timer? _vibeTimer;
  bool _ringing = false;

  SoundPref of(SoundCategory c) => prefs.value[c] ?? _defaults[c]!;

  Map<SoundCategory, SoundPref> _parse(Map<String, dynamic> m) => {
        for (final c in SoundCategory.values)
          c: m[c.key] is Map
              ? SoundPref((m[c.key]['sound'] ?? _defaults[c]!.sound) as String, (m[c.key]['vibrate'] ?? _defaults[c]!.vibrate) as bool)
              : _defaults[c]!,
      };

  Map<String, dynamic> _toJson(Map<SoundCategory, SoundPref> p) => {for (final e in p.entries) e.key.key: e.value.toJson()};

  /// Loads the cached choices, then refreshes from the server.
  Future<void> load() async {
    try {
      final sp = await SharedPreferences.getInstance();
      final cached = sp.getString(_cacheKey);
      if (cached != null) prefs.value = _parse(jsonDecode(cached) as Map<String, dynamic>);
    } catch (_) {}
    try {
      final r = await ApiService.getNotificationPrefs();
      final p = _parse(Map<String, dynamic>.from(r['data'] as Map));
      prefs.value = p;
      final sp = await SharedPreferences.getInstance();
      await sp.setString(_cacheKey, jsonEncode(_toJson(p)));
    } catch (_) {}
  }

  /// Saves one category's choice (locally at once, then on the server).
  Future<void> update(SoundCategory c, SoundPref p) async {
    final next = Map.of(prefs.value)..[c] = p;
    prefs.value = next;
    final sp = await SharedPreferences.getInstance();
    await sp.setString(_cacheKey, jsonEncode(_toJson(next)));
    await ApiService.updateNotificationPrefs(_toJson(next));
  }

  String _asset(String id) => 'assets/sounds/$id.mp3';

  Future<void> _startVibrating({bool loop = true}) async {
    try {
      if (!(await Vibration.hasVibrator())) return;
      Vibration.vibrate(pattern: [0, 600, 400, 600]);
      if (loop) {
        _vibeTimer?.cancel();
        _vibeTimer = Timer.periodic(const Duration(milliseconds: 2400), (_) {
          if (_ringing) Vibration.vibrate(pattern: [0, 600, 400, 600]);
        });
      }
    } catch (_) {}
  }

  /// Rings for an incoming request until [stopRinging]. [type] is 'chat', 'voice' or 'video'.
  Future<void> startRinging(String type) async {
    final p = of(type == 'chat' ? SoundCategory.chatRequest : SoundCategory.callRequest);
    _ringing = true;
    if (p.vibrate) _startVibrating();
    if (p.sound == 'silent') return;
    try {
      await _ring.setAsset(_asset(p.sound));
      await _ring.setLoopMode(LoopMode.one);
      await _ring.play();
    } catch (_) {}
  }

  Future<void> stopRinging() async {
    _ringing = false;
    _vibeTimer?.cancel();
    _vibeTimer = null;
    try {
      Vibration.cancel();
    } catch (_) {}
    try {
      await _ring.stop();
    } catch (_) {}
  }

  /// Short alert for a new chat message from the user.
  Future<void> playMessage() async {
    final p = of(SoundCategory.message);
    if (p.vibrate) {
      try {
        if (await Vibration.hasVibrator()) Vibration.vibrate(duration: 120);
      } catch (_) {}
    }
    if (p.sound == 'silent') return;
    try {
      await _short.setAsset(_asset(p.sound));
      await _short.setLoopMode(LoopMode.off);
      await _short.seek(Duration.zero);
      await _short.play();
    } catch (_) {}
  }

  /// Plays a sound once from the settings screen.
  Future<void> preview(String soundId, {bool vibrate = false}) async {
    await stopRinging();
    if (vibrate) _startVibrating(loop: false);
    if (soundId == 'silent') return;
    try {
      await _short.setAsset(_asset(soundId));
      await _short.setLoopMode(LoopMode.off);
      await _short.seek(Duration.zero);
      await _short.play();
      // Ringtones loop-length files can be long; stop previews after 3 s
      Future.delayed(const Duration(seconds: 3), () => _short.stop());
    } catch (_) {}
  }
}
