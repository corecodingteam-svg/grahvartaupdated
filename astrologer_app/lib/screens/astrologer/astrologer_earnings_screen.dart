import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/earnings_cubit.dart';
import '../../theme/app_theme.dart';

class AstrologerEarningsScreen extends StatelessWidget {
  const AstrologerEarningsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) => EarningsCubit()..load(),
      child: const _AstrologerEarningsView(),
    );
  }
}

class _AstrologerEarningsView extends StatelessWidget {
  const _AstrologerEarningsView();

  @override
  Widget build(BuildContext context) {
    // Payouts are processed manually by the Grahvarta team, so this screen only
    // shows earnings and transactions (no in-app withdrawal requests).
    return BlocBuilder<EarningsCubit, EarningsState>(
      builder: (context, state) {
        return Scaffold(
          appBar: AppBar(
            backgroundColor: context.clr.surface,
            title: Text('Earnings & Wallet', style: TextStyle(color: context.clr.txtPrimary)),
          ),
          body: state.loading
              ? Center(child: CircularProgressIndicator(color: context.clr.accent))
              : Column(
                  children: [
                    _buildWalletCard(context, state),
                    Expanded(child: _buildTransactionsList(context, state)),
                  ],
                ),
        );
      },
    );
  }

  Widget _buildWalletCard(BuildContext context, EarningsState state) {
    final walletData = state.wallet?['wallet'] as Map? ?? state.wallet ?? {};
    final statsData = state.wallet?['stats'] as Map? ?? {};
    final balance = double.tryParse(walletData['balance']?.toString() ?? '0') ?? 0;
    final totalEarned = double.tryParse(walletData['total_earned']?.toString() ?? '0') ?? 0;
    final thisMonth = double.tryParse(statsData['this_month']?.toString() ?? '0') ?? 0;
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: context.clr.accent, // solid brand colour
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Available Balance', style: TextStyle(color: Colors.white70, fontSize: 13)),
          const SizedBox(height: 4),
          Text('₹${balance.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text('Lifetime: ₹${totalEarned.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white60, fontSize: 12)),
          const SizedBox(height: 12),
          Row(children: [
            _walletStat('This Month', '₹${thisMonth.toStringAsFixed(0)}'),
            const SizedBox(width: 24),
            _walletStat('Total Earned', '₹${totalEarned.toStringAsFixed(0)}'),
          ]),
        ],
      ),
    );
  }

  Widget _walletStat(String label, String value) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(label, style: const TextStyle(color: Colors.white70, fontSize: 11)),
      Text(value, style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w600)),
    ],
  );

  Widget _buildTransactionsList(BuildContext context, EarningsState state) {
    if (state.transactions.isEmpty) {
      return Center(child: Text('No transactions yet', style: TextStyle(color: context.clr.txtMuted)));
    }
    return ListView.separated(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      itemCount: state.transactions.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final t = state.transactions[i] as Map;
        final amount = double.tryParse(t['amount']?.toString() ?? '0') ?? 0;
        final sessionType = (t['type']?.toString() ?? 'chat').toUpperCase();
        final userName = t['user_name']?.toString() ?? 'User';
        final duration = int.tryParse(t['duration_seconds']?.toString() ?? '0') ?? 0;
        final durationLabel = duration > 0 ? ' · ${duration ~/ 60}m ${duration % 60}s' : '';
        String dateLabel = '';
        try {
          final dt = DateTime.parse(t['created_at'].toString()).toLocal();
          dateLabel = '${dt.day}/${dt.month}/${dt.year}  ${dt.hour.toString().padLeft(2,'0')}:${dt.minute.toString().padLeft(2,'0')}';
        } catch (_) { dateLabel = t['created_at']?.toString() ?? ''; }
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: context.clr.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: context.clr.border)),
          child: Row(children: [
            Container(
              width: 40, height: 40,
              decoration: BoxDecoration(color: context.clr.success.withValues(alpha: 0.15), shape: BoxShape.circle),
              child: Icon(Icons.arrow_downward, color: context.clr.success, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('$sessionType with $userName$durationLabel', style: TextStyle(color: context.clr.txtPrimary, fontSize: 13)),
              const SizedBox(height: 2),
              Text(dateLabel, style: TextStyle(color: context.clr.txtMuted, fontSize: 11)),
            ])),
            Text('+₹${amount.toStringAsFixed(0)}',
              style: TextStyle(color: context.clr.success, fontWeight: FontWeight.bold, fontSize: 15)),
          ]),
        );
      },
    );
  }
}
