import 'package:flutter_test/flutter_test.dart';
import 'package:diario_crianca/domain/event.dart';
import 'package:diario_crianca/domain/reminder.dart';

void main() {
  final now = DateTime(2026, 7, 8, 12, 0);
  Event milkAgo(int minutes) => Event(
        id: 'm$minutes',
        type: EventType.milk,
        ts: now.subtract(Duration(minutes: minutes)),
        amountMl: 150,
      );
  Event evAgo(EventType type, int minutes) => Event(
        id: '${type.name}$minutes',
        type: type,
        ts: now.subtract(Duration(minutes: minutes)),
      );

  test('cenário 1: leite há 3h30, sem sono noturno → ATIVO', () {
    final r = milkReminderState([milkAgo(210)], now);
    expect(r.due, true);
    expect(r.active, true);
  });

  test('cenário 2: leite há 2h → não vencido', () {
    final r = milkReminderState([milkAgo(120)], now);
    expect(r.due, false);
    expect(r.active, false);
  });

  test('cenário 3: leite há 3h30 + soneca em aberto → ATIVO (soneca não suprime)', () {
    final r = milkReminderState([milkAgo(210), evAgo(EventType.napStart, 20)], now);
    expect(r.active, true);
  });

  test('cenário 4: leite há 3h30 + sono noturno em aberto → SUPRIMIDO', () {
    final r = milkReminderState([milkAgo(210), evAgo(EventType.nightStart, 40)], now);
    expect(r.due, true);
    expect(r.active, false);
  });

  test('cenário 5: sono noturno seguido de acordar → volta a ATIVAR', () {
    final r = milkReminderState([
      milkAgo(210),
      evAgo(EventType.nightStart, 300),
      evAgo(EventType.wakeMorning, 5),
    ], now);
    expect(r.active, true);
  });

  test('sem nenhum leite → inativo', () {
    final r = milkReminderState([evAgo(EventType.napStart, 10)], now);
    expect(r.active, false);
    expect(r.due, false);
  });

  test('night_start "esquecido" (>16h) não suprime para sempre', () {
    final r = milkReminderState([
      milkAgo(210),
      evAgo(EventType.nightStart, 20 * 60), // 20h atrás
    ], now);
    expect(r.active, true);
  });
}
