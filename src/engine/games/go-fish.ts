import { Card, Rank, Player } from '@/types';
import { BaseGameState, GameAction } from '@/types';
import { createStandardDeck, shuffle } from '../deck';
import { BotDifficulty } from '../bot/difficulty';

export type GoFishPhase = 'playing' | 'ended';

export interface GoFishState extends BaseGameState {
  gameId: 'go-fish';
  phase: GoFishPhase;
  hands: Record<string, Card[]>; // playerId -> cards
  books: Record<string, Rank[]>; // playerId -> completed sets of 4
  pond: Card[]; // draw pile
  lastAction?: {
    askerId: string;
    targetId: string;
    rank: Rank;
    result: 'got-cards' | 'go-fish';
    cardsReceived?: number;
  };
}

const INITIAL_HAND_SIZE: Record<number, number> = {
  2: 7,
  3: 5,
  4: 5,
  5: 5,
  6: 5,
};

export function createInitialState(
  players: Player[],
  _options: Record<string, unknown> = {},
  seed?: number
): GoFishState {
  const n = players.length;
  if (n < 2 || n > 6) throw new Error('Go Fish requires 2-6 players');

  const deck = shuffle(createStandardDeck(), seed).map((c) => ({ ...c, faceUp: false }));
  const handSize = INITIAL_HAND_SIZE[n] ?? 5;

  const hands: Record<string, Card[]> = {};
  const books: Record<string, Rank[]> = {};
  const scores: Record<string, number> = {};

  let deckCopy = [...deck];
  for (const p of players) {
    hands[p.id] = deckCopy.splice(0, handSize).map((c) => ({ ...c, faceUp: true }));
    books[p.id] = [];
    scores[p.id] = 0;
  }

  // Check for initial books
  const { hands: clearedHands, books: initialBooks, scores: initialScores } = checkAndRemoveBooks(
    hands,
    books,
    scores,
    players
  );

  return {
    gameId: 'go-fish',
    players,
    currentPlayerIndex: 0,
    phase: 'playing',
    status: 'active',
    winners: [],
    scores: initialScores,
    turnCount: 0,
    hands: clearedHands,
    books: initialBooks,
    pond: deckCopy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seed,
  };
}

function checkAndRemoveBooks(
  hands: Record<string, Card[]>,
  books: Record<string, Rank[]>,
  scores: Record<string, number>,
  players: Player[]
): { hands: Record<string, Card[]>; books: Record<string, Rank[]>; scores: Record<string, number> } {
  const newHands = { ...hands };
  const newBooks = { ...books };
  const newScores = { ...scores };

  for (const p of players) {
    const hand = [...(newHands[p.id] ?? [])];
    const rankCounts: Partial<Record<Rank, Card[]>> = {};
    for (const card of hand) {
      if (!rankCounts[card.rank]) rankCounts[card.rank] = [];
      rankCounts[card.rank]!.push(card);
    }
    const bookIds = new Set<string>();
    for (const [rank, cards] of Object.entries(rankCounts)) {
      if (cards && cards.length === 4) {
        newBooks[p.id] = [...(newBooks[p.id] ?? []), rank as Rank];
        newScores[p.id] = (newScores[p.id] ?? 0) + 1;
        for (const c of cards) bookIds.add(c.id);
      }
    }
    newHands[p.id] = hand.filter((c) => !bookIds.has(c.id));
  }

  return { hands: newHands, books: newBooks, scores: newScores };
}

export function applyAction(state: GoFishState, action: GameAction): GoFishState {
  const s = { ...state, updatedAt: new Date().toISOString(), turnCount: (state.turnCount ?? 0) + 1 };

  switch (action.type) {
    case 'ask': {
      const { targetId, rank } = action.payload as { targetId: string; rank: Rank };
      const askerId = action.playerId ?? '';

      // Validate: asker must have at least one of this rank
      const askerHand = s.hands[askerId] ?? [];
      if (!askerHand.some((c) => c.rank === rank)) return state;

      const targetHand = [...(s.hands[targetId] ?? [])];
      const matchingCards = targetHand.filter((c) => c.rank === rank);

      let newHands = { ...s.hands };
      let newPond = [...s.pond];
      let lastAction: GoFishState['lastAction'];
      let nextPlayerIndex = s.currentPlayerIndex;

      if (matchingCards.length > 0) {
        // Got cards - take them all
        newHands[targetId] = targetHand.filter((c) => c.rank !== rank);
        newHands[askerId] = [...askerHand, ...matchingCards.map((c) => ({ ...c, faceUp: true }))];
        lastAction = {
          askerId,
          targetId,
          rank,
          result: 'got-cards',
          cardsReceived: matchingCards.length,
        };
        // Player gets another turn (don't advance)
      } else {
        // Go Fish! Draw from pond
        lastAction = { askerId, targetId, rank, result: 'go-fish' };
        if (newPond.length > 0) {
          const drawnCard = { ...newPond.shift()!, faceUp: true };
          newHands[askerId] = [...askerHand, drawnCard];
        }
        // Advance turn
        nextPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
      }

      const { hands, books, scores } = checkAndRemoveBooks(newHands, s.books, s.scores, s.players);

      // Check for game over: pond empty and any player's hand empty
      const allHandsEmpty = s.players.every((p) => (hands[p.id] ?? []).length === 0);
      const pondEmpty = newPond.length === 0;
      const anyHandEmpty = s.players.some((p) => (hands[p.id] ?? []).length === 0);

      if (allHandsEmpty || (pondEmpty && anyHandEmpty)) {
        const maxBooks = Math.max(...Object.values(books).map((b) => b.length));
        const winners = s.players
          .filter((p) => (books[p.id] ?? []).length === maxBooks)
          .map((p) => p.id);
        return {
          ...s,
          hands,
          books,
          scores,
          pond: newPond,
          phase: 'ended',
          status: 'finished',
          winners,
          lastAction,
          currentPlayerIndex: nextPlayerIndex,
        };
      }

      // Skip players with empty hands
      let ni = nextPlayerIndex;
      for (let i = 0; i < s.players.length; i++) {
        if ((hands[s.players[ni]?.id ?? ''] ?? []).length > 0 || newPond.length > 0) break;
        ni = (ni + 1) % s.players.length;
      }

      return {
        ...s,
        hands,
        books,
        scores,
        pond: newPond,
        lastAction,
        currentPlayerIndex: ni,
      };
    }

    case 'draw': {
      // Manual draw (when no valid ask possible)
      const pid = action.playerId ?? '';
      if (s.pond.length === 0) return state;
      const newPond = [...s.pond];
      const drawnCard = { ...newPond.shift()!, faceUp: true };
      const newHands = { ...s.hands, [pid]: [...(s.hands[pid] ?? []), drawnCard] };

      const { hands, books, scores } = checkAndRemoveBooks(newHands, s.books, s.scores, s.players);
      const nextPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;

      return {
        ...s,
        hands,
        books,
        scores,
        pond: newPond,
        currentPlayerIndex: nextPlayerIndex,
      };
    }

    default:
      return state;
  }
}

export function getLegalActions(state: GoFishState, playerId: string): GameAction[] {
  const actions: GameAction[] = [];
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) return actions;
  if (state.phase !== 'playing') return actions;

  const hand = state.hands[playerId] ?? [];
  const myRanks = [...new Set(hand.map((c) => c.rank))];

  for (const targetPlayer of state.players) {
    if (targetPlayer.id === playerId) continue;
    if ((state.hands[targetPlayer.id] ?? []).length === 0 && state.pond.length === 0) continue;

    for (const rank of myRanks) {
      actions.push({
        type: 'ask',
        playerId,
        payload: { targetId: targetPlayer.id, rank },
      });
    }
  }

  if (actions.length === 0 && state.pond.length > 0) {
    actions.push({ type: 'draw', playerId });
  }

  return actions;
}

export function isTerminal(state: GoFishState): boolean {
  return state.phase === 'ended';
}

export function getWinners(state: GoFishState): string[] {
  return state.winners;
}

export function getBotAction(
  state: GoFishState,
  botPlayerId: string,
  difficulty: BotDifficulty
): GameAction {
  const hand = state.hands[botPlayerId] ?? [];
  const myRanks = [...new Set(hand.map((c) => c.rank))];

  if (myRanks.length === 0) {
    return { type: 'draw', playerId: botPlayerId };
  }

  const validTargets = state.players.filter(
    (p) => p.id !== botPlayerId && (state.hands[p.id] ?? []).length > 0
  );
  if (validTargets.length === 0) {
    return { type: 'draw', playerId: botPlayerId };
  }

  if (difficulty === 'hard') {
    // Ask for rank we have the most of (most likely to succeed statistically)
    const rankCounts: Partial<Record<Rank, number>> = {};
    for (const c of hand) rankCounts[c.rank] = (rankCounts[c.rank] ?? 0) + 1;
    const bestRank = myRanks.reduce((a, b) =>
      (rankCounts[a] ?? 0) >= (rankCounts[b] ?? 0) ? a : b
    );
    const target = validTargets[Math.floor(Math.random() * validTargets.length)];
    return { type: 'ask', playerId: botPlayerId, payload: { targetId: target.id, rank: bestRank } };
  }

  // Easy/medium: pick randomly
  const rank = myRanks[Math.floor(Math.random() * myRanks.length)];
  const target = validTargets[Math.floor(Math.random() * validTargets.length)];
  return { type: 'ask', playerId: botPlayerId, payload: { targetId: target.id, rank } };
}
