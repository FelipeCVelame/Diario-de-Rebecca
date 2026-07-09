import 'package:flutter_test/flutter_test.dart';
import 'package:diario_crianca/domain/event.dart';
import 'package:diario_crianca/domain/summary.dart';

// Helper para criar eventos de teste.
Event ev(EventType type, DateTime ts, {int? ml}) =>
    Event(id: '${type.name}-${ts.toIso8601String()}', type: type, ts: ts, amountMl: ml);

void main() {
  group('dayKey', () {
    test('formata YYYY-MM-DD local', () {
      expect(dayKey(DateTime(2026, 7, 6, 23, 0)), '2026-07-06');
      expect(dayKey(DateTime(2026, 1, 3, 0, 5)), '2026-01-03');
    });
  });

  group('summaryForDay — dia com dados (07/07) + noite anterior (06/07)', () {
    // Reproduz o cenário validado no PWA.
    final events = <Event>[
      // sono noturno: 06/07 20:00 -> 07/07 06:30 (= 10h30, atribuído ao dia 06)
      ev(EventType.nightStart, DateTime(2026, 7, 6, 20, 0)),
      ev(EventType.wakeMorning, DateTime(2026, 7, 7, 6, 30)),
      // leite 07/07: 150 + 120 + 180 = 450 (3 mamadas)
      ev(EventType.milk, DateTime(2026, 7, 7, 7, 0), ml: 150),
      ev(EventType.milk, DateTime(2026, 7, 7, 11, 0), ml: 120),
      ev(EventType.milk, DateTime(2026, 7, 7, 19, 0), ml: 180),
      ev(EventType.lunch, DateTime(2026, 7, 7, 12, 0)),
      // sonecas 07/07: 09:00-10:30 (90) + 14:00-15:15 (75) = 165 min
      ev(EventType.napStart, DateTime(2026, 7, 7, 9, 0)),
      ev(EventType.napEnd, DateTime(2026, 7, 7, 10, 30)),
      ev(EventType.napStart, DateTime(2026, 7, 7, 14, 0)),
      ev(EventType.napEnd, DateTime(2026, 7, 7, 15, 15)),
      // fraldas 07/07
      ev(EventType.diaperPoop, DateTime(2026, 7, 7, 12, 30)),
      ev(EventType.diaperWet, DateTime(2026, 7, 7, 16, 30)),
    ];

    final d7 = summaryForDay(events, '2026-07-07');
    final d6 = summaryForDay(events, '2026-07-06');

    test('leite total e contagem', () {
      expect(d7.milkMl, 450);
      expect(d7.milkCount, 3);
    });

    test('sonecas: tempo e quantidade', () {
      expect(d7.napMs, 165 * 60 * 1000);
      expect(d7.napCount, 2);
    });

    test('sono noturno é atribuído ao dia em que começou (06/07), não ao 07/07', () {
      expect(d7.nightMs, 0);
      expect(d6.nightMs, 630 * 60 * 1000); // 10h30
      expect(d6.nightCount, 1);
    });

    test('fraldas e refeições', () {
      expect(d7.diapers, 2);
      expect(d7.poops, 1);
      expect(d7.meals, 4); // 3 leite + 1 almoço
    });
  });

  test('eventos deleted (tombstones) são ignorados', () {
    final events = <Event>[
      ev(EventType.milk, DateTime(2026, 7, 7, 7, 0), ml: 100),
      Event(
        id: 'x',
        type: EventType.milk,
        ts: DateTime(2026, 7, 7, 8, 0),
        amountMl: 999,
        deleted: true,
      ),
    ];
    final s = summaryForDay(events, '2026-07-07');
    expect(s.milkMl, 100);
    expect(s.milkCount, 1);
  });
}
