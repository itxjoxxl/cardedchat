import { Card } from '@/types';
import { getRankValue } from './card-utils';

export type HandRank =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'royal-flush';

const HAND_RANK_VALUES: Record<HandRank, number> = {
  'high-card': 0,
  'pair': 1,
  'two-pair': 2,
  'three-of-a-kind': 3,
  'straight': 4,
  'flush': 5,
  'full-house': 6,
  'four-of-a-kind': 7,
  'straight-flush': 8,
  'royal-flush': 9,
};

export interface EvaluatedHand {
  rank: HandRank;
  score: number; // numeric for comparison
  cards: Card[]; // best 5 cards
  description: string;
}

// Get all 5-card combinations from an array
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map((combo) => [first, ...combo]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function rankValue(card: Card): number {
  return getRankValue(card.rank);
}

// Score a 5-card hand - returns a comparable numeric score
function scoreFiveCard(cards: Card[]): { handRank: HandRank; score: number } {
  const sorted = [...cards].sort((a, b) => rankValue(b) - rankValue(a));
  const values = sorted.map(rankValue);
  const suits = sorted.map((c) => c.suit);

  const isFlush = suits.every((s) => s === suits[0]);

  // Check straight
  const isRegularStraight = values.every((v, i) => i === 0 || v === values[i - 1] - 1);
  // Wheel: A-2-3-4-5
  const isWheelStraight =
    values[0] === 14 &&
    values[1] === 5 &&
    values[2] === 4 &&
    values[3] === 3 &&
    values[4] === 2;
  const isStraight = isRegularStraight || isWheelStraight;

  // Count ranks
  const rankCounts: Record<number, number> = {};
  for (const v of values) {
    rankCounts[v] = (rankCounts[v] || 0) + 1;
  }
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const countKeys = Object.keys(rankCounts)
    .map(Number)
    .sort((a, b) => {
      const countDiff = rankCounts[b] - rankCounts[a];
      if (countDiff !== 0) return countDiff;
      return b - a;
    });

  // Build a tiebreaker score
  // Score = handRankValue * 10^10 + card kickers encoded in base-15
  const handBase = 15 ** 5;

  let handRank: HandRank;
  let tiebreakerCards: number[];

  if (isFlush && isStraight) {
    if (values[0] === 14 && values[1] === 13) {
      handRank = 'royal-flush';
    } else {
      handRank = 'straight-flush';
    }
    tiebreakerCards = isWheelStraight ? [5, 4, 3, 2, 1] : values;
  } else if (counts[0] === 4) {
    handRank = 'four-of-a-kind';
    tiebreakerCards = [countKeys[0], countKeys[0], countKeys[0], countKeys[0], countKeys[1]];
  } else if (counts[0] === 3 && counts[1] === 2) {
    handRank = 'full-house';
    tiebreakerCards = [countKeys[0], countKeys[0], countKeys[0], countKeys[1], countKeys[1]];
  } else if (isFlush) {
    handRank = 'flush';
    tiebreakerCards = values;
  } else if (isStraight) {
    handRank = 'straight';
    tiebreakerCards = isWheelStraight ? [5, 4, 3, 2, 1] : values;
  } else if (counts[0] === 3) {
    handRank = 'three-of-a-kind';
    tiebreakerCards = [...countKeys];
  } else if (counts[0] === 2 && counts[1] === 2) {
    handRank = 'two-pair';
    tiebreakerCards = [...countKeys];
  } else if (counts[0] === 2) {
    handRank = 'pair';
    tiebreakerCards = [...countKeys];
  } else {
    handRank = 'high-card';
    tiebreakerCards = values;
  }

  // Encode tiebreaker as a number
  let tiebreaker = 0;
  for (let i = 0; i < 5; i++) {
    tiebreaker += (tiebreakerCards[i] || 0) * 15 ** (4 - i);
  }

  const score = HAND_RANK_VALUES[handRank] * handBase + tiebreaker;

  return { handRank, score };
}

function getDescription(handRank: HandRank, cards: Card[]): string {
  const sorted = [...cards].sort((a, b) => rankValue(b) - rankValue(a));
  const topRank = sorted[0].rank;
  const topSuit = sorted[0].suit;

  switch (handRank) {
    case 'royal-flush':
      return `Royal Flush`;
    case 'straight-flush':
      return `Straight Flush, ${topRank} high`;
    case 'four-of-a-kind': {
      // Find the rank with 4
      const rankCounts: Record<string, number> = {};
      for (const c of cards) rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
      const fourRank = Object.keys(rankCounts).find((r) => rankCounts[r] === 4) || topRank;
      return `Four of a Kind, ${fourRank}s`;
    }
    case 'full-house': {
      const rankCounts: Record<string, number> = {};
      for (const c of cards) rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
      const threeRank = Object.keys(rankCounts).find((r) => rankCounts[r] === 3) || topRank;
      const twoRank = Object.keys(rankCounts).find((r) => rankCounts[r] === 2) || '';
      return `Full House, ${threeRank}s over ${twoRank}s`;
    }
    case 'flush':
      return `Flush, ${topRank} high (${topSuit})`;
    case 'straight':
      return `Straight, ${topRank} high`;
    case 'three-of-a-kind': {
      const rankCounts: Record<string, number> = {};
      for (const c of cards) rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
      const threeRank = Object.keys(rankCounts).find((r) => rankCounts[r] === 3) || topRank;
      return `Three of a Kind, ${threeRank}s`;
    }
    case 'two-pair': {
      const rankCounts: Record<string, number> = {};
      for (const c of cards) rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
      const pairs = Object.keys(rankCounts)
        .filter((r) => rankCounts[r] === 2)
        .sort((a, b) => getRankValue(b as any) - getRankValue(a as any));
      return `Two Pair, ${pairs[0]}s and ${pairs[1]}s`;
    }
    case 'pair': {
      const rankCounts: Record<string, number> = {};
      for (const c of cards) rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;
      const pairRank = Object.keys(rankCounts).find((r) => rankCounts[r] === 2) || topRank;
      return `Pair of ${pairRank}s`;
    }
    case 'high-card':
      return `High Card, ${topRank}`;
  }
}

export function evaluateHand(cards: Card[]): EvaluatedHand {
  if (cards.length < 5) {
    // Can't evaluate less than 5 cards - return high card with what we have
    const sorted = [...cards].sort((a, b) => rankValue(b) - rankValue(a));
    const values = sorted.map(rankValue);
    let tiebreaker = 0;
    for (let i = 0; i < 5; i++) {
      tiebreaker += (values[i] || 0) * 15 ** (4 - i);
    }
    return {
      rank: 'high-card',
      score: tiebreaker,
      cards: sorted,
      description: `High Card, ${sorted[0]?.rank || '?'}`,
    };
  }

  if (cards.length === 5) {
    const { handRank, score } = scoreFiveCard(cards);
    return {
      rank: handRank,
      score,
      cards: [...cards].sort((a, b) => rankValue(b) - rankValue(a)),
      description: getDescription(handRank, cards),
    };
  }

  // Try all 5-card combinations and pick best
  const combos = combinations(cards, 5);
  let best: EvaluatedHand | null = null;

  for (const combo of combos) {
    const { handRank, score } = scoreFiveCard(combo);
    if (!best || score > best.score) {
      best = {
        rank: handRank,
        score,
        cards: [...combo].sort((a, b) => rankValue(b) - rankValue(a)),
        description: getDescription(handRank, combo),
      };
    }
  }

  return best!;
}

export function compareHands(a: EvaluatedHand, b: EvaluatedHand): number {
  return a.score - b.score;
}

export function getBestHand(holeCards: Card[], communityCards: Card[]): EvaluatedHand {
  return evaluateHand([...holeCards, ...communityCards]);
}
