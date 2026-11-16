import 'package:flutter_bloc/flutter_bloc.dart';
import '../../services/api_service.dart';
import '../../services/socket_service.dart';
import 'marketplace_state.dart';

class MarketplaceCubit extends Cubit<MarketplaceState> {
  MarketplaceCubit() : super(const MarketplaceInitial()) {
    // Live presence: astrologers going online/offline or switching
    // chat / call / video on or off update the list without a reload.
    final socket = SocketService.instance;
    socket.on('astrologer_online', _onOnline);
    socket.on('astrologer_offline', _onOffline);
    socket.on('astrologer_availability', _onAvailability);
    socket.connect();
  }

  late final Function(dynamic) _onOnline = (d) => _applyPresence(d, true);
  late final Function(dynamic) _onOffline = (d) => _applyPresence(d, false);
  late final Function(dynamic) _onAvailability = (d) => _applyPresence(d, null);

  void _applyPresence(dynamic data, bool? online) {
    final current = state;
    if (isClosed || current is! MarketplaceLoaded || data is! Map) return;
    final id = data['astrologer_id'];
    if (!current.astrologers.any((a) => a.id == id)) return;
    final event = Map<String, dynamic>.from(data);
    var updated = current.astrologers
        .map((a) => a.id == id ? a.withStatus(event, forceOnline: event['is_online'] == null ? online : null) : a)
        .toList();
    if (current.onlineOnly) updated = updated.where((a) => a.isOnline).toList();
    emit(current.copyWith(astrologers: updated));
  }

  @override
  Future<void> close() {
    final socket = SocketService.instance;
    socket.offHandler('astrologer_online', _onOnline);
    socket.offHandler('astrologer_offline', _onOffline);
    socket.offHandler('astrologer_availability', _onAvailability);
    return super.close();
  }

  Future<void> load() async {
    final current = state;
    final String sortBy =
        current is MarketplaceLoaded ? current.sortBy : 'rating';
    final bool onlineOnly =
        current is MarketplaceLoaded ? current.onlineOnly : false;
    final String? spec =
        current is MarketplaceLoaded ? current.selectedSpecialization : null;

    emit(const MarketplaceLoading());
    try {
      final data = await ApiService.getAstrologers(
        specialization: spec,
        sort: sortBy,
        onlineOnly: onlineOnly,
      );
      emit(MarketplaceLoaded(
        astrologers: data,
        sortBy: sortBy,
        onlineOnly: onlineOnly,
        selectedSpecialization: spec,
      ));
    } catch (_) {
      emit(const MarketplaceError());
    }
  }

  Future<void> _reload() async {
    final current = state;
    if (current is! MarketplaceLoaded) return;
    emit(const MarketplaceLoading());
    try {
      final data = await ApiService.getAstrologers(
        specialization: current.selectedSpecialization,
        sort: current.sortBy,
        onlineOnly: current.onlineOnly,
      );
      emit(current.copyWith(astrologers: data));
    } catch (_) {
      emit(const MarketplaceError());
    }
  }

  Future<void> search(String q) async {
    final current = state;
    if (current is MarketplaceLoaded) {
      emit(current.copyWith(searchQuery: q));
    }
  }

  Future<void> filterSpecialization(String? spec) async {
    final current = state;
    if (current is MarketplaceLoaded) {
      emit(current.copyWith(selectedSpecialization: spec));
      await _reloadFromCurrent();
    }
  }

  Future<void> toggleOnline() async {
    final current = state;
    if (current is MarketplaceLoaded) {
      emit(current.copyWith(onlineOnly: !current.onlineOnly));
      await _reloadFromCurrent();
    }
  }

  Future<void> changeSortBy(String sort) async {
    final current = state;
    if (current is MarketplaceLoaded) {
      emit(current.copyWith(sortBy: sort));
      await _reloadFromCurrent();
    }
  }

  Future<void> _reloadFromCurrent() async {
    final current = state;
    if (current is! MarketplaceLoaded) return;
    // Keep the current loaded state visible while fetching; replace list when done
    try {
      final data = await ApiService.getAstrologers(
        specialization: current.selectedSpecialization,
        sort: current.sortBy,
        onlineOnly: current.onlineOnly,
      );
      if (state is MarketplaceLoaded) {
        emit((state as MarketplaceLoaded).copyWith(astrologers: data));
      }
    } catch (_) {
      // silently keep old list on error
    }
  }
}
