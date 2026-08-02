import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../core/services/game.service';
import { GameMode } from '../../core/models/game-state.model';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="lobby">
      <div class="lobby-card">
        <div class="logo">
          <span class="suit">♠</span>
          <h1>Truco<br><span>Argentino</span></h1>
          <span class="suit">♣</span>
        </div>
        <p class="subtitle">Baraja española · 40 cartas · Comodines</p>
        <div class="modes">
          <h2>Elegí el modo</h2>
          <button class="mode-btn" (click)="start('1v1')">
            <span class="mode-icon">🤺</span>
            <span class="mode-name">1 vs 1</span>
            <span class="mode-desc">Mano a mano contra la IA</span>
          </button>
          <button class="mode-btn" (click)="start('2v2')">
            <span class="mode-icon">🤝</span>
            <span class="mode-name">2 vs 2</span>
            <span class="mode-desc">Parejas · Próximamente online</span>
          </button>
          <button class="mode-btn" (click)="start('3v3')">
            <span class="mode-icon">👥</span>
            <span class="mode-name">3 vs 3</span>
            <span class="mode-desc">Equipos · Próximamente online</span>
          </button>
        </div>
        <div class="rules-summary">
          <span>🃏 40 puntos para ganar</span>
          <span>⭐ 11♣ y 10♦ son comodines</span>
          <span>🌸 Con Flor incluida</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .lobby {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(ellipse at center, #1a2a1a 0%, #0d1a0d 100%);
      padding: 1rem;
    }
    .lobby-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 24px;
      padding: 2.5rem 2rem;
      max-width: 420px;
      width: 100%;
      text-align: center;
      backdrop-filter: blur(12px);
      box-shadow: 0 24px 64px rgba(0,0,0,0.6);
    }
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }
    .suit { font-size: 2.5rem; }
    h1 { font-size: 2.2rem; font-weight: 800; line-height: 1.1; color: #f0e6c8; }
    h1 span { color: #c9a84c; font-size: 1.6rem; }
    .subtitle { color: #8a9a8a; font-size: 0.85rem; margin-bottom: 2rem; }
    h2 { font-size: 1rem; color: #a0b0a0; margin-bottom: 1rem; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; }
    .modes { display: flex; flex-direction: column; gap: 0.75rem; margin-bottom: 1.5rem; }
    .mode-btn {
      display: flex; align-items: center; gap: 1rem;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      border-radius: 14px; padding: 1rem 1.25rem; cursor: pointer;
      transition: all 0.2s; text-align: left; color: white;
    }
    .mode-btn:hover { background: rgba(201,168,76,0.15); border-color: #c9a84c; transform: translateY(-1px); }
    .mode-icon { font-size: 1.8rem; }
    .mode-name { font-size: 1.1rem; font-weight: 700; color: #f0e6c8; flex: 1; }
    .mode-desc { font-size: 0.75rem; color: #6a7a6a; }
    .rules-summary { display: flex; flex-direction: column; gap: 0.3rem; }
    .rules-summary span { font-size: 0.8rem; color: #6a8a6a; }
  `]
})
export class LobbyComponent {
  constructor(private game: GameService) {}
  start(mode: GameMode) { this.game.startGame(mode); }
}
