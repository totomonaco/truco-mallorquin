export type Suit = 'espadas' | 'bastos' | 'oros' | 'copas';
export type CardNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;

export interface Card {
  number: CardNumber;
  suit: Suit;
  /** Rank for truco comparison: lower number = stronger card (1 = best) */
  trucoRank: number;
  /** Envido value: 1-7 = face value, 10/12 = 0, special cards have their own */
  envidoValue: number;
  /** Whether this card is a wildcard comodín */
  isComodin: boolean;
  /** Comodín envido base value (only for 11-bastos and 10-oros) */
  comodinValue?: number;
  id: string; // e.g. "11-bastos"
}

/**
 * Truco rank table (Argentine variant with comodines):
 * 1  → 11 de bastos  (comodín)
 * 2  → 10 de oros    (comodín)
 * 3  → 1 de espadas
 * 4  → 1 de bastos
 * 5  → 7 de espadas
 * 6  → 7 de oros
 * 7  → 3s (all suits)
 * 8  → 2s (all suits)
 * 9  → 1 de oros
 * 9  → 1 de copas   (ties with 1-oros)
 * 10 → 12s (all suits)
 * 11 → 11 de espadas, 11 de oros, 11 de copas
 * 12 → 10 de bastos, 10 de espadas, 10 de copas
 * 13 → 7 de bastos
 * 13 → 7 de copas   (ties with 7-bastos)
 * 14 → 6s (all suits)
 * 15 → 5s (all suits)
 * 16 → 4s (all suits)
 */
export function getTrucoRank(number: CardNumber, suit: Suit): number {
  if (number === 11 && suit === 'bastos') return 1;
  if (number === 10 && suit === 'oros') return 2;
  if (number === 1 && suit === 'espadas') return 3;
  if (number === 1 && suit === 'bastos') return 4;
  if (number === 7 && suit === 'espadas') return 5;
  if (number === 7 && suit === 'oros') return 6;
  if (number === 3) return 7;
  if (number === 2) return 8;
  if (number === 1 && suit === 'oros') return 9;
  if (number === 1 && suit === 'copas') return 9;
  if (number === 12) return 10;
  if (number === 11) return 11; // espadas, oros, copas
  if (number === 10) return 12; // bastos, espadas, copas
  if (number === 7 && suit === 'bastos') return 13;
  if (number === 7 && suit === 'copas') return 13;
  if (number === 6) return 14;
  if (number === 5) return 15;
  if (number === 4) return 16;
  return 99;
}

export function getEnvidoValue(number: CardNumber, suit: Suit): number {
  // Comodines have special envido logic handled in EnvidoService
  if (number === 11 && suit === 'bastos') return 0; // handled as comodín
  if (number === 10 && suit === 'oros') return 0;   // handled as comodín
  if (number >= 10) return 0; // figures worth 0
  return number; // 1-7 worth face value
}

export function buildCard(number: CardNumber, suit: Suit): Card {
  const isComodin = (number === 11 && suit === 'bastos') || (number === 10 && suit === 'oros');
  const comodinValue = number === 11 && suit === 'bastos' ? 28
    : number === 10 && suit === 'oros' ? 27
    : undefined;

  return {
    number,
    suit,
    trucoRank: getTrucoRank(number, suit),
    envidoValue: getEnvidoValue(number, suit),
    isComodin,
    comodinValue,
    id: `${number}-${suit}`,
  };
}
