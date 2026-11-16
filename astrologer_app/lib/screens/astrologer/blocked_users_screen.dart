import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

/// Users this astrologer has blocked, with unblock.
class BlockedUsersScreen extends StatefulWidget {
  const BlockedUsersScreen({super.key});

  @override
  State<BlockedUsersScreen> createState() => _BlockedUsersScreenState();
}

class _BlockedUsersScreenState extends State<BlockedUsersScreen> {
  List<Map<String, dynamic>> _users = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final users = await ApiService.getBlockedUsers();
      if (mounted) setState(() { _users = users; _loading = false; });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _unblock(Map<String, dynamic> u) async {
    final name = u['user_name']?.toString() ?? 'this user';
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: ctx.clr.card,
        title: Text('Unblock $name?', style: TextStyle(color: ctx.clr.txtPrimary)),
        content: Text('They will be able to request chats and calls with you again.', style: TextStyle(color: ctx.clr.txtSecondary)),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Unblock')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await ApiService.unblockUser(u['user_id'].toString());
      if (!mounted) return;
      setState(() => _users.removeWhere((x) => x['user_id'] == u['user_id']));
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$name has been unblocked')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not unblock: $e'), backgroundColor: context.clr.error));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(backgroundColor: context.clr.surface, title: const Text('Blocked users')),
      body: _loading
          ? Center(child: CircularProgressIndicator(color: context.clr.accent))
          : _users.isEmpty
              ? Center(child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Text(
                    'You have not blocked anyone.\nYou can block a user from a chat or from their conversation history.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: context.clr.txtMuted, height: 1.5),
                  ),
                ))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.separated(
                    itemCount: _users.length,
                    separatorBuilder: (_, __) => Divider(height: 1, color: context.clr.border),
                    itemBuilder: (_, i) {
                      final u = _users[i];
                      final name = u['user_name']?.toString() ?? 'User';
                      final blockedAt = DateTime.tryParse(u['created_at']?.toString() ?? '')?.toLocal();
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundColor: context.clr.error.withValues(alpha: 0.15),
                          child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?', style: TextStyle(color: context.clr.error, fontWeight: FontWeight.bold)),
                        ),
                        title: Text(name, style: TextStyle(color: context.clr.txtPrimary)),
                        subtitle: Text(
                          [
                            if (blockedAt != null) 'Blocked ${blockedAt.day}/${blockedAt.month}/${blockedAt.year}',
                            if ((u['reason']?.toString() ?? '').isNotEmpty) u['reason'].toString(),
                          ].join(' · '),
                          style: TextStyle(color: context.clr.txtMuted, fontSize: 12),
                        ),
                        trailing: TextButton(onPressed: () => _unblock(u), child: const Text('Unblock')),
                      );
                    },
                  ),
                ),
    );
  }
}
