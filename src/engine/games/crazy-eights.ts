import { Card, Rank, Suit, Player } from '@/types';
import { BaseGameState, GameAction } from '@/types';
import { createStandardDeck, shuffle } from '../deck';
import { BotDifficulty } from '../bot/difficulty';

export type CrazyEightsPhase = 'playing' | 'ended';

export interface CrazyEightsState extends BaseGameState {
  gameId: 'crazy-eights';
  phase: CrazyEightsPhase;
  hands: Record<string, Card[]>;
  drawPile: Card[];
  discardPile: Card[];
  currentSuit: Suit; // can differ from top card suit due to 8s
  direction: 1 | -1;
  drawCount: number; // accumulated draws from 2s (if stacking enabled)
  skipped: boolean; // is the next player skipped
  mustDraw: number; // cards next player must draw (from 2 stack)
  options: {
    draw2Stacking: boolean;
    jSkip: boolean;
    qReverse: boolean;
  };
}

const HAND_SIZE = 7;

export function createInitialState(
  players: Player[],
  options: {
    draw2Stacking?: boolean;
    jSkip?: boolean;
    qReverse?: boolean;
  } = {},
  seed?: number
): CrazyEightsState {
  const n = players.length;
  if (n < 2 || n > 5) throw new Error('Crazy Eights requires 2-5 players');

  const deck = shuffle(createStandardDeck(), seed).map((c) => ({ ...c, faceUp: false }));
  let deckCopy = [...deck];

  const hands: Record<string, Card[]> = {};
  const scores: Record<string, number> = {};

  for (const p of players) {
    hands[p.id] = deckCopy.splice(0, HAND_SIZE).map((c) => ({ ...c, faceUp: true }));
    scores[p.id] = 0;
  }

  // Find first non-8 card for discard pile
  let startCardIndex = deckCopy.findIndex((c) => c.rank !== '8');
  if (startCardIndex === -1) startCardIndex = 0;
  const startCard = { ...deckCopy.splice(startCardIndex, 1)[0], faceUp: true };

  return {
    gameId: 'crazy-eights',
    players,
    currentPlayerIndex: 0,
    phase: 'playing',
    status: 'active',
    winners: [],
    scores,
    turnCount: 0,
    hands,
    drawPile: deckCopy,
    discardPile: [startCard],
    currentSuit: startCard.suit,
    direction: 1,
    drawCount: 0,
    skipped: false,
    mustDraw: 0,
    options: {
      draw2Stacking: options.draw2Stacking ?? true,
      jSkip: options.jSkip ?? true,
      qReverse: options.qReverse ?? true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seed,
  };
}

function nextPlayerIndex(current: number, total: number, direction: 1 | -1): number {
  return ((current + direction) % total + total) % total;
}

function calculateHandScore(hand: Card[]): number {
  let total = 0;
  for (const card of hand) {
    if (card.rank === '8') total += 50;
    else if (['J', 'Q', 'K'].includes(card.rank)) total += 10;
    else if (card.rank === 'A') total += 1;
    else total += parseInt(card.rank, 10);
  }
  return total;
}

function reshuffleIfNeeded(drawPile: Card[], discardPile: Card[]): { drawPile: Card[]; discardPile: Card[] } {
  if (drawPile.length > 0) return { drawPile, discardPile };
  if (discardPile.length <= 1) return { drawPile, discardPile };

  const topCard = discardPile[discardPile.length - 1];
  const newDraw = shuffle(discardPile.slice(0, -1).map((c) => ({ ...c, faceUp: false })));
  return { drawPile: newDraw, discardPile: [topCard] };
}

export function applyAction(state: CrazyEightsState, action: GameAction): CrazyEightsState {
  const s = { ...state, updatedAt: new Date().toISOString(), turnCount: (state.turnCount ?? 0) + 1 };

  switch (action.type) {
    case 'play': {
      const { cardId, chosenSuit } = action.payload as { cardId: string; chosenSuit?: Suit };
      const pid = action.playerId ?? '';
      const pIdx = s.players.findIndex((p) => p.id === pid);
      if (pIdx !== s.currentPlayerIndex) return state;

      const hand = [...(s.hands[pid] ?? [])];
      const cardIdx = hand.findIndex((c) => c.id === cardId);
      if (cardIdx === -1) return state;

      const card = hand[cardIdx];
      const topCard = s.discardPile[s.discardPile.length - 1];

      // Validate play
      const isEight = card.rank === '8';
      const matchesSuit = card.suit === s.currentSuit;
      const matchesRank = card.rank === topCard.rank;

      // If must draw due to stacked 2s, only allow drawing or stacking another 2
      if (s.mustDraw > 0 && s.options.draw2Stacking) {
        if (card.rank !== '2') return state;
      }

      if (!isEight && !matchesSuit && !matchesRank) return state;

      hand.splice(cardIdx, 1);
      const newHand = hand;
      const discardPile = [...s.discardPile, { ...card, faceUp: true }];
      let newSuit = isEight ? (chosenSuit ?? card.suit) : card.suit;
      let direction = s.direction;
      let skipped = false;
      let mustDraw = s.mustDraw;

      // Apply special card effects
      if (s.options.jSkip && card.rank === 'J') {
        skipped = true;
      }
      if (s.options.qReverse && card.rank === 'Q') {
        direction = (direction === 1 ? -1 : 1) as 1 | -1;
      }
      if (card.rank === '2') {
        mustDraw += 2;
      }

      const newHands = { ...s.hands, [pid]: newHand };

      // Check win
      if (newHand.length === 0) {
        // Calculate scores for other players
        const newScores = { ...s.scores };
        for (const p of s.players) {
          if (p.id !== pid) {
            newScores[pid] = (newScores[pid] ?? 0) + calculateHandScore(newHands[p.id] ?? []);
          }
        }
        return {
          ...s,
          hands: newHands,
          discardPile,
          currentSuit: newSuit,
          direction,
          phase: 'ended',
          status: 'finished',
          winners: [pid],
          scores: newScores,
        };
      }

      // Advance turn (handling skip)
      let nextIdx = nextPlayerIndex(pIdx, s.players.length, direction);
      if (skipped) {
        nextIdx = nextPlayerIndex(nextIdx, s.players.length, direction);
      }

      return {
        ...s,
        hands: newHands,
        discardPile,
        currentSuit: newSuit,
        direction,
        currentPlayerIndex: nextIdx,
        skipped: false,
        mustDraw,
      };
    }

    case 'draw': {
      const pid = action.playerId ?? '';
      const pIdx = s.players.findIndex((p) => p.id === pid);
      if (pIdx !== s.currentPlayerIndex) return state;

      const drawCount = s.mustDraw > 0 ? s.mustDraw : 1;
      let { drawPile, discardPile } = reshuffleIfNeeded(s.drawPile, s.discardPile);
      const hand = [...(s.hands[pid] ?? [])];

      for (let i = 0; i < drawCount && drawPile.length > 0; i++) {
        const card = { ...drawPile.shift()!, faceUp: true };
        hand.push(card);
      }

      const newHands = { ...s.hands, [pid]: hand };
      const nextIdx = nextPlayerIndex(pIdx, s.players.length, s.direction);

      return {
        ...s,
        hands: newHands,
        drawPile,
        discardPile,
        currentPlayerIndex: nextIdx,
        mustDraw: 0,
      };
    }

    default:
      return state;
  }
}

export function getLegalActions(state: CrazyEightsState, playerId: string): GameAction[] {
  const actions: GameAction[] = [];
  const pIdx = state.players.findIndex((p) => p.id === playerId);
  if (pIdx !== state.currentPlayerIndex) return actions;
  if (state.phase !== 'playing') return actions;

  const hand = state.hands[playerId] ?? [];
  const topCard = state.discardPile[state.discardPile.length - 1];

  for (const card of hand) {
    const isEight = card.rank === '8';
    const matchesSuit = card.suit === state.currentSuit;
    const matchesRank = card.rank === topCard.rank;

    if (state.mustDraw > 0 && state.options.draw2Stacking && card.rank !== '2') continue;

    if (isEight || matchesSuit || matchesRank) {
      if (isEight) {
        const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
        for (const s of suits) {
          actions.push({ type: 'play', playerId, payload: { cardId: card.id, chosenSuit: s } });
        }
      } else {
        actions.push({ type: 'play', playerId, payload: { cardId: card.id } });
      }
    }
  }

  if (actions.length === 0 || state.mustDraw > 0) {
    actions.push({ type: 'draw', playerId });
  }

  return actions;
}

export function isTerminal(state: CrazyEightsState): boolean {
  return state.phase === 'ended';
}

export function getWinners(state: CrazyEightsState): string[] {
  return state.winners;
}

export function getBotAction(
  state: CrazyEightsState,
  botPlayerId: string,
  difficulty: BotDifficulty
): GameAction {
  const actions = getLegalActions(state, botPlayerId);
  if (actions.length === 0) return { type: 'draw', playerId: botPlayerId };

  const playActions = actions.filter((a) => a.type === 'play');
  const drawAction = actions.find((a) => a.type === 'draw');

  if (playActions.length === 0) return drawAction!;

  if (difficulty === 'easy') {
    return playActions[Math.floor(Math.random() * playActions.length)];
  }

  // Medium/Hard: prefer non-eight cards first, then 8s
  const hand = state.hands[botPlayerId] ?? [];
  const nonEightPlays = playActions.filter((a) => {
    const cardId = (a.payload as { cardId: string }).cardId;
    const card = hand.find((c) => c.id === cardId);
    return card && card.rank !== '8';
  });

  if (nonEightPlays.length > 0) {
    if (difficulty === 'hard') {
      // Prefer cards that match rank (extends further options)
      const topCard = state.discardPile[state.discardPile.length - 1];
      const rankMatch = nonEightPlays.filter((a) => {
        const cardId = (a.payload as { cardId: string }).cardId;
        const card = hand.find((c) => c.id === cardId);
        return card?.rank === topCard.rank;
      });
      if (rankMatch.length > 0) return rankMatch[0];
    }
    return nonEightPlays[Math.floor(Math.random() * nonEightPlays.length)];
  }

  // Use 8 - choose most common suit in hand
  const suitCounts: Partial<Record<Suit, number>> = {};
  for (const card of hand) {
    if (card.rank !== '8') suitCounts[card.suit] = (suitCounts[card.suit] ?? 0) + 1;
  }
  const bestSuit = (['spades', 'hearts', 'diamonds', 'clubs'] as Suit[]).reduce((a, b) =>
    (suitCounts[a] ?? 0) >= (suitCounts[b] ?? 0) ? a : b
  );
  const eightAction = playActions.find(
    (a) => (a.payload as { chosenSuit?: Suit }).chosenSuit === bestSuit
  );
  return eightAction ?? playActions[0];
}
