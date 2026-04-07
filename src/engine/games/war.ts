import { Card, Player } from '@/types';
import { BaseGameState, GameAction } from '@/types';
import { createStandardDeck, shuffle } from '../deck';
import { getRankValue } from '../card-utils';
import { BotDifficulty } from '../bot/difficulty';

export type WarPhase = 'flip' | 'war' | 'collect' | 'ended';

export interface WarState extends BaseGameState {
  gameId: 'war';
  phase: WarPhase;
  playerDecks: [Card[], Card[]]; // deck for each player (0 and 1)
  flippedCards: [Card | null, Card | null]; // current face-up battle cards
  warPile: Card[]; // accumulated during war
  warFaceDownCounts: [number, number]; // face-down cards each player has committed to war
  roundWinner: string | null;
  roundCount: number;
}

export function createInitialState(
  players: Player[],
  _options: Record<string, unknown> = {},
  seed?: number
): WarState {
  if (players.length !== 2) throw new Error('War requires exactly 2 players');

  const deck = shuffle(createStandardDeck(), seed);
  const half = Math.floor(deck.length / 2);

  const deck0 = deck.slice(0, half).map((c) => ({ ...c, faceUp: false }));
  const deck1 = deck.slice(half).map((c) => ({ ...c, faceUp: false }));

  const scores: Record<string, number> = {};
  for (const p of players) scores[p.id] = 0;

  return {
    gameId: 'war',
    players,
    currentPlayerIndex: 0,
    phase: 'flip',
    status: 'active',
    winners: [],
    scores,
    turnCount: 0,
    playerDecks: [deck0, deck1],
    flippedCards: [null, null],
    warPile: [],
    warFaceDownCounts: [0, 0],
    roundWinner: null,
    roundCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seed,
  };
}

export function applyAction(state: WarState, action: GameAction): WarState {
  const s = { ...state, updatedAt: new Date().toISOString(), turnCount: (state.turnCount ?? 0) + 1 };

  switch (action.type) {
    case 'flip': {
      if (s.phase !== 'flip') return state;

      const p0Deck = [...s.playerDecks[0]];
      const p1Deck = [...s.playerDecks[1]];

      if (p0Deck.length === 0 || p1Deck.length === 0) {
        // Game over
        const winner = p0Deck.length > 0 ? s.players[0].id : s.players[1].id;
        return { ...s, phase: 'ended', status: 'finished', winners: [winner] };
      }

      const card0 = { ...p0Deck.shift()!, faceUp: true };
      const card1 = { ...p1Deck.shift()!, faceUp: true };

      const val0 = getRankValue(card0.rank);
      const val1 = getRankValue(card1.rank);

      if (val0 > val1) {
        // Player 0 wins
        return {
          ...s,
          phase: 'collect',
          playerDecks: [p0Deck, p1Deck],
          flippedCards: [card0, card1],
          roundWinner: s.players[0].id,
          roundCount: s.roundCount + 1,
        };
      } else if (val1 > val0) {
        // Player 1 wins
        return {
          ...s,
          phase: 'collect',
          playerDecks: [p0Deck, p1Deck],
          flippedCards: [card0, card1],
          roundWinner: s.players[1].id,
          roundCount: s.roundCount + 1,
        };
      } else {
        // Tie = war!
        const warPile = [...s.warPile, card0, card1];

        // Check if either player can afford war (needs at least 4 more cards)
        if (p0Deck.length < 4 || p1Deck.length < 4) {
          // Not enough cards - player with more cards wins
          if (p0Deck.length > p1Deck.length) {
            return { ...s, phase: 'ended', status: 'finished', winners: [s.players[0].id], playerDecks: [p0Deck, p1Deck] };
          } else if (p1Deck.length > p0Deck.length) {
            return { ...s, phase: 'ended', status: 'finished', winners: [s.players[1].id], playerDecks: [p0Deck, p1Deck] };
          } else {
            return { ...s, phase: 'ended', status: 'finished', winners: [s.players[0].id, s.players[1].id], playerDecks: [p0Deck, p1Deck] };
          }
        }

        // Place 3 face-down cards each
        const faceDown0 = p0Deck.splice(0, 3).map((c) => ({ ...c, faceUp: false }));
        const faceDown1 = p1Deck.splice(0, 3).map((c) => ({ ...c, faceUp: false }));

        return {
          ...s,
          phase: 'war',
          playerDecks: [p0Deck, p1Deck],
          flippedCards: [null, null],
          warPile: [...warPile, ...faceDown0, ...faceDown1],
          roundWinner: null,
          roundCount: s.roundCount + 1,
        };
      }
    }

    case 'war-flip': {
      if (s.phase !== 'war') return state;

      const p0Deck = [...s.playerDecks[0]];
      const p1Deck = [...s.playerDecks[1]];

      if (p0Deck.length === 0 || p1Deck.length === 0) {
        const winner = p0Deck.length > 0 ? s.players[0].id : s.players[1].id;
        return { ...s, phase: 'ended', status: 'finished', winners: [winner] };
      }

      const card0 = { ...p0Deck.shift()!, faceUp: true };
      const card1 = { ...p1Deck.shift()!, faceUp: true };
      const val0 = getRankValue(card0.rank);
      const val1 = getRankValue(card1.rank);

      const warPile = [...s.warPile, card0, card1];

      if (val0 > val1) {
        return {
          ...s,
          phase: 'collect',
          playerDecks: [p0Deck, p1Deck],
          flippedCards: [card0, card1],
          warPile,
          roundWinner: s.players[0].id,
        };
      } else if (val1 > val0) {
        return {
          ...s,
          phase: 'collect',
          playerDecks: [p0Deck, p1Deck],
          flippedCards: [card0, card1],
          warPile,
          roundWinner: s.players[1].id,
        };
      } else {
        // Another war
        if (p0Deck.length < 4 || p1Deck.length < 4) {
          const winner = p0Deck.length >= p1Deck.length ? s.players[0].id : s.players[1].id;
          return { ...s, phase: 'ended', status: 'finished', winners: [winner], playerDecks: [p0Deck, p1Deck] };
        }
        const fd0 = p0Deck.splice(0, 3).map((c) => ({ ...c, faceUp: false }));
        const fd1 = p1Deck.splice(0, 3).map((c) => ({ ...c, faceUp: false }));
        return {
          ...s,
          phase: 'war',
          playerDecks: [p0Deck, p1Deck],
          flippedCards: [null, null],
          warPile: [...warPile, ...fd0, ...fd1],
          roundWinner: null,
        };
      }
    }

    case 'collect': {
      if (s.phase !== 'collect' || !s.roundWinner) return state;

      const winnerIndex = s.players.findIndex((p) => p.id === s.roundWinner);
      const loserIndex = winnerIndex === 0 ? 1 : 0;

      const allCards = [
        ...(s.flippedCards[0] ? [{ ...s.flippedCards[0], faceUp: false }] : []),
        ...(s.flippedCards[1] ? [{ ...s.flippedCards[1], faceUp: false }] : []),
        ...s.warPile.map((c) => ({ ...c, faceUp: false })),
      ];

      const newDecks: [Card[], Card[]] = [...s.playerDecks] as [Card[], Card[]];
      newDecks[winnerIndex] = [...s.playerDecks[winnerIndex], ...allCards];

      const scores = { ...s.scores };
      scores[s.roundWinner] = (scores[s.roundWinner] || 0) + 1;

      // Check for game over
      if (newDecks[loserIndex].length === 0) {
        return {
          ...s,
          phase: 'ended',
          status: 'finished',
          playerDecks: newDecks,
          winners: [s.roundWinner],
          scores,
          flippedCards: [null, null],
          warPile: [],
          roundWinner: null,
        };
      }

      return {
        ...s,
        phase: 'flip',
        playerDecks: newDecks,
        flippedCards: [null, null],
        warPile: [],
        roundWinner: null,
        scores,
      };
    }

    default:
      return state;
  }
}

export function getLegalActions(state: WarState, playerId: string): GameAction[] {
  if (state.phase === 'flip') {
    return [{ type: 'flip', playerId }];
  }
  if (state.phase === 'war') {
    return [{ type: 'war-flip', playerId }];
  }
  if (state.phase === 'collect') {
    return [{ type: 'collect', playerId }];
  }
  return [];
}

export function isTerminal(state: WarState): boolean {
  return state.phase === 'ended';
}

export function getWinners(state: WarState): string[] {
  return state.winners;
}

export function getBotAction(
  state: WarState,
  botPlayerId: string,
  _difficulty: BotDifficulty
): GameAction {
  // War is deterministic - just take the next legal action
  const actions = getLegalActions(state, botPlayerId);
  return actions[0] ?? { type: 'flip', playerId: botPlayerId };
}
