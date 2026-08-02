import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from '../../../core/services/game.service';

@Component({
  selector: 'app-scoreboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scoreboard">
      <div class="team" [class.winning]="team1().score > team2().score">
        <span class="team-name">Nosotros</span>
        <span class="team-score">{{ team1().score }}</span>
        <div class="score-bar">
          <div class="score-fill" [style.width.%]="pct(team1().score)"></div>
        </div>
      </div>
      <div class="divider">
        <span class="pts-label">/ 40</span>
        <span class="mano-badge">Mano {{ manoNum() }}</span>
      </div>
      <div class="team" [class.winning]="team2().score > team1().score">
        <span class="team-name">Ellos</span>
        <span class="team-score">{{ team2().score }}</span>
        <div class="score-bar">
          <div class="score-fill rival" [style.width.%]="pct(team2().score)"></div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .scoreboard {
      display: flex; align-items: center; gap: 1rem;
      background: rgba(0,0,0,0.4); border-bottom: 1px solid rgba(255,255,255,0.08);
      padding: 0.6rem 1.25rem;
    }
    .team { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }
    .team:last-child { align-items: flex-end; }
    .team-name { font-size: 0.7rem; color: #6a8a6a; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
    .team-score { font-size: 2rem; font-weight: 800; color: #f0e6c8; line-height: 1; }
    .team.winning .team-score { color: #c9a84c; }
    .score-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; width: 100%; }
    .score-fill { height: 100%; background: #3a8a4a; border-radius: 2px; transition: width 0.5s; }
    .score-fill.rival { background: #8a3a3a; }
    .divider { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
    .pts-label { font-size: 0.7rem; color: #4a6a4a; }
    .mano-badge { font-size: 0.65rem; background: rgba(255,255,255,0.07); color: #6a8a6a; padding: 2px 8px; border-radius: 20px; white-space: nowrap; }
  `]
})
export class ScoreboardComponent {
  readonly team1 = computed(() => this.game.team1());
  readonly team2 = computed(() => this.game.team2());
  readonly manoNum = computed(() => (this.game.state().manoHistory.length + 1));
  constructor(private game: GameService) {}
  pct(score: number): number { return Math.min(100, (score / 40) * 100); }
}
