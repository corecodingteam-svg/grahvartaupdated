import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';
import '../../utils/weekly_schedule.dart';

/// Settings → Weekly schedule: the days and times the astrologer is usually
/// available. Users see these timings on the profile and, while the
/// astrologer is offline, when they will be back.
class WeeklyScheduleScreen extends StatefulWidget {
  const WeeklyScheduleScreen({super.key});
  @override
  State<WeeklyScheduleScreen> createState() => _WeeklyScheduleScreenState();
}

class _WeeklyScheduleScreenState extends State<WeeklyScheduleScreen> {
  final Map<int, List<TimeSlot>> _days = {for (var d = 0; d < 7; d++) d: []};
  bool _loading = true;
  bool _saving = false;
  bool _dirty = false;
  String? _error;

  // Monday first, Sunday last (how most people read a week)
  static const _order = [1, 2, 3, 4, 5, 6, 0];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final r = await ApiService.getSchedule();
      final s = WeeklySchedule.fromJson(r['data']);
      for (var d = 0; d < 7; d++) {
        _days[d] = List.of(s.slotsFor(d));
      }
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  void _snack(String m) => ScaffoldMessenger.of(context)
    ..hideCurrentSnackBar()
    ..showSnackBar(SnackBar(content: Text(m)));

  Future<int?> _pickTime(String help, int initialMinutes) async {
    final t = await showTimePicker(
      context: context,
      helpText: help,
      initialTime: TimeOfDay(hour: (initialMinutes ~/ 60) % 24, minute: initialMinutes % 60),
    );
    return t == null ? null : t.hour * 60 + t.minute;
  }

  Future<void> _addOrEdit(int day, [int? index]) async {
    final existing = index == null ? null : _days[day]![index];
    final lastEnd = _days[day]!.isEmpty ? 10 * 60 : _days[day]!.last.end;
    final start = await _pickTime('From', existing?.start ?? (index == null ? lastEnd.clamp(0, 22 * 60) : 0));
    if (start == null || !mounted) return;
    var end = await _pickTime('To', existing?.end ?? (start + 120).clamp(0, 23 * 60 + 59));
    if (end == null) return;
    if (end == 0) end = 24 * 60; // "12:00 AM" as the end means midnight
    if (end <= start) {
      _snack('The end time must be after the start time');
      return;
    }
    final slots = List.of(_days[day]!);
    if (index != null) slots.removeAt(index);
    final overlaps = slots.any((s) => start < s.end && end! > s.start);
    if (overlaps) {
      _snack('That overlaps another time on ${WeeklySchedule.dayNames[day]}');
      return;
    }
    slots.add(TimeSlot(start, end));
    slots.sort((a, b) => a.start.compareTo(b.start));
    setState(() {
      _days[day] = slots;
      _dirty = true;
    });
  }

  void _remove(int day, int index) => setState(() {
        _days[day]!.removeAt(index);
        _dirty = true;
      });

  void _copyToAll(int day) {
    setState(() {
      for (var d = 0; d < 7; d++) {
        _days[d] = List.of(_days[day]!);
      }
      _dirty = true;
    });
    _snack('${WeeklySchedule.dayNames[day]}\'s timings copied to every day');
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ApiService.updateSchedule(WeeklySchedule(_days).toJson());
      _dirty = false;
      _snack('Schedule saved. Users can now see your timings.');
    } catch (e) {
      _snack(e.toString());
    }
    if (mounted) setState(() => _saving = false);
  }

  Widget _dayCard(int day) {
    final slots = _days[day]!;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
      decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: context.clr.border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: Text(WeeklySchedule.dayNames[day], style: TextStyle(color: context.clr.txtPrimary, fontSize: 15, fontWeight: FontWeight.w600))),
          if (slots.isEmpty) Text('Not available', style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
          PopupMenuButton<String>(
            icon: Icon(Icons.more_vert_rounded, color: context.clr.txtMuted),
            onSelected: (v) {
              if (v == 'copy') _copyToAll(day);
              if (v == 'clear') setState(() { _days[day] = []; _dirty = true; });
            },
            itemBuilder: (_) => [
              if (slots.isNotEmpty) const PopupMenuItem(value: 'copy', child: Text('Copy to all days')),
              if (slots.isNotEmpty) const PopupMenuItem(value: 'clear', child: Text('Clear this day')),
              if (slots.isEmpty) const PopupMenuItem(enabled: false, value: '', child: Text('Add a time first')),
            ],
          ),
        ]),
        for (var i = 0; i < slots.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 6, right: 8),
            child: Material(
              color: context.clr.accent.withValues(alpha: 0.08),
              borderRadius: BorderRadius.circular(10),
              child: InkWell(
                borderRadius: BorderRadius.circular(10),
                onTap: () => _addOrEdit(day, i),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 4, 0, 4),
                  child: Row(children: [
                    Icon(Icons.schedule_rounded, size: 16, color: context.clr.accent),
                    const SizedBox(width: 8),
                    Expanded(child: Text(slots[i].text, style: TextStyle(color: context.clr.txtPrimary, fontSize: 14, fontWeight: FontWeight.w500))),
                    IconButton(
                      tooltip: 'Remove',
                      icon: Icon(Icons.close_rounded, size: 18, color: context.clr.txtMuted),
                      onPressed: () => _remove(day, i),
                    ),
                  ]),
                ),
              ),
            ),
          ),
        TextButton.icon(
          onPressed: slots.length >= 6 ? null : () => _addOrEdit(day),
          icon: const Icon(Icons.add_rounded, size: 18),
          label: Text(slots.isEmpty ? 'Add time' : 'Add another time'),
        ),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final preview = WeeklySchedule(_days).nextAvailableLabel();
    return PopScope(
      canPop: !_dirty,
      onPopInvokedWithResult: (didPop, _) async {
        if (didPop) return;
        final leave = await showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Discard changes?'),
            content: const Text('Your schedule changes are not saved yet.'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep editing')),
              TextButton(onPressed: () => Navigator.pop(ctx, true), child: Text('Discard', style: TextStyle(color: ctx.clr.error))),
            ],
          ),
        );
        if (leave == true && context.mounted) {
          setState(() => _dirty = false);
          Navigator.pop(context);
        }
      },
      child: Scaffold(
        appBar: AppBar(title: const Text('Weekly schedule')),
        bottomNavigationBar: _loading || _error != null
            ? null
            : SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  child: SizedBox(
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _saving || !_dirty ? null : _save,
                      child: Text(_saving ? 'Saving…' : _dirty ? 'Save schedule' : 'Saved'),
                    ),
                  ),
                ),
              ),
        body: _loading
            ? Center(child: CircularProgressIndicator(color: context.clr.accent))
            : _error != null
                ? Center(child: Padding(padding: const EdgeInsets.all(24), child: Text(_error!, textAlign: TextAlign.center)))
                : ListView(
                    padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
                    children: [
                      Container(
                        margin: const EdgeInsets.only(bottom: 14),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(color: context.clr.surfaceLight, borderRadius: BorderRadius.circular(14), border: Border.all(color: context.clr.border)),
                        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text('Set the times you are usually available (IST). Users see them on your profile, and while you are offline they see when you will be back.',
                              style: TextStyle(color: context.clr.txtSecondary, fontSize: 12.5, height: 1.4)),
                          const SizedBox(height: 6),
                          Text('You still go online with the Online switch — requests can only reach you while the app is connected.',
                              style: TextStyle(color: context.clr.txtMuted, fontSize: 12, height: 1.4)),
                          if (preview != null) ...[
                            const SizedBox(height: 8),
                            Text('Users will see: "$preview"', style: TextStyle(color: context.clr.accentAlt, fontSize: 12.5, fontWeight: FontWeight.w600)),
                          ],
                        ]),
                      ),
                      for (final d in _order) _dayCard(d),
                    ],
                  ),
      ),
    );
  }
}
