/// Modelo de evento do diário (portado do PWA `app.js`).
/// Mantém `updatedAt` (last-write-wins) e `deleted` (exclusão lógica) para sync.
library;

enum EventType {
  wakeMorning, // Acordou (fim do sono noturno)
  milk, // Comeu — Leite (usa amountMl)
  snack, // Comeu — Lanche
  lunch, // Comeu — Almoço
  diaperPoop, // Fralda com cocô
  diaperWet, // Troca sem cocô
  napStart, // Dormiu (soneca)
  napEnd, // Acordou (soneca)
  nightStart, // Dormiu (noite)
  sick, // Doente
}

class Event {
  final String id;
  final EventType type;
  final DateTime ts; // horário do evento (local)
  final int updatedAt; // epoch ms — resolução de conflito
  final bool deleted; // tombstone
  final int? amountMl; // só para milk
  final String? notes;

  const Event({
    required this.id,
    required this.type,
    required this.ts,
    this.updatedAt = 0,
    this.deleted = false,
    this.amountMl,
    this.notes,
  });

  Event copyWith({
    EventType? type,
    DateTime? ts,
    int? updatedAt,
    bool? deleted,
    int? amountMl,
    String? notes,
  }) {
    return Event(
      id: id,
      type: type ?? this.type,
      ts: ts ?? this.ts,
      updatedAt: updatedAt ?? this.updatedAt,
      deleted: deleted ?? this.deleted,
      amountMl: amountMl ?? this.amountMl,
      notes: notes ?? this.notes,
    );
  }
}
