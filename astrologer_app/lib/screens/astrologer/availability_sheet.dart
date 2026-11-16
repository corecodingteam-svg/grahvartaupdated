import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

/// Bottom sheet: master Online/Offline switch plus separate on/off switches for
/// chat, voice call and video call. Users only see (and can start) the
/// consultation types that are switched on.
Future<void> showAvailabilitySheet(BuildContext context) {
  return showModalBottomSheet(
    context: context,
    backgroundColor: context.clr.card,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (_) => const _AvailabilitySheet(),
  );
}

class _AvailabilitySheet extends StatefulWidget {
  const _AvailabilitySheet();
  @override
  State<_AvailabilitySheet> createState() => _AvailabilitySheetState();
}

class _AvailabilitySheetState extends State<_AvailabilitySheet> {
  String? _saving; // which switch is saving

  Future<void> _update(String key, bool value) async {
    final auth = context.read<AuthProvider>();
    setState(() => _saving = key);
    try {
      await ApiService.updateChannelAvailability(
        online: key == 'online' ? value : null,
        chat: key == 'chat' ? value : null,
        call: key == 'call' ? value : null,
        video: key == 'video' ? value : null,
      );
      await auth.refreshAstrologerProfile();
    } catch (e) {
      if (mounted) {
        final msg = e.toString().replaceFirst('Exception: ', '');
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg), backgroundColor: context.clr.error));
      }
    } finally {
      if (mounted) setState(() => _saving = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final a = context.watch<AuthProvider>().astrologerProfile;
    if (a == null) return const SizedBox.shrink();
    final online = a.isAvailable;
    final noneOn = !a.isChatAvailable && !a.isCallAvailable && !a.isVideoAvailable;

    Widget row({required String key, required IconData icon, required String title, required String subtitle, required bool value, bool enabled = true, Color? color}) {
      final c = color ?? context.clr.accent;
      return Opacity(
        opacity: enabled ? 1 : 0.45,
        child: ListTile(
          contentPadding: EdgeInsets.zero,
          leading: Container(
            width: 42, height: 42,
            decoration: BoxDecoration(color: c.withValues(alpha: 0.15), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: c, size: 22),
          ),
          title: Text(title, style: TextStyle(color: context.clr.txtPrimary, fontWeight: FontWeight.w600)),
          subtitle: Text(subtitle, style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
          trailing: _saving == key
              ? SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: c))
              : Switch(
                  value: value,
                  activeThumbColor: c,
                  onChanged: (enabled && _saving == null) ? (v) => _update(key, v) : null,
                ),
        ),
      );
    }

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: context.clr.border, borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 16),
          Text('Availability', style: TextStyle(color: context.clr.txtPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text('Choose how users can reach you right now', style: TextStyle(color: context.clr.txtMuted, fontSize: 13)),
          const SizedBox(height: 12),
          row(
            key: 'online', icon: online ? Icons.wifi_tethering : Icons.wifi_tethering_off,
            title: online ? 'Online' : 'Offline',
            subtitle: online ? 'You are visible and can receive requests' : 'You will not receive any requests',
            value: online, color: context.clr.success,
          ),
          Divider(color: context.clr.border),
          row(key: 'chat', icon: Icons.chat_bubble_outline_rounded, title: 'Chat', subtitle: '₹${a.perMinuteRateChat.toInt()}/min', value: a.isChatAvailable, enabled: online),
          row(key: 'call', icon: Icons.call_outlined, title: 'Voice call', subtitle: '₹${a.perMinuteRateCall.toInt()}/min', value: a.isCallAvailable, enabled: online),
          row(key: 'video', icon: Icons.videocam_outlined, title: 'Video call', subtitle: '₹${a.perMinuteRateVideo.toInt()}/min', value: a.isVideoAvailable, enabled: online),
          if (online && noneOn)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text('All consultation types are off — users will see you as unavailable.', style: TextStyle(color: context.clr.error, fontSize: 12)),
            ),
        ]),
      ),
    );
  }
}
