import { Card } from '@/types';
import { BaseGameState, GameAction, Player, GameStatus } from '@/types';
import { createStandardDeck, shuffle, deal } from '../deck';
import { getRankValue } from '../card-utils';
import { BotDifficulty } from '../bot/difficulty';

export type GinPhase = 'draw' | 'discard' | 'knock' | 'ended';

export interface Meld {
  cards: Card[];
  type: 'set' | 'run';
}

export interface GinState extends BaseGameState {
  gameId: 'gin-rummy';
  phase: GinPhase;
  drawPile: Card[];
  discardPile: Card[];
  hands: Record<string, Card[]>;
  knocker: string | null;
  melds: Record<string, Meld[]>;
  roundScores: Record<string, number>;
  targetScore: number;
  drawnFromDiscard: boolean;
}

function cardPoints(card: Card): number {
  const r = getRankValue(card.rank);
  if (r >= 11) return 10; // J Q K
  if (card.rank === 'A') return 1;
  return r;
}

function deadwood(hand: Card[], melds: Meld[]): number {
  const meldedIds = new Set(melds.flatMap((m) => m.cards.map((c) => c.id)));
  return hand.filter((c) => !meldedIds.has(c.id)).reduce((sum, c) => sum + cardPoints(c), 0);
}

export function findBestMelds(hand: Card[]): Meld[] {
  const sets: Meld[] = [];
  const runs: Meld[] = [];

  // Find sets (3-4 of same rank)
  const byRank: Record<string, Card[]> = {};
  for (const card of hand) {
    byRank[card.rank] = [...(byRank[card.rank] ?? []), card];
  }
  for (const rank in byRank) {
    if (byRank[rank].length >= 3) {
      sets.push({ type: 'set', cards: byRank[rank].slice(0, byRank[rank].length >= 4 ? 4 : 3) });
    }
  }

  // Find runs (3+ consecutive same suit)
  const bySuit: Record<string, Card[]> = {};
  for (const card of hand) {
    bySuit[card.suit] = [...(bySuit[card.suit] ?? []), card];
  }
  for (const suit in bySuit) {
    const sorted = bySuit[suit].sort((a, b) => getRankValue(a.rank) - getRankValue(b.rank));
    let run: Card[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (getRankValue(sorted[i].rank) === getRankValue(sorted[i - 1].rank) + 1) {
        run.push(sorted[i]);
      } else {
        if (run.length >= 3) runs.push({ type: 'run', cards: [...run] });
        run = [sorted[i]];
      }
    }
    if (run.length >= 3) runs.push({ type: 'run', cards: [...run] });
  }

  // Simple greedy: pick melds that maximize coverage
  const allMelds = [...sets, ...runs];
  const usedIds = new Set<string>();
  const chosen: Meld[] = [];

  // Sort by number of cards descending
  allMelds.sort((a, b) => b.cards.length - a.cards.length);

  for (const meld of allMelds) {
    if (meld.cards.every((c) => !usedIds.has(c.id))) {
      chosen.push(meld);
      meld.cards.forEach((c) => usedIds.add(c.id));
    }
  }

  return chosen;
}

export function createInitialState(
  players: Player[],
  options: Record<string, unknown> = {},
  seed?: number
): GinState {
  if (players.length !== 2) throw new Error('Gin Rummy requires exactly 2 players');

  const deck = shuffle(createStandardDeck(), seed);
  const { hands: rawHands, remaining } = deal(deck, 10, 2);

  const hands: Record<string, Card[]> = {};
  players.forEach((p, i) => {
    hands[p.id] = rawHands[i].map((c) => ({ ...c, faceUp: true }));
  });

  // Turn top card of remaining face-up for discard
  const drawPile = remaining.slice(1);
  const discardPile = [{ ...remaining[0], faceUp: true }];

  const base: BaseGameState = {
    gameId: 'gin-rummy',
    players,
    currentPlayerIndex: 0,
    status: 'playing' as GameStatus,
    winners: [],
    scores: Object.fromEntries(players.map((p) => [p.id, 0])),
  };

  return {
    ...base,
    gameId: 'gin-rummy',
    phase: 'draw',
    drawPile,
    discardPile,
    hands,
    knocker: null,
    melds: Object.fromEntries(players.map((p) => [p.id, []])),
    roundScores: Object.fromEntries(players.map((p) => [p.id, 0])),
    targetScore: (options.targetScore as number) ?? 100,
    drawnFromDiscard: false,
  };
}

export function applyAction(state: GinState, action: GameAction): GinState {
  const { type, payload } = action;
  const currentPlayer = state.players[state.currentPlayerIndex];
  const otherId = state.players.find((p) => p.id !== currentPlayer.id)!.id;

  if (type === 'draw-stock') {
    if (state.phase !== 'draw' || state.drawPile.length === 0) return state;
    const [drawn, ...rest] = state.drawPile;
    const hand = [...state.hands[currentPlayer.id], { ...drawn, faceUp: true }];
    return {
      ...state,
      drawPile: rest,
      hands: { ...state.hands, [currentPlayer.id]: hand },
      phase: 'discard',
      drawnFromDiscard: false,
    };
  }

  if (type === 'draw-discard') {
    if (state.phase !== 'draw' || state.discardPile.length === 0) return state;
    const top = state.discardPile[state.discardPile.length - 1];
    const discard = state.discardPile.slice(0, -1);
    const hand = [...state.hands[currentPlayer.id], { ...top, faceUp: true }];
    return {
      ...state,
      discardPile: discard,
      hands: { ...state.hands, [currentPlayer.id]: hand },
      phase: 'discard',
      drawnFromDiscard: true,
    };
  }

  if (type === 'discard') {
    const { cardId } = payload as { cardId: string };
    if (state.phase !== 'discard') return state;
    const hand = state.hands[currentPlayer.id].filter((c) => c.id !== cardId);
    const discarded = state.hands[currentPlayer.id].find((c) => c.id === cardId);
    if (!discarded) return state;

    const nextIndex = state.players.findIndex((p) => p.id === otherId);
    return {
      ...state,
      hands: { ...state.hands, [currentPlayer.id]: hand },
      discardPile: [...state.discardPile, { ...discarded, faceUp: true }],
      currentPlayerIndex: nextIndex,
      phase: 'draw',
    };
  }

  if (type === 'knock') {
    const { discardCardId } = payload as { discardCardId: string };
    if (state.phase !== 'discard') return state;

    const hand = state.hands[currentPlayer.id].filter((c) => c.id !== discardCardId);
    const discarded = state.hands[currentPlayer.id].find((c) => c.id === discardCardId);
    if (!discarded) return state;

    const myMelds = findBestMelds(hand);
    const myDeadwood = deadwood(hand, myMelds);

    if (myDeadwood > 10) return state; // Can't knock with >10 deadwood

    const otherHand = state.hands[otherId];
    const otherMelds = findBestMelds(otherHand);
    const otherDeadwood = deadwood(otherHand, otherMelds);

    let newScores = { ...state.scores };
    const isGin = myDeadwood === 0;

    if (isGin) {
      newScores[currentPlayer.id] = (newScores[currentPlayer.id] ?? 0) + otherDeadwood + 25;
    } else if (myDeadwood < otherDeadwood) {
      newScores[currentPlayer.id] = (newScores[currentPlayer.id] ?? 0) + (otherDeadwood - myDeadwood);
    } else {
      // Undercut - other player wins
      newScores[otherId] = (newScores[otherId] ?? 0) + (myDeadwood - otherDeadwood) + 25;
    }

    const winner = Object.entries(newScores).find(([, s]) => s >= state.targetScore)?.[0];

    return {
      ...state,
      hands: { ...state.hands, [currentPlayer.id]: hand },
      discardPile: [...state.discardPile, { ...discarded, faceUp: true }],
      melds: { ...state.melds, [currentPlayer.id]: myMelds, [otherId]: otherMelds },
      scores: newScores,
      knocker: currentPlayer.id,
      phase: 'ended',
      status: winner ? 'ended' : 'playing',
      winners: winner ? [winner] : [myDeadwood < otherDeadwood ? currentPlayer.id : otherId],
    };
  }

  if (type === 'gin') {
    return applyAction(state, { type: 'knock', payload: action.payload });
  }

  return state;
}

export function getLegalActions(state: GinState, playerId: string): GameAction[] {
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) return [];

  if (state.phase === 'draw') {
    const actions: GameAction[] = [{ type: 'draw-stock', payload: {} }];
    if (state.discardPile.length > 0) {
      actions.push({ type: 'draw-discard', payload: {} });
    }
    return actions;
  }

  if (state.phase === 'discard') {
    const hand = state.hands[playerId];
    const actions: GameAction[] = hand.map((c) => ({ type: 'discard', payload: { cardId: c.id } }));

    // Check if can knock
    const melds = findBestMelds(hand);
    for (const card of hand) {
      const tempHand = hand.filter((c) => c.id !== card.id);
      const tempMelds = findBestMelds(tempHand);
      const dw = deadwood(tempHand, tempMelds);
      if (dw === 0) {
        actions.push({ type: 'gin', payload: { discardCardId: card.id } });
      } else if (dw <= 10) {
        actions.push({ type: 'knock', payload: { discardCardId: card.id } });
      }
    }

    return actions;
  }

  return [];
}

export function isTerminal(state: GinState): boolean {
  return state.phase === 'ended';
}

export function getWinners(state: GinState): string[] {
  return state.winners;
}

export function getBotAction(state: GinState, botPlayerId: string, difficulty: BotDifficulty): GameAction {
  const actions = getLegalActions(state, botPlayerId);
  if (actions.length === 0) return { type: 'draw-stock', payload: {} };

  if (state.phase === 'draw') {
    if (difficulty === 'easy') return actions[Math.floor(Math.random() * actions.length)];

    // Medium/Hard: draw discard if it helps
    const hand = state.hands[botPlayerId];
    const discardTop = state.discardPile[state.discardPile.length - 1];
    if (discardTop) {
      const tempHand = [...hand, discardTop];
      const withDiscard = deadwood(tempHand, findBestMelds(tempHand));
      const withoutDiscard = deadwood(hand, findBestMelds(hand));
      if (withDiscard < withoutDiscard - 2) {
        return { type: 'draw-discard', payload: {} };
      }
    }
    return { type: 'draw-stock', payload: {} };
  }

  if (state.phase === 'discard') {
    // Prefer gin/knock if available
    const knockAction = actions.find((a) => a.type === 'gin' || a.type === 'knock');
    if (knockAction) return knockAction;

    // Discard highest deadwood card
    const hand = state.hands[botPlayerId];
    const discardActions = actions.filter((a) => a.type === 'discard');

    if (difficulty === 'easy') {
      return discardActions[Math.floor(Math.random() * discardActions.length)];
    }

    // Find card that when discarded minimizes deadwood
    let best = discardActions[0];
    let bestDw = Infinity;
    for (const a of discardActions) {
      const { cardId } = a.payload as { cardId: string };
      const tempHand = hand.filter((c) => c.id !== cardId);
      const dw = deadwood(tempHand, findBestMelds(tempHand));
      if (dw < bestDw) {
        bestDw = dw;
        best = a;
      }
    }
    return best;
  }

  return actions[0];
}
