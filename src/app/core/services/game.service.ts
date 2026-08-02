import { Injectable, signal, computed } from '@angular/core';
import { Player, Team } from '../models/player.model';
import { GameState, GameMode, Mano, ManoPhase, Vuelta, VueltaResult, TrucoCall, EnvidoCall, FlorCall } from '../models/game-state.model';
import { Card } from '../models/card.model';
import { DeckService } from './deck.service';
import { TrucoService } from './truco.service';
import { EnvidoService } from './envido.service';
import { FlorService } from './flor.service';
import { AiService } from './ai.service';

@Injectable({ providedIn: 'root' })
export class GameService {

  private _state = signal<GameState>(this.emptyState());
  readonly state = this._state.asReadonly();

  readonly team1 = computed(() => this._state().teams.team1);
  readonly team2 = computed(() => this._state().teams.team2);
  readonly currentMano = computed(() => this._state().currentMano);
  readonly gamePhase = computed(() => this._state().phase);
  readonly winner = computed(() => this._state().winner);

  constructor(
    private deckSvc: DeckService,
    private trucoSvc: TrucoService,
    private envidoSvc: EnvidoService,
    private florSvc: FlorService,
    private aiSvc: AiService,
  ) {}

  // ─── Setup ────────────────────────────────────────────────────────────────

  startGame(mode: GameMode): void {
    const playersPerTeam = mode === '1v1' ? 1 : mode === '2v2' ? 2 : 3;
    const players = this.createPlayers(playersPerTeam);
    const teams: { team1: Team; team2: Team } = {
      team1: { id: 'team1', name: 'Nosotros', playerIds: players.filter(p => p.teamId === 'team1').map(p => p.id), score: 0, roundPoints: 0 },
      team2: { id: 'team2', name: 'Ellos', playerIds: players.filter(p => p.teamId === 'team2').map(p => p.id), score: 0, roundPoints: 0 },
    };
    this._state.set({ mode, phase: 'playing', players, teams, currentMano: null, manoHistory: [], pointsToWin: 40, winner: null });
    this.startMano();
  }

  private createPlayers(perTeam: number): Player[] {
    const players: Player[] = [];
    for (let i = 0; i < perTeam; i++) {
      players.push({ id: `t1-p${i}`, name: i === 0 ? 'Vos' : `Compañero ${i}`, type: i === 0 ? 'human' : 'ai', teamId: 'team1', role: i === 0 ? 'mano' : 'pie', hand: [], playedCards: [] });
      players.push({ id: `t2-p${i}`, name: `Rival ${i + 1}`, type: 'ai', teamId: 'team2', role: i === 0 ? 'mano' : 'pie', hand: [], playedCards: [] });
    }
    return players;
  }

  // ─── Mano lifecycle ───────────────────────────────────────────────────────

  startMano(): void {
    const st = this._state();
    const players = st.players;
    const hands = this.deckSvc.dealFresh(players.length);
    const manoNum = st.manoHistory.length + 1;
    const manoTeamId: 'team1' | 'team2' = manoNum % 2 === 1 ? 'team1' : 'team2';

    const updatedPlayers = players.map((p, i) => ({ ...p, hand: hands[i], playedCards: [] }));

    // Detect flor for each team
    const t1Players = updatedPlayers.filter(p => p.teamId === 'team1');
    const t2Players = updatedPlayers.filter(p => p.teamId === 'team2');
    // Use first player of each team for flor detection (1v1) — for 2v2/3v3 any player can have flor
    const t1HasFlor = t1Players.some(p => this.envidoSvc.detectFlor(p.hand).hasFlor);
    const t2HasFlor = t2Players.some(p => this.envidoSvc.detectFlor(p.hand).hasFlor);

    const florState = {
      phase: 'none' as const,
      currentCall: null,
      callerTeamId: null,
      pointsIfAccepted: 3,
      pointsIfRefused: 2,
      team1HasFlor: t1HasFlor,
      team2HasFlor: t2HasFlor,
    };

    const mano: Mano = {
      number: manoNum,
      manoTeamId,
      currentTurnPlayerId: this.getManoPlayer(updatedPlayers, manoTeamId).id,
      phase: t1HasFlor || t2HasFlor ? 'flor-resolution' : 'envido-window',
      vueltas: [{ number: 1, plays: [], winner: null }],
      currentVuelta: 1,
      trucoState: this.trucoSvc.initialState(),
      envidoState: { phase: 'none', callChain: [], callerTeamId: null, pointsIfAccepted: 2, pointsIfRefused: 1 },
      florState,
      winner: null,
      mazoTeamId: null,
    };

    this._state.update(s => ({ ...s, players: updatedPlayers, currentMano: mano }));
    this.triggerAiIfNeeded();
  }

  private getManoPlayer(players: Player[], manoTeamId: 'team1' | 'team2'): Player {
    return players.find(p => p.teamId === manoTeamId && p.role === 'mano')!;
  }

  // ─── Playing cards ────────────────────────────────────────────────────────

  playCard(playerId: string, card: Card): void {
    const st = this._state();
    const mano = st.currentMano;
    if (!mano || mano.currentTurnPlayerId !== playerId) return;
    if (mano.phase !== 'playing' && mano.phase !== 'envido-window') return;

    const vueltaIdx = mano.currentVuelta - 1;
    const vuelta = mano.vueltas[vueltaIdx];
    const newPlay = { playerId, card };
    const newPlays = [...vuelta.plays, newPlay];

    // Remove card from player's hand
    const updatedPlayers = st.players.map(p =>
      p.id === playerId ? { ...p, hand: p.hand.filter(c => c.id !== card.id), playedCards: [...p.playedCards, card] } : p
    );

    const totalPlayers = st.players.length;
    let updatedVuelta: Vuelta = { ...vuelta, plays: newPlays };
    let updatedMano = { ...mano, phase: 'playing' as ManoPhase };

    if (newPlays.length === totalPlayers) {
      // Vuelta complete — determine winner
      const winner = this.resolveVuelta(newPlays.map(p => p.card), mano);
      updatedVuelta = { ...updatedVuelta, winner };

      // Check if mano is over
      const allVueltas = [...mano.vueltas.slice(0, vueltaIdx), updatedVuelta];
      const manoWinner = this.checkManoWinner(allVueltas, mano.manoTeamId);

      if (manoWinner) {
        updatedMano = { ...updatedMano, vueltas: allVueltas, winner: manoWinner, phase: 'finished' };
        this._state.update(s => ({ ...s, players: updatedPlayers, currentMano: updatedMano }));
        this.finishMano(manoWinner);
        return;
      }

      // Next vuelta
      const nextVueltaNum = (mano.currentVuelta + 1) as 1 | 2 | 3;
      const nextVuelta: Vuelta = { number: nextVueltaNum, plays: [], winner: null };
      const nextTurnPlayer = this.getFirstPlayerForVuelta(updatedPlayers, winner, mano.manoTeamId, updatedMano);

      updatedMano = {
        ...updatedMano,
        vueltas: [...allVueltas, nextVuelta],
        currentVuelta: nextVueltaNum,
        currentTurnPlayerId: nextTurnPlayer,
        phase: 'playing',
      };
    } else {
      // Next player's turn within the vuelta
      const nextPlayer = this.nextPlayerInTurn(st.players, playerId);
      updatedMano = {
        ...updatedMano,
        vueltas: [...mano.vueltas.slice(0, vueltaIdx), updatedVuelta],
        currentTurnPlayerId: nextPlayer.id,
        phase: 'playing',
      };
    }

    this._state.update(s => ({ ...s, players: updatedPlayers, currentMano: updatedMano }));
    this.triggerAiIfNeeded();
  }

  private resolveVuelta(cards: Card[], mano: Mano): VueltaResult {
    const best = cards.reduce((a, b) => a.trucoRank < b.trucoRank ? a : b);
    const tied = cards.every(c => c.trucoRank === best.trucoRank);
    if (tied) return 'parda';

    const winners = cards.filter(c => c.trucoRank === best.trucoRank);
    if (winners.length > 1) return 'parda'; // ties between teams

    // Find which team played the best card
    const st = this._state();
    const vuelta = mano.vueltas[mano.currentVuelta - 1];
    const bestPlay = vuelta.plays.find(p => p.card.id === best.id);
    const player = st.players.find(p => p.id === bestPlay?.playerId);
    return player?.teamId ?? 'parda';
  }

  private checkManoWinner(vueltas: Vuelta[], manoTeamId: 'team1' | 'team2'): 'team1' | 'team2' | null {
    const t1Wins = vueltas.filter(v => v.winner === 'team1').length;
    const t2Wins = vueltas.filter(v => v.winner === 'team2').length;
    const pardas = vueltas.filter(v => v.winner === 'parda').length;

    if (t1Wins >= 2) return 'team1';
    if (t2Wins >= 2) return 'team2';

    // All 3 played
    if (vueltas.length === 3) {
      if (t1Wins > t2Wins) return 'team1';
      if (t2Wins > t1Wins) return 'team2';
      return manoTeamId; // full tie → mano wins
    }

    // Parda in vuelta 1 + someone wins vuelta 2 → they win
    if (pardas === 1 && vueltas.length === 2) {
      if (t1Wins === 1) return 'team1';
      if (t2Wins === 1) return 'team2';
    }

    return null;
  }

  private getFirstPlayerForVuelta(players: Player[], vueltaResult: VueltaResult, manoTeamId: 'team1' | 'team2', mano: Mano): string {
    const winnerTeam = vueltaResult === 'parda' ? manoTeamId : vueltaResult;
    return players.find(p => p.teamId === winnerTeam && p.role === 'mano')?.id ?? players[0].id;
  }

  private nextPlayerInTurn(players: Player[], currentId: string): Player {
    const idx = players.findIndex(p => p.id === currentId);
    return players[(idx + 1) % players.length];
  }

  // ─── Mazo ─────────────────────────────────────────────────────────────────

  irseAlMazo(teamId: 'team1' | 'team2'): void {
    const mano = this._state().currentMano;
    if (!mano) return;
    const rivalTeam: 'team1' | 'team2' = teamId === 'team1' ? 'team2' : 'team1';
    const trucoPoints = mano.trucoState.pointsIfRefused;
    const updatedMano = { ...mano, mazoTeamId: teamId, winner: rivalTeam, phase: 'finished' as ManoPhase };
    this._state.update(s => ({ ...s, currentMano: updatedMano }));
    this.finishMano(rivalTeam, { truco: trucoPoints });
  }

  // ─── Truco ────────────────────────────────────────────────────────────────

  callTruco(teamId: 'team1' | 'team2', call: TrucoCall): void {
    this._state.update(s => {
      if (!s.currentMano) return s;
      const trucoState = this.trucoSvc.applyCall(s.currentMano.trucoState, call, teamId);
      return { ...s, currentMano: { ...s.currentMano, trucoState } };
    });
    this.triggerAiIfNeeded();
  }

  respondTruco(response: 'quiero' | 'no-quiero' | 'raise', raisingCall?: TrucoCall): void {
    this._state.update(s => {
      if (!s.currentMano) return s;
      let trucoState = s.currentMano.trucoState;
      if (response === 'quiero') trucoState = this.trucoSvc.accept(trucoState);
      else if (response === 'no-quiero') trucoState = this.trucoSvc.refuse(trucoState);
      else if (response === 'raise' && raisingCall) {
        const rival: 'team1' | 'team2' = trucoState.callerTeamId === 'team1' ? 'team2' : 'team1';
        trucoState = this.trucoSvc.applyCall(trucoState, raisingCall, rival);
      }
      return { ...s, currentMano: { ...s.currentMano, trucoState } };
    });

    const mano = this._state().currentMano!;
    if (mano.trucoState.phase === 'refused') {
      const winner = mano.trucoState.callerTeamId!;
      this.finishMano(winner, { truco: mano.trucoState.pointsIfRefused });
    }
    this.triggerAiIfNeeded();
  }

  // ─── Envido ───────────────────────────────────────────────────────────────

  callEnvido(teamId: 'team1' | 'team2', call: EnvidoCall): void {
    this._state.update(s => {
      if (!s.currentMano) return s;
      const chain = [...s.currentMano.envidoState.callChain, call];
      const envidoState = {
        phase: 'pending' as const,
        callChain: chain,
        callerTeamId: teamId,
        pointsIfAccepted: this.envidoSvc.getPointsIfAccepted(chain),
        pointsIfRefused: this.envidoSvc.getPointsIfRefused(chain),
      };
      return { ...s, currentMano: { ...s.currentMano, envidoState } };
    });
    this.triggerAiIfNeeded();
  }

  respondEnvido(response: 'quiero' | 'no-quiero' | EnvidoCall): void {
    const mano = this._state().currentMano!;
    const rival: 'team1' | 'team2' = mano.envidoState.callerTeamId === 'team1' ? 'team2' : 'team1';

    if (response === 'quiero') {
      // Resolve: compare scores
      const st = this._state();
      const t1Player = st.players.find(p => p.teamId === 'team1' && p.role === 'mano')!;
      const t2Player = st.players.find(p => p.teamId === 'team2' && p.role === 'mano')!;
      const s1 = this.envidoSvc.calculateScore(t1Player.hand).value;
      const s2 = this.envidoSvc.calculateScore(t2Player.hand).value;
      const pts = mano.envidoState.pointsIfAccepted === -1
        ? (40 - st.teams[rival].score) // falta envido
        : mano.envidoState.pointsIfAccepted;
      const envidoWinner: 'team1' | 'team2' = s1 > s2 ? 'team1' : s2 > s1 ? 'team2' : mano.manoTeamId;
      this._state.update(s => ({
        ...s,
        teams: {
          ...s.teams,
          [envidoWinner]: { ...s.teams[envidoWinner], score: s.teams[envidoWinner].score + pts },
        },
        currentMano: { ...s.currentMano!, envidoState: { ...s.currentMano!.envidoState, phase: 'accepted' } },
      }));
    } else if (response === 'no-quiero') {
      const pts = mano.envidoState.pointsIfRefused;
      const callerTeam = mano.envidoState.callerTeamId!;
      this._state.update(s => ({
        ...s,
        teams: { ...s.teams, [callerTeam]: { ...s.teams[callerTeam], score: s.teams[callerTeam].score + pts } },
        currentMano: { ...s.currentMano!, envidoState: { ...s.currentMano!.envidoState, phase: 'refused' } },
      }));
    } else {
      // raise
      this.callEnvido(rival, response as EnvidoCall);
      return;
    }
    this.checkGameWinner();
    this.triggerAiIfNeeded();
  }

  // ─── Flor ─────────────────────────────────────────────────────────────────

  callFlor(teamId: 'team1' | 'team2', call: FlorCall): void {
    this._state.update(s => {
      if (!s.currentMano) return s;
      const florState = this.florSvc.applyCall(s.currentMano.florState, call, teamId);
      return { ...s, currentMano: { ...s.currentMano, florState } };
    });
    this.triggerAiIfNeeded();
  }

  respondFlor(response: 'quiero' | 'no-quiero' | FlorCall): void {
    const mano = this._state().currentMano!;
    const caller = mano.florState.callerTeamId!;
    const rival: 'team1' | 'team2' = caller === 'team1' ? 'team2' : 'team1';

    if (response === 'no-quiero') {
      const pts = mano.florState.pointsIfRefused;
      this._state.update(s => ({
        ...s,
        teams: { ...s.teams, [caller]: { ...s.teams[caller], score: s.teams[caller].score + pts } },
        currentMano: { ...s.currentMano!, florState: { ...s.currentMano!.florState, phase: 'refused' }, phase: 'envido-window' },
      }));
    } else if (response === 'quiero') {
      // Both teams declared flor — resolve by score
      const st = this._state();
      const t1P = st.players.find(p => p.teamId === 'team1' && p.role === 'mano')!;
      const t2P = st.players.find(p => p.teamId === 'team2' && p.role === 'mano')!;
      const florWinner = this.florSvc.resolveFlor(t1P.hand, t2P.hand, mano.manoTeamId);
      const pts = mano.florState.pointsIfAccepted === -1
        ? (40 - st.teams[rival].score)
        : mano.florState.pointsIfAccepted;
      this._state.update(s => ({
        ...s,
        teams: { ...s.teams, [florWinner]: { ...s.teams[florWinner], score: s.teams[florWinner].score + pts } },
        currentMano: { ...s.currentMano!, florState: { ...s.currentMano!.florState, phase: 'accepted' }, phase: 'envido-window' },
      }));
    } else {
      // raise
      this.callFlor(rival, response as FlorCall);
      return;
    }
    this.checkGameWinner();
    this.triggerAiIfNeeded();
  }

  // ─── Finish & score ───────────────────────────────────────────────────────

  private finishMano(winner: 'team1' | 'team2', extra?: { truco?: number }): void {
    const mano = this._state().currentMano!;
    const trucoPoints = extra?.truco ?? (mano.trucoState.phase === 'accepted' ? mano.trucoState.pointsIfAccepted : 1);

    this._state.update(s => ({
      ...s,
      teams: { ...s.teams, [winner]: { ...s.teams[winner], score: s.teams[winner].score + trucoPoints } },
      currentMano: { ...s.currentMano!, phase: 'finished', winner },
    }));

    const hasWinner = this.checkGameWinner();
    if (!hasWinner) {
      setTimeout(() => this.startMano(), 1800);
    }
  }

  private checkGameWinner(): boolean {
    const st = this._state();
    if (st.teams.team1.score >= st.pointsToWin) {
      this._state.update(s => ({ ...s, phase: 'finished', winner: 'team1' }));
      return true;
    }
    if (st.teams.team2.score >= st.pointsToWin) {
      this._state.update(s => ({ ...s, phase: 'finished', winner: 'team2' }));
      return true;
    }
    return false;
  }

  // ─── AI trigger ───────────────────────────────────────────────────────────

  private triggerAiIfNeeded(): void {
    const st = this._state();
    const mano = st.currentMano;
    if (!mano || mano.phase === 'finished') return;

    const currentPlayer = st.players.find(p => p.id === mano.currentTurnPlayerId);
    if (!currentPlayer || currentPlayer.type !== 'ai') return;

    setTimeout(() => this.runAiTurn(), 900);
  }

  private runAiTurn(): void {
    const st = this._state();
    const mano = st.currentMano;
    if (!mano) return;

    const player = st.players.find(p => p.id === mano.currentTurnPlayerId);
    if (!player || player.type !== 'ai') return;

    // Handle pending calls first
    if (mano.trucoState.phase === 'pending' && mano.trucoState.callerTeamId !== player.teamId) {
      const score = this.aiSvc.decideTruco(player.hand, 'respond', mano.trucoState.pointsIfAccepted);
      this.respondTruco(score as any);
      return;
    }
    if (mano.envidoState.phase === 'pending' && mano.envidoState.callerTeamId !== player.teamId) {
      const score = this.aiSvc.decideEnvido(player.hand, 'respond', st.teams[player.teamId].score, 0);
      this.respondEnvido(score as any);
      return;
    }
    if (mano.florState.phase === 'pending' && mano.florState.callerTeamId !== player.teamId) {
      this.respondFlor('quiero');
      return;
    }

    // Flor resolution: AI calls flor if it has it
    if (mano.phase === 'flor-resolution' && mano.florState[`${player.teamId}HasFlor` as keyof typeof mano.florState]) {
      this.callFlor(player.teamId, 'flor');
      return;
    }

    // Play a card
    if ((mano.phase === 'playing' || mano.phase === 'envido-window') && player.hand.length > 0) {
      const card = this.aiSvc.chooseCard(player.hand, mano, player.teamId);
      this.playCard(player.id, card);
    }
  }

  // ─── Utils ────────────────────────────────────────────────────────────────

  private emptyState(): GameState {
    return {
      mode: '1v1',
      phase: 'lobby',
      players: [],
      teams: {
        team1: { id: 'team1', name: 'Nosotros', playerIds: [], score: 0, roundPoints: 0 },
        team2: { id: 'team2', name: 'Ellos', playerIds: [], score: 0, roundPoints: 0 },
      },
      currentMano: null,
      manoHistory: [],
      pointsToWin: 40,
      winner: null,
    };
  }

  resetGame(): void {
    this._state.set(this.emptyState());
  }
}
