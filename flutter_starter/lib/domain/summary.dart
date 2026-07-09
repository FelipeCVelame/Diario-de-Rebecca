/// Resumo diário e pareamento de intervalos de sono (portado de `app.js`).
library;

import 'event.dart';

/// Chave local YYYY-MM-DD (respeita o fuso do aparelho, como no PWA).
String dayKey(DateTime d) {
  String two(int n) => n.toString().padLeft(2, '0');
  return '${d.year}-${two(d.month)}-${two(d.day)}';
}

class SleepInterval {
  final DateTime start;
  final DateTime end;
  final int ms;
  final String dayKey; // dia em que o sono COMEÇOU

  const SleepInterval(this.start, this.end, this.ms, this.dayKey);
}

/// Casa início→fim cronologicamente, mesmo cruzando a meia-noite.
/// O intervalo é atribuído ao dia em que o sono começou.
List<SleepInterval> buildIntervals(
  List<Event> events,
  EventType startType,
  EventType endType,
) {
  final list = events.where((e) => !e.deleted).toList()
    ..sort((a, b) => a.ts.compareTo(b.ts));
  final out = <SleepInterval>[];
  Event? open;
  for (final e in list) {
    if (e.type == startType) {
      open = e; // dois inícios seguidos: o mais recente vale
    } else if (e.type == endType && open != null) {
      final ms = e.ts.difference(open.ts).inMilliseconds;
      out.add(SleepInterval(open.ts, e.ts, ms, dayKey(open.ts)));
      open = null;
    }
  }
  return out;
}

class DaySummary {
  final int milkMl;
  final int milkCount;
  final int napMs;
  final int napCount;
  final int nightMs;
  final int nightCount;
  final int diapers;
  final int poops;
  final int meals;

  const DaySummary({
    required this.milkMl,
    required this.milkCount,
    required this.napMs,
    required this.napCount,
    required this.nightMs,
    required this.nightCount,
    required this.diapers,
    required this.poops,
    required this.meals,
  });
}

/// Resumo de um dia (`dateKey` = YYYY-MM-DD).
DaySummary summaryForDay(List<Event> all, String dateKey) {
  final active = all.where((e) => !e.deleted).toList();
  final evts = active.where((e) => dayKey(e.ts) == dateKey).toList();

  int count(EventType t) => evts.where((e) => e.type == t).length;

  final milkMl = evts
      .where((e) => e.type == EventType.milk)
      .fold<int>(0, (s, e) => s + (e.amountMl ?? 0));

  final naps = buildIntervals(active, EventType.napStart, EventType.napEnd)
      .where((i) => i.dayKey == dateKey)
      .toList();
  final nights =
      buildIntervals(active, EventType.nightStart, EventType.wakeMorning)
          .where((i) => i.dayKey == dateKey)
          .toList();

  final napMs = naps.fold<int>(0, (s, i) => s + i.ms);
  final nightMs = nights.fold<int>(0, (s, i) => s + i.ms);

  return DaySummary(
    milkMl: milkMl,
    milkCount: count(EventType.milk),
    napMs: napMs,
    napCount: naps.length,
    nightMs: nightMs,
    nightCount: nights.length,
    diapers: count(EventType.diaperWet) + count(EventType.diaperPoop),
    poops: count(EventType.diaperPoop),
    meals: count(EventType.milk) + count(EventType.snack) + count(EventType.lunch),
  );
}
