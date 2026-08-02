import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../../core/services/game.service';
import { EnvidoCall, FlorCall, TrucoCall } from '../../../core/models/game-state.model';
import { Player } from '../../../core/models/player.model';

@Component({
  selector: 'app-action-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="action-panel">
      @if (mano(); as m) {

        <!-- FLOR resolution -->
        @if (m.phase === 'flor-resolution') {
          <div class="panel-section">
            <h3>🌸 Tenés Flor</h3>
            <button class="btn btn-flor" (click)="callFlor('flor')">Cantar Flor</button>
            <button class="btn btn-mazo" (click)="irAlMazo()">Al Mazo</button>
          </div>
        }

        <!-- FLOR pending response -->
        @if (m.florState.phase === 'pending' && !isMyCaller(m.florState.callerTeamId)) {
          <div class="panel-section pending">
            <h3>🌸 {{ callerName(m.florState.callerTeamId) }} cantó <strong>{{ m.florState.currentCall | uppercase }}</strong></h3>
            <div class="row">
              <button class="btn btn-quiero" (click)="respondFlor('quiero')">Quiero ({{ m.florState.pointsIfAccepted }})</button>
              <button class="btn btn-noquiero" (click)="respondFlor('no-quiero')">No Quiero ({{ m.florState.pointsIfRefused }})</button>
              @if (nextFlorCall(m.florState.currentCall); as next) {
                <button class="btn btn-flor" (click)="callFlor(next)">{{ next | uppercase }} ({{ florPts(next) }})</button>
              }
            </div>
          </div>
        }

        <!-- ENVIDO window -->
        @if ((m.phase === 'envido-window' || m.phase === 'playing') && m.envidoState.phase === 'none' && m.currentVuelta === 1) {
          <div class="panel-section">
            <h3>🟢 Envido</h3>
            <div class="row">
              <button class="btn btn-envido" (click)="callEnvido('envido')">Envido</button>
              <button class="btn btn-envido" (click)="callEnvido('real-envido')">Real Envido</button>
              <button class="btn btn-envido" (click)="callEnvido('falta-envido')">Falta Envido</button>
            </div>
          </div>
        }

        <!-- ENVIDO pending response -->
        @if (m.envidoState.phase === 'pending' && !isMyCaller(m.envidoState.callerTeamId)) {
          <div class="panel-section pending">
            <h3>🟢 {{ callerName(m.envidoState.callerTeamId) }} cantó <strong>{{ lastEnvido(m.envidoState.callChain) | uppercase }}</strong></h3>
            <div class="row">
              <button class="btn btn-quiero" (click)="respondEnvido('quiero')">Quiero</button>
              <button class="btn btn-noquiero" (click)="respondEnvido('no-quiero')">No Quiero ({{ m.envidoState.pointsIfRefused }})</button>
            </div>
          </div>
        }

        <!-- TRUCO -->
        @if (m.trucoState.phase === 'none' && m.phase === 'playing') {
          <div class="panel-section">
            <h3>🎯 Truco</h3>
            <button class="btn btn-truco" (click)="callTruco('truco')">Truco</button>
          </div>
        }

        <!-- TRUCO pending response -->
        @if (m.trucoState.phase === 'pending' && !isMyCaller(m.trucoState.callerTeamId)) {
          <div class="panel-section pending">
            <h3>🎯 {{ callerName(m.trucoState.callerTeamId) }} cantó <strong>{{ m.trucoState.currentCall | uppercase }}</strong></h3>
            <div class="row">
              <button class="btn btn-quiero" (click)="respondTruco('quiero')">Quiero ({{ m.trucoState.pointsIfAccepted }})</button>
              <button class="btn btn-noquiero" (click)="respondTruco('no-quiero')">No Quiero ({{ m.trucoState.pointsIfRefused }})</button>
              @if (nextTrucoCall(m.trucoState.currentCall); as next) {
                <button class="btn btn-truco" (click)="respondTruco('raise', next)">{{ next | uppercase }}</button>
              }
            </div>
          </div>
        }

        <!-- TRUCO accepted — can raise -->
        @if (m.trucoState.phase === 'accepted' && canRaise(m.trucoState)) {
          <div class="panel-section">
            @if (nextTrucoCall(m.trucoState.currentCall); as next) {
              <button class="btn btn-truco" (click)="callTruco(next)">{{ next | uppercase }}</button>
            }
          </div>
        }

        <!-- Mazo always available -->
        @if (m.phase === 'playing' || m.phase === 'envido-window') {
          <div class="panel-section mazo-section">
            <button class="btn btn-mazo" (click)="irAlMazo()">Al Mazo</button>
          </div>
        }
      }
    </div>
  `,
  styles: [`
    .action-panel {
      background: rgba(0,0,0,0.3);
      border-top: 1px solid rgba(255,255,255,0.08);
      padding: 0.75rem 1rem;
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      min-height: 80px;
      align-items: center;
    }
    .panel-section { display: flex; flex-direction: column; gap: 0.4rem; }
    .panel-section.pending { background: rgba(255,220,50,0.06); border: 1px solid rgba(255,220,50,0.2); border-radius: 10px; padding: 0.6rem; }
    .panel-section.mazo-section { margin-left: auto; }
    h3 { font-size: 0.78rem; color: #a0b0a0; margin: 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    h3 strong { color: #f5e06a; }
    .row { display: flex; gap: 0.4rem; flex-wrap: wrap; }
    .btn {
      padding: 0.45rem 0.9rem; border: none; border-radius: 8px;
      font-size: 0.8rem; font-weight: 700; cursor: pointer;
      transition: all 0.15s; letter-spacing: 0.02em;
    }
    .btn:hover { transform: translateY(-1px); filter: brightness(1.15); }
    .btn-truco { background: #c9a84c; color: #1a1a0d; }
    .btn-envido { background: #3a8a4a; color: white; }
    .btn-flor { background: #8a3a8a; color: white; }
    .btn-quiero { background: #2a7a4a; color: white; }
    .btn-noquiero { background: #7a2a2a; color: white; }
    .btn-mazo { background: rgba(255,255,255,0.08); color: #a0a0a0; border: 1px solid rgba(255,255,255,0.15); }
  `]
})
export class ActionPanelComponent {
  private game = inject(GameService);
  readonly mano = computed(() => this.game.currentMano());
  private readonly humanPlayer = computed(() => this.game.state().players.find((p: Player) => p.type === 'human'));

  isMyCaller(callerTeamId: string | null): boolean {
    return callerTeamId === this.humanPlayer()?.teamId;
  }
  callerName(id: string | null): string { return id === 'team1' ? 'Vos' : 'El rival'; }
  lastEnvido(chain: EnvidoCall[]): string { return chain[chain.length - 1] ?? ''; }

  nextTrucoCall(current: TrucoCall | null): TrucoCall | null {
    if (!current) return null;
    if (current === 'truco') return 'retruco';
    if (current === 'retruco') return 'vale4';
    return null;
  }
  nextFlorCall(current: FlorCall | null): FlorCall | null {
    if (current === 'flor') return 'contraflor';
    if (current === 'contraflor') return 'al-resto';
    return null;
  }
  florPts(call: FlorCall): number {
    if (call === 'contraflor') return 6;
    if (call === 'al-resto') return 0;
    return 3;
  }
  canRaise(ts: any): boolean {
    return ts.callerTeamId !== this.humanPlayer()?.teamId && this.nextTrucoCall(ts.currentCall) !== null;
  }

  callTruco(call: TrucoCall) { this.game.callTruco(this.humanPlayer()!.teamId, call); }
  respondTruco(r: 'quiero' | 'no-quiero' | 'raise', next?: TrucoCall) { this.game.respondTruco(r, next); }
  callEnvido(call: EnvidoCall) { this.game.callEnvido(this.humanPlayer()!.teamId, call); }
  respondEnvido(r: any) { this.game.respondEnvido(r); }
  callFlor(call: FlorCall) { this.game.callFlor(this.humanPlayer()!.teamId, call); }
  respondFlor(r: any) { this.game.respondFlor(r); }
  irAlMazo() { this.game.irseAlMazo(this.humanPlayer()!.teamId); }
}
