import { Card } from './card.model';
import { Player, Team } from './player.model';

// ─── Vuelta (individual round within a mano) ────────────────────────────────

export interface VueltaPlay {
  playerId: string;
  card: Card;
}

export type VueltaResult = 'team1' | 'team2' | 'parda';

export interface Vuelta {
  number: 1 | 2 | 3;
  plays: VueltaPlay[];      // cards played in order
  winner: VueltaResult | null;
}

// ─── Truco betting state ─────────────────────────────────────────────────────

export type TrucoCall = 'truco' | 'retruco' | 'vale4';
export type TrucoResponse = 'quiero' | 'no-quiero' | 'raise';
export type TrucoPhase = 'none' | 'pending' | 'accepted' | 'refused';

export interface TrucoState {
  phase: TrucoPhase;
  currentCall: TrucoCall | null;
  callerTeamId: 'team1' | 'team2' | null;
  /** Points if accepted at current call level */
  pointsIfAccepted: number;
  /** Points if refused at current call level */
  pointsIfRefused: number;
}

// ─── Envido betting state ────────────────────────────────────────────────────

export type EnvidoCall = 'envido' | 'envido-envido' | 'real-envido' | 'falta-envido';
export type EnvidoPhase = 'none' | 'pending' | 'accepted' | 'refused';

export interface EnvidoState {
  phase: EnvidoPhase;
  callChain: EnvidoCall[];
  callerTeamId: 'team1' | 'team2' | null;
  pointsIfAccepted: number;
  pointsIfRefused: number;
}

// ─── Flor betting state ──────────────────────────────────────────────────────

export type FlorCall = 'flor' | 'contraflor' | 'al-resto';
export type FlorPhase = 'none' | 'pending' | 'accepted' | 'refused';

export interface FlorState {
  phase: FlorPhase;
  currentCall: FlorCall | null;
  callerTeamId: 'team1' | 'team2' | null;
  pointsIfAccepted: number;
  pointsIfRefused: number;
  team1HasFlor: boolean;
  team2HasFlor: boolean;
}

// ─── Mano (full hand / deal) ─────────────────────────────────────────────────

export type ManoPhase =
  | 'dealing'
  | 'flor-resolution'   // flor must be resolved first
  | 'envido-window'     // can call envido during vuelta 1
  | 'playing'           // playing cards
  | 'finished';

export interface Mano {
  number: number;
  manoTeamId: 'team1' | 'team2';  // who is "mano" this hand
  currentTurnPlayerId: string;
  phase: ManoPhase;
  vueltas: Vuelta[];
  currentVuelta: 1 | 2 | 3;
  trucoState: TrucoState;
  envidoState: EnvidoState;
  florState: FlorState;
  winner: 'team1' | 'team2' | null;
  /** Team that went "al mazo" this mano */
  mazoTeamId: 'team1' | 'team2' | null;
}

// ─── Full game state ──────────────────────────────────────────────────────────

export type GameMode = '1v1' | '2v2' | '3v3';
export type GamePhase = 'lobby' | 'playing' | 'finished';

export interface GameState {
  mode: GameMode;
  phase: GamePhase;
  players: Player[];
  teams: { team1: Team; team2: Team };
  currentMano: Mano | null;
  manoHistory: Mano[];
  /** Points needed to win */
  pointsToWin: number;
  winner: 'team1' | 'team2' | null;
}
