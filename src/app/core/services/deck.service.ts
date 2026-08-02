import { Injectable } from '@angular/core';
import { Card, CardNumber, Suit, buildCard } from '../models/card.model';

const SUITS: Suit[] = ['espadas', 'bastos', 'oros', 'copas'];
const NUMBERS: CardNumber[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

@Injectable({ providedIn: 'root' })
export class DeckService {

  /** Build the full 40-card Spanish deck */
  buildDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
      for (const number of NUMBERS) {
        deck.push(buildCard(number, suit));
      }
    }
    return deck;
  }

  /** Fisher-Yates shuffle */
  shuffle(deck: Card[]): Card[] {
    const d = [...deck];
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [d[i], d[j]] = [d[j], d[i]];
    }
    return d;
  }

  /** Deal `count` cards per player, returns [player1Cards, player2Cards, ...] */
  deal(deck: Card[], playerCount: number, cardsEach: number = 3): Card[][] {
    const hands: Card[][] = Array.from({ length: playerCount }, () => []);
    let idx = 0;
    for (let c = 0; c < cardsEach; c++) {
      for (let p = 0; p < playerCount; p++) {
        hands[p].push(deck[idx++]);
      }
    }
    return hands;
  }

  /** Shuffle and deal fresh hands */
  dealFresh(playerCount: number): Card[][] {
    const deck = this.shuffle(this.buildDeck());
    return this.deal(deck, playerCount);
  }
}
