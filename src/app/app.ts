import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameService } from './core/services/game.service';
import { LobbyComponent } from './features/lobby/lobby.component';
import { GameComponent } from './features/game/game.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, LobbyComponent, GameComponent],
  template: `
    @if (phase() === 'lobby') {
      <app-lobby />
    } @else {
      <app-game />
    }
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class App {
  readonly phase = computed(() => this.game.gamePhase());
  constructor(private game: GameService) {}
}
