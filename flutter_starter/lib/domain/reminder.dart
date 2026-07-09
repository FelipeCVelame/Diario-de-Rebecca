/// Lembrete de leite (portado de `app.js`): avisa após 3h desde o último leite,
/// SUPRIMIDO durante o sono noturno em aberto. Soneca não suprime.
library;

import 'event.dart';

const int milkReminderMs = 3 * 60 * 60 * 1000; // 3 horas
const int _nightMaxOpenMs = 16 * 60 * 60 * 1000; // ignora night_start "esquecido"

/// Bebê está em sono noturno agora? (night_start em aberto, sem wake_morning depois).
bool isNightSleeping(List<Event> all, DateTime now) {
  int lastNight = -1;
  int lastWake = -1;
  for (final e in all) {
    if (e.deleted) continue;
    final t = e.ts.millisecondsSinceEpoch;
    if (e.type == EventType.nightStart) {
      if (t > lastNight) lastNight = t;
    } else if (e.type == EventType.wakeMorning) {
      if (t > lastWake) lastWake = t;
    }
  }
  if (lastNight <= lastWake) return false;
  return (now.millisecondsSinceEpoch - lastNight) < _nightMaxOpenMs;
}

class MilkReminder {
  final bool active; // deve mostrar/notificar agora
  final bool due; // já passou de 3h (independente do sono)
  final int elapsedMs; // desde o último leite
  final DateTime? lastTs;

  const MilkReminder({
    required this.active,
    required this.due,
    required this.elapsedMs,
    this.lastTs,
  });
}

MilkReminder milkReminderState(
  List<Event> all,
  DateTime now, {
  int thresholdMs = milkReminderMs,
}) {
  final milks = all
      .where((e) => !e.deleted && e.type == EventType.milk)
      .toList()
    ..sort((a, b) => a.ts.compareTo(b.ts));
  if (milks.isEmpty) {
    return const MilkReminder(active: false, due: false, elapsedMs: 0);
  }
  final last = milks.last;
  final elapsed = now.millisecondsSinceEpoch - last.ts.millisecondsSinceEpoch;
  final due = elapsed >= thresholdMs;
  return MilkReminder(
    active: due && !isNightSleeping(all, now),
    due: due,
    elapsedMs: elapsed,
    lastTs: last.ts,
  );
}
