import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';
import '../theme/app_theme.dart';

/// Confirm, then block [userId] for this astrologer. A blocked user can no
/// longer reach the astrologer by chat, voice call, video call or live session.
/// Any session in progress with them is ended. Returns true when blocked.
Future<bool> confirmAndBlockUser(BuildContext context, {required String userId, required String userName}) async {
  final reasonCtrl = TextEditingController();
  final ok = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      backgroundColor: ctx.clr.card,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Text('Block $userName?', style: TextStyle(color: ctx.clr.txtPrimary)),
      content: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(
          'They will not be able to contact you by chat, voice call, video call or in your live sessions. '
          'Any session in progress with them will end. You can unblock them later from your profile.',
          style: TextStyle(color: ctx.clr.txtSecondary, fontSize: 13, height: 1.4),
        ),
        const SizedBox(height: 14),
        TextField(
          controller: reasonCtrl,
          maxLength: 200,
          decoration: const InputDecoration(labelText: 'Reason (optional, private)', counterText: ''),
        ),
      ]),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: Text('Cancel', style: TextStyle(color: ctx.clr.txtSecondary))),
        ElevatedButton(
          style: ElevatedButton.styleFrom(backgroundColor: ctx.clr.error),
          onPressed: () => Navigator.pop(ctx, true),
          child: const Text('Block'),
        ),
      ],
    ),
  );
  final reason = reasonCtrl.text.trim();
  reasonCtrl.dispose();
  if (ok != true) return false;

  try {
    final active = await ApiService.blockUser(userId, reason: reason);
    for (final id in active) {
      SocketService.instance.astrologerEndConsultation(id);
    }
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('$userName has been blocked'),
        backgroundColor: context.clr.success,
      ));
    }
    return true;
  } catch (e) {
    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not block: $e'), backgroundColor: context.clr.error));
    }
    return false;
  }
}
