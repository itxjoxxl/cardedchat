import { Card, Suit } from '@/types';
import { BaseGameState, GameAction, Player, GameStatus } from '@/types';
import { createStandardDeck, shuffle } from '../deck';
import { getRankValue } from '../card-utils';
import { BotDifficulty } from '../bot/difficulty';

export type HeartsPhase = 'passing' | 'playing' | 'scoring' | 'ended';
export type PassDirection = 'left' | 'right' | 'across' | 'none';

export interface HeartsState extends BaseGameState {
  gameId: 'hearts';
  phase: HeartsPhase;
  hands: Record<string, Card[]>;
  passDirection: PassDirection;
  pendingPasses: Record<string, Card[]>;
  trick: { playerId: string; card: Card }[];
  trickLeader: number;
  heartsBroken: boolean;
  tricksTaken: Record<string, Card[]>;
  roundNumber: number;
}

const PASS_ROTATION: PassDirection[] = ['left', 'right', 'across', 'none'];

function cardPoints(card: Card): number {
  if (card.suit === 'hearts') return 1;
  if (card.suit === 'spades' && card.rank === 'Q') return 13;
  return 0;
}

function trickWinner(trick: { playerId: string; card: Card }[], leadSuit: Suit): string {
  const led = trick.filter((t) => t.card.suit === leadSuit);
  const highest = led.reduce((best, curr) =>
    getRankValue(curr.card.rank) > getRankValue(best.card.rank) ? curr : best
  );
  return highest.playerId;
}

export function createInitialState(
  players: Player[],
  _options: Record<string, unknown> = {},
  seed?: number
): HeartsState {
  if (players.length !== 4) throw new Error('Hearts requires 4 players');

  const deck = shuffle(createStandardDeck(), seed);
  const hands: Record<string, Card[]> = {};
  const chunkSize = 13;
  players.forEach((p, i) => {
    hands[p.id] = deck.slice(i * chunkSize, (i + 1) * chunkSize).map((c) => ({ ...c, faceUp: true }));
  });

  // 2 of clubs starts - find who has it
  const starter = players.findIndex((p) =>
    hands[p.id].some((c) => c.rank === '2' && c.suit === 'clubs')
  );

  const base: BaseGameState = {
    gameId: 'hearts',
    players,
    currentPlayerIndex: starter >= 0 ? starter : 0,
    status: 'playing' as GameStatus,
    winners: [],
    scores: Object.fromEntries(players.map((p) => [p.id, 0])),
  };

  return {
    ...base,
    gameId: 'hearts',
    phase: 'passing',
    hands,
    passDirection: 'left',
    pendingPasses: Object.fromEntries(players.map((p) => [p.id, []])),
    trick: [],
    trickLeader: starter >= 0 ? starter : 0,
    heartsBroken: false,
    tricksTaken: Object.fromEntries(players.map((p) => [p.id, []])),
    roundNumber: 1,
  };
}

function resolvePassPhase(state: HeartsState): HeartsState {
  const n = state.players.length;
  const newHands = { ...state.hands };

  state.players.forEach((player, i) => {
    let targetIndex: number;
    if (state.passDirection === 'left') targetIndex = (i + 1) % n;
    else if (state.passDirection === 'right') targetIndex = (i - 1 + n) % n;
    else if (state.passDirection === 'across') targetIndex = (i + 2) % n;
    else return; // 'none'

    const target = state.players[targetIndex];
    const passed = state.pendingPasses[player.id] ?? [];
    newHands[target.id] = [...(newHands[target.id] ?? []), ...passed].filter(
      (c) => !(passed.some((p) => p.id === c.id) && newHands[target.id].includes(c) === false)
    );
    // Remove passed cards from passer
    const passedIds = new Set(passed.map((c) => c.id));
    newHands[player.id] = state.hands[player.id].filter((c) => !passedIds.has(c.id));
  });

  // Add received cards
  state.players.forEach((player, i) => {
    let fromIndex: number;
    if (state.passDirection === 'left') fromIndex = (i - 1 + n) % n;
    else if (state.passDirection === 'right') fromIndex = (i + 1) % n;
    else if (state.passDirection === 'across') fromIndex = (i + 2) % n;
    else return;

    const from = state.players[fromIndex];
    const received = state.pendingPasses[from.id] ?? [];
    const passedIds = new Set(received.map((c) => c.id));
    // Remove from sender's hand (already done above), add to receiver
    newHands[player.id] = [...newHands[player.id].filter((c) => !passedIds.has(c.id)), ...received];
  });

  // Fix: simple direct swap
  const finalHands = { ...state.hands };
  state.players.forEach((player, i) => {
    let targetIndex: number;
    if (state.passDirection === 'left') targetIndex = (i + 1) % n;
    else if (state.passDirection === 'right') targetIndex = (i - 1 + n) % n;
    else if (state.passDirection === 'across') targetIndex = (i + 2) % n;
    else { return; }

    const target = state.players[targetIndex];
    const passed = state.pendingPasses[player.id] ?? [];
    const passedIds = new Set(passed.map((c) => c.id));
    finalHands[player.id] = state.hands[player.id].filter((c) => !passedIds.has(c.id));
    finalHands[target.id] = [...finalHands[target.id], ...passed];
  });

  const starter = state.players.findIndex((p) =>
    finalHands[p.id].some((c) => c.rank === '2' && c.suit === 'clubs')
  );

  return {
    ...state,
    hands: finalHands,
    phase: 'playing',
    pendingPasses: Object.fromEntries(state.players.map((p) => [p.id, []])),
    trickLeader: starter >= 0 ? starter : 0,
    currentPlayerIndex: starter >= 0 ? starter : 0,
  };
}

export function applyAction(state: HeartsState, action: GameAction): HeartsState {
  const { type, payload } = action;
  const currentPlayer = state.players[state.currentPlayerIndex];

  if (type === 'pass') {
    const { cardIds } = payload as { cardIds: string[] };
    if (state.phase !== 'passing') return state;
    if (state.passDirection === 'none') {
      // No-pass round — advance to playing immediately
      return resolvePassPhase(state);
    }
    if (cardIds.length !== 3) return state;
    const cards = state.hands[currentPlayer.id].filter((c) => cardIds.includes(c.id));
    if (cards.length !== 3) return state;

    const newPending = { ...state.pendingPasses, [currentPlayer.id]: cards };
    const newState = { ...state, pendingPasses: newPending };

    // Check if all players have passed
    const allPassed = newState.players.every((p) => (newPending[p.id]?.length ?? 0) === 3);
    if (allPassed) return resolvePassPhase(newState);

    // Move to next player who hasn't passed
    const nextIndex = newState.players.findIndex((p) => (newPending[p.id]?.length ?? 0) === 0);
    return { ...newState, currentPlayerIndex: nextIndex >= 0 ? nextIndex : state.currentPlayerIndex };
  }

  if (type === 'play') {
    const { cardId } = payload as { cardId: string };
    if (state.phase !== 'playing') return state;

    const hand = state.hands[currentPlayer.id];
    const card = hand.find((c) => c.id === cardId);
    if (!card) return state;

    const newHand = hand.filter((c) => c.id !== cardId);
    const newTrick = [...state.trick, { playerId: currentPlayer.id, card }];
    let heartsBroken = state.heartsBroken || card.suit === 'hearts';

    const n = state.players.length;

    if (newTrick.length < n) {
      // Trick not complete
      const nextIndex = (state.currentPlayerIndex + 1) % n;
      return {
        ...state,
        hands: { ...state.hands, [currentPlayer.id]: newHand },
        trick: newTrick,
        heartsBroken,
        currentPlayerIndex: nextIndex,
      };
    }

    // Trick complete - find winner
    const leadSuit = newTrick[0].card.suit;
    const winnerId = trickWinner(newTrick, leadSuit);
    const winnerIndex = state.players.findIndex((p) => p.id === winnerId);
    const newTricksTaken = {
      ...state.tricksTaken,
      [winnerId]: [...(state.tricksTaken[winnerId] ?? []), ...newTrick.map((t) => t.card)],
    };

    const newHands = { ...state.hands, [currentPlayer.id]: newHand };

    // Check if round is over (all hands empty)
    const roundOver = state.players.every((p) => {
      const h = p.id === currentPlayer.id ? newHand : newHands[p.id];
      return h.length === 0;
    });

    if (!roundOver) {
      return {
        ...state,
        hands: newHands,
        trick: [],
        trickLeader: winnerIndex,
        currentPlayerIndex: winnerIndex,
        heartsBroken,
        tricksTaken: newTricksTaken,
      };
    }

    // Score the round
    const roundPoints: Record<string, number> = {};
    for (const player of state.players) {
      roundPoints[player.id] = (newTricksTaken[player.id] ?? []).reduce((sum, c) => sum + cardPoints(c), 0);
    }

    // Check for shooting the moon
    const moonShooter = Object.entries(roundPoints).find(([, pts]) => pts === 26)?.[0];
    const newScores = { ...state.scores };
    if (moonShooter) {
      for (const p of state.players) {
        if (p.id !== moonShooter) newScores[p.id] = (newScores[p.id] ?? 0) + 26;
      }
    } else {
      for (const p of state.players) {
        newScores[p.id] = (newScores[p.id] ?? 0) + (roundPoints[p.id] ?? 0);
      }
    }

    // Check game over (any player >= 100)
    const gameOver = Object.values(newScores).some((s) => s >= 100);
    if (gameOver) {
      const minScore = Math.min(...Object.values(newScores));
      const winners = state.players.filter((p) => newScores[p.id] === minScore).map((p) => p.id);
      return {
        ...state,
        hands: newHands,
        trick: [],
        heartsBroken,
        tricksTaken: newTricksTaken,
        scores: newScores,
        phase: 'ended',
        status: 'ended',
        winners,
        currentPlayerIndex: winnerIndex,
      };
    }

    // Start new round
    return startNewRound({ ...state, scores: newScores, roundNumber: state.roundNumber + 1 });
  }

  return state;
}

function startNewRound(state: HeartsState): HeartsState {
  const deck = shuffle(createStandardDeck());
  const n = state.players.length;
  const chunkSize = Math.floor(52 / n);
  const hands: Record<string, Card[]> = {};
  state.players.forEach((p, i) => {
    hands[p.id] = deck.slice(i * chunkSize, (i + 1) * chunkSize).map((c) => ({ ...c, faceUp: true }));
  });

  const passIdx = state.roundNumber % 4;
  const passDirection = PASS_ROTATION[passIdx];

  const starter = state.players.findIndex((p) =>
    hands[p.id].some((c) => c.rank === '2' && c.suit === 'clubs')
  );

  return {
    ...state,
    phase: passDirection === 'none' ? 'playing' : 'passing',
    hands,
    passDirection,
    pendingPasses: Object.fromEntries(state.players.map((p) => [p.id, []])),
    trick: [],
    trickLeader: starter >= 0 ? starter : 0,
    currentPlayerIndex: starter >= 0 ? starter : 0,
    heartsBroken: false,
    tricksTaken: Object.fromEntries(state.players.map((p) => [p.id, []])),
  };
}

export function getLegalActions(state: HeartsState, playerId: string): GameAction[] {
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) return [];

  if (state.phase === 'passing') {
    if (state.passDirection === 'none') {
      return [{ type: 'pass', payload: { cardIds: [] } }];
    }
    const hand = state.hands[playerId] ?? [];
    return hand.map((c) => ({ type: 'select-pass', payload: { cardId: c.id } }));
  }

  if (state.phase === 'playing') {
    const hand = state.hands[playerId] ?? [];
    const leadSuit = state.trick.length > 0 ? state.trick[0].card.suit : null;
    const isFirstTrick = state.players.every((p) => (state.tricksTaken[p.id]?.length ?? 0) === 0);

    let playable: Card[];

    if (leadSuit) {
      const inSuit = hand.filter((c) => c.suit === leadSuit);
      playable = inSuit.length > 0 ? inSuit : hand.filter((c) => {
        // First trick: can't play hearts or Q of spades
        if (isFirstTrick && (c.suit === 'hearts' || (c.suit === 'spades' && c.rank === 'Q'))) return false;
        return true;
      });
      if (playable.length === 0) playable = hand;
    } else {
      // Leading a trick
      if (isFirstTrick) {
        // Must lead 2 of clubs
        const twoClubs = hand.find((c) => c.rank === '2' && c.suit === 'clubs');
        playable = twoClubs ? [twoClubs] : hand;
      } else if (!state.heartsBroken) {
        const nonHearts = hand.filter((c) => c.suit !== 'hearts');
        playable = nonHearts.length > 0 ? nonHearts : hand;
      } else {
        playable = hand;
      }
    }

    return playable.map((c) => ({ type: 'play', payload: { cardId: c.id } }));
  }

  return [];
}

export function isTerminal(state: HeartsState): boolean {
  return state.phase === 'ended';
}

export function getWinners(state: HeartsState): string[] {
  return state.winners;
}

export function getBotAction(state: HeartsState, botPlayerId: string, difficulty: BotDifficulty): GameAction {
  const actions = getLegalActions(state, botPlayerId);
  if (actions.length === 0) return { type: 'play', payload: { cardId: '' } };

  if (state.phase === 'passing') {
    if (state.passDirection === 'none') return actions[0];

    const hand = state.hands[botPlayerId] ?? [];
    // Pass high-point cards: Q of spades, high hearts, high spades
    const sorted = [...hand].sort((a, b) => {
      const pts = (c: Card) => {
        if (c.suit === 'spades' && c.rank === 'Q') return 100;
        if (c.suit === 'hearts') return getRankValue(c.rank);
        if (c.suit === 'spades' && getRankValue(c.rank) > 11) return getRankValue(c.rank) - 5;
        return 0;
      };
      return pts(b) - pts(a);
    });
    return { type: 'pass', payload: { cardIds: sorted.slice(0, 3).map((c) => c.id) } };
  }

  if (state.phase === 'playing') {
    if (difficulty === 'easy') return actions[Math.floor(Math.random() * actions.length)];

    const hand = state.hands[botPlayerId] ?? [];
    const playableIds = new Set(actions.map((a) => (a.payload as { cardId: string }).cardId));
    const playable = hand.filter((c) => playableIds.has(c.id));

    if (playable.length === 0) return actions[0];

    // Avoid taking points: prefer low cards, avoid hearts
    const sorted = [...playable].sort((a, b) => {
      const pts = (c: Card) => {
        if (c.suit === 'spades' && c.rank === 'Q') return 100;
        if (c.suit === 'hearts') return 10 + getRankValue(c.rank);
        return getRankValue(c.rank);
      };
      return pts(a) - pts(b);
    });

    const best = sorted[0];
    return { type: 'play', payload: { cardId: best.id } };
  }

  return actions[0];
}
