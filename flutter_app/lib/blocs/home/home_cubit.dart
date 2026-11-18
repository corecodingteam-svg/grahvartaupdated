import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../models/astrologer.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import 'home_state.dart';

class HomeCubit extends Cubit<HomeState> {
  HomeCubit() : super(const HomeInitial()) {
    // Live presence over the realtime socket: the "Online Astrologers" row
    // updates as soon as an astrologer goes online/offline or toggles chat,
    // call or video — no pull to refresh needed.
    final socket = SocketService.instance;
    socket.on('astrologer_online', _onPresence);
    socket.on('astrologer_offline', _onPresence);
    socket.on('astrologer_availability', _onPresence);
    socket.connection.addListener(_onConnectionChanged);
    socket.ensureConnected();
  }

  static const _maxShown = 10;
  Timer? _refetch;

  late final Function(dynamic) _onPresence = (data) {
    final current = state;
    if (isClosed || current is! HomeLoaded || data is! Map) return;
    final event = Map<String, dynamic>.from(data);
    final id = event['astrologer_id'];
    final online = event['is_online'];
    final shown = current.onlineAstrologers.any((a) => a.id == id);
    // Moderation hold/ban sends just {astrologer_id} with astrologer_offline
    final wentOffline = online == false || event.length == 1;

    if (wentOffline) {
      if (shown) emit(current.copyWith(onlineAstrologers: current.onlineAstrologers.where((a) => a.id != id).toList()));
    } else if (shown) {
      emit(current.copyWith(
        onlineAstrologers: current.onlineAstrologers.map((a) => a.id == id ? a.withStatus(event) : a).toList(),
      ));
    } else if (online == true) {
      // Someone new came online — fetch their card (debounced for bursts)
      _scheduleRefetch();
    }
  };

  // Presence events missed while the connection was down — catch up on reconnect
  void _onConnectionChanged() {
    if (!isClosed && SocketService.instance.connection.value && state is HomeLoaded) _scheduleRefetch();
  }

  void _scheduleRefetch() {
    _refetch?.cancel();
    _refetch = Timer(const Duration(milliseconds: 400), _silentRefresh);
  }

  Future<void> _silentRefresh() async {
    if (isClosed || state is! HomeLoaded) return;
    try {
      final data = await ApiService.getAstrologers(onlineOnly: true);
      final current = state;
      if (!isClosed && current is HomeLoaded) {
        emit(current.copyWith(onlineAstrologers: data.take(_maxShown).toList().cast<Astrologer>()));
      }
    } catch (_) {}
  }

  @override
  Future<void> close() {
    final socket = SocketService.instance;
    socket.offHandler('astrologer_online', _onPresence);
    socket.offHandler('astrologer_offline', _onPresence);
    socket.offHandler('astrologer_availability', _onPresence);
    socket.connection.removeListener(_onConnectionChanged);
    _refetch?.cancel();
    return super.close();
  }

  Future<void> load() async {
    emit(const HomeLoading());
    try {
      final results = await Future.wait([
        ApiService.getDashboard(),
        ApiService.getMyHoroscope(),
        ApiService.getAstrologers(onlineOnly: true),
      ]);
      emit(HomeLoaded(
        dashboardData: (results[0] as Map<String, dynamic>)['data'],
        horoscope: results[1] as dynamic,
        onlineAstrologers:
            ((results[2] as List).take(_maxShown).toList()).cast(),
      ));
    } catch (_) {
      emit(const HomeError());
    }
  }

  Future<void> refreshAstrologers() async {
    final current = state;
    if (current is HomeLoaded) {
      emit(current.copyWith(astrologersRefreshing: true));
      try {
        final data = await ApiService.getAstrologers(onlineOnly: true);
        emit(current.copyWith(
          onlineAstrologers: data.take(_maxShown).toList(),
          astrologersRefreshing: false,
        ));
      } catch (_) {
        emit(current.copyWith(astrologersRefreshing: false));
      }
    }
  }

  Future<void> refresh() => load();
}
