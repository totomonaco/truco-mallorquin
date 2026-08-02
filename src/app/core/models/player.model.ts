import { Card } from './card.model';

export type PlayerRole = 'mano' | 'pie';
export type PlayerType = 'human' | 'ai';

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  teamId: 'team1' | 'team2';
  role: PlayerRole;
  hand: Card[];          // cards in hand
  playedCards: Card[];   // cards played this mano
}

export interface Team {
  id: 'team1' | 'team2';
  name: string;
  playerIds: string[];
  score: number;         // total points in the game
  roundPoints: number;   // points earned this mano (truco + envido)
}
