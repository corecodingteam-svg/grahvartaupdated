import 'package:flutter/material.dart';
import '../../services/chat_tools_service.dart';
import '../../theme/app_theme.dart';

/// Settings → Welcome & remedies: the automatic welcome message and the list
/// of saved remedies that can be sent from the chat with one tap.
class ChatToolsScreen extends StatefulWidget {
  const ChatToolsScreen({super.key});
  @override
  State<ChatToolsScreen> createState() => _ChatToolsScreenState();
}

class _ChatToolsScreenState extends State<ChatToolsScreen> {
  final _svc = ChatToolsService.instance;
  final _welcome = TextEditingController();
  bool _enabled = false;
  bool _loading = true;
  bool _saving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _welcome.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final t = await _svc.load(force: true);
      _welcome.text = t.welcomeMessage;
      _enabled = t.welcomeEnabled;
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  void _snack(String m) => ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(m)));

  Future<void> _saveWelcome() async {
    setState(() => _saving = true);
    try {
      await _svc.saveWelcome(_enabled, _welcome.text.trim());
      _snack('Welcome message saved');
    } catch (e) {
      _snack(e.toString());
    }
    if (mounted) setState(() => _saving = false);
  }

  Future<void> _editRemedy([Remedy? r]) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: context.clr.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (_) => _RemedyEditor(remedy: r),
    );
    if (saved == true && mounted) {
      setState(() {});
      _snack(r == null ? 'Remedy added' : 'Remedy updated');
    }
  }

  Future<void> _delete(Remedy r) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete remedy?'),
        content: Text('"${r.title}" will be removed from your list.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text('Delete', style: TextStyle(color: ctx.clr.error))),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await _svc.deleteRemedy(r.id);
      if (mounted) setState(() {});
    } catch (e) {
      _snack(e.toString());
    }
  }

  Widget _card({required Widget child}) => Container(
        margin: const EdgeInsets.only(bottom: 16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: context.clr.border)),
        child: child,
      );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Welcome & remedies')),
      floatingActionButton: _loading || _error != null
          ? null
          : FloatingActionButton.extended(onPressed: () => _editRemedy(), icon: const Icon(Icons.add), label: const Text('Add remedy')),
      body: _loading
          ? Center(child: CircularProgressIndicator(color: context.clr.accent))
          : _error != null
              ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
              : ValueListenableBuilder(
                  valueListenable: _svc.tools,
                  builder: (_, tools, __) => ListView(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 96),
                    children: [
                      _card(
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Row(children: [
                            Icon(Icons.waving_hand_outlined, color: context.clr.accent),
                            const SizedBox(width: 10),
                            Expanded(child: Text('Welcome message', style: TextStyle(color: context.clr.txtPrimary, fontSize: 16, fontWeight: FontWeight.w600))),
                            Switch(value: _enabled, activeThumbColor: Colors.white, activeTrackColor: context.clr.accent, onChanged: (v) => setState(() => _enabled = v)),
                          ]),
                          Text('Sent to the user automatically as soon as a chat starts.',
                              style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
                          const SizedBox(height: 12),
                          TextField(
                            controller: _welcome,
                            maxLength: 1000,
                            minLines: 3,
                            maxLines: 6,
                            textCapitalization: TextCapitalization.sentences,
                            decoration: const InputDecoration(hintText: 'Namaste {name}! 🙏 Please share your date, time and place of birth.'),
                          ),
                          Text('Tip: {name} becomes the user\'s first name.', style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
                          const SizedBox(height: 12),
                          Align(
                            alignment: Alignment.centerRight,
                            child: ElevatedButton(onPressed: _saving ? null : _saveWelcome, child: Text(_saving ? 'Saving…' : 'Save')),
                          ),
                        ]),
                      ),
                      Padding(
                        padding: const EdgeInsets.only(left: 4, bottom: 8),
                        child: Text('Remedies (${tools.remedies.length})',
                            style: TextStyle(color: context.clr.txtSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
                      ),
                      if (tools.remedies.isEmpty)
                        _card(
                          child: Text(
                            'No remedies yet. Add the remedies you suggest often — in a chat, tap the remedy button to send one instantly.',
                            style: TextStyle(color: context.clr.txtMuted, height: 1.4),
                          ),
                        ),
                      ...tools.remedies.map((r) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: Material(
                              color: context.clr.card,
                              clipBehavior: Clip.antiAlias,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: context.clr.border)),
                              child: ListTile(
                              contentPadding: const EdgeInsets.fromLTRB(16, 6, 4, 6),
                              title: Text(r.title, style: TextStyle(color: context.clr.txtPrimary, fontWeight: FontWeight.w600)),
                              subtitle: Text(r.body, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
                              onTap: () => _editRemedy(r),
                              trailing: IconButton(icon: Icon(Icons.delete_outline_rounded, color: context.clr.error), onPressed: () => _delete(r)),
                            ),
                            ),
                          )),
                    ],
                  ),
                ),
    );
  }
}

/// Add / edit form for one remedy. Owns its text controllers, so they are
/// disposed only after the sheet has fully closed.
class _RemedyEditor extends StatefulWidget {
  final Remedy? remedy;
  const _RemedyEditor({this.remedy});
  @override
  State<_RemedyEditor> createState() => _RemedyEditorState();
}

class _RemedyEditorState extends State<_RemedyEditor> {
  late final _title = TextEditingController(text: widget.remedy?.title ?? '');
  late final _body = TextEditingController(text: widget.remedy?.body ?? '');
  bool _busy = false;
  String? _err;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    FocusScope.of(context).unfocus();
    setState(() {
      _busy = true;
      _err = null;
    });
    try {
      await ChatToolsService.instance.saveRemedy(id: widget.remedy?.id, title: _title.text.trim(), body: _body.text.trim());
      if (mounted) Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        setState(() {
          _busy = false;
          _err = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.viewInsetsOf(context).bottom + 20),
      child: SafeArea(
        top: false,
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Text(widget.remedy == null ? 'New remedy' : 'Edit remedy',
              style: TextStyle(color: context.clr.txtPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          TextField(
            controller: _title,
            enabled: !_busy,
            maxLength: 80,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(labelText: 'Title', hintText: 'e.g. Saturn remedy'),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _body,
            enabled: !_busy,
            maxLength: 1500,
            minLines: 4,
            maxLines: 8,
            textCapitalization: TextCapitalization.sentences,
            decoration: const InputDecoration(labelText: 'Remedy', hintText: 'What the user should do, when, and how often', alignLabelWithHint: true),
          ),
          if (_err != null) Text(_err!, style: TextStyle(color: context.clr.error, fontSize: 13)),
          const SizedBox(height: 12),
          SizedBox(height: 48, child: ElevatedButton(onPressed: _busy ? null : _save, child: Text(_busy ? 'Saving…' : 'Save remedy'))),
        ]),
      ),
    );
  }
}
