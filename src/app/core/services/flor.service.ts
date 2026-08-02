import { Injectable } from '@angular/core';
import { Card } from '../models/card.model';
import { FlorCall, FlorState } from '../models/game-state.model';
import { EnvidoService } from './envido.service';

@Injectable({ providedIn: 'root' })
export class FlorService {

  constructor(private envidoSvc: EnvidoService) {}

  initialState(team1Hand: Card[], team2Hand: Card[]): FlorState {
    return {
      phase: 'none',
      currentCall: null,
      callerTeamId: null,
      pointsIfAccepted: 3,
      pointsIfRefused: 2,
      team1HasFlor: this.envidoSvc.detectFlor(team1Hand).hasFlor,
      team2HasFlor: this.envidoSvc.detectFlor(team2Hand).hasFlor,
    };
  }

  getPointsIfAccepted(call: FlorCall): number {
    switch (call) {
      case 'flor':      return 3;
      case 'contraflor': return 6;
      case 'al-resto':  return -1; // calculated at runtime: points to 40
    }
  }

  getPointsIfRefused(call: FlorCall): number {
    switch (call) {
      case 'flor':       return 2;
      case 'contraflor': return 3;
      case 'al-resto':   return 6;
    }
  }

  nextCall(current: FlorCall | null): FlorCall | null {
    if (!current) return 'flor';
    if (current === 'flor') return 'contraflor';
    if (current === 'contraflor') return 'al-resto';
    return null;
  }

  applyCall(state: FlorState, call: FlorCall, callerTeamId: 'team1' | 'team2'): FlorState {
    return {
      ...state,
      phase: 'pending',
      currentCall: call,
      callerTeamId,
      pointsIfAccepted: this.getPointsIfAccepted(call),
      pointsIfRefused: this.getPointsIfRefused(call),
    };
  }

  accept(state: FlorState): FlorState {
    return { ...state, phase: 'accepted' };
  }

  refuse(state: FlorState): FlorState {
    return { ...state, phase: 'refused' };
  }

  /**
   * When both teams have flor, resolve automatically:
   * higher envido-of-flor wins. Returns winning teamId.
   */
  resolveFlor(
    team1Hand: Card[],
    team2Hand: Card[],
    manoTeamId: 'team1' | 'team2'
  ): 'team1' | 'team2' {
    const s1 = this.envidoSvc.calculateScore(team1Hand).value;
    const s2 = this.envidoSvc.calculateScore(team2Hand).value;
    if (s1 > s2) return 'team1';
    if (s2 > s1) return 'team2';
    return manoTeamId; // tie → mano wins
  }
}
