import { Injectable } from '@angular/core';
import { Card } from '../models/card.model';
import { Player } from '../models/player.model';
import { EnvidoService } from './envido.service';
import { TrucoCall, EnvidoCall, FlorCall, Mano, VueltaResult } from '../models/game-state.model';

/**
 * Basic AI that makes reasonable decisions.
 * Strategy level: beginner-friendly (not unbeatable).
 */
@Injectable({ providedIn: 'root' })
export class AiService {

  constructor(private envidoSvc: EnvidoService) {}

  /** Choose which card to play */
  chooseCard(hand: Card[], mano: Mano, teamId: 'team1' | 'team2'): Card {
    const vueltaNum = mano.currentVuelta;
    const currentVuelta = mano.vueltas[vueltaNum - 1];
    const plays = currentVuelta?.plays ?? [];

    if (plays.length === 0) {
      // AI plays first: play weakest card to conserve strong ones
      return this.weakest(hand);
    }

    // AI plays second: try to win the vuelta
    const opponentCard = plays[plays.length - 1].card;
    const winning = hand.filter(c => c.trucoRank < opponentCard.trucoRank);

    if (winning.length > 0) {
      // Play the weakest winning card (conserve good cards)
      return winning.reduce((a, b) => a.trucoRank > b.trucoRank ? a : b);
    }

    // Can't win: play the weakest card
    return this.weakest(hand);
  }

  /** Decide whether to call/respond to Truco */
  decideTruco(
    hand: Card[],
    situation: 'call' | 'respond' | 'raise',
    currentPoints: number
  ): 'truco' | 'retruco' | 'vale4' | 'quiero' | 'no-quiero' {
    const strength = this.handStrength(hand);

    if (situation === 'call') {
      return strength >= 0.6 ? 'truco' : 'no-quiero';
    }
    if (situation === 'respond') {
      if (currentPoints === 1 && strength >= 0.4) return 'quiero';
      if (currentPoints === 2 && strength >= 0.6) return 'quiero';
      if (currentPoints === 3 && strength >= 0.75) return 'quiero';
      return 'no-quiero';
    }
    if (situation === 'raise') {
      return strength >= 0.75 ? 'retruco' : 'quiero';
    }
    return 'no-quiero';
  }

  /** Decide whether to call/respond to Envido */
  decideEnvido(
    hand: Card[],
    situation: 'call' | 'respond',
    teamScore: number,
    opponentScore: number
  ): EnvidoCall | 'quiero' | 'no-quiero' {
    const score = this.envidoSvc.calculateScore(hand).value;

    if (situation === 'call') {
      if (score >= 30) return 'falta-envido';
      if (score >= 27) return 'real-envido';
      if (score >= 23) return 'envido';
      return 'no-quiero';
    }

    // respond
    if (score >= 28) return 'quiero';
    if (score >= 23) return 'quiero';
    return 'no-quiero';
  }

  /** Decide flor */
  decideFlor(
    hand: Card[],
    situation: 'call' | 'respond'
  ): FlorCall | 'quiero' | 'no-quiero' {
    const score = this.envidoSvc.calculateScore(hand).value;
    if (situation === 'call') return 'flor';
    if (score >= 30) return 'quiero';
    return 'no-quiero';
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private weakest(hand: Card[]): Card {
    return hand.reduce((a, b) => a.trucoRank > b.trucoRank ? a : b);
  }

  private strongest(hand: Card[]): Card {
    return hand.reduce((a, b) => a.trucoRank < b.trucoRank ? a : b);
  }

  /** 0.0 (weak) → 1.0 (strong) based on truco ranks */
  private handStrength(hand: Card[]): number {
    // Average rank (lower rank = stronger). Worst rank = 16.
    const avg = hand.reduce((s, c) => s + c.trucoRank, 0) / hand.length;
    return 1 - (avg - 1) / 15;
  }
}
