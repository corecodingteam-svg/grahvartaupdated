import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:provider/provider.dart';
import 'package:shimmer/shimmer.dart';
import '../../cubits/dashboard_cubit.dart';
import '../../providers/auth_provider.dart';
import '../../theme/app_theme.dart';
import 'astrologer_own_profile_screen.dart';
import '../../services/socket_service.dart';
import 'availability_sheet.dart';
import 'week_earnings_card.dart';
import 'performance_screen.dart';

class AstrologerDashboardScreen extends StatelessWidget {
  const AstrologerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => DashboardCubit()..load(),
      child: const _AstrologerDashboardView(),
    );
  }
}

class _AstrologerDashboardView extends StatelessWidget {
  const _AstrologerDashboardView();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final astrologer = auth.astrologerProfile;

    return BlocBuilder<DashboardCubit, DashboardState>(
      builder: (context, state) {
        final cubit = context.read<DashboardCubit>();
        return Scaffold(
          appBar: AppBar(
            backgroundColor: context.clr.surface,
            leadingWidth: 64,
            leading: Padding(
              padding: const EdgeInsets.only(left: 16),
              child: GestureDetector(
                onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const AstrologerOwnProfileScreen())),
                child: CircleAvatar(
                  radius: 20,
                  backgroundImage: astrologer?.avatarUrl != null ? NetworkImage(astrologer!.avatarUrl!) : null,
                  backgroundColor: context.clr.accent.withValues(alpha: 0.2),
                  child: astrologer?.avatarUrl == null
                      ? Text(
                          (auth.user?.name?.isNotEmpty == true ? auth.user!.name[0].toUpperCase() : 'A'),
                          style: TextStyle(color: context.clr.accent, fontWeight: FontWeight.bold),
                        )
                      : null,
                ),
              ),
            ),
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Welcome, ${auth.user?.name?.split(' ').first ?? ''} ✨',
                  style: TextStyle(color: context.clr.txtPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
                Text('Performance Overview', style: TextStyle(color: context.clr.txtSecondary, fontSize: 12)),
              ],
            ),
            actions: [
              if (astrologer != null)
                GestureDetector(
                  // Opens Online/Offline + separate chat / voice / video switches
                  onTap: state.toggling ? null : () => showAvailabilitySheet(context),
                  // Users only see "online" when the switch is on AND the app is
                  // connected — show that truthfully instead of just the switch.
                  child: ValueListenableBuilder<bool>(
                    valueListenable: SocketService.instance.connection,
                    builder: (context, connected, _) {
                      final on = astrologer.isAvailable;
                      final reconnecting = on && !connected;
                      final color = reconnecting ? Colors.orange : (on ? context.clr.success : context.clr.txtMuted);
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                        decoration: BoxDecoration(
                          color: on ? color.withValues(alpha: 0.2) : context.clr.surface,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: on ? color : context.clr.border),
                        ),
                        child: Row(mainAxisSize: MainAxisSize.min, children: [
                          reconnecting
                              ? SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: color))
                              : Icon(on ? Icons.toggle_on_rounded : Icons.toggle_off_rounded, color: color, size: 18),
                          const SizedBox(width: 4),
                          Text(reconnecting ? 'Connecting…' : (on ? 'Online' : 'Offline'),
                            style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
                        ]),
                      );
                    },
                  ),
                ),
              const SizedBox(width: 12),
            ],
          ),
          body: state.loading
              ? _buildShimmer(context)
              : RefreshIndicator(
                  onRefresh: cubit.load,
                  color: context.clr.accent,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Online + chat / voice / video switches, right on the dashboard
                        if (astrologer != null)
                          Container(
                            width: double.infinity,
                            margin: const EdgeInsets.only(bottom: 20),
                            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                            decoration: BoxDecoration(
                              color: context.clr.card,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: context.clr.border),
                            ),
                            child: const AvailabilityPanel(),
                          ),
                        WeekEarningsCard(earningsChart: state.data?['earnings_chart'] as List<dynamic>?),
                        _performanceCard(context),
                        const SizedBox(height: 20),
                        _buildStats(context, astrologer, state.data),
                        const SizedBox(height: 20),
                        _buildRecentConsultations(context, state.data),
                      ],
                    ),
                  ),
                ),
        );
      },
    );
  }

  Widget _buildShimmer(BuildContext context) {
    final base = context.clr.card;
    final highlight = context.clr.surface;
    return Shimmer.fromColors(
      baseColor: base,
      highlightColor: highlight,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          GridView.count(
            crossAxisCount: 2,
            crossAxisSpacing: 12,
            mainAxisSpacing: 12,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            childAspectRatio: 1.4,
            children: List.generate(4, (_) => Container(
              decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
            )),
          ),
          const SizedBox(height: 20),
          Container(height: 16, width: 180, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(6))),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
            child: Column(children: List.generate(4, (i) => Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
              child: Row(children: [
                Container(width: 40, height: 40, decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle)),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Container(height: 12, width: 120, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                  const SizedBox(height: 6),
                  Container(height: 10, width: 80, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
                ])),
                Container(height: 14, width: 40, decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(4))),
              ]),
            ))),
          ),
        ]),
      ),
    );
  }

  Widget _buildStats(BuildContext context, AstrologerProfile? astrologer, Map<String, dynamic>? data) {
    final stats = data?['stats'] ?? {};
    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.4,
      children: [
        _statCard(context, Icons.people_rounded, 'Consultations', '${stats['total'] ?? 0}', context.clr.accent),
        _statCard(context, Icons.star_rounded, 'Rating', '${(double.tryParse(astrologer?.rating.toString() ?? '0') ?? 0).toStringAsFixed(1)} (${astrologer?.reviewCount ?? 0})', const Color(0xFFFFD700)),
        _statCard(context, Icons.trending_up_rounded, 'Total Earnings', '₹${(double.tryParse(stats['total_revenue']?.toString() ?? '0') ?? 0).toStringAsFixed(0)}', context.clr.success),
        _statCard(context, Icons.access_time_rounded, 'Avg Duration', '${((double.tryParse(stats['avg_duration']?.toString() ?? '0') ?? 0) / 60).round()}m', Colors.blue),
      ],
    );
  }

  Widget _statCard(BuildContext context, IconData icon, String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: context.clr.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: context.clr.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(color: color.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 18),
          ),
          const Spacer(),
          Text(value, style: TextStyle(color: context.clr.txtPrimary, fontSize: 18, fontWeight: FontWeight.bold)),
          Text(label, style: TextStyle(color: context.clr.txtSecondary, fontSize: 11)),
        ],
      ),
    );
  }

  Widget _buildRecentConsultations(BuildContext context, Map<String, dynamic>? data) {
    final recent = (data?['recent_consultations'] as List?) ?? [];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Recent Consultations', style: TextStyle(color: context.clr.txtPrimary, fontSize: 16, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: context.clr.border)),
          child: recent.isEmpty
              ? Padding(
                  padding: const EdgeInsets.all(24),
                  child: Center(child: Text('No consultations yet', style: TextStyle(color: context.clr.txtMuted))),
                )
              : ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: recent.length > 5 ? 5 : recent.length,
                  separatorBuilder: (_, __) => Divider(color: context.clr.border, height: 1),
                  itemBuilder: (_, i) {
                    final c = recent[i] as Map;
                    final name = ((c['user_name'] ?? 'User') as String).split(' ').map((w) => w.isNotEmpty ? '${w[0].toUpperCase()}${w.substring(1)}' : '').join(' ');
                    final type = c['type'] ?? 'chat';
                    final secs = (double.tryParse(c['duration_seconds']?.toString() ?? '0') ?? 0).round();
                    final duration = secs < 60 ? '${secs}s' : '${(secs / 60).round()}m';
                    // What the astrologer earned (their share) — matches the earnings card and wallet
                    final amount = double.tryParse(c['astrologer_earning']?.toString() ?? '0') ?? 0;
                    final status = c['status']?.toString() ?? '';
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: context.clr.accent.withValues(alpha: 0.2),
                        child: Text(name[0].toUpperCase(), style: TextStyle(color: context.clr.accent, fontWeight: FontWeight.bold)),
                      ),
                      title: Text(name, style: TextStyle(color: context.clr.txtPrimary, fontSize: 14)),
                      subtitle: Text(status == 'completed' ? '$type · $duration' : '$type · $status', style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
                      trailing: Text(
                        amount == amount.roundToDouble() ? '₹${amount.toStringAsFixed(0)}' : '₹${amount.toStringAsFixed(2)}',
                        style: TextStyle(color: amount > 0 ? context.clr.success : context.clr.txtMuted, fontWeight: FontWeight.bold),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }
}

/// Dashboard shortcut to the detailed performance report.
Widget _performanceCard(BuildContext context) {
  return InkWell(
    borderRadius: BorderRadius.circular(16),
    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const PerformanceScreen())),
    child: Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: context.clr.border)),
      child: Row(children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(color: context.clr.accent.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(12)),
          child: Icon(Icons.insights_rounded, color: context.clr.accent),
        ),
        const SizedBox(width: 14),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Performance', style: TextStyle(color: context.clr.txtPrimary, fontSize: 15, fontWeight: FontWeight.w600)),
          Text('Calls, chats, talk time, declines, missed requests and drops',
              style: TextStyle(color: context.clr.txtMuted, fontSize: 12)),
        ])),
        Icon(Icons.chevron_right_rounded, color: context.clr.txtMuted),
      ]),
    ),
  );
}
