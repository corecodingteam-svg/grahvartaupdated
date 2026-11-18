import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';

/// Asks for the microphone (and camera for video) before a call starts.
/// Returns true when everything needed is allowed. If the user refused
/// earlier, explains why and offers to open the app's settings.
Future<bool> ensureCallPermissions(BuildContext context, {required bool video}) async {
  final perms = [Permission.microphone, if (video) Permission.camera];
  final statuses = await perms.request();
  bool allowed(PermissionStatus s) => s.isGranted || s.isLimited;
  if (statuses.values.every(allowed)) return true;
  if (!context.mounted) return false;

  final missing = [
    if (!allowed(statuses[Permission.microphone]!)) 'microphone',
    if (video && !allowed(statuses[Permission.camera]!)) 'camera',
  ].join(' and ');
  // iOS asks only once; after a refusal the only way back is Settings.
  final needsSettings = statuses.values.any((s) => s.isPermanentlyDenied || s.isRestricted);

  final open = await showDialog<bool>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Text('Allow $missing access'),
      content: Text(
        video
            ? 'Video calls need your camera and microphone so the other person can see and hear you.'
            : 'Voice calls need your microphone so the other person can hear you.',
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Not now')),
        TextButton(
          onPressed: () => Navigator.pop(ctx, true),
          child: Text(needsSettings ? 'Open Settings' : 'Try again'),
        ),
      ],
    ),
  );
  if (open != true) return false;
  if (needsSettings) {
    await openAppSettings();
    return false; // they come back and start the call again
  }
  if (!context.mounted) return false;
  return ensureCallPermissions(context, video: video);
}
