import 'package:flutter_bloc/flutter_bloc.dart';
import '../services/api_service.dart';

// --------------- State ---------------

class EarningsState {
  final bool loading;
  final Map<String, dynamic>? wallet;
  final List<dynamic> transactions;

  const EarningsState({
    this.loading = true,
    this.wallet,
    this.transactions = const [],
  });

  EarningsState copyWith({
    bool? loading,
    Map<String, dynamic>? wallet,
    List<dynamic>? transactions,
  }) =>
      EarningsState(
        loading: loading ?? this.loading,
        wallet: wallet ?? this.wallet,
        transactions: transactions ?? this.transactions,
      );
}

// --------------- Cubit ---------------

class EarningsCubit extends Cubit<EarningsState> {
  EarningsCubit() : super(const EarningsState());

  Future<void> load() async {
    emit(state.copyWith(loading: true));
    final walletFuture = ApiService.getAstrologerWallet().catchError((_) => <String, dynamic>{});
    final txFuture = ApiService.getAstrologerTransactions().catchError((_) => <dynamic>[]);
    final results = await Future.wait([walletFuture, txFuture]);
    final walletResp = results[0] as Map<String, dynamic>;
    emit(state.copyWith(
      loading: false,
      wallet: (walletResp['data'] as Map<String, dynamic>?) ?? walletResp,
      transactions: results[1] as List,
    ));
  }
}
