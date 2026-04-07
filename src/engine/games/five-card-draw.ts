import { Card, Player } from '@/types';
import { BaseGameState, GameAction } from '@/types';
import { createStandardDeck, shuffle } from '../deck';
import { evaluateHand } from '../hand-evaluator';
import { BotDifficulty } from '../bot/difficulty';

export type FiveCardDrawPhase = 'ante' | 'deal' | 'first-bet' | 'draw' | 'second-bet' | 'showdown';

export interface FiveCardDrawPlayer {
  playerId: string;
  hand: Card[];
  chips: number;
  bet: number;
  totalBet: number;
  folded: boolean;
  allIn: boolean;
  acted: boolean; // has acted in this betting round
  discardedCount: number;
}

export interface FiveCardDrawState extends BaseGameState {
  gameId: 'five-card-draw';
  phase: FiveCardDrawPhase;
  fcdPlayers: FiveCardDrawPlayer[];
  deck: Card[];
  pot: number;
  currentBet: number; // highest bet in current round
  anteAmount: number;
  dealerIndex: number;
  lastRaiserIndex: number | null;
  sidePots: Array<{ amount: number; eligible: string[] }>;
}

export function createInitialState(
  players: Player[],
  options: { startingChips?: number; anteAmount?: number } = {},
  seed?: number
): FiveCardDrawState {
  const startingChips = options.startingChips ?? 1000;
  const anteAmount = options.anteAmount ?? 5;

  // Auto-ante + deal 5 cards to each
  const deck = shuffle(createStandardDeck(), seed);
  let deckCopy = [...deck];
  const fcdPlayers: FiveCardDrawPlayer[] = players.map((p) => {
    const cards = deckCopy.splice(0, 5).map((c) => ({ ...c, faceUp: true }));
    return {
      playerId: p.id,
      hand: cards,
      chips: startingChips - anteAmount,
      bet: 0,
      totalBet: anteAmount,
      folded: false,
      allIn: false,
      acted: false,
      discardedCount: 0,
    };
  });

  const pot = anteAmount * players.length;
  const scores: Record<string, number> = {};
  for (const p of fcdPlayers) scores[p.playerId] = p.chips;

  return {
    gameId: 'five-card-draw',
    players,
    currentPlayerIndex: 1 % players.length,
    phase: 'first-bet',
    status: 'active',
    winners: [],
    scores,
    turnCount: 0,
    fcdPlayers,
    deck: deckCopy,
    pot,
    currentBet: 0,
    anteAmount,
    dealerIndex: 0,
    lastRaiserIndex: null,
    sidePots: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seed,
  };
}

function nextActivePlayer(players: FiveCardDrawPlayer[], current: number): number {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (current + i) % n;
    if (!players[idx].folded && !players[idx].allIn) return idx;
  }
  return current;
}

function allActed(players: FiveCardDrawPlayer[], currentBet: number): boolean {
  return players.every(
    (p) => p.folded || p.allIn || (p.acted && p.totalBet === currentBet)
  );
}

function activePlayers(players: FiveCardDrawPlayer[]): FiveCardDrawPlayer[] {
  return players.filter((p) => !p.folded);
}

export function applyAction(state: FiveCardDrawState, action: GameAction): FiveCardDrawState {
  const s = { ...state, updatedAt: new Date().toISOString(), turnCount: (state.turnCount ?? 0) + 1 };

  switch (action.type) {
    case 'ante': {
      const pIdx = s.fcdPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;

      const players = [...s.fcdPlayers];
      const p = { ...players[pIdx] };
      const anteAmt = Math.min(s.anteAmount, p.chips);
      p.chips -= anteAmt;
      p.bet = anteAmt;
      p.totalBet = anteAmt;
      p.acted = true;
      players[pIdx] = p;

      const allAnteed = players.every((pl) => pl.acted);
      if (allAnteed) {
        // Deal 5 cards to each player
        const deck = shuffle(createStandardDeck(), s.seed ? s.seed + s.turnCount : undefined);
        const pot = players.reduce((sum, pl) => sum + pl.bet, 0);
        const newPlayers = players.map((pl) => ({ ...pl, bet: 0, totalBet: pl.totalBet, acted: false }));

        // Deal 5 cards each
        let deckCopy = [...deck];
        for (const pl of newPlayers) {
          pl.hand = deckCopy.splice(0, 5).map((c) => ({ ...c, faceUp: true }));
        }

        return {
          ...s,
          fcdPlayers: newPlayers,
          deck: deckCopy,
          pot,
          phase: 'first-bet',
          currentBet: 0,
          currentPlayerIndex: (s.dealerIndex + 1) % s.players.length,
        };
      }

      const nextIdx = (pIdx + 1) % s.players.length;
      return { ...s, fcdPlayers: players, currentPlayerIndex: nextIdx };
    }

    case 'bet': {
      const { amount } = action.payload as { amount: number };
      const pIdx = s.fcdPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;

      const players = [...s.fcdPlayers.map((p) => ({ ...p }))];
      const p = players[pIdx];
      const callAmount = s.currentBet - p.totalBet;
      const totalBetAmount = callAmount + amount;
      const actual = Math.min(totalBetAmount, p.chips);

      p.chips -= actual;
      p.bet += actual;
      p.totalBet += actual;
      p.acted = true;
      if (p.chips === 0) p.allIn = true;

      const newCurrentBet = Math.max(s.currentBet, p.totalBet);
      if (p.totalBet > s.currentBet) {
        // It's a raise - reset acted for others
        players.forEach((pl, i) => {
          if (i !== pIdx && !pl.folded && !pl.allIn) pl.acted = false;
        });
      }

      const pot = s.pot + actual;
      const nextIdx = nextActivePlayer(players, pIdx);
      if (allActed(players, newCurrentBet)) {
        if (s.phase === 'first-bet') {
          const firstDrawer = (s.dealerIndex + 1) % s.players.length;
          const resetPlayers = players.map((pl) => ({ ...pl, acted: false, bet: 0 }));
          return { ...s, fcdPlayers: resetPlayers, pot, currentBet: newCurrentBet, phase: 'draw', currentPlayerIndex: firstDrawer };
        }
        return resolveShowdown({ ...s, fcdPlayers: players, pot, currentBet: newCurrentBet });
      }
      return { ...s, fcdPlayers: players, pot, currentBet: newCurrentBet, currentPlayerIndex: nextIdx };
    }

    case 'call': {
      const pIdx = s.fcdPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;

      const players = [...s.fcdPlayers.map((p) => ({ ...p }))];
      const p = players[pIdx];
      const callAmount = Math.min(s.currentBet - p.totalBet, p.chips);

      p.chips -= callAmount;
      p.bet += callAmount;
      p.totalBet += callAmount;
      p.acted = true;
      if (p.chips === 0) p.allIn = true;

      const pot = s.pot + callAmount;
      const nextIdx = nextActivePlayer(players, pIdx);
      if (allActed(players, s.currentBet)) {
        if (s.phase === 'first-bet') {
          const firstDrawer = (s.dealerIndex + 1) % s.players.length;
          const resetPlayers = players.map((pl) => ({ ...pl, acted: false, bet: 0 }));
          return { ...s, fcdPlayers: resetPlayers, pot, phase: 'draw', currentPlayerIndex: firstDrawer };
        }
        return resolveShowdown({ ...s, fcdPlayers: players, pot });
      }
      return { ...s, fcdPlayers: players, pot, currentPlayerIndex: nextIdx };
    }

    case 'check': {
      const pIdx = s.fcdPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1 || s.fcdPlayers[pIdx].totalBet < s.currentBet) return state;

      const players = [...s.fcdPlayers.map((p) => ({ ...p }))];
      players[pIdx].acted = true;

      const nextIdx = nextActivePlayer(players, pIdx);
      if (allActed(players, s.currentBet)) {
        if (s.phase === 'first-bet') {
          const firstDrawer = (s.dealerIndex + 1) % s.players.length;
          const resetPlayers = players.map((pl) => ({ ...pl, acted: false, bet: 0 }));
          return { ...s, fcdPlayers: resetPlayers, phase: 'draw', currentPlayerIndex: firstDrawer };
        }
        return resolveShowdown({ ...s, fcdPlayers: players });
      }
      return { ...s, fcdPlayers: players, currentPlayerIndex: nextIdx };
    }

    case 'fold': {
      const pIdx = s.fcdPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;

      const players = [...s.fcdPlayers.map((p) => ({ ...p }))];
      players[pIdx].folded = true;
      players[pIdx].acted = true;

      const active = activePlayers(players);
      if (active.length === 1) {
        // Last player standing wins
        const winner = active[0];
        const newChips = winner.chips + s.pot;
        const updatedPlayers = players.map((p) =>
          p.playerId === winner.playerId ? { ...p, chips: newChips } : p
        );
        const scores: Record<string, number> = {};
        for (const p of updatedPlayers) scores[p.playerId] = p.chips;
        return {
          ...s,
          fcdPlayers: updatedPlayers,
          phase: 'showdown',
          status: 'finished',
          winners: [winner.playerId],
          scores,
          pot: 0,
        };
      }

      const nextIdx = nextActivePlayer(players, pIdx);
      if (allActed(players, s.currentBet)) {
        if (s.phase === 'first-bet') {
          const firstDrawer = (s.dealerIndex + 1) % s.players.length;
          const resetPlayers = players.map((pl) => ({ ...pl, acted: false, bet: 0 }));
          return { ...s, fcdPlayers: resetPlayers, phase: 'draw', currentPlayerIndex: firstDrawer };
        }
        return resolveShowdown({ ...s, fcdPlayers: players });
      }
      return { ...s, fcdPlayers: players, currentPlayerIndex: nextIdx };
    }

    case 'raise': {
      const { amount } = action.payload as { amount: number };
      const pIdx = s.fcdPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;

      const players = [...s.fcdPlayers.map((p) => ({ ...p }))];
      const p = players[pIdx];
      const totalRaise = (s.currentBet - p.totalBet) + amount;
      const actual = Math.min(totalRaise, p.chips);

      p.chips -= actual;
      p.bet += actual;
      p.totalBet += actual;
      p.acted = true;
      if (p.chips === 0) p.allIn = true;

      const newCurrentBet = p.totalBet;
      players.forEach((pl, i) => {
        if (i !== pIdx && !pl.folded && !pl.allIn) pl.acted = false;
      });

      const pot = s.pot + actual;
      const nextIdx = nextActivePlayer(players, pIdx);

      return { ...s, fcdPlayers: players, pot, currentBet: newCurrentBet, currentPlayerIndex: nextIdx, lastRaiserIndex: pIdx };
    }

    case 'all-in': {
      const pIdx = s.fcdPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;

      const players = [...s.fcdPlayers.map((p) => ({ ...p }))];
      const p = players[pIdx];
      const allInAmount = p.chips;

      p.totalBet += allInAmount;
      p.bet += allInAmount;
      p.chips = 0;
      p.allIn = true;
      p.acted = true;

      const newCurrentBet = Math.max(s.currentBet, p.totalBet);
      if (p.totalBet > s.currentBet) {
        players.forEach((pl, i) => {
          if (i !== pIdx && !pl.folded && !pl.allIn) pl.acted = false;
        });
      }

      const pot = s.pot + allInAmount;
      const nextIdx = nextActivePlayer(players, pIdx);
      if (allActed(players, newCurrentBet)) {
        if (s.phase === 'first-bet') {
          const firstDrawer = (s.dealerIndex + 1) % s.players.length;
          const resetPlayers = players.map((pl) => ({ ...pl, acted: false, bet: 0 }));
          return { ...s, fcdPlayers: resetPlayers, pot, currentBet: newCurrentBet, phase: 'draw', currentPlayerIndex: firstDrawer };
        }
        return resolveShowdown({ ...s, fcdPlayers: players, pot, currentBet: newCurrentBet });
      }
      return { ...s, fcdPlayers: players, pot, currentBet: newCurrentBet, currentPlayerIndex: nextIdx };
    }

    case 'discard': {
      const { cardIds } = action.payload as { cardIds: string[] };
      if (cardIds.length > 4) return state;

      const pIdx = s.fcdPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;

      const players = [...s.fcdPlayers.map((p) => ({ ...p }))];
      const p = players[pIdx];

      // Remove discarded cards
      const keptCards = p.hand.filter((c) => !cardIds.includes(c.id));
      let deck = [...s.deck];

      // Draw replacements
      const newCards = deck.splice(0, cardIds.length).map((c) => ({ ...c, faceUp: true }));
      p.hand = [...keptCards, ...newCards];
      p.discardedCount = cardIds.length;
      p.acted = true;

      const allDiscarded = players.every((pl) => pl.folded || pl.acted);

      if (allDiscarded) {
        // Reset for second betting round
        const newPlayers = players.map((pl) => ({ ...pl, acted: false, bet: 0 }));
        const nextIdx = (s.dealerIndex + 1) % s.players.length;
        const firstActive = newPlayers.findIndex((pl, i) => i >= nextIdx && !pl.folded && !pl.allIn);
        return {
          ...s,
          fcdPlayers: newPlayers,
          deck,
          phase: 'second-bet',
          currentBet: 0,
          currentPlayerIndex: firstActive !== -1 ? firstActive : nextIdx,
        };
      }

      const nextIdx = nextActivePlayer(players, pIdx);
      return { ...s, fcdPlayers: players, deck, currentPlayerIndex: nextIdx };
    }

    default:
      return state;
  }
}

function resolveShowdown(state: FiveCardDrawState): FiveCardDrawState {
  const active = state.fcdPlayers.filter((p) => !p.folded);
  const evaluated = active.map((p) => ({
    player: p,
    hand: evaluateHand(p.hand),
  }));

  evaluated.sort((a, b) => b.hand.score - a.hand.score);
  const bestScore = evaluated[0].hand.score;
  const winners = evaluated.filter((e) => e.hand.score === bestScore).map((e) => e.player.playerId);

  const perWinner = Math.floor(state.pot / winners.length);
  const remainder = state.pot % winners.length;

  const players = state.fcdPlayers.map((p) => {
    if (winners.includes(p.playerId)) {
      return { ...p, chips: p.chips + perWinner + (p.playerId === winners[0] ? remainder : 0) };
    }
    return p;
  });

  const scores: Record<string, number> = {};
  for (const p of players) scores[p.playerId] = p.chips;

  return {
    ...state,
    fcdPlayers: players,
    phase: 'showdown',
    status: 'finished',
    winners,
    scores,
    pot: 0,
  };
}

export function getLegalActions(state: FiveCardDrawState, playerId: string): GameAction[] {
  const actions: GameAction[] = [];
  const pIdx = state.fcdPlayers.findIndex((p) => p.playerId === playerId);
  if (pIdx === -1) return actions;
  const p = state.fcdPlayers[pIdx];
  if (p.folded || p.allIn) return actions;

  if (state.phase === 'ante' && !p.acted) {
    actions.push({ type: 'ante', playerId });
    return actions;
  }

  if (state.currentPlayerIndex !== pIdx) return actions;

  if (state.phase === 'first-bet' || state.phase === 'second-bet') {
    const callAmount = state.currentBet - p.totalBet;
    if (callAmount === 0) {
      actions.push({ type: 'check', playerId });
    } else {
      actions.push({ type: 'call', playerId });
    }
    actions.push({ type: 'fold', playerId });
    if (p.chips > 0) {
      actions.push({ type: 'raise', playerId, payload: { amount: state.anteAmount * 2 } });
      actions.push({ type: 'all-in', playerId });
    }
  }

  if (state.phase === 'draw' && !p.acted && state.currentPlayerIndex === pIdx) {
    // Board UI will construct actual discard action with specific card IDs
    actions.push({ type: 'discard', playerId, payload: { cardIds: [] } });
  }

  return actions;
}

export function isTerminal(state: FiveCardDrawState): boolean {
  if (state.status === 'finished') return true;
  if (state.phase === 'showdown') {
    // Need to actually resolve
    return state.winners.length > 0;
  }
  return false;
}

export function getWinners(state: FiveCardDrawState): string[] {
  return state.winners;
}

export function getBotAction(
  state: FiveCardDrawState,
  botPlayerId: string,
  difficulty: BotDifficulty
): GameAction {
  const pIdx = state.fcdPlayers.findIndex((p) => p.playerId === botPlayerId);
  if (pIdx === -1) return { type: 'fold', playerId: botPlayerId };
  const p = state.fcdPlayers[pIdx];

  if (state.phase === 'ante') {
    return { type: 'ante', playerId: botPlayerId };
  }

  if (state.phase === 'draw') {
    // Evaluate hand and discard weak cards
    const evaluated = evaluateHand(p.hand);
    const keepCards = evaluated.cards.slice(0, 5); // best 5 - but we only have 5 cards
    const keepIds = new Set(keepCards.map((c) => c.id));

    // Strategy: keep pairs/trips/etc, discard rest
    const rankCounts: Record<string, number> = {};
    for (const card of p.hand) {
      rankCounts[card.rank] = (rankCounts[card.rank] ?? 0) + 1;
    }

    let discardIds: string[] = [];

    if (difficulty === 'easy') {
      // Randomly discard 0-3 cards
      const toDiscard = Math.floor(Math.random() * 4);
      discardIds = p.hand.slice(0, toDiscard).map((c) => c.id);
    } else {
      // Keep matched cards, discard singles
      const singles = p.hand.filter((c) => rankCounts[c.rank] === 1);
      const maxDiscard = difficulty === 'hard' ? 3 : 4;
      discardIds = singles.slice(0, maxDiscard).map((c) => c.id);
    }

    return { type: 'discard', playerId: botPlayerId, payload: { cardIds: discardIds } };
  }

  if (state.phase === 'first-bet' || state.phase === 'second-bet') {
    const evaluated = evaluateHand(p.hand);
    const handRankValue: Record<string, number> = {
      'high-card': 0, 'pair': 1, 'two-pair': 2, 'three-of-a-kind': 3,
      'straight': 4, 'flush': 5, 'full-house': 6, 'four-of-a-kind': 7,
      'straight-flush': 8, 'royal-flush': 9,
    };
    const strength = handRankValue[evaluated.rank] ?? 0;
    const callAmount = state.currentBet - p.totalBet;

    if (difficulty === 'easy') {
      if (strength >= 1) return callAmount === 0 ? { type: 'check', playerId: botPlayerId } : { type: 'call', playerId: botPlayerId };
      return callAmount > 0 ? { type: 'fold', playerId: botPlayerId } : { type: 'check', playerId: botPlayerId };
    }

    // Medium/Hard
    if (strength >= 3) {
      return { type: 'raise', playerId: botPlayerId, payload: { amount: state.anteAmount * 2 } };
    }
    if (strength >= 1) {
      return callAmount === 0 ? { type: 'check', playerId: botPlayerId } : { type: 'call', playerId: botPlayerId };
    }
    return callAmount === 0 ? { type: 'check', playerId: botPlayerId } : { type: 'fold', playerId: botPlayerId };
  }

  return { type: 'check', playerId: botPlayerId };
}
