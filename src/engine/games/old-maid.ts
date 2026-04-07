import { Card, Rank, Player } from '@/types';
import { BaseGameState, GameAction } from '@/types';
import { createStandardDeck, shuffle } from '../deck';
import { BotDifficulty } from '../bot/difficulty';

export type OldMaidPhase = 'discard-pairs' | 'draw-phase' | 'ended';

export interface OldMaidState extends BaseGameState {
  gameId: 'old-maid';
  phase: OldMaidPhase;
  hands: Record<string, Card[]>;
  eliminated: string[]; // players who have emptied their hand (ranked finishers)
  discardedPairs: Record<string, number>; // count of pairs discarded per player
  pendingDiscard: string | null; // playerId who still needs to discard pairs
}

function discardPairsFromHand(hand: Card[]): { hand: Card[]; pairsRemoved: number } {
  let newHand = [...hand];
  let pairsRemoved = 0;
  let changed = true;

  while (changed) {
    changed = false;
    const rankCounts: Partial<Record<Rank, number>> = {};
    for (const card of newHand) {
      rankCounts[card.rank] = (rankCounts[card.rank] ?? 0) + 1;
    }
    for (const [rank, count] of Object.entries(rankCounts)) {
      if ((count ?? 0) >= 2) {
        // Remove a pair
        let removed = 0;
        newHand = newHand.filter((c) => {
          if (c.rank === rank && removed < 2) {
            removed++;
            return false;
          }
          return true;
        });
        pairsRemoved++;
        changed = true;
        break; // restart scan
      }
    }
  }

  return { hand: newHand, pairsRemoved };
}

export function createInitialState(
  players: Player[],
  _options: Record<string, unknown> = {},
  seed?: number
): OldMaidState {
  const n = players.length;
  if (n < 2) throw new Error('Old Maid requires at least 2 players');

  // Remove one Queen (Queen of Clubs) to create the Old Maid
  const fullDeck = createStandardDeck();
  const deck = fullDeck.filter((c) => !(c.rank === 'Q' && c.suit === 'clubs'));
  const shuffled = shuffle(deck, seed);

  // Deal all cards round-robin
  const hands: Record<string, Card[]> = {};
  const scores: Record<string, number> = {};
  for (const p of players) {
    hands[p.id] = [];
    scores[p.id] = 0;
  }

  for (let i = 0; i < shuffled.length; i++) {
    const p = players[i % n];
    hands[p.id].push({ ...shuffled[i], faceUp: true });
  }

  // Discard initial pairs
  const discardedPairs: Record<string, number> = {};
  for (const p of players) {
    const { hand, pairsRemoved } = discardPairsFromHand(hands[p.id]);
    hands[p.id] = hand;
    discardedPairs[p.id] = pairsRemoved;
  }

  return {
    gameId: 'old-maid',
    players,
    currentPlayerIndex: 0,
    phase: 'draw-phase',
    status: 'active',
    winners: [],
    scores,
    turnCount: 0,
    hands,
    eliminated: [],
    discardedPairs,
    pendingDiscard: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seed,
  };
}

function getNextActivePlayerIndex(
  current: number,
  players: Player[],
  hands: Record<string, Card[]>,
  eliminated: string[]
): number {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (current + i) % n;
    const pid = players[idx].id;
    if (!eliminated.includes(pid) && (hands[pid] ?? []).length > 0) {
      return idx;
    }
  }
  return (current + 1) % n;
}

export function applyAction(state: OldMaidState, action: GameAction): OldMaidState {
  const s = { ...state, updatedAt: new Date().toISOString(), turnCount: (state.turnCount ?? 0) + 1 };

  switch (action.type) {
    case 'discard-pairs': {
      const pid = action.playerId ?? '';
      const hand = [...(s.hands[pid] ?? [])];
      const { hand: newHand, pairsRemoved } = discardPairsFromHand(hand);
      const newHands = { ...s.hands, [pid]: newHand };
      const discardedPairs = { ...s.discardedPairs, [pid]: (s.discardedPairs[pid] ?? 0) + pairsRemoved };

      // Check if player is eliminated
      let eliminated = [...s.eliminated];
      if (newHand.length === 0 && !eliminated.includes(pid)) {
        eliminated = [...eliminated, pid];
      }

      return { ...s, hands: newHands, discardedPairs, eliminated, pendingDiscard: null };
    }

    case 'draw': {
      const { fromPlayerId, cardIndex } = action.payload as { fromPlayerId: string; cardIndex: number };
      const drawerId = action.playerId ?? '';

      const fromHand = [...(s.hands[fromPlayerId] ?? [])];
      if (cardIndex < 0 || cardIndex >= fromHand.length) return state;

      // Card shown face-down to drawer (they don't know which it is)
      const drawnCard = { ...fromHand.splice(cardIndex, 1)[0], faceUp: true };
      const drawerHand = [...(s.hands[drawerId] ?? []), drawnCard];

      const newHands = { ...s.hands, [fromPlayerId]: fromHand, [drawerId]: drawerHand };

      // Discard any new pairs for drawer
      const { hand: drawerHandClean, pairsRemoved } = discardPairsFromHand(drawerHand);
      newHands[drawerId] = drawerHandClean;
      const discardedPairs = {
        ...s.discardedPairs,
        [drawerId]: (s.discardedPairs[drawerId] ?? 0) + pairsRemoved,
      };

      let eliminated = [...s.eliminated];
      // Check eliminations
      for (const p of s.players) {
        if (!eliminated.includes(p.id) && (newHands[p.id] ?? []).length === 0) {
          eliminated = [...eliminated, p.id];
        }
      }

      const scores = { ...s.scores };
      for (let i = 0; i < eliminated.length; i++) {
        scores[eliminated[i]] = i + 1; // rank by elimination order
      }

      // Check game end: only 1 player with cards left (the Old Maid holder loses)
      const activePlayers = s.players.filter(
        (p) => !eliminated.includes(p.id) && (newHands[p.id] ?? []).length > 0
      );

      if (activePlayers.length <= 1) {
        const loser = activePlayers[0]?.id;
        const winners = eliminated.slice();
        return {
          ...s,
          hands: newHands,
          eliminated,
          discardedPairs,
          scores,
          phase: 'ended',
          status: 'finished',
          winners,
        };
      }

      // Advance to next active player who has cards to draw from
      const nextIdx = getNextActivePlayerIndex(s.currentPlayerIndex, s.players, newHands, eliminated);

      return {
        ...s,
        hands: newHands,
        eliminated,
        discardedPairs,
        scores,
        currentPlayerIndex: nextIdx,
      };
    }

    default:
      return state;
  }
}

export function getLegalActions(state: OldMaidState, playerId: string): GameAction[] {
  const actions: GameAction[] = [];

  if (state.phase === 'discard-pairs') {
    if (state.pendingDiscard === playerId || !state.pendingDiscard) {
      actions.push({ type: 'discard-pairs', playerId });
    }
    return actions;
  }

  if (state.phase !== 'draw-phase') return actions;

  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer || currentPlayer.id !== playerId) return actions;

  // Find the player to draw from (previous active player in turn order)
  // The current player draws from the player to their "right" (prev in turn)
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const targetIdx = ((state.currentPlayerIndex - i) + n) % n;
    const target = state.players[targetIdx];
    if (target.id !== playerId && !state.eliminated.includes(target.id)) {
      const targetHand = state.hands[target.id] ?? [];
      for (let ci = 0; ci < targetHand.length; ci++) {
        actions.push({
          type: 'draw',
          playerId,
          payload: { fromPlayerId: target.id, cardIndex: ci },
        });
      }
      break;
    }
  }

  return actions;
}

export function isTerminal(state: OldMaidState): boolean {
  return state.phase === 'ended';
}

export function getWinners(state: OldMaidState): string[] {
  return state.winners;
}

export function getBotAction(
  state: OldMaidState,
  botPlayerId: string,
  difficulty: BotDifficulty
): GameAction {
  const actions = getLegalActions(state, botPlayerId);
  if (actions.length === 0) return { type: 'draw', playerId: botPlayerId, payload: { fromPlayerId: '', cardIndex: 0 } };

  if (actions[0].type === 'discard-pairs') return actions[0];

  // For drawing: pick a random card (can't see opponent's cards)
  // Hard bots might remember what cards were drawn before, but in this model we pick randomly
  if (difficulty === 'hard') {
    // Pick the middle card (statistically equivalent to random for unknown hand)
    const midIdx = Math.floor(actions.length / 2);
    return actions[midIdx];
  }

  return actions[Math.floor(Math.random() * actions.length)];
}
