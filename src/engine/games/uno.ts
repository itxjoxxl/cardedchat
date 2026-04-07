import { Card, UnoCard, UnoColor } from '@/types';
import { BaseGameState, GameAction, Player, GameStatus } from '@/types';
import { createUnoDeck, shuffle } from '../deck';
import { BotDifficulty } from '../bot/difficulty';

export type UnoPhase = 'playing' | 'choosing-color' | 'ended';

export interface UnoState extends BaseGameState {
  gameId: 'uno';
  phase: UnoPhase;
  drawPile: UnoCard[];
  discardPile: UnoCard[];
  hands: Record<string, UnoCard[]>;
  currentColor: UnoColor;
  direction: 1 | -1;
  drawPending: number; // accumulated draw2/wild4 penalty
  unoCalled: Record<string, boolean>;
  pendingColorChooser: string | null;
}

function topCard(state: UnoState): UnoCard | null {
  return state.discardPile[state.discardPile.length - 1] ?? null;
}

function canPlay(card: UnoCard, top: UnoCard, currentColor: UnoColor): boolean {
  if (card.color === 'wild') return true;
  if (card.color === currentColor) return true;
  if (top.value === card.value) return true;
  return false;
}

function nextPlayerIndex(state: UnoState, skip = false): number {
  const n = state.players.length;
  let next = ((state.currentPlayerIndex + state.direction) % n + n) % n;
  if (skip) {
    next = ((next + state.direction) % n + n) % n;
  }
  return next;
}

function drawCards(state: UnoState, count: number): { state: UnoState; drawn: UnoCard[] } {
  let pile = [...state.drawPile];
  let discard = [...state.discardPile];
  const drawn: UnoCard[] = [];

  for (let i = 0; i < count; i++) {
    if (pile.length === 0) {
      if (discard.length <= 1) break;
      const top = discard[discard.length - 1];
      const reshuffled = shuffle(discard.slice(0, -1));
      pile = reshuffled;
      discard = [top];
    }
    const card = pile.shift()!;
    drawn.push(card);
  }

  return {
    state: { ...state, drawPile: pile, discardPile: discard },
    drawn,
  };
}

export function createInitialState(
  players: Player[],
  _options: Record<string, unknown> = {},
  seed?: number
): UnoState {
  const deck = shuffle(createUnoDeck(), seed);
  const hands: Record<string, UnoCard[]> = {};
  let remaining = [...deck];

  for (const player of players) {
    hands[player.id] = remaining.splice(0, 7);
  }

  // Find first non-wild card for discard
  let startIndex = remaining.findIndex((c) => c.color !== 'wild');
  if (startIndex === -1) startIndex = 0;
  const [startCard] = remaining.splice(startIndex, 1);

  const base: BaseGameState = {
    gameId: 'uno',
    players,
    currentPlayerIndex: 0,
    status: 'playing' as GameStatus,
    winners: [],
    scores: Object.fromEntries(players.map((p) => [p.id, 0])),
  };

  return {
    ...base,
    gameId: 'uno',
    phase: 'playing',
    drawPile: remaining,
    discardPile: [{ ...startCard, color: startCard.color === 'wild' ? 'red' : startCard.color }],
    hands,
    currentColor: startCard.color === 'wild' ? 'red' : startCard.color,
    direction: 1,
    drawPending: 0,
    unoCalled: Object.fromEntries(players.map((p) => [p.id, false])),
    pendingColorChooser: null,
  };
}

export function applyAction(state: UnoState, action: GameAction): UnoState {
  const { type, payload } = action;
  const currentPlayer = state.players[state.currentPlayerIndex];

  if (type === 'play') {
    const { cardId, chosenColor } = payload as { cardId: string; chosenColor?: UnoColor };
    const hand = [...state.hands[currentPlayer.id]];
    const cardIndex = hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return state;

    const card = hand[cardIndex];
    const top = topCard(state);
    if (top && !canPlay(card, top, state.currentColor)) return state;

    hand.splice(cardIndex, 1);

    let newState: UnoState = {
      ...state,
      hands: { ...state.hands, [currentPlayer.id]: hand },
      discardPile: [...state.discardPile, card],
      unoCalled: { ...state.unoCalled, [currentPlayer.id]: false },
    };

    // Check win
    if (hand.length === 0) {
      // Score = sum of all other players' remaining card values
      const scoreGained = state.players
        .filter((p) => p.id !== currentPlayer.id)
        .reduce((sum, p) => {
          const pHand = newState.hands[p.id] ?? [];
          return sum + pHand.reduce((s, c) => {
            if (c.color === 'wild') return s + 50;
            if (['skip', 'reverse', 'draw2'].includes(c.value)) return s + 20;
            const n = parseInt(c.value);
            return s + (isNaN(n) ? 0 : n);
          }, 0);
        }, 0);
      const newScores = { ...newState.scores, [currentPlayer.id]: (newState.scores[currentPlayer.id] ?? 0) + scoreGained };
      return {
        ...newState,
        scores: newScores,
        phase: 'ended',
        status: 'finished',
        winners: [currentPlayer.id],
      };
    }

    // Handle wild - need color choice
    if (card.color === 'wild') {
      if (chosenColor && chosenColor !== 'wild') {
        newState.currentColor = chosenColor;
      } else {
        // Wait for color choice
        return {
          ...newState,
          phase: 'choosing-color',
          pendingColorChooser: currentPlayer.id,
        };
      }
    } else {
      newState.currentColor = card.color;
    }

    // Apply card effects
    if (card.value === 'reverse') {
      newState.direction = (newState.direction * -1) as 1 | -1;
      if (state.players.length === 2) {
        // Reverse acts as skip in 2-player
        newState.currentPlayerIndex = nextPlayerIndex(newState, true);
      } else {
        newState.currentPlayerIndex = nextPlayerIndex(newState);
      }
    } else if (card.value === 'skip') {
      newState.currentPlayerIndex = nextPlayerIndex(newState, true);
    } else if (card.value === 'draw2') {
      const pending = newState.drawPending + 2;
      newState.drawPending = pending;
      newState.currentPlayerIndex = nextPlayerIndex(newState);
    } else if (card.value === 'wild4') {
      const pending = newState.drawPending + 4;
      newState.drawPending = pending;
      newState.currentPlayerIndex = nextPlayerIndex(newState);
    } else {
      newState.currentPlayerIndex = nextPlayerIndex(newState);
    }

    // UNO check - 1 card left should have called UNO
    if (hand.length === 1 && !newState.unoCalled[currentPlayer.id]) {
      // Penalty happens when someone catches them - skip for now
    }

    return newState;
  }

  if (type === 'choose-color') {
    const { color } = payload as { color: UnoColor };
    if (!color || color === 'wild') return state;
    const newState = {
      ...state,
      currentColor: color,
      phase: 'playing' as UnoPhase,
      pendingColorChooser: null,
    };
    // Now advance turn
    const top = topCard(state);
    if (top?.value === 'wild4') {
      newState.drawPending = (state.drawPending || 0) + 4;
      newState.currentPlayerIndex = nextPlayerIndex(newState);
    } else {
      newState.currentPlayerIndex = nextPlayerIndex(newState);
    }
    return newState;
  }

  if (type === 'draw') {
    const drawCount = state.drawPending > 0 ? state.drawPending : 1;
    const { state: newState, drawn } = drawCards(state, drawCount);
    const hand = [...(newState.hands[currentPlayer.id] ?? []), ...drawn];

    return {
      ...newState,
      hands: { ...newState.hands, [currentPlayer.id]: hand },
      drawPending: 0,
      currentPlayerIndex: nextPlayerIndex(newState),
    };
  }

  if (type === 'call-uno') {
    return {
      ...state,
      unoCalled: { ...state.unoCalled, [currentPlayer.id]: true },
    };
  }

  return state;
}

export function getLegalActions(state: UnoState, playerId: string): GameAction[] {
  const player = state.players[state.currentPlayerIndex];
  if (player.id !== playerId) return [];

  if (state.phase === 'choosing-color') {
    return [
      { type: 'choose-color', payload: { color: 'red' } },
      { type: 'choose-color', payload: { color: 'yellow' } },
      { type: 'choose-color', payload: { color: 'green' } },
      { type: 'choose-color', payload: { color: 'blue' } },
    ];
  }

  const hand = state.hands[playerId] ?? [];
  const top = topCard(state);
  const actions: GameAction[] = [];

  if (state.drawPending > 0) {
    // Can only play draw2 on draw2 or wild4 on wild4 to stack, else must draw
    const canStack = hand.some((c) => {
      if (c.value === 'draw2' && top?.value === 'draw2') return true;
      if (c.value === 'wild4') return true;
      return false;
    });
    if (canStack) {
      for (const card of hand) {
        if (card.value === 'draw2' && top?.value === 'draw2') {
          actions.push({ type: 'play', payload: { cardId: card.id } });
        }
        if (card.value === 'wild4') {
          actions.push({ type: 'play', payload: { cardId: card.id } });
        }
      }
    }
    actions.push({ type: 'draw', payload: {} });
    return actions;
  }

  for (const card of hand) {
    if (top && canPlay(card, top, state.currentColor)) {
      actions.push({ type: 'play', payload: { cardId: card.id } });
    }
  }
  actions.push({ type: 'draw', payload: {} });

  if (hand.length === 2) {
    actions.push({ type: 'call-uno', payload: {} });
  }

  return actions;
}

export function isTerminal(state: UnoState): boolean {
  return state.phase === 'ended';
}

export function getWinners(state: UnoState): string[] {
  return state.winners;
}

const UNO_COLORS_ONLY: UnoColor[] = ['red', 'yellow', 'green', 'blue'];

export function getBotAction(state: UnoState, botPlayerId: string, difficulty: BotDifficulty): GameAction {
  const actions = getLegalActions(state, botPlayerId);
  if (actions.length === 0) return { type: 'draw', payload: {} };

  if (state.phase === 'choosing-color') {
    const hand = state.hands[botPlayerId] ?? [];
    const colorCounts: Record<string, number> = {};
    for (const card of hand) {
      if (card.color !== 'wild') colorCounts[card.color] = (colorCounts[card.color] ?? 0) + 1;
    }
    const best = UNO_COLORS_ONLY.reduce((a, b) => (colorCounts[a] ?? 0) >= (colorCounts[b] ?? 0) ? a : b);
    return { type: 'choose-color', payload: { color: best } };
  }

  const playActions = actions.filter((a) => a.type === 'play');
  const drawAction = actions.find((a) => a.type === 'draw') ?? { type: 'draw', payload: {} };

  if (playActions.length === 0) return drawAction;

  if (difficulty === 'easy') {
    return playActions[Math.floor(Math.random() * playActions.length)];
  }

  // Medium/Hard: prefer action cards, keep wilds for later
  const hand = state.hands[botPlayerId] ?? [];
  const top = topCard(state);

  const playable = playActions.map((a) => {
    const card = hand.find((c) => c.id === (a.payload as { cardId: string }).cardId);
    return { action: a, card };
  }).filter((x): x is { action: GameAction; card: UnoCard } => !!x.card);

  // Sort: prefer action cards, deprioritize wild
  playable.sort((a, b) => {
    const scoreCard = (c: UnoCard) => {
      if (c.color === 'wild' && c.value === 'wild4') return difficulty === 'hard' ? 3 : 1;
      if (c.color === 'wild') return 2;
      if (['skip', 'reverse', 'draw2'].includes(c.value)) return 5;
      return 4;
    };
    return scoreCard(b.card) - scoreCard(a.card);
  });

  const chosen = playable[0];
  if (!chosen) return drawAction;

  // For wild cards, choose best color
  if (chosen.card.color === 'wild') {
    const colorCounts: Record<string, number> = {};
    for (const card of hand) {
      if (card.color !== 'wild') colorCounts[card.color] = (colorCounts[card.color] ?? 0) + 1;
    }
    const best = UNO_COLORS_ONLY.reduce((a, b) => (colorCounts[a] ?? 0) >= (colorCounts[b] ?? 0) ? a : b);
    return { type: 'play', payload: { cardId: chosen.card.id, chosenColor: best } };
  }

  return chosen.action;
}
