import { Injectable } from '@angular/core';
import { Card, Suit } from '../models/card.model';
import { EnvidoCall } from '../models/game-state.model';

export interface EnvidoScore {
  value: number;
  hasFlor: boolean;
  detail: string;
}

@Injectable({ providedIn: 'root' })
export class EnvidoService {

  /**
   * Calculate envido score for a player's 3-card hand.
   * Rules:
   *  - 11 de bastos (comodín) = 28, pairs with any card
   *  - 10 de oros  (comodín) = 27, pairs with any card
   *  - Both comodines together = 35
   *  - Normal pair (same suit): sum of 2 best + 20
   *  - No pair: highest single card (10/11/12 = 0)
   */
  calculateScore(hand: Card[]): EnvidoScore {
    const florResult = this.detectFlor(hand);

    const comodines = hand.filter(c => c.isComodin);
    const normals = hand.filter(c => !c.isComodin);

    // Both comodines
    if (comodines.length === 2) {
      return { value: 35, hasFlor: florResult.hasFlor, detail: 'Amo + Madona = 35' };
    }

    // One comodín
    if (comodines.length === 1) {
      const comodin = comodines[0];
      const base = comodin.comodinValue!; // 28 or 27
      // Pair comodín with the best other card
      const bestOther = Math.max(...normals.map(c => c.envidoValue));
      const value = base + bestOther;
      return {
        value,
        hasFlor: florResult.hasFlor,
        detail: `${comodin.id} (${base}) + ${bestOther} = ${value}`,
      };
    }

    // No comodines — group by suit
    const bySuit = new Map<Suit, Card[]>();
    for (const card of hand) {
      const group = bySuit.get(card.suit) ?? [];
      group.push(card);
      bySuit.set(card.suit, group);
    }

    let bestValue = 0;
    let bestDetail = '';

    for (const [suit, cards] of bySuit) {
      const sorted = [...cards].sort((a, b) => b.envidoValue - a.envidoValue);
      if (sorted.length >= 2) {
        const v = sorted[0].envidoValue + sorted[1].envidoValue + 20;
        if (v > bestValue) {
          bestValue = v;
          bestDetail = `${sorted[0].id} + ${sorted[1].id} + 20 = ${v}`;
        }
      } else {
        const v = sorted[0].envidoValue;
        if (v > bestValue) {
          bestValue = v;
          bestDetail = `Solo ${sorted[0].id} = ${v}`;
        }
      }
    }

    return { value: bestValue, hasFlor: florResult.hasFlor, detail: bestDetail };
  }

  /**
   * Detect flor: all 3 cards of same suit (comodines count as any suit).
   */
  detectFlor(hand: Card[]): { hasFlor: boolean; suit?: Suit } {
    const comodines = hand.filter(c => c.isComodin);
    const normals = hand.filter(c => !c.isComodin);

    if (comodines.length === 3) return { hasFlor: true };

    // Group normals by suit
    const suitGroups = new Map<Suit, number>();
    for (const c of normals) {
      suitGroups.set(c.suit, (suitGroups.get(c.suit) ?? 0) + 1);
    }

    if (comodines.length === 2) {
      // 2 comodines + 1 normal = always flor
      return { hasFlor: true, suit: normals[0]?.suit };
    }

    if (comodines.length === 1) {
      // 1 comodín + 2 normals: flor if 2 normals are same suit
      for (const [suit, count] of suitGroups) {
        if (count >= 2) return { hasFlor: true, suit };
      }
      return { hasFlor: false };
    }

    // No comodines: all 3 must be same suit
    for (const [suit, count] of suitGroups) {
      if (count === 3) return { hasFlor: true, suit };
    }
    return { hasFlor: false };
  }

  // ─── Points table ──────────────────────────────────────────────────────────

  /** Points if the last envido call is ACCEPTED */
  getPointsIfAccepted(chain: EnvidoCall[]): number {
    const last = chain[chain.length - 1];
    switch (last) {
      case 'envido':        return chain.length === 1 ? 2 : 4;
      case 'envido-envido': return 4;
      case 'real-envido':   return chain.length === 1 ? 3 : (chain.includes('envido') ? 5 : 3);
      case 'falta-envido':  return -1;
      default:              return 2;
    }
  }

  /** Points if the last envido call is REFUSED */
  getPointsIfRefused(chain: EnvidoCall[]): number {
    if (chain.length === 1) return 1;
    // Refused after 2+ calls: caller wins what was already at stake
    const prev = chain.slice(0, -1);
    return this.getPointsIfAccepted(prev as EnvidoCall[]);
  }

  /** Valid next calls given the current chain */
  validNextCalls(chain: EnvidoCall[]): EnvidoCall[] {
    const last = chain[chain.length - 1];
    if (!last || last === 'envido') {
      return chain.includes('envido') ? ['real-envido', 'falta-envido'] : ['envido', 'real-envido', 'falta-envido'];
    }
    if (last === 'envido-envido') return ['real-envido', 'falta-envido'];
    if (last === 'real-envido') return ['falta-envido'];
    return [];
  }
}
