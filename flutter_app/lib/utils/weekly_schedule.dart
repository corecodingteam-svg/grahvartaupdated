// Weekly availability timings an astrologer sets (Sunday–Saturday, India time).
// Server format: {"0":[["14:00","16:00"]], "1":[["16:00","21:00"]]}, 0 = Sunday.

class TimeSlot {
  final int start; // minutes after midnight
  final int end;
  const TimeSlot(this.start, this.end);

  static int _parse(String t) => int.parse(t.substring(0, 2)) * 60 + int.parse(t.substring(3, 5));
  static String _hhmm(int m) => '${(m ~/ 60).toString().padLeft(2, '0')}:${(m % 60).toString().padLeft(2, '0')}';

  factory TimeSlot.fromJson(List<dynamic> j) => TimeSlot(_parse(j[0] as String), _parse(j[1] as String));
  List<String> toJson() => [_hhmm(start), _hhmm(end)];

  /// "2 PM", "4:30 PM", "midnight" (end of day).
  static String label(int m) {
    if (m >= 24 * 60) return 'midnight';
    final h24 = (m ~/ 60) % 24, min = m % 60;
    final h12 = h24 % 12 == 0 ? 12 : h24 % 12;
    final ampm = h24 < 12 ? 'AM' : 'PM';
    return min == 0 ? '$h12 $ampm' : '$h12:${min.toString().padLeft(2, '0')} $ampm';
  }

  String get text => '${label(start)} – ${label(end)}';
}

class WeeklySchedule {
  /// 0 = Sunday … 6 = Saturday
  final Map<int, List<TimeSlot>> days;
  const WeeklySchedule(this.days);
  static const empty = WeeklySchedule({});

  static const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  static const dayShort = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  bool get isEmpty => days.values.every((s) => s.isEmpty);

  factory WeeklySchedule.fromJson(dynamic json) {
    if (json is! Map) return empty;
    final out = <int, List<TimeSlot>>{};
    json.forEach((k, v) {
      final d = int.tryParse(k.toString());
      if (d == null || d < 0 || d > 6 || v is! List) return;
      try {
        out[d] = v.map((s) => TimeSlot.fromJson(s as List)).toList()..sort((a, b) => a.start.compareTo(b.start));
      } catch (_) {}
    });
    return WeeklySchedule(out);
  }

  Map<String, dynamic> toJson() => {
        for (final e in days.entries)
          if (e.value.isNotEmpty) '${e.key}': e.value.map((s) => s.toJson()).toList(),
      };

  List<TimeSlot> slotsFor(int day) => days[day] ?? const [];

  /// Current time in India (schedules are set in IST).
  static DateTime nowIst() => DateTime.now().toUtc().add(const Duration(hours: 5, minutes: 30));
  static int weekdayIndex(DateTime d) => d.weekday % 7; // DateTime: Mon=1..Sun=7 → Sun=0

  /// Short line for users, e.g. "Available today 4 PM – 9 PM", "Until 4 PM today",
  /// "Next: Mon 4 PM". Null when no timings are set.
  String? nextAvailableLabel({DateTime? now}) {
    if (isEmpty) return null;
    final n = now ?? nowIst();
    final today = weekdayIndex(n);
    final minute = n.hour * 60 + n.minute;
    for (final s in slotsFor(today)) {
      if (minute >= s.start && minute < s.end) return 'Usually available until ${TimeSlot.label(s.end)} today';
      if (minute < s.start) return 'Available today ${s.text}';
    }
    for (var i = 1; i <= 7; i++) {
      final d = (today + i) % 7;
      final slots = slotsFor(d);
      if (slots.isNotEmpty) {
        final when = i == 1 ? 'Tomorrow' : dayShort[d];
        return 'Next: $when ${TimeSlot.label(slots.first.start)}';
      }
    }
    return null;
  }
}
