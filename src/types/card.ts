export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type Color = 'red' | 'black';

export interface Card {
  id: string; // e.g. 'A-spades', '10-hearts' - STABLE across sessions
  suit: Suit;
  rank: Rank;
  color: Color;
  faceUp: boolean;
}

export type UnoColor = 'red' | 'yellow' | 'green' | 'blue' | 'wild';
export type UnoValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'skip' | 'reverse' | 'draw2' | 'wild' | 'wild4';

export interface UnoCard {
  id: string; // e.g. 'red-5-0', 'wild-0'
  color: UnoColor;
  value: UnoValue;
}

export type Deck = Card[];
export type UnoDeck = UnoCard[];
