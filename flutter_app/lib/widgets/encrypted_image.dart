import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../services/chat_crypto.dart';
import '../theme/app_theme.dart';

/// Shows a photo from an end-to-end encrypted chat. [payloadJson] is the
/// decrypted message payload ({u, k, n, m}); the file on the server is
/// ciphertext and is decrypted here on the device.
class EncryptedImage extends StatefulWidget {
  final String payloadJson;
  final double width;
  final double height;
  final BorderRadius borderRadius;
  const EncryptedImage({super.key, required this.payloadJson, this.width = 200, this.height = 160, required this.borderRadius});

  @override
  State<EncryptedImage> createState() => _EncryptedImageState();
}

class _EncryptedImageState extends State<EncryptedImage> {
  late final Future<Uint8List> _bytes =
      ChatCrypto.loadImage(Map<String, dynamic>.from(jsonDecode(widget.payloadJson) as Map));

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Uint8List>(
      future: _bytes,
      builder: (context, snap) {
        if (snap.hasError) {
          return Container(
            width: widget.width, height: 80,
            decoration: BoxDecoration(color: context.clr.card, borderRadius: widget.borderRadius),
            child: Icon(Icons.broken_image, color: context.clr.txtMuted),
          );
        }
        if (!snap.hasData) {
          return Container(
            width: widget.width, height: widget.height,
            decoration: BoxDecoration(color: context.clr.card, borderRadius: widget.borderRadius),
            child: Center(child: CircularProgressIndicator(strokeWidth: 2, color: context.clr.accent)),
          );
        }
        return GestureDetector(
          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => _FullscreenBytes(bytes: snap.data!))),
          child: ClipRRect(
            borderRadius: widget.borderRadius,
            child: Image.memory(snap.data!, width: widget.width, height: widget.height, fit: BoxFit.cover),
          ),
        );
      },
    );
  }
}

class _FullscreenBytes extends StatelessWidget {
  final Uint8List bytes;
  const _FullscreenBytes({required this.bytes});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: context.clr.mediaBg,
      appBar: AppBar(backgroundColor: context.clr.mediaBg, iconTheme: IconThemeData(color: context.clr.onMedia)),
      body: Center(child: InteractiveViewer(child: Image.memory(bytes))),
    );
  }
}
