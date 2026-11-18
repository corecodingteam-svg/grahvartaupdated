import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../services/api_service.dart';
import '../../theme/app_theme.dart';

/// Performance dashboard: requests, answers, declines, missed requests, call
/// drops, talk time, chat messages and reply speed for the last 7/30/90 days.
class PerformanceScreen extends StatefulWidget {
  const PerformanceScreen({super.key});
  @override
  State<PerformanceScreen> createState() => _PerformanceScreenState();
}

class _PerformanceScreenState extends State<PerformanceScreen> {
  int _days = 30;
  Map<String, dynamic>? _data;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final r = await ApiService.getPerformance(_days);
      _data = Map<String, dynamic>.from(r['data'] as Map);
    } catch (e) {
      _error = e.toString();
    }
    if (mounted) setState(() => _loading = false);
  }

  // ── formatting ──
  static String dur(num? s) {
    if (s == null) return '—';
    final v = s.round();
    if (v < 60) return '${v}s';
    final h = v ~/ 3600, m = (v % 3600) ~/ 60, sec = v % 60;
    if (h > 0) return '${h}h ${m.toString().padLeft(2, '0')}m';
    return sec == 0 ? '${m}m' : '${m}m ${sec}s';
  }

  static String money(num? v) {
    final x = (v ?? 0).toDouble();
    return x == x.roundToDouble() ? '₹${x.toInt()}' : '₹${x.toStringAsFixed(2)}';
  }

  Color _outcomeColor(String o) => switch (o) {
        'completed' => context.clr.success,
        'dropped' => context.clr.error,
        'declined' => context.clr.accentAlt,
        'missed' => context.clr.txtMuted,
        _ => context.clr.accent,
      };

  static const _outcomeLabel = {
    'completed': 'Completed',
    'dropped': 'Dropped',
    'declined': 'Declined',
    'missed': 'Missed',
  };

  static const _reasonLabel = {
    'ended': 'Ended normally',
    'declined': 'You declined',
    'cancelled': 'User cancelled while waiting',
    'superseded': 'User went to another astrologer',
    'blocked': 'User blocked',
    'inactivity': 'Ended after 5 min inactivity',
    'insufficient_balance': 'User ran out of balance',
    'astrologer_disconnected': 'Dropped — your connection',
    'user_disconnected': 'Dropped — user\'s connection',
    'missed': 'Missed',
    'not_recorded': 'Before tracking started',
  };

  Widget _card({required Widget child, EdgeInsets? padding}) => Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: padding ?? const EdgeInsets.all(16),
        decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: context.clr.border)),
        child: child,
      );

  Widget _title(String t, [String? sub]) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(t, style: TextStyle(color: context.clr.txtPrimary, fontSize: 15, fontWeight: FontWeight.w700)),
          if (sub != null) Text(sub, style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
        ]),
      );

  Widget _kpi(String label, String value, IconData icon, {String? hint}) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(14), border: Border.all(color: context.clr.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Icon(icon, size: 16, color: context.clr.accent),
            const SizedBox(width: 6),
            Expanded(child: Text(label, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: context.clr.txtMuted, fontSize: 12))),
          ]),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(color: context.clr.txtPrimary, fontSize: 20, fontWeight: FontWeight.bold)),
          if (hint != null) Text(hint, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(color: context.clr.txtMuted, fontSize: 11)),
        ]),
      );

  // ── scorecard ──

  Color _bandColor(String? band) => switch (band) {
        'excellent' => context.clr.success,
        'average' => context.clr.accentAlt,
        'poor' => context.clr.error,
        _ => context.clr.txtMuted,
      };

  IconData _bandIcon(String? band) => switch (band) {
        'excellent' => Icons.sentiment_very_satisfied_rounded,
        'average' => Icons.sentiment_neutral_rounded,
        'poor' => Icons.sentiment_dissatisfied_rounded,
        _ => Icons.remove_rounded,
      };

  String _bandLabel(String? band) => switch (band) {
        'excellent' => 'Excellent',
        'average' => 'Average',
        'poor' => 'Poor',
        _ => 'No data',
      };

  void _showInfo(Map row) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(row['label'] as String),
        content: Text(row['info'] as String, style: TextStyle(color: ctx.clr.txtSecondary, height: 1.45)),
        actions: [TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK'))],
      ),
    );
  }

  Widget _scorecard(List rows) {
    final rated = rows.where((r) => r['rating'] != null).toList();
    final excellent = rated.where((r) => r['rating'] == 'excellent').length;
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: context.clr.border)),
      clipBehavior: Clip.antiAlias,
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: Row(children: [
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Scorecard', style: TextStyle(color: context.clr.txtPrimary, fontSize: 17, fontWeight: FontWeight.w700)),
              Text(rated.isEmpty ? 'Scores appear once you have consultations' : '$excellent of ${rated.length} indicators excellent',
                  style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
            ])),
            Text('Last $_days days', style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
          ]),
        ),
        Container(
          color: context.clr.surfaceLight,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(children: [
            Expanded(child: Text('Indicator', style: TextStyle(color: context.clr.txtSecondary, fontSize: 12, fontWeight: FontWeight.w600))),
            SizedBox(width: 72, child: Text('Score', textAlign: TextAlign.center, style: TextStyle(color: context.clr.txtSecondary, fontSize: 12, fontWeight: FontWeight.w600))),
            SizedBox(width: 128, child: Text('Rating', style: TextStyle(color: context.clr.txtSecondary, fontSize: 12, fontWeight: FontWeight.w600))),
          ]),
        ),
        for (var i = 0; i < rows.length; i++) _scoreRow(rows[i] as Map, last: i == rows.length - 1),
      ]),
    );
  }

  Widget _scoreRow(Map r, {bool last = false}) {
    final band = r['rating'] as String?;
    final color = _bandColor(band);
    final value = r['value'];
    final unit = r['unit'] as String;
    final shown = value == null ? 'NA' : (value is num && value == value.roundToDouble() ? '${value.toInt()}' : '$value');
    return InkWell(
      onTap: () => _showInfo(r),
      child: Container(
        padding: const EdgeInsets.fromLTRB(16, 10, 6, 10),
        decoration: BoxDecoration(border: last ? null : Border(bottom: BorderSide(color: context.clr.divider))),
        child: Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(r['label'] as String, style: TextStyle(color: context.clr.txtPrimary, fontSize: 14, fontWeight: FontWeight.w600)),
            Text(unit == '★' && (r['count'] ?? 0) > 0 ? '${r['count']} reviews' : unit == '★' ? 'stars' : unit,
                style: TextStyle(color: context.clr.txtMuted, fontSize: 11)),
          ])),
          Container(
            width: 64,
            margin: const EdgeInsets.only(right: 8),
            padding: const EdgeInsets.symmetric(vertical: 6),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(8)),
            child: Text(shown, textAlign: TextAlign.center, style: TextStyle(color: band == null ? context.clr.txtMuted : color, fontWeight: FontWeight.w700, fontSize: 14)),
          ),
          SizedBox(
            width: 92,
            child: Row(children: [
              Icon(_bandIcon(band), size: 18, color: color),
              const SizedBox(width: 4),
              Flexible(child: Text(_bandLabel(band), overflow: TextOverflow.ellipsis, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600))),
            ]),
          ),
          Icon(Icons.info_outline_rounded, size: 18, color: context.clr.txtMuted),
          const SizedBox(width: 10),
        ]),
      ),
    );
  }

  Widget _impactNote() => _card(
        child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Icon(Icons.trending_up_rounded, color: context.clr.accent),
          const SizedBox(width: 10),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Performance impacts income', style: TextStyle(color: context.clr.txtPrimary, fontWeight: FontWeight.w700)),
            const SizedBox(height: 4),
            Text(
              'Users see your rating and whether you are online, and they come back to astrologers who answer quickly. '
              'Keeping these indicators Excellent brings more consultations and more repeat users. Tap any row to see how it is measured.',
              style: TextStyle(color: context.clr.txtSecondary, fontSize: 12.5, height: 1.45),
            ),
          ])),
        ]),
      );

  // ── sections ──

  Widget _kpis(Map s) {
    final items = [
      _kpi('Requests', '${s['requests']}', Icons.notifications_active_outlined, hint: '${s['sessions']} answered'),
      _kpi('Acceptance', '${s['acceptance_rate']}%', Icons.check_circle_outline, hint: '${s['declined']} declined · ${s['missed']} missed'),
      _kpi('Talk time', dur(s['total_seconds']), Icons.timer_outlined, hint: 'avg ${dur(s['avg_session_seconds'])} / session'),
      _kpi('Call drops', '${s['dropped']}', Icons.signal_cellular_connected_no_internet_4_bar_outlined, hint: '${s['drop_rate']}% of sessions'),
      _kpi('Answer time', dur(s['avg_answer_seconds']), Icons.bolt_outlined, hint: 'request → accept'),
      _kpi('Earnings', money(s['earned']), Icons.currency_rupee_rounded, hint: '${s['unique_users']} users · ${s['repeat_users']} repeat'),
      _kpi('Short sessions', '${s['short_sessions']}', Icons.hourglass_bottom_rounded, hint: 'under 1 minute'),
      _kpi('Rating', s['rating_avg'] == null ? '—' : '${s['rating_avg']} ★', Icons.star_outline_rounded, hint: '${s['rating_count']} reviews'),
    ];
    return LayoutBuilder(builder: (_, c) {
      final w = (c.maxWidth - 10) / 2;
      return Wrap(spacing: 10, runSpacing: 10, children: items.map((e) => SizedBox(width: w, child: e)).toList());
    });
  }

  Widget _outcomes(Map s) {
    final keys = ['completed', 'dropped', 'declined', 'missed'];
    final total = keys.fold<int>(0, (a, k) => a + (s[k] as int));
    return _card(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _title('Request outcomes', '$total finished requests'),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: SizedBox(
            height: 14,
            child: total == 0
                ? Container(color: context.clr.divider)
                : Row(children: [
                    for (final k in keys)
                      if ((s[k] as int) > 0) Expanded(flex: s[k] as int, child: Container(color: _outcomeColor(k))),
                  ]),
          ),
        ),
        const SizedBox(height: 12),
        for (final k in keys)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(children: [
              Container(width: 10, height: 10, decoration: BoxDecoration(color: _outcomeColor(k), shape: BoxShape.circle)),
              const SizedBox(width: 8),
              Expanded(child: Text(_outcomeLabel[k]!, style: TextStyle(color: context.clr.txtSecondary, fontSize: 13))),
              Text('${s[k]}', style: TextStyle(color: context.clr.txtPrimary, fontWeight: FontWeight.w600)),
              SizedBox(
                width: 54,
                child: Text(total == 0 ? '' : '${((s[k] as int) * 100 / total).toStringAsFixed(0)}%',
                    textAlign: TextAlign.right, style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
              ),
            ]),
          ),
        if ((s['waiting'] as int) > 0)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text('${s['waiting']} waiting or in progress right now', style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
          ),
      ]),
    );
  }

  Widget _byType(Map types) {
    const order = ['chat', 'voice', 'video'];
    const names = {'chat': 'Chat', 'voice': 'Voice call', 'video': 'Video call'};
    const icons = {'chat': Icons.chat_bubble_outline_rounded, 'voice': Icons.call_outlined, 'video': Icons.videocam_outlined};
    final present = order.where((t) => types[t] != null).toList();
    return _card(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _title('By consultation type'),
        if (present.isEmpty) Text('No consultations in this period.', style: TextStyle(color: context.clr.txtMuted)),
        for (final t in present) ...[
          Row(children: [
            Icon(icons[t], size: 18, color: context.clr.accent),
            const SizedBox(width: 8),
            Expanded(child: Text(names[t]!, style: TextStyle(color: context.clr.txtPrimary, fontWeight: FontWeight.w600))),
            Text(money(types[t]['earned']), style: TextStyle(color: context.clr.success, fontWeight: FontWeight.w600)),
          ]),
          const SizedBox(height: 8),
          Wrap(spacing: 14, runSpacing: 6, children: [
            _mini('Requests', '${types[t]['requests']}'),
            _mini('Sessions', '${types[t]['sessions']}'),
            _mini('Time', dur(types[t]['seconds'])),
            _mini('Avg', dur(types[t]['avg_seconds'])),
            _mini('Declined', '${types[t]['declined']}'),
            _mini('Missed', '${types[t]['missed']}'),
            _mini('Drops', '${types[t]['dropped']}'),
          ]),
          if (t != present.last) Divider(height: 24, color: context.clr.divider),
        ],
      ]),
    );
  }

  Widget _mini(String k, String v) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(v, style: TextStyle(color: context.clr.txtPrimary, fontWeight: FontWeight.w600, fontSize: 14)),
        Text(k, style: TextStyle(color: context.clr.txtMuted, fontSize: 11)),
      ]);

  Widget _daily(List daily) {
    final keys = ['completed', 'dropped', 'declined', 'missed'];
    final maxReq = daily.fold<int>(1, (m, d) => math.max(m, d['requests'] as int));
    final labelEvery = daily.length <= 7 ? 1 : daily.length <= 30 ? 5 : 15;
    return _card(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _title('Requests per day', 'Coloured by outcome'),
        SizedBox(
          height: 150,
          child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
            for (var i = 0; i < daily.length; i++)
              Expanded(
                child: Padding(
                  padding: EdgeInsets.symmetric(horizontal: daily.length > 40 ? 0.5 : 2),
                  child: Column(mainAxisAlignment: MainAxisAlignment.end, children: [
                    for (final k in keys.reversed)
                      if ((daily[i][k] as int) > 0)
                        Container(height: 120 * (daily[i][k] as int) / maxReq, color: _outcomeColor(k)),
                    if ((daily[i]['requests'] as int) == 0) Container(height: 2, color: context.clr.divider),
                  ]),
                ),
              ),
          ]),
        ),
        const SizedBox(height: 6),
        Row(children: [
          for (var i = 0; i < daily.length; i++)
            Expanded(
              child: (i % labelEvery == 0 || i == daily.length - 1) && !(i != daily.length - 1 && daily.length - 1 - i < labelEvery ~/ 2)
                  ? Text(DateFormat('d MMM').format(DateTime.parse(daily[i]['day'] as String)),
                      maxLines: 1, overflow: TextOverflow.visible, softWrap: false, style: TextStyle(color: context.clr.txtMuted, fontSize: 9))
                  : const SizedBox.shrink(),
            ),
        ]),
        const SizedBox(height: 10),
        Wrap(spacing: 12, runSpacing: 4, children: [
          for (final k in keys)
            Row(mainAxisSize: MainAxisSize.min, children: [
              Container(width: 8, height: 8, decoration: BoxDecoration(color: _outcomeColor(k), borderRadius: BorderRadius.circular(2))),
              const SizedBox(width: 4),
              Text(_outcomeLabel[k]!, style: TextStyle(color: context.clr.txtMuted, fontSize: 11)),
            ]),
        ]),
      ]),
    );
  }

  Widget _hours(List hours) {
    final maxReq = hours.fold<int>(1, (m, h) => math.max(m, h['requests'] as int));
    final busiest = hours.reduce((a, b) => (b['requests'] as int) > (a['requests'] as int) ? b : a);
    String hourLabel(int h) => DateFormat('h a').format(DateTime(2000, 1, 1, h));
    return _card(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        _title('Busiest hours',
            (busiest['requests'] as int) == 0 ? 'No requests yet' : 'Most requests around ${hourLabel(busiest['hour'] as int)}'),
        SizedBox(
          height: 90,
          child: Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
            for (final h in hours)
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 1.5),
                  child: Stack(alignment: Alignment.bottomCenter, children: [
                    Container(height: math.max(2, 80 * (h['requests'] as int) / maxReq), color: context.clr.accent.withValues(alpha: 0.25)),
                    Container(height: 80 * (h['accepted'] as int) / maxReq, color: context.clr.accent),
                  ]),
                ),
              ),
          ]),
        ),
        const SizedBox(height: 4),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          for (final h in const [0, 6, 12, 18, 23]) Text(hourLabel(h), style: TextStyle(color: context.clr.txtMuted, fontSize: 9)),
        ]),
        const SizedBox(height: 8),
        Text('Light = requests, dark = answered', style: TextStyle(color: context.clr.txtMuted, fontSize: 11)),
      ]),
    );
  }

  Widget _messages(Map m) => _card(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _title('Chat messages'),
          Wrap(spacing: 22, runSpacing: 10, children: [
            _mini('Sent by you', '${m['sent']}'),
            _mini('From users', '${m['received']}'),
            _mini('Chats', '${m['chats']}'),
            _mini('First reply (avg)', dur(m['first_reply_avg_seconds'])),
            _mini('First reply (median)', dur(m['first_reply_median_seconds'])),
          ]),
        ]),
      );

  Widget _reasons(List reasons) => _card(
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _title('Why consultations ended'),
          if (reasons.isEmpty) Text('Nothing yet.', style: TextStyle(color: context.clr.txtMuted)),
          for (final r in reasons)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(children: [
                Expanded(child: Text(_reasonLabel[r['reason']] ?? r['reason'].toString(), style: TextStyle(color: context.clr.txtSecondary, fontSize: 13))),
                Text('${r['n']}', style: TextStyle(color: context.clr.txtPrimary, fontWeight: FontWeight.w600)),
              ]),
            ),
        ]),
      );

  Widget _recent(List recent) => _card(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 6),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _title('Recent requests'),
          if (recent.isEmpty) Padding(padding: const EdgeInsets.only(bottom: 10), child: Text('No requests in this period.', style: TextStyle(color: context.clr.txtMuted))),
          for (final c in recent) _recentRow(c),
        ]),
      );

  Widget _recentRow(Map c) {
    final outcome = c['outcome'] as String;
    final type = c['type'] as String;
    final when = DateTime.tryParse(c['created_at'].toString())?.toLocal();
    final icon = type == 'chat' ? Icons.chat_bubble_outline_rounded : type == 'voice' ? Icons.call_outlined : Icons.videocam_outlined;
    final color = _outcomeColor(outcome);
    final details = [
      if ((c['seconds'] as num? ?? 0) > 0) dur(c['seconds'] as num),
      if (type == 'chat' && (c['messages'] as int? ?? 0) > 0) '${c['messages']} msgs',
      if ((c['earned'] as num? ?? 0) > 0) money(c['earned'] as num),
      if (c['end_reason'] != null) (_reasonLabel[c['end_reason']] ?? c['end_reason']).toString(),
    ].join(' · ');
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(color: context.clr.accent.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
          child: Icon(icon, size: 18, color: context.clr.accent),
        ),
        const SizedBox(width: 10),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${c['user_name']}${when == null ? '' : ' · ${DateFormat('d MMM, h:mm a').format(when)}'}',
              style: TextStyle(color: context.clr.txtPrimary, fontSize: 13, fontWeight: FontWeight.w600)),
          if (details.isNotEmpty) Text(details, maxLines: 2, style: TextStyle(color: context.clr.txtMuted, fontSize: 11)),
        ])),
        const SizedBox(width: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(color: color.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(20)),
          child: Text(_outcomeLabel[outcome] ?? (outcome == 'in_progress' ? 'Live' : 'Waiting'),
              style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
        ),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final d = _data;
    return Scaffold(
      appBar: AppBar(title: const Text('Performance')),
      body: RefreshIndicator(
        onRefresh: _load,
        color: context.clr.accent,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          children: [
            Row(children: [
              for (final n in const [7, 30, 90])
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    label: Text('$n days'),
                    selected: _days == n,
                    // Solid when selected: white text on the accent colour, no tick
                    showCheckmark: false,
                    selectedColor: context.clr.accent,
                    labelStyle: TextStyle(
                      color: _days == n ? Colors.white : context.clr.txtSecondary,
                      fontWeight: _days == n ? FontWeight.w600 : FontWeight.normal,
                    ),
                    side: BorderSide(color: _days == n ? context.clr.accent : context.clr.border),
                    onSelected: (_) {
                      if (_days == n) return;
                      _days = n;
                      _load();
                    },
                  ),
                ),
            ]),
            const SizedBox(height: 14),
            if (_loading && d == null)
              Padding(padding: const EdgeInsets.only(top: 80), child: Center(child: CircularProgressIndicator(color: context.clr.accent)))
            else if (_error != null && d == null)
              Padding(
                padding: const EdgeInsets.only(top: 60),
                child: Column(children: [
                  Text('Could not load your performance.', style: TextStyle(color: context.clr.txtSecondary)),
                  const SizedBox(height: 12),
                  ElevatedButton(onPressed: _load, child: const Text('Try again')),
                ]),
              )
            else if (d != null) ...[
              if (_loading) LinearProgressIndicator(minHeight: 2, color: context.clr.accent),
              if (d['scorecard'] is List) ...[
                _scorecard(d['scorecard'] as List),
                _impactNote(),
              ],
              _kpis(d['summary'] as Map),
              const SizedBox(height: 14),
              _outcomes(d['summary'] as Map),
              _daily(d['daily'] as List),
              _byType(d['by_type'] as Map),
              _messages(d['messages'] as Map),
              _hours(d['hours'] as List),
              _reasons(d['end_reasons'] as List),
              _recent(d['recent'] as List),
              Text(
                'Declines, call drops and end reasons are recorded from 18 Nov 2026. Older requests that were never answered count as missed.',
                style: TextStyle(color: context.clr.txtMuted, fontSize: 11, height: 1.4),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
