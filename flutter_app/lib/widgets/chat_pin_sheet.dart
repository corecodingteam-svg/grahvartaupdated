import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../services/chat_crypto.dart';
import '../theme/app_theme.dart';

/// Makes sure this device holds the account's chat key before an encrypted
/// chat is opened: asks the user to create a chat PIN the first time, or to
/// enter it on a new device. Returns false if the user backs out.
Future<bool> ensureChatUnlocked(BuildContext context) async {
  ChatKeyStatus status;
  try {
    status = await ChatCrypto.instance.status();
  } catch (_) {
    // Key service unreachable (offline, or a server without encrypted chat):
    // carry on without end-to-end encryption. The server still refuses
    // unencrypted messages once both people have chat keys.
    return true;
  }
  if (status == ChatKeyStatus.ready) return true;
  if (!context.mounted) return false;
  final ok = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    isDismissible: false,
    enableDrag: false,
    backgroundColor: context.clr.surface,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
    builder: (_) => _ChatPinSheet(mode: status == ChatKeyStatus.needsSetup ? _Mode.create : _Mode.unlock),
  );
  return ok == true;
}

enum _Mode { create, unlock, reset }

class _ChatPinSheet extends StatefulWidget {
  final _Mode mode;
  const _ChatPinSheet({required this.mode});
  @override
  State<_ChatPinSheet> createState() => _ChatPinSheetState();
}

class _ChatPinSheetState extends State<_ChatPinSheet> {
  late _Mode _mode = widget.mode;
  final _pin = TextEditingController();
  final _confirm = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _pin.dispose();
    _confirm.dispose();
    super.dispose();
  }

  String get _title => switch (_mode) {
        _Mode.create => 'Set your chat PIN',
        _Mode.unlock => 'Enter your chat PIN',
        _Mode.reset => 'Set a new chat PIN',
      };

  String get _subtitle => switch (_mode) {
        _Mode.create =>
          'Your chats are end-to-end encrypted. This 6-digit PIN unlocks them on a new phone or on the website. We can\'t see it or recover it.',
        _Mode.unlock => 'Unlock your end-to-end encrypted chats on this device.',
        _Mode.reset => 'Chats sent before the reset can no longer be opened. New chats will work normally.',
      };

  Future<void> _submit() async {
    final pin = _pin.text.trim();
    if (!RegExp(r'^\d{6}$').hasMatch(pin)) {
      setState(() => _error = 'Enter 6 digits');
      return;
    }
    if (_mode != _Mode.unlock && pin != _confirm.text.trim()) {
      setState(() => _error = 'PINs don\'t match');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      switch (_mode) {
        case _Mode.create:
          await ChatCrypto.instance.setup(pin);
        case _Mode.reset:
          await ChatCrypto.instance.reset(pin);
        case _Mode.unlock:
          if (!await ChatCrypto.instance.unlock(pin)) {
            setState(() {
              _busy = false;
              _error = 'Wrong PIN. Try again.';
              _pin.clear();
            });
            return;
          }
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      setState(() {
        _busy = false;
        _error = e.toString();
      });
    }
  }

  Future<void> _forgot() async {
    final go = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ctx.clr.surface,
        title: Text('Reset chat PIN?', style: TextStyle(color: ctx.clr.txtPrimary)),
        content: Text(
          'Because your chats are end-to-end encrypted, nobody — including Grahvarta — can recover them without your PIN. '
          'If you reset it, your earlier chats will no longer be readable on any device.',
          style: TextStyle(color: ctx.clr.txtSecondary, height: 1.4),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Reset', style: TextStyle(color: ctx.clr.error)),
          ),
        ],
      ),
    );
    if (go == true) {
      setState(() {
        _mode = _Mode.reset;
        _error = null;
        _pin.clear();
        _confirm.clear();
      });
    }
  }

  Widget _field(TextEditingController c, String hint, {bool autofocus = false}) => TextField(
        controller: c,
        autofocus: autofocus,
        enabled: !_busy,
        obscureText: true,
        keyboardType: TextInputType.number,
        textAlign: TextAlign.center,
        maxLength: 6,
        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
        style: TextStyle(color: context.clr.txtPrimary, fontSize: 22, letterSpacing: 12, fontWeight: FontWeight.w600),
        decoration: InputDecoration(hintText: hint, counterText: '', hintStyle: TextStyle(color: context.clr.txtMuted, fontSize: 14, letterSpacing: 0)),
        onSubmitted: (_) => _submit(),
      );

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(24, 16, 24, MediaQuery.of(context).viewInsets.bottom + 24),
      child: SafeArea(
        top: false,
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Center(
            child: Container(width: 40, height: 4, decoration: BoxDecoration(color: context.clr.handle, borderRadius: BorderRadius.circular(2))),
          ),
          const SizedBox(height: 20),
          Center(
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: context.clr.accent.withValues(alpha: 0.12), shape: BoxShape.circle),
              child: Icon(Icons.lock_rounded, color: context.clr.accent, size: 28),
            ),
          ),
          const SizedBox(height: 14),
          Text(_title, textAlign: TextAlign.center, style: TextStyle(color: context.clr.txtPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(_subtitle, textAlign: TextAlign.center, style: TextStyle(color: context.clr.txtSecondary, fontSize: 13, height: 1.4)),
          const SizedBox(height: 20),
          _field(_pin, _mode == _Mode.unlock ? 'Chat PIN' : 'New 6-digit PIN', autofocus: true),
          if (_mode != _Mode.unlock) ...[const SizedBox(height: 12), _field(_confirm, 'Confirm PIN')],
          if (_error != null) ...[
            const SizedBox(height: 10),
            Text(_error!, textAlign: TextAlign.center, style: TextStyle(color: context.clr.error, fontSize: 13)),
          ],
          const SizedBox(height: 20),
          SizedBox(
            height: 50,
            child: ElevatedButton(
              onPressed: _busy ? null : _submit,
              child: _busy
                  ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: context.clr.onAccent, strokeWidth: 2))
                  : Text(_mode == _Mode.unlock ? 'Unlock chats' : 'Save PIN'),
            ),
          ),
          const SizedBox(height: 6),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            TextButton(onPressed: _busy ? null : () => Navigator.pop(context, false), child: const Text('Not now')),
            if (_mode == _Mode.unlock) TextButton(onPressed: _busy ? null : _forgot, child: const Text('Forgot PIN?')),
          ]),
        ]),
      ),
    );
  }
}
