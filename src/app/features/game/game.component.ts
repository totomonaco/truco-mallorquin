import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../core/services/game.service';
import { CardComponent } from './card/card.component';
import { ActionPanelComponent } from './action-panel/action-panel.component';
import { ScoreboardComponent } from './scoreboard/scoreboard.component';
import { Card } from '../../core/models/card.model';
import { Player } from '../../core/models/player.model';
import { Vuelta } from '../../core/models/game-state.model';

@Component({
  selector: 'app-game',
  standalone: true,
  imports: [CommonModule, CardComponent, ActionPanelComponent, ScoreboardComponent],
  template: `
    <div class="game-root">
      <app-scoreboard />
      <div class="table">
        <!-- Rival zone -->
        <div class="zone rival-zone">
          <span class="zone-label">{{ rivalName() }}</span>
          <div class="hand">
            @for (card of rivalHand(); track card.id) {
              <app-card [card]="card" [faceDown]="true" />
            }
          </div>
        </div>

        <!-- Played cards area -->
        <div class="played-area">
          @for (v of vueltas(); track v.number) {
            <div class="vuelta" [class.active]="v.number === currentVuelta()">
              <span class="vuelta-label">
                {{ v.number === 1 ? '1ra' : v.number === 2 ? '2da' : '3ra' }}
                @if (v.winner === 'parda') { <span class="parda-badge">PARDA</span> }
                @if (v.winner && v.winner !== 'parda') {
                  <span class="winner-badge" [class.us]="v.winner === 'team1'">
                    {{ v.winner === 'team1' ? 'Nos' : 'Ellos' }}
                  </span>
                }
              </span>
              <div class="vuelta-cards">
                @for (play of v.plays; track play.playerId) {
                  <app-card [card]="play.card" />
                }
              </div>
            </div>
          }
          @if (mano()?.phase === 'finished' && mano()?.winner) {
            <div class="status-msg">
              <div class="winner-msg" [class.us]="mano()?.winner === 'team1'">
                {{ mano()?.winner === 'team1' ? 'Ganamos la mano!' : 'Perdimos la mano' }}
              </div>
            </div>
          }
        </div>

        <!-- Human player zone -->
        <div class="zone player-zone">
          <span class="zone-label">
            Vos
            @if (isMyTurn()) { <span class="turn-indicator"> tu turno</span> }
          </span>
          <div class="hand">
            @for (card of humanHand(); track card.id) {
              <app-card
                [card]="card"
                [playable]="isMyTurn() && canPlay()"
                (cardClick)="onCardClick($event)"
              />
            }
          </div>
        </div>
      </div>

      <app-action-panel />

      @if (state().phase === 'finished') {
        <div class="game-over">
          <div class="game-over-card">
            @if (state().winner === 'team1') {
              <h2>Ganamos!</h2>
              <p>El equipo llego a 40 puntos</p>
            } @else {
              <h2>Perdimos</h2>
              <p>El rival llego a 40 puntos</p>
            }
            <button class="btn-play-again" (click)="playAgain()">Jugar de nuevo</button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .game-root {
      display: flex; flex-direction: column;
      height: 100vh; overflow: hidden;
      background: radial-gradient(ellipse at center, #1a3a1a 0%, #0d1a0d 100%);
      color: white; font-family: 'Inter', sans-serif;
    }
    .table { flex: 1; display: flex; flex-direction: column; padding: 1rem; gap: 0.75rem; overflow: hidden; }
    .zone { display: flex; flex-direction: column; gap: 0.5rem; }
    .rival-zone { align-items: center; }
    .player-zone { align-items: center; }
    .zone-label { font-size: 0.7rem; color: #6a8a6a; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
    .turn-indicator { color: #c9a84c; }
    .hand { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
    .played-area {
      flex: 1; display: flex; gap: 1rem;
      align-items: center; justify-content: center;
      background: rgba(0,0,0,0.2); border-radius: 16px;
      border: 1px solid rgba(255,255,255,0.05); padding: 1rem; position: relative;
    }
    .vuelta {
      display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
      padding: 0.75rem; border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.06);
      background: rgba(255,255,255,0.03);
      min-width: 100px; transition: all 0.3s;
    }
    .vuelta.active { border-color: rgba(201,168,76,0.3); background: rgba(201,168,76,0.05); }
    .vuelta-label { font-size: 0.65rem; color: #4a6a4a; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.3rem; }
    .vuelta-cards { display: flex; gap: 0.3rem; flex-wrap: wrap; justify-content: center; }
    .parda-badge { background: #5a5a2a; color: #e0d080; padding: 1px 5px; border-radius: 4px; font-size: 0.6rem; }
    .winner-badge { background: #2a5a2a; color: #80e080; padding: 1px 5px; border-radius: 4px; font-size: 0.6rem; }
    .winner-badge.us { background: #4a7a2a; color: #c0f080; }
    .status-msg { position: absolute; }
    .winner-msg { padding: 0.75rem 1.5rem; border-radius: 12px; font-size: 1.1rem; font-weight: 700; background: rgba(0,0,0,0.7); border: 1px solid rgba(255,255,255,0.1); }
    .winner-msg.us { color: #c9a84c; }
    .game-over { position: fixed; inset: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .game-over-card { background: rgba(20,40,20,0.95); border: 1px solid rgba(255,255,255,0.15); border-radius: 20px; padding: 3rem 2.5rem; text-align: center; }
    .game-over-card h2 { font-size: 2.5rem; margin: 0 0 0.5rem; }
    .game-over-card p { color: #6a8a6a; margin: 0 0 1.5rem; }
    .btn-play-again { background: #c9a84c; color: #1a1a0d; border: none; border-radius: 12px; padding: 0.75rem 2rem; font-size: 1rem; font-weight: 700; cursor: pointer; }
  `]
})
export class GameComponent {
  private game = inject(GameService);

  readonly state = computed(() => this.game.state());
  readonly mano = computed(() => this.game.currentMano());
  readonly humanPlayer = computed(() => this.game.state().players.find((p: Player) => p.type === 'human'));
  readonly humanHand = computed(() => this.humanPlayer()?.hand ?? []);
  readonly rivalHand = computed(() => {
    const rival = this.game.state().players.find((p: Player) => p.teamId === 'team2' && p.role === 'mano');
    return rival?.hand ?? [];
  });
  readonly rivalName = computed(() => this.game.state().teams.team2.name);
  readonly vueltas = computed(() => this.mano()?.vueltas ?? []);
  readonly currentVuelta = computed(() => this.mano()?.currentVuelta ?? 1);
  readonly isMyTurn = computed(() => {
    const m = this.mano();
    const p = this.humanPlayer();
    return !!m && !!p && m.currentTurnPlayerId === p.id;
  });

  canPlay(): boolean {
    const m = this.mano();
    return !!m &&
      (m.phase === 'playing' || m.phase === 'envido-window') &&
      m.trucoState.phase !== 'pending' &&
      m.envidoState.phase !== 'pending' &&
      m.florState.phase !== 'pending';
  }

  onCardClick(card: Card): void {
    const p = this.humanPlayer();
    if (p) this.game.playCard(p.id, card);
  }

  playAgain(): void {
    const mode = this.game.state().mode;
    this.game.startGame(mode);
  }
}
