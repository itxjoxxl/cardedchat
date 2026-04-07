import { Card, Suit } from '@/types';
import { BaseGameState, GameAction, Player, GameStatus } from '@/types';
import { createStandardDeck, shuffle } from '../deck';
import { getRankValue } from '../card-utils';
import { BotDifficulty } from '../bot/difficulty';

export type SpadesPhase = 'bidding' | 'playing' | 'scoring' | 'ended';

export interface SpadesState extends BaseGameState {
  gameId: 'spades';
  phase: SpadesPhase;
  hands: Record<string, Card[]>;
  bids: Record<string, number>;
  tricksTaken: Record<string, number>;
  bags: Record<string, number>; // per team
  trick: { playerId: string; card: Card }[];
  trickLeader: number;
  spadesBroken: boolean;
  roundNumber: number;
  teamScores: [number, number]; // team 0 = players 0+2, team 1 = players 1+3
}

function getTeam(playerIndex: number): 0 | 1 {
  return (playerIndex % 2) as 0 | 1;
}

function trickWinner(trick: { playerId: string; card: Card }[], leadSuit: Suit, players: Player[]): string {
  // Spades trump
  const spades = trick.filter((t) => t.card.suit === 'spades');
  if (spades.length > 0) {
    return spades.reduce((best, curr) =>
      getRankValue(curr.card.rank) > getRankValue(best.card.rank) ? curr : best
    ).playerId;
  }
  const led = trick.filter((t) => t.card.suit === leadSuit);
  return led.reduce((best, curr) =>
    getRankValue(curr.card.rank) > getRankValue(best.card.rank) ? curr : best
  ).playerId;
}

export function createInitialState(
  players: Player[],
  _options: Record<string, unknown> = {},
  seed?: number
): SpadesState {
  if (players.length !== 4) throw new Error('Spades requires 4 players');

  const deck = shuffle(createStandardDeck(), seed);
  const hands: Record<string, Card[]> = {};
  players.forEach((p, i) => {
    hands[p.id] = deck.slice(i * 13, (i + 1) * 13).map((c) => ({ ...c, faceUp: true }));
  });

  const base: BaseGameState = {
    gameId: 'spades',
    players,
    currentPlayerIndex: 0,
    status: 'playing' as GameStatus,
    winners: [],
    scores: Object.fromEntries(players.map((p) => [p.id, 0])),
  };

  return {
    ...base,
    gameId: 'spades',
    phase: 'bidding',
    hands,
    bids: {},
    tricksTaken: Object.fromEntries(players.map((p) => [p.id, 0])),
    bags: { '0': 0, '1': 0 },
    trick: [],
    trickLeader: 0,
    spadesBroken: false,
    roundNumber: 1,
    teamScores: [0, 0],
  };
}

export function applyAction(state: SpadesState, action: GameAction): SpadesState {
  const { type, payload } = action;
  const currentPlayer = state.players[state.currentPlayerIndex];

  if (type === 'bid') {
    const { amount } = payload as { amount: number };
    const newBids = { ...state.bids, [currentPlayer.id]: amount };
    const allBid = state.players.every((p) => newBids[p.id] !== undefined);

    if (!allBid) {
      const nextIndex = (state.currentPlayerIndex + 1) % 4;
      return { ...state, bids: newBids, currentPlayerIndex: nextIndex };
    }

    // All bids in, start playing
    return {
      ...state,
      bids: newBids,
      phase: 'playing',
      currentPlayerIndex: 0,
      trickLeader: 0,
    };
  }

  if (type === 'play') {
    const { cardId } = payload as { cardId: string };
    if (state.phase !== 'playing') return state;

    const hand = state.hands[currentPlayer.id];
    const card = hand.find((c) => c.id === cardId);
    if (!card) return state;

    const newHand = hand.filter((c) => c.id !== cardId);
    const newTrick = [...state.trick, { playerId: currentPlayer.id, card }];
    const spadesBroken = state.spadesBroken || card.suit === 'spades';

    if (newTrick.length < 4) {
      const nextIndex = (state.currentPlayerIndex + 1) % 4;
      return {
        ...state,
        hands: { ...state.hands, [currentPlayer.id]: newHand },
        trick: newTrick,
        spadesBroken,
        currentPlayerIndex: nextIndex,
      };
    }

    // Trick complete
    const leadSuit = newTrick[0].card.suit;
    const winnerId = trickWinner(newTrick, leadSuit, state.players);
    const winnerIndex = state.players.findIndex((p) => p.id === winnerId);

    const newTricksTaken = { ...state.tricksTaken, [winnerId]: (state.tricksTaken[winnerId] ?? 0) + 1 };
    const newHands = { ...state.hands, [currentPlayer.id]: newHand };

    // Check if round over (all 13 tricks played)
    const totalTricks = Object.values(newTricksTaken).reduce((a, b) => a + b, 0);

    if (totalTricks < 13) {
      return {
        ...state,
        hands: newHands,
        trick: [],
        trickLeader: winnerIndex,
        currentPlayerIndex: winnerIndex,
        spadesBroken,
        tricksTaken: newTricksTaken,
      };
    }

    // Score the round
    const teamTricks: [number, number] = [0, 0];
    const teamBids: [number, number] = [0, 0];
    for (let i = 0; i < 4; i++) {
      const pid = state.players[i].id;
      const team = getTeam(i);
      teamTricks[team] += newTricksTaken[pid] ?? 0;
      teamBids[team] += state.bids[pid] ?? 0;
    }

    const newTeamScores: [number, number] = [...state.teamScores] as [number, number];
    const newBags: Record<string, number> = { ...state.bags };

    for (let team = 0; team < 2; team++) {
      const bid = teamBids[team];
      const taken = teamTricks[team];

      if (bid === 0) {
        // Nil bid handled separately
      }

      if (taken >= bid) {
        const bags = taken - bid;
        newBags[String(team)] = (Number(newBags[String(team)]) ?? 0) + bags;
        newTeamScores[team] += bid * 10 + bags;
        // Bag penalty
        if (Number(newBags[String(team)]) >= 10) {
          newTeamScores[team] -= 100;
          newBags[String(team)] = Number(newBags[String(team)]) - 10;
        }
      } else {
        newTeamScores[team] -= bid * 10;
      }
    }

    // Check nil bids
    for (let i = 0; i < 4; i++) {
      const pid = state.players[i].id;
      const team = getTeam(i);
      if (state.bids[pid] === 0) {
        const tricks = newTricksTaken[pid] ?? 0;
        if (tricks === 0) {
          newTeamScores[team] += 100;
        } else {
          newTeamScores[team] -= 100;
        }
      }
    }

    const gameOver = newTeamScores[0] >= 500 || newTeamScores[1] >= 500 ||
      newTeamScores[0] <= -200 || newTeamScores[1] <= -200;

    if (gameOver) {
      let winners: string[];
      if (newTeamScores[0] >= newTeamScores[1]) {
        winners = state.players.filter((_, i) => getTeam(i) === 0).map((p) => p.id);
      } else {
        winners = state.players.filter((_, i) => getTeam(i) === 1).map((p) => p.id);
      }
      return {
        ...state,
        hands: newHands,
        trick: [],
        spadesBroken,
        tricksTaken: newTricksTaken,
        teamScores: newTeamScores,
        bags: newBags,
        phase: 'ended',
        status: 'ended',
        winners,
        currentPlayerIndex: winnerIndex,
      };
    }

    // Start new round
    return startNewRound({
      ...state,
      teamScores: newTeamScores,
      bags: newBags,
      roundNumber: state.roundNumber + 1,
    });
  }

  return state;
}

function startNewRound(state: SpadesState): SpadesState {
  const deck = shuffle(createStandardDeck());
  const hands: Record<string, Card[]> = {};
  state.players.forEach((p, i) => {
    hands[p.id] = deck.slice(i * 13, (i + 1) * 13).map((c) => ({ ...c, faceUp: true }));
  });

  return {
    ...state,
    phase: 'bidding',
    hands,
    bids: {},
    tricksTaken: Object.fromEntries(state.players.map((p) => [p.id, 0])),
    trick: [],
    trickLeader: 0,
    currentPlayerIndex: 0,
    spadesBroken: false,
  };
}

export function getLegalActions(state: SpadesState, playerId: string): GameAction[] {
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) return [];

  if (state.phase === 'bidding') {
    // Can bid 0-13 (0 = nil)
    return Array.from({ length: 14 }, (_, i) => ({ type: 'bid', payload: { amount: i } }));
  }

  if (state.phase === 'playing') {
    const hand = state.hands[playerId] ?? [];
    const leadSuit = state.trick.length > 0 ? state.trick[0].card.suit : null;

    let playable: Card[];

    if (leadSuit) {
      const inSuit = hand.filter((c) => c.suit === leadSuit);
      playable = inSuit.length > 0 ? inSuit : hand;
    } else {
      // Leading: can't lead spades if not broken, unless only spades in hand
      if (!state.spadesBroken) {
        const nonSpades = hand.filter((c) => c.suit !== 'spades');
        playable = nonSpades.length > 0 ? nonSpades : hand;
      } else {
        playable = hand;
      }
    }

    return playable.map((c) => ({ type: 'play', payload: { cardId: c.id } }));
  }

  return [];
}

export function isTerminal(state: SpadesState): boolean {
  return state.phase === 'ended';
}

export function getWinners(state: SpadesState): string[] {
  return state.winners;
}

export function getBotAction(state: SpadesState, botPlayerId: string, difficulty: BotDifficulty): GameAction {
  const actions = getLegalActions(state, botPlayerId);
  if (actions.length === 0) return { type: 'play', payload: { cardId: '' } };

  if (state.phase === 'bidding') {
    const hand = state.hands[botPlayerId] ?? [];
    // Count likely tricks: aces, kings, queen of spades, high spades
    let estimate = 0;
    for (const card of hand) {
      if (card.rank === 'A') estimate += 1;
      else if (card.rank === 'K') estimate += 0.7;
      else if (card.suit === 'spades') estimate += 0.3;
    }
    const bid = Math.max(0, Math.min(13, Math.round(estimate)));
    return { type: 'bid', payload: { amount: bid } };
  }

  if (state.phase === 'playing') {
    if (difficulty === 'easy') return actions[Math.floor(Math.random() * actions.length)];

    const hand = state.hands[botPlayerId] ?? [];
    const playableIds = new Set(actions.map((a) => (a.payload as { cardId: string }).cardId));
    const playable = hand.filter((c) => playableIds.has(c.id));

    if (playable.length === 0) return actions[0];

    // Try to win tricks we bid for, dump losers otherwise
    const sorted = [...playable].sort((a, b) => {
      const score = (c: Card) => {
        if (c.suit === 'spades') return getRankValue(c.rank) + 14;
        return getRankValue(c.rank);
      };
      return score(b) - score(a);
    });

    return { type: 'play', payload: { cardId: sorted[0].id } };
  }

  return actions[0];
}
