import { Card, Player } from '@/types';
import { BaseGameState, GameAction } from '@/types';
import { createStandardDeck, shuffle } from '../deck';
import { BotDifficulty, BOT_CONFIGS } from '../bot/difficulty';

export type SnapPhase = 'flip' | 'snap-window' | 'ended';

export interface SnapState extends BaseGameState {
  gameId: 'snap';
  phase: SnapPhase;
  playerDecks: Record<string, Card[]>; // each player's deck
  centralPile: Card[]; // shared center pile
  snapWindowOpen: boolean; // true when a snap is valid
  snapDebounceUntil: number; // timestamp (ms) - snaps before this are invalid
  lastFlipTimestamp: number; // ms since game start
  currentFlipperIndex: number; // who flips next
  roundWinner?: string; // who won the last snap
}

export function createInitialState(
  players: Player[],
  _options: Record<string, unknown> = {},
  seed?: number
): SnapState {
  const n = players.length;
  if (n < 2) throw new Error('Snap requires at least 2 players');

  const deck = shuffle(createStandardDeck(), seed).map((c) => ({ ...c, faceUp: false }));

  // Deal cards round-robin
  const playerDecks: Record<string, Card[]> = {};
  const scores: Record<string, number> = {};
  for (const p of players) {
    playerDecks[p.id] = [];
    scores[p.id] = 0;
  }

  for (let i = 0; i < deck.length; i++) {
    playerDecks[players[i % n].id].push(deck[i]);
  }

  return {
    gameId: 'snap',
    players,
    currentPlayerIndex: 0,
    phase: 'flip',
    status: 'active',
    winners: [],
    scores,
    turnCount: 0,
    playerDecks,
    centralPile: [],
    snapWindowOpen: false,
    snapDebounceUntil: 0,
    lastFlipTimestamp: Date.now(),
    currentFlipperIndex: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seed,
  };
}

function checkSnapCondition(pile: Card[]): boolean {
  if (pile.length < 2) return false;
  const top = pile[pile.length - 1];
  const second = pile[pile.length - 2];
  return top.rank === second.rank;
}

export function applyAction(state: SnapState, action: GameAction): SnapState {
  const s = { ...state, updatedAt: new Date().toISOString(), turnCount: (state.turnCount ?? 0) + 1 };

  switch (action.type) {
    case 'flip': {
      const flipperIdx = s.currentFlipperIndex;
      const flipper = s.players[flipperIdx];
      if (!flipper) return state;

      const pDeck = [...(s.playerDecks[flipper.id] ?? [])];
      if (pDeck.length === 0) {
        // Skip this player - advance
        const nextIdx = (flipperIdx + 1) % s.players.length;
        return { ...s, currentFlipperIndex: nextIdx, currentPlayerIndex: nextIdx };
      }

      const card = { ...pDeck.shift()!, faceUp: true };
      const centralPile = [...s.centralPile, card];
      const newPlayerDecks = { ...s.playerDecks, [flipper.id]: pDeck };

      const isSnap = checkSnapCondition(centralPile);
      const now = Date.now();
      const nextFlipperIdx = (flipperIdx + 1) % s.players.length;

      return {
        ...s,
        playerDecks: newPlayerDecks,
        centralPile,
        snapWindowOpen: isSnap,
        snapDebounceUntil: now + 50, // 50ms debounce
        lastFlipTimestamp: now,
        currentFlipperIndex: nextFlipperIdx,
        currentPlayerIndex: nextFlipperIdx,
        phase: isSnap ? 'snap-window' : 'flip',
      };
    }

    case 'snap': {
      const now = Date.now();
      if (now < s.snapDebounceUntil) return state; // too fast - debounced
      if (!s.snapWindowOpen && s.phase !== 'snap-window') return state;

      const snapPlayerId = action.playerId ?? '';
      const isValid = checkSnapCondition(s.centralPile);

      if (!isValid) {
        // False snap - player gives 3 cards to the pile
        const pDeck = [...(s.playerDecks[snapPlayerId] ?? [])];
        const penalty = pDeck.splice(0, Math.min(3, pDeck.length)).map((c) => ({ ...c, faceUp: false }));
        const newPlayerDecks = { ...s.playerDecks, [snapPlayerId]: pDeck };
        const newPile = [...s.centralPile, ...penalty];

        // Check if player is out
        if (pDeck.length === 0) {
          const remaining = s.players.filter((p) => (newPlayerDecks[p.id] ?? []).length > 0);
          if (remaining.length === 1) {
            return {
              ...s,
              playerDecks: newPlayerDecks,
              centralPile: newPile,
              phase: 'ended',
              status: 'finished',
              winners: [remaining[0].id],
              snapWindowOpen: false,
            };
          }
        }

        return {
          ...s,
          playerDecks: newPlayerDecks,
          centralPile: newPile,
          snapWindowOpen: false,
          phase: 'flip',
        };
      }

      // Valid snap! Winner takes the pile
      const pDeck = [
        ...(s.playerDecks[snapPlayerId] ?? []),
        ...s.centralPile.map((c) => ({ ...c, faceUp: false })),
      ];
      const newPlayerDecks = { ...s.playerDecks, [snapPlayerId]: pDeck };

      const newScores = { ...s.scores, [snapPlayerId]: (s.scores[snapPlayerId] ?? 0) + 1 };

      // Check if all other players are out
      const activePlayers = s.players.filter((p) => (newPlayerDecks[p.id] ?? []).length > 0);
      if (activePlayers.length === 1) {
        return {
          ...s,
          playerDecks: newPlayerDecks,
          centralPile: [],
          scores: newScores,
          phase: 'ended',
          status: 'finished',
          winners: [snapPlayerId],
          snapWindowOpen: false,
          roundWinner: snapPlayerId,
        };
      }

      // Find the snapper's index and set them as next flipper
      const snapIdx = s.players.findIndex((p) => p.id === snapPlayerId);

      return {
        ...s,
        playerDecks: newPlayerDecks,
        centralPile: [],
        scores: newScores,
        snapWindowOpen: false,
        phase: 'flip',
        currentFlipperIndex: snapIdx,
        currentPlayerIndex: snapIdx,
        roundWinner: snapPlayerId,
      };
    }

    default:
      return state;
  }
}

export function getLegalActions(state: SnapState, playerId: string): GameAction[] {
  const actions: GameAction[] = [];

  if (state.phase === 'ended') return actions;

  // Any player can snap at any time when window is open
  if (state.snapWindowOpen || state.phase === 'snap-window') {
    actions.push({ type: 'snap', playerId });
  }

  // Current flipper can flip
  const currentFlipper = state.players[state.currentFlipperIndex];
  if (currentFlipper?.id === playerId && state.phase === 'flip') {
    actions.push({ type: 'flip', playerId });
  }

  return actions;
}

export function isTerminal(state: SnapState): boolean {
  return state.phase === 'ended';
}

export function getWinners(state: SnapState): string[] {
  return state.winners;
}

export function getBotAction(
  state: SnapState,
  botPlayerId: string,
  difficulty: BotDifficulty
): GameAction {
  const config = BOT_CONFIGS[difficulty];

  // Check if snap is valid
  if ((state.snapWindowOpen || state.phase === 'snap-window') && checkSnapCondition(state.centralPile)) {
    const [minReaction, maxReaction] = config.reactionTimeMs ?? [500, 1000];
    const reactionTime = Math.floor(Math.random() * (maxReaction - minReaction) + minReaction);
    const now = Date.now();

    // Simulate reaction time check
    if (now >= state.lastFlipTimestamp + reactionTime) {
      return { type: 'snap', playerId: botPlayerId };
    }
  }

  // Otherwise flip if it's this bot's turn
  const currentFlipper = state.players[state.currentFlipperIndex];
  if (currentFlipper?.id === botPlayerId) {
    return { type: 'flip', playerId: botPlayerId };
  }

  return { type: 'flip', playerId: botPlayerId };
}
