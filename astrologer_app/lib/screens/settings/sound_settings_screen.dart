import 'package:flutter/material.dart';
import '../../services/sound_service.dart';
import '../../theme/app_theme.dart';

/// Settings → Sounds & vibration: ringtone and vibration for chat requests,
/// call requests and new chat messages.
class SoundSettingsScreen extends StatefulWidget {
  const SoundSettingsScreen({super.key});
  @override
  State<SoundSettingsScreen> createState() => _SoundSettingsScreenState();
}

class _SoundSettingsScreenState extends State<SoundSettingsScreen> {
  final _svc = SoundService.instance;

  @override
  void initState() {
    super.initState();
    _svc.load();
  }

  @override
  void dispose() {
    _svc.stopRinging();
    super.dispose();
  }

  Future<void> _set(SoundCategory c, SoundPref p) async {
    try {
      await _svc.update(c, p);
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not save: $e')));
    }
  }

  Widget _section(SoundCategory c, String title, String subtitle, IconData icon, List<SoundOption> options) {
    final p = _svc.of(c);
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.fromLTRB(16, 16, 8, 8),
      decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: context.clr.border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 40, height: 40,
            decoration: BoxDecoration(color: context.clr.accent.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: context.clr.accent, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: TextStyle(color: context.clr.txtPrimary, fontSize: 15, fontWeight: FontWeight.w600)),
            Text(subtitle, style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
          ])),
        ]),
        const SizedBox(height: 8),
        ...options.map((o) => InkWell(
              borderRadius: BorderRadius.circular(10),
              onTap: () {
                _set(c, p.copyWith(sound: o.id));
                _svc.preview(o.id);
              },
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(children: [
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: Icon(
                      p.sound == o.id ? Icons.radio_button_checked_rounded : Icons.radio_button_unchecked_rounded,
                      color: p.sound == o.id ? context.clr.accent : context.clr.txtMuted,
                      size: 22,
                    ),
                  ),
                  Expanded(child: Text(o.label, style: TextStyle(color: context.clr.txtPrimary, fontSize: 14))),
                  if (o.id != 'silent')
                    IconButton(
                      tooltip: 'Play',
                      icon: Icon(Icons.play_circle_outline_rounded, color: context.clr.accentAlt),
                      onPressed: () => _svc.preview(o.id),
                    ),
                ]),
              ),
            )),
        Divider(color: context.clr.divider, height: 16),
        SwitchListTile(
          contentPadding: const EdgeInsets.only(left: 4, right: 4),
          title: Text('Vibrate', style: TextStyle(color: context.clr.txtPrimary, fontSize: 14)),
          value: p.vibrate,
          activeThumbColor: context.clr.accent,
          onChanged: (v) {
            _set(c, p.copyWith(vibrate: v));
            if (v) _svc.preview('silent', vibrate: true);
          },
        ),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sounds & vibration')),
      body: ValueListenableBuilder(
        valueListenable: _svc.prefs,
        builder: (_, __, ___) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _section(SoundCategory.chatRequest, 'Chat requests', 'When a user asks to chat', Icons.chat_bubble_outline_rounded, SoundService.ringtones),
            _section(SoundCategory.callRequest, 'Call requests', 'Voice and video calls', Icons.call_outlined, SoundService.ringtones),
            _section(SoundCategory.message, 'New messages', 'Messages during a chat', Icons.mark_chat_unread_outlined, SoundService.messageTones),
            Text(
              'On Android, request notifications use the same ringtone even when the app is closed. '
              'Your phone\'s silent / Do Not Disturb mode still applies.',
              style: TextStyle(color: context.clr.txtMuted, fontSize: 12, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }
}
