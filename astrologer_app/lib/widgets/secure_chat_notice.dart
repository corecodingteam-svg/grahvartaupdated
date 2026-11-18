import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

/// Small banner shown at the top of a consultation chat, telling both sides
/// that the conversation is private and sent over an encrypted connection.
class SecureChatNotice extends StatelessWidget {
  /// True when messages in this chat are end-to-end encrypted.
  final bool endToEnd;
  const SecureChatNotice({super.key, this.endToEnd = true});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 320),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: context.clr.surfaceLight,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: context.clr.border),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(Icons.lock_rounded, size: 14, color: context.clr.accentAlt),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                endToEnd
                    ? 'Messages are end-to-end encrypted. No one outside this chat, not even Grahvarta, can read them.'
                    : 'Your chats are secure and encrypted in transit. Your conversation stays private.',
                textAlign: TextAlign.center,
                style: TextStyle(color: context.clr.txtSecondary, fontSize: 11.5, height: 1.35),
              ),
            ),
          ]),
        ),
      ),
    );
  }
}
