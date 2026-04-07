import { Card, Rank, Suit, Player } from '@/types';
import { BaseGameState, GameAction } from '@/types';
import { createStandardDeck, shuffle } from '../deck';
import { getRankValue } from '../card-utils';
import { BotDifficulty } from '../bot/difficulty';

export type RummyPhase = 'draw' | 'meld' | 'discard' | 'ended';

export interface Meld {
  id: string;
  type: 'set' | 'run';
  cards: Card[];
}

export interface RummyState extends BaseGameState {
  gameId: 'rummy';
  phase: RummyPhase;
  hands: Record<string, Card[]>;
  stock: Card[];
  discardPile: Card[];
  melds: Meld[]; // laid down melds (visible to all)
  drawnFromDiscard: boolean; // current player drew from discard
  hasDrawn: boolean; // current player has drawn this turn
  targetScore: number; // points to win (default 100)
}

const HAND_SIZE: Record<number, number> = {
  2: 10, 3: 7, 4: 7, 5: 6, 6: 6,
};

export function getCardValue(rank: Rank): number {
  if (rank === 'A') return 1;
  if (['J', 'Q', 'K'].includes(rank)) return 10;
  return parseInt(rank, 10);
}

export function isValidSet(cards: Card[]): boolean {
  if (cards.length < 3) return false;
  const rank = cards[0].rank;
  const suits = new Set(cards.map((c) => c.suit));
  return cards.every((c) => c.rank === rank) && suits.size === cards.length;
}

export function isValidRun(cards: Card[]): boolean {
  if (cards.length < 3) return false;
  const suit = cards[0].suit;
  if (!cards.every((c) => c.suit === suit)) return false;

  const sortedRanks = [...cards].sort((a, b) => getRankValue(a.rank) - getRankValue(b.rank));
  for (let i = 1; i < sortedRanks.length; i++) {
    if (getRankValue(sortedRanks[i].rank) !== getRankValue(sortedRanks[i - 1].rank) + 1) return false;
  }
  return true;
}

export function isValidMeld(cards: Card[]): boolean {
  return isValidSet(cards) || isValidRun(cards);
}

export function findSets(hand: Card[]): Card[][] {
  const rankGroups: Record<string, Card[]> = {};
  for (const card of hand) {
    if (!rankGroups[card.rank]) rankGroups[card.rank] = [];
    rankGroups[card.rank].push(card);
  }
  return Object.values(rankGroups).filter((g) => g.length >= 3);
}

export function findRuns(hand: Card[]): Card[][] {
  const runs: Card[][] = [];
  const bySuit: Record<string, Card[]> = {};
  for (const card of hand) {
    if (!bySuit[card.suit]) bySuit[card.suit] = [];
    bySuit[card.suit].push(card);
  }

  for (const cards of Object.values(bySuit)) {
    const sorted = [...cards].sort((a, b) => getRankValue(a.rank) - getRankValue(b.rank));
    let run: Card[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      if (getRankValue(sorted[i].rank) === getRankValue(sorted[i - 1].rank) + 1) {
        run.push(sorted[i]);
      } else {
        if (run.length >= 3) runs.push(run);
        run = [sorted[i]];
      }
    }
    if (run.length >= 3) runs.push(run);
  }

  return runs;
}

export function calcDeadwood(hand: Card[], melds?: Meld[]): number {
  // Identify which cards are in melds
  const meldCardIds = new Set(melds?.flatMap((m) => m.cards.map((c) => c.id)) ?? []);
  const deadwoodCards = hand.filter((c) => !meldCardIds.has(c.id));
  return deadwoodCards.reduce((sum, c) => sum + getCardValue(c.rank), 0);
}

let meldCounter = 0;
function newMeldId(): string {
  return `meld-${++meldCounter}`;
}

export function createInitialState(
  players: Player[],
  options: { targetScore?: number } = {},
  seed?: number
): RummyState {
  const n = players.length;
  if (n < 2 || n > 6) throw new Error('Rummy requires 2-6 players');

  const deck = shuffle(createStandardDeck(), seed).map((c) => ({ ...c, faceUp: false }));
  const handSize = HAND_SIZE[n] ?? 7;

  const hands: Record<string, Card[]> = {};
  const scores: Record<string, number> = {};
  let deckCopy = [...deck];

  for (const p of players) {
    hands[p.id] = deckCopy.splice(0, handSize).map((c) => ({ ...c, faceUp: true }));
    scores[p.id] = 0;
  }

  const firstDiscard = { ...deckCopy.shift()!, faceUp: true };

  return {
    gameId: 'rummy',
    players,
    currentPlayerIndex: 0,
    phase: 'draw',
    status: 'active',
    winners: [],
    scores,
    turnCount: 0,
    hands,
    stock: deckCopy,
    discardPile: [firstDiscard],
    melds: [],
    drawnFromDiscard: false,
    hasDrawn: false,
    targetScore: options.targetScore ?? 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seed,
  };
}

function startNewRound(state: RummyState): RummyState {
  const n = state.players.length;
  const handSize = HAND_SIZE[n] ?? 7;
  const deck = shuffle(createStandardDeck(), state.seed ? state.seed + (state.turnCount ?? 0) : undefined)
    .map((c) => ({ ...c, faceUp: false }));
  let deckCopy = [...deck];
  const hands: Record<string, Card[]> = {};
  for (const p of state.players) {
    hands[p.id] = deckCopy.splice(0, handSize).map((c) => ({ ...c, faceUp: true }));
  }
  const firstDiscard = { ...deckCopy.shift()!, faceUp: true };
  const nextDealer = (state.currentPlayerIndex + 1) % n;
  return {
    ...state,
    phase: 'draw',
    status: 'active',
    hands,
    stock: deckCopy,
    discardPile: [firstDiscard],
    melds: [],
    hasDrawn: false,
    drawnFromDiscard: false,
    winners: [],
    currentPlayerIndex: nextDealer,
  };
}

export function applyAction(state: RummyState, action: GameAction): RummyState {
  const s = { ...state, updatedAt: new Date().toISOString(), turnCount: (state.turnCount ?? 0) + 1 };
  const playerId = action.playerId ?? '';

  switch (action.type) {
    case 'drawFromStock': {
      const pIdx = s.players.findIndex((p) => p.id === playerId);
      if (pIdx !== s.currentPlayerIndex || s.hasDrawn) return state;

      let stock = [...s.stock];
      let discardPile = [...s.discardPile];

      if (stock.length === 0) {
        // Reshuffle discard
        const top = discardPile[discardPile.length - 1];
        stock = shuffle(discardPile.slice(0, -1).map((c) => ({ ...c, faceUp: false })));
        discardPile = [top];
      }

      if (stock.length === 0) return state;

      const card = { ...stock.shift()!, faceUp: true };
      const hands = { ...s.hands, [playerId]: [...(s.hands[playerId] ?? []), card] };

      return { ...s, hands, stock, discardPile, hasDrawn: true, drawnFromDiscard: false, phase: 'meld' };
    }

    case 'drawFromDiscard': {
      const pIdx = s.players.findIndex((p) => p.id === playerId);
      if (pIdx !== s.currentPlayerIndex || s.hasDrawn || s.discardPile.length === 0) return state;

      const discardPile = [...s.discardPile];
      const card = { ...discardPile.pop()!, faceUp: true };
      const hands = { ...s.hands, [playerId]: [...(s.hands[playerId] ?? []), card] };

      return { ...s, hands, discardPile, hasDrawn: true, drawnFromDiscard: true, phase: 'meld' };
    }

    case 'layMeld': {
      const pIdx = s.players.findIndex((p) => p.id === playerId);
      if (pIdx !== s.currentPlayerIndex || !s.hasDrawn) return state;

      const { cardIds } = action.payload as { cardIds: string[] };
      const hand = [...(s.hands[playerId] ?? [])];
      const meldCards = hand.filter((c) => cardIds.includes(c.id));

      if (!isValidMeld(meldCards)) return state;

      const meldType = isValidSet(meldCards) ? 'set' : 'run';
      const newMeld: Meld = {
        id: newMeldId(),
        type: meldType,
        cards: meldCards,
      };

      const newHand = hand.filter((c) => !cardIds.includes(c.id));
      const newHands = { ...s.hands, [playerId]: newHand };
      const melds = [...s.melds, newMeld];

      return { ...s, hands: newHands, melds };
    }

    case 'layOff': {
      const pIdx = s.players.findIndex((p) => p.id === playerId);
      if (pIdx !== s.currentPlayerIndex || !s.hasDrawn) return state;

      const { cardId, meldId } = action.payload as { cardId: string; meldId: string };
      const meldIdx = s.melds.findIndex((m) => m.id === meldId);
      if (meldIdx === -1) return state;

      const meld = s.melds[meldIdx];
      const hand = [...(s.hands[playerId] ?? [])];
      const cardIdx = hand.findIndex((c) => c.id === cardId);
      if (cardIdx === -1) return state;

      const card = hand[cardIdx];
      const newMeldCards = [...meld.cards, card];

      // Validate extended meld
      if (!isValidMeld(newMeldCards)) return state;

      const newMeld = { ...meld, cards: newMeldCards };
      const melds = s.melds.map((m, i) => (i === meldIdx ? newMeld : m));
      const newHand = hand.filter((_, i) => i !== cardIdx);
      const newHands = { ...s.hands, [playerId]: newHand };

      return { ...s, hands: newHands, melds };
    }

    case 'discard': {
      const pIdx = s.players.findIndex((p) => p.id === playerId);
      if (pIdx !== s.currentPlayerIndex || !s.hasDrawn) return state;

      const { cardId } = action.payload as { cardId: string };
      const hand = [...(s.hands[playerId] ?? [])];
      const cardIdx = hand.findIndex((c) => c.id === cardId);
      if (cardIdx === -1) return state;

      const card = { ...hand.splice(cardIdx, 1)[0], faceUp: true };
      const discardPile = [...s.discardPile, card];
      const newHands = { ...s.hands, [playerId]: hand };

      // Check for win (empty hand)
      if (hand.length === 0) {
        // Score: other players' deadwood counts
        const newScores = { ...s.scores };
        for (const p of s.players) {
          if (p.id !== playerId) {
            newScores[playerId] = (newScores[playerId] ?? 0) +
              (newHands[p.id] ?? []).reduce((sum: number, c) => sum + getCardValue(c.rank), 0);
          }
        }

        // Check if target score reached
        const maxScore = Math.max(...Object.values(newScores));
        if (maxScore >= s.targetScore) {
          return {
            ...s,
            hands: newHands,
            discardPile,
            scores: newScores,
            phase: 'ended',
            status: 'finished',
            winners: [playerId],
            hasDrawn: false,
          };
        }

        // Start new round with fresh deal
        return startNewRound({ ...s, scores: newScores });
      }

      const nextIdx = (pIdx + 1) % s.players.length;
      return {
        ...s,
        hands: newHands,
        discardPile,
        currentPlayerIndex: nextIdx,
        phase: 'draw',
        hasDrawn: false,
        drawnFromDiscard: false,
      };
    }

    default:
      return state;
  }
}

export function getLegalActions(state: RummyState, playerId: string): GameAction[] {
  const actions: GameAction[] = [];
  const pIdx = state.players.findIndex((p) => p.id === playerId);
  if (pIdx !== state.currentPlayerIndex) return actions;
  if (state.phase === 'ended') return actions;

  if (!state.hasDrawn) {
    actions.push({ type: 'drawFromStock', playerId });
    if (state.discardPile.length > 0) {
      actions.push({ type: 'drawFromDiscard', playerId });
    }
    return actions;
  }

  // Can lay melds
  const hand = state.hands[playerId] ?? [];
  const sets = findSets(hand);
  const runs = findRuns(hand);

  for (const set of sets) {
    actions.push({ type: 'layMeld', playerId, payload: { cardIds: set.map((c) => c.id) } });
  }
  for (const run of runs) {
    actions.push({ type: 'layMeld', playerId, payload: { cardIds: run.map((c) => c.id) } });
  }

  // Can lay off on existing melds
  for (const meld of state.melds) {
    for (const card of hand) {
      const extended = [...meld.cards, card];
      if (isValidMeld(extended)) {
        actions.push({ type: 'layOff', playerId, payload: { cardId: card.id, meldId: meld.id } });
      }
    }
  }

  // Must discard one card
  for (const card of hand) {
    actions.push({ type: 'discard', playerId, payload: { cardId: card.id } });
  }

  return actions;
}

export function isTerminal(state: RummyState): boolean {
  return state.phase === 'ended' || state.status === 'finished';
}

export function getWinners(state: RummyState): string[] {
  return state.winners;
}

export function getBotAction(
  state: RummyState,
  botPlayerId: string,
  difficulty: BotDifficulty
): GameAction {
  const hand = state.hands[botPlayerId] ?? [];

  if (!state.hasDrawn) {
    // Draw strategy
    if (state.discardPile.length > 0) {
      const topDiscard = state.discardPile[state.discardPile.length - 1];

      if (difficulty !== 'easy') {
        // Check if top discard completes a meld
        const withDiscard = [...hand, topDiscard];
        const sets = findSets(withDiscard);
        const runs = findRuns(withDiscard);
        if (sets.length > 0 || runs.length > 0) {
          return { type: 'drawFromDiscard', playerId: botPlayerId };
        }
      }
    }
    return { type: 'drawFromStock', playerId: botPlayerId };
  }

  // Try to lay melds
  const sets = findSets(hand);
  const runs = findRuns(hand);

  if (sets.length > 0) {
    return { type: 'layMeld', playerId: botPlayerId, payload: { cardIds: sets[0].map((c) => c.id) } };
  }
  if (runs.length > 0) {
    return { type: 'layMeld', playerId: botPlayerId, payload: { cardIds: runs[0].map((c) => c.id) } };
  }

  // Try to lay off
  for (const meld of state.melds) {
    for (const card of hand) {
      if (isValidMeld([...meld.cards, card])) {
        return { type: 'layOff', playerId: botPlayerId, payload: { cardId: card.id, meldId: meld.id } };
      }
    }
  }

  // Discard highest value unmatched card
  const sortedByValue = [...hand].sort((a, b) => getCardValue(b.rank) - getCardValue(a.rank));
  const toDiscard = sortedByValue[0];
  return { type: 'discard', playerId: botPlayerId, payload: { cardId: toDiscard.id } };
}
