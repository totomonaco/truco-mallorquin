import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Card } from '../../../core/models/card.model';

const SUIT_SYMBOL: Record<string, string> = {
  espadas: '♠', bastos: '♣', oros: '♦', copas: '♥'
};
const SUIT_COLOR: Record<string, string> = {
  espadas: '#e8e8f0', bastos: '#e8e8f0', oros: '#f5c842', copas: '#e05050'
};
const NUMBER_LABEL: Record<number, string> = {
  1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  10: '10', 11: 'C', 12: 'R'
};

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="card"
      [class.playable]="playable"
      [class.face-down]="faceDown"
      [class.comodin]="card.isComodin"
      [style.--suit-color]="suitColor"
      (click)="playable && cardClick.emit(card)"
    >
      @if (!faceDown) {
        <div class="card-inner">
          <div class="corner top-left">
            <span class="num">{{ numLabel }}</span>
            <span class="suit-sym">{{ suitSymbol }}</span>
          </div>
          <div class="center-suit">{{ suitSymbol }}</div>
          <div class="corner bottom-right">
            <span class="num">{{ numLabel }}</span>
            <span class="suit-sym">{{ suitSymbol }}</span>
          </div>
          @if (card.isComodin) {
            <div class="comodin-badge">⭐</div>
          }
        </div>
      } @else {
        <div class="card-back">
          <div class="back-pattern">🃏</div>
        </div>
      }
    </div>
  `,
  styles: [`
    .card {
      width: 80px; height: 120px;
      border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.15);
      background: #faf6ee;
      cursor: default;
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
      user-select: none;
      flex-shrink: 0;
      box-shadow: 2px 4px 12px rgba(0,0,0,0.4);
    }
    .card.playable { cursor: pointer; }
    .card.playable:hover { transform: translateY(-12px) scale(1.05); box-shadow: 4px 12px 24px rgba(0,0,0,0.5); }
    .card.comodin { border-color: #c9a84c; box-shadow: 0 0 12px rgba(201,168,76,0.4), 2px 4px 12px rgba(0,0,0,0.4); }
    .card.face-down { background: linear-gradient(135deg, #1a3a2a, #0d2a1a); cursor: default; }
    .card-inner { width: 100%; height: 100%; padding: 6px; display: flex; flex-direction: column; justify-content: space-between; }
    .corner { display: flex; flex-direction: column; align-items: center; line-height: 1; }
    .corner.bottom-right { align-self: flex-end; transform: rotate(180deg); }
    .num { font-size: 1rem; font-weight: 800; color: var(--suit-color); }
    .suit-sym { font-size: 0.8rem; color: var(--suit-color); }
    .center-suit { font-size: 2rem; text-align: center; color: var(--suit-color); }
    .comodin-badge { position: absolute; top: 4px; right: 4px; font-size: 0.65rem; }
    .card-back { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; border-radius: 10px; background: repeating-linear-gradient(45deg, #1a3a2a, #1a3a2a 4px, #0d2a1a 4px, #0d2a1a 8px); }
    .back-pattern { font-size: 2rem; opacity: 0.4; }
  `]
})
export class CardComponent {
  @Input() card!: Card;
  @Input() playable = false;
  @Input() faceDown = false;
  @Output() cardClick = new EventEmitter<Card>();

  get suitSymbol() { return SUIT_SYMBOL[this.card.suit]; }
  get suitColor() { return SUIT_COLOR[this.card.suit]; }
  get numLabel() { return NUMBER_LABEL[this.card.number]; }
}
