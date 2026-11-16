import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

/// "Invite friends" — opens the system share sheet with an invite to the app.
class InviteShare {
  static const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.grahvarta.user';
  static const websiteUrl = 'https://grahvarta.com';

  static Future<void> share(BuildContext context, {String? inviterName}) async {
    final from = (inviterName != null && inviterName.trim().isNotEmpty) ? '${inviterName.trim().split(' ').first} has invited you to ' : 'Join me on ';
    final text = '${from}Grahvarta 🔮\n\n'
        'Talk to verified astrologers on chat, call or video, and get your daily horoscope, kundli and more.\n\n'
        'Download the app: $playStoreUrl\n'
        'Or visit: $websiteUrl';

    // iPad needs an anchor for the share popover
    final box = context.findRenderObject() as RenderBox?;
    final origin = box != null && box.hasSize ? box.localToGlobal(Offset.zero) & box.size : null;
    try {
      await SharePlus.instance.share(ShareParams(
        text: text,
        subject: 'Join me on Grahvarta',
        sharePositionOrigin: origin,
      ));
    } catch (_) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Could not open the share sheet')));
      }
    }
  }
}
