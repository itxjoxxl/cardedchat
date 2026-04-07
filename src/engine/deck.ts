import { Card, UnoCard, Suit, Rank, UnoColor, UnoValue, Color } from '@/types';

// Seeded PRNG - mulberry32
export function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function getSuitColor(suit: Suit): Color {
  return suit === 'hearts' || suit === 'diamonds' ? 'red' : 'black';
}

export function createStandardDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}-${suit}`,
        suit,
        rank,
        color: getSuitColor(suit),
        faceUp: false,
      });
    }
  }
  return deck; // 52 cards
}

export function createMultiDeck(count: number): Card[] {
  const decks: Card[] = [];
  for (let i = 0; i < count; i++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        decks.push({
          id: `${rank}-${suit}-d${i}`,
          suit,
          rank,
          color: getSuitColor(suit),
          faceUp: false,
        });
      }
    }
  }
  return decks;
}

// 108 UNO cards: 4 colors × (1×0 + 2×1-9 + 2×skip + 2×reverse + 2×draw2) = 4×19=76 + 4×wild + 4×wild4 = 108
const UNO_COLORS: Exclude<UnoColor, 'wild'>[] = ['red', 'yellow', 'green', 'blue'];
const UNO_ACTION_VALUES: UnoValue[] = ['skip', 'reverse', 'draw2'];
const UNO_NUMBER_VALUES: UnoValue[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function createUnoDeck(): UnoCard[] {
  const deck: UnoCard[] = [];

  for (const color of UNO_COLORS) {
    // One 0 per color
    deck.push({ id: `${color}-0-0`, color, value: '0' });

    // Two each of 1-9 and action cards
    for (const value of [...UNO_NUMBER_VALUES.slice(1), ...UNO_ACTION_VALUES]) {
      deck.push({ id: `${color}-${value}-0`, color, value });
      deck.push({ id: `${color}-${value}-1`, color, value });
    }
  }

  // 4 wilds + 4 wild4
  for (let i = 0; i < 4; i++) {
    deck.push({ id: `wild-${i}`, color: 'wild', value: 'wild' });
    deck.push({ id: `wild4-${i}`, color: 'wild', value: 'wild4' });
  }

  return deck; // 108 cards
}

export function shuffle<T>(arr: T[], seed?: number): T[] {
  const result = [...arr];
  const rand = seed !== undefined ? mulberry32(seed) : Math.random;

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export function deal(
  deck: Card[],
  cardsPerPlayer: number,
  numPlayers: number
): { hands: Card[][]; remaining: Card[] } {
  const hands: Card[][] = Array.from({ length: numPlayers }, () => []);
  const deckCopy = [...deck];

  // Deal round-robin
  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let p = 0; p < numPlayers; p++) {
      const card = deckCopy.shift();
      if (card) {
        hands[p].push(card);
      }
    }
  }

  return { hands, remaining: deckCopy };
}
