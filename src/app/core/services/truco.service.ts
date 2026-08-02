import { Injectable } from '@angular/core';
import { TrucoCall, TrucoState } from '../models/game-state.model';

@Injectable({ providedIn: 'root' })
export class TrucoService {

  initialState(): TrucoState {
    return {
      phase: 'none',
      currentCall: null,
      callerTeamId: null,
      pointsIfAccepted: 2,
      pointsIfRefused: 1,
    };
  }

  /** Points if accepted at this call level */
  getPointsIfAccepted(call: TrucoCall): number {
    switch (call) {
      case 'truco':   return 2;
      case 'retruco': return 3;
      case 'vale4':   return 4;
    }
  }

  /** Points if refused at this call level */
  getPointsIfRefused(call: TrucoCall): number {
    switch (call) {
      case 'truco':   return 1;
      case 'retruco': return 2;
      case 'vale4':   return 3;
    }
  }

  /** Next call in the escalation chain */
  nextCall(current: TrucoCall | null): TrucoCall | null {
    if (!current) return 'truco';
    if (current === 'truco') return 'retruco';
    if (current === 'retruco') return 'vale4';
    return null; // vale4 is max
  }

  /** Whether a team can raise (only the team that ACCEPTED can raise) */
  canRaise(state: TrucoState, teamId: 'team1' | 'team2'): boolean {
    return (
      state.phase === 'accepted' &&
      state.callerTeamId !== teamId &&
      this.nextCall(state.currentCall) !== null
    );
  }

  /** Whether a team can call truco (only when no pending truco) */
  canCall(state: TrucoState, teamId: 'team1' | 'team2'): boolean {
    return state.phase === 'none';
  }

  /** Apply a new truco call, returns updated state */
  applyCall(state: TrucoState, call: TrucoCall, callerTeamId: 'team1' | 'team2'): TrucoState {
    return {
      ...state,
      phase: 'pending',
      currentCall: call,
      callerTeamId,
      pointsIfAccepted: this.getPointsIfAccepted(call),
      pointsIfRefused: this.getPointsIfRefused(call),
    };
  }

  /** Accept the current truco call */
  accept(state: TrucoState): TrucoState {
    return { ...state, phase: 'accepted' };
  }

  /** Refuse the current truco call */
  refuse(state: TrucoState): TrucoState {
    return { ...state, phase: 'refused' };
  }
}
