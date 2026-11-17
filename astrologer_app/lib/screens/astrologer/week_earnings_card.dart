import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../theme/app_theme.dart';

/// "This week's earnings" — total for Mon–Sun of the current week plus a
/// bar per day. Built from the dashboard API's `earnings_chart`
/// (list of {date, daily_earning} for the last 30 days).
class WeekEarningsCard extends StatefulWidget {
  final List<dynamic>? earningsChart;
  const WeekEarningsCard({super.key, required this.earningsChart});

  @override
  State<WeekEarningsCard> createState() => _WeekEarningsCardState();
}

class _WeekEarningsCardState extends State<WeekEarningsCard> {
  int? _touched;

  // Single series → one hue. Validated against the card surface in each mode
  // (light #027DFD on #F0F6FF, dark #D96A20 on #1E1E1E).
  static const _barLight = Color(0xFF027DFD);
  static const _barDark = Color(0xFFD96A20);

  static final _rupee = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
  static final _rupeeExact = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 2);

  /// Monday 00:00 of the current week (local time)
  DateTime get _weekStart {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    return today.subtract(Duration(days: today.weekday - DateTime.monday));
  }

  List<double> _dailyTotals() {
    final byDay = <String, double>{};
    for (final row in widget.earningsChart ?? const []) {
      if (row is! Map) continue;
      final raw = row['date']?.toString();
      if (raw == null || raw.length < 10) continue;
      final key = raw.substring(0, 10); // yyyy-MM-dd
      byDay[key] = (byDay[key] ?? 0) + (double.tryParse(row['daily_earning']?.toString() ?? '') ?? 0);
    }
    final start = _weekStart;
    return List.generate(7, (i) => byDay[DateFormat('yyyy-MM-dd').format(start.add(Duration(days: i)))] ?? 0);
  }

  /// A rounded axis top with ~4 gridlines
  (double maxY, double step) _scale(double peak) {
    if (peak <= 0) return (100, 25);
    const nice = [1, 2, 2.5, 5, 10];
    final rough = peak / 4;
    var mag = 1.0;
    while (mag * 10 <= rough) {
      mag *= 10;
    }
    final step = nice.map((n) => n * mag).firstWhere((s) => s >= rough, orElse: () => 10 * mag);
    return ((peak / step).ceil() * step, step);
  }

  String _axis(double v) {
    if (v >= 100000) return '₹${(v / 100000).toStringAsFixed(v % 100000 == 0 ? 0 : 1)}L';
    if (v >= 1000) return '₹${(v / 1000).toStringAsFixed(v % 1000 == 0 ? 0 : 1)}k';
    return '₹${v.toInt()}';
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bar = isDark ? _barDark : _barLight;
    final totals = _dailyTotals();
    final total = totals.fold<double>(0, (a, b) => a + b);
    final start = _weekStart;
    final todayIndex = DateTime.now().weekday - DateTime.monday;
    final (maxY, step) = _scale(totals.reduce((a, b) => a > b ? a : b));
    final range = '${DateFormat('d MMM').format(start)} – ${DateFormat('d MMM').format(start.add(const Duration(days: 6)))}';
    final best = total > 0 ? totals.indexOf(totals.reduce((a, b) => a > b ? a : b)) : -1;

    return Semantics(
      label: "This week's earnings ${_rupee.format(total)}. "
          '${List.generate(7, (i) => '${DateFormat('EEEE').format(start.add(Duration(days: i)))} ${_rupee.format(totals[i])}').join(', ')}',
      excludeSemantics: true,
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: 20),
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
        decoration: BoxDecoration(
          color: context.clr.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: context.clr.border),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text("This week's earnings", style: TextStyle(color: context.clr.txtSecondary, fontSize: 13, fontWeight: FontWeight.w600)),
                const SizedBox(height: 4),
                Text(_rupee.format(total), style: TextStyle(color: context.clr.txtPrimary, fontSize: 28, fontWeight: FontWeight.bold)),
              ]),
            ),
            Text(range, style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
          ]),
          if (best >= 0)
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                'Best day: ${DateFormat('EEEE').format(start.add(Duration(days: best)))} · ${_rupee.format(totals[best])}',
                style: TextStyle(color: context.clr.txtMuted, fontSize: 12),
              ),
            ),
          const SizedBox(height: 16),
          SizedBox(
            height: 170,
            child: Stack(children: [
              BarChart(
                BarChartData(
                  maxY: maxY,
                  minY: 0,
                  alignment: BarChartAlignment.spaceAround,
                  borderData: FlBorderData(show: false),
                  gridData: FlGridData(
                    drawVerticalLine: false,
                    horizontalInterval: step,
                    getDrawingHorizontalLine: (_) => FlLine(color: context.clr.border.withValues(alpha: 0.7), strokeWidth: 1),
                  ),
                  titlesData: FlTitlesData(
                    topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    leftTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 44,
                        interval: step,
                        getTitlesWidget: (v, meta) => SideTitleWidget(
                          meta: meta,
                          child: Text(_axis(v), style: TextStyle(color: context.clr.txtMuted, fontSize: 10)),
                        ),
                      ),
                    ),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        reservedSize: 26,
                        getTitlesWidget: (v, meta) {
                          final i = v.toInt();
                          final isToday = i == todayIndex;
                          return SideTitleWidget(
                            meta: meta,
                            child: Text(
                              isToday ? 'Today' : DateFormat('E').format(start.add(Duration(days: i))),
                              style: TextStyle(
                                color: isToday ? context.clr.txtPrimary : context.clr.txtMuted,
                                fontSize: 11,
                                fontWeight: isToday ? FontWeight.w700 : FontWeight.w500,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  barTouchData: BarTouchData(
                    // bigger hit target than the bar itself
                    touchExtraThreshold: const EdgeInsets.symmetric(horizontal: 12, vertical: 24),
                    touchCallback: (event, response) {
                      final i = response?.spot?.touchedBarGroupIndex;
                      if (event.isInterestedForInteractions && i != null) {
                        if (_touched != i) setState(() => _touched = i);
                      } else if (_touched != null && !event.isInterestedForInteractions) {
                        setState(() => _touched = null);
                      }
                    },
                    touchTooltipData: BarTouchTooltipData(
                      getTooltipColor: (_) => context.clr.txtPrimary,
                      tooltipBorderRadius: BorderRadius.circular(8),
                      tooltipPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      getTooltipItem: (group, _, rod, __) => BarTooltipItem(
                        '${DateFormat('EEE, d MMM').format(start.add(Duration(days: group.x)))}\n',
                        TextStyle(color: context.clr.bg, fontSize: 11),
                        children: [
                          TextSpan(text: _rupeeExact.format(totals[group.x]), style: TextStyle(color: context.clr.bg, fontSize: 13, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  ),
                  barGroups: List.generate(7, (i) {
                    final future = i > todayIndex;
                    return BarChartGroupData(
                      x: i,
                      barRods: [
                        BarChartRodData(
                          toY: totals[i],
                          width: 18,
                          color: (_touched == null || _touched == i) ? bar : bar.withValues(alpha: 0.45),
                          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                          // faint track shows the days still to come this week
                          backDrawRodData: BackgroundBarChartRodData(
                            show: future,
                            toY: maxY,
                            color: context.clr.border.withValues(alpha: 0.35),
                          ),
                        ),
                      ],
                    );
                  }),
                ),
              ),
              if (total == 0)
                Positioned.fill(
                  child: Padding(
                    padding: const EdgeInsets.only(left: 44, bottom: 26),
                    child: Center(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          color: context.clr.card,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: context.clr.border),
                        ),
                        child: Text('No earnings yet this week', style: TextStyle(color: context.clr.txtMuted, fontSize: 13)),
                      ),
                    ),
                  ),
                ),
            ]),
          ),
        ]),
      ),
    );
  }
}
