import { Card, Player } from '@/types';
import { BaseGameState, GameAction } from '@/types';
import { createStandardDeck, shuffle } from '../deck';
import { evaluateHand, getBestHand } from '../hand-evaluator';
import { BotDifficulty } from '../bot/difficulty';

export type HoldemPhase = 'ante' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface HoldemPlayer {
  playerId: string;
  holeCards: Card[];
  chips: number;
  bet: number;
  totalBet: number;
  folded: boolean;
  allIn: boolean;
  acted: boolean;
  isSmallBlind: boolean;
  isBigBlind: boolean;
}

export interface SidePot {
  amount: number;
  eligible: string[]; // player IDs eligible to win this pot
}

export interface HoldemState extends BaseGameState {
  gameId: 'texas-holdem';
  phase: HoldemPhase;
  holdemPlayers: HoldemPlayer[];
  deck: Card[];
  communityCards: Card[];
  pot: number;
  sidePots: SidePot[];
  currentBet: number;
  smallBlind: number;
  bigBlind: number;
  dealerIndex: number;
  smallBlindIndex: number;
  bigBlindIndex: number;
  lastRaiserIndex: number | null;
}

export function createInitialState(
  players: Player[],
  options: { startingChips?: number; smallBlind?: number; bigBlind?: number } = {},
  seed?: number
): HoldemState {
  const startingChips = options.startingChips ?? 1000;
  const smallBlind = options.smallBlind ?? 10;
  const bigBlind = options.bigBlind ?? 20;

  const n = players.length;
  const dealerIndex = 0;
  const smallBlindIndex = n === 2 ? 0 : 1 % n;
  const bigBlindIndex = n === 2 ? 1 : 2 % n;

  // Deal hole cards immediately
  const deck = shuffle(createStandardDeck(), seed);
  let deckCopy = [...deck];

  const holdemPlayers: HoldemPlayer[] = players.map((p, i) => {
    const isSB = i === smallBlindIndex;
    const isBB = i === bigBlindIndex;
    const blind = isSB ? smallBlind : isBB ? bigBlind : 0;
    const cards = deckCopy.splice(0, 2).map((c) => ({ ...c, faceUp: true }));
    return {
      playerId: p.id,
      holeCards: cards,
      chips: startingChips - blind,
      bet: 0,
      totalBet: blind,
      folded: false,
      allIn: false,
      acted: isBB, // BB has "option" to act last
      isSmallBlind: isSB,
      isBigBlind: isBB,
    };
  });

  const pot = smallBlind + bigBlind;
  const scores: Record<string, number> = {};
  for (const p of holdemPlayers) scores[p.playerId] = p.chips;

  // First to act preflop: left of big blind
  const firstActor = (bigBlindIndex + 1) % n;

  return {
    gameId: 'texas-holdem',
    players,
    currentPlayerIndex: firstActor,
    phase: 'preflop',
    status: 'active',
    winners: [],
    scores,
    turnCount: 0,
    holdemPlayers,
    deck: deckCopy,
    communityCards: [],
    pot,
    sidePots: [],
    currentBet: bigBlind,
    smallBlind,
    bigBlind,
    dealerIndex,
    smallBlindIndex,
    bigBlindIndex,
    lastRaiserIndex: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seed,
  };
}

function nextActivePlayer(players: HoldemPlayer[], current: number): number {
  const n = players.length;
  for (let i = 1; i <= n; i++) {
    const idx = (current + i) % n;
    if (!players[idx].folded && !players[idx].allIn) return idx;
  }
  return current;
}

function allActed(players: HoldemPlayer[], currentBet: number): boolean {
  return players.every((p) => p.folded || p.allIn || (p.acted && p.totalBet >= currentBet));
}

function activePlayers(players: HoldemPlayer[]): HoldemPlayer[] {
  return players.filter((p) => !p.folded);
}

function calculateSidePots(players: HoldemPlayer[], mainPot: number): SidePot[] {
  const allInPlayers = players.filter((p) => p.allIn && !p.folded);
  if (allInPlayers.length === 0) return [{ amount: mainPot, eligible: players.filter((p) => !p.folded).map((p) => p.playerId) }];

  const sortedAllIns = [...allInPlayers].sort((a, b) => a.totalBet - b.totalBet);
  const pots: SidePot[] = [];
  let prevLevel = 0;

  for (const allInP of sortedAllIns) {
    const level = allInP.totalBet;
    const contribution = level - prevLevel;
    const eligible = players.filter((p) => !p.folded && p.totalBet >= level).map((p) => p.playerId);
    const amount = contribution * eligible.length;
    pots.push({ amount, eligible });
    prevLevel = level;
  }

  // Remaining pot
  const maxBet = Math.max(...players.map((p) => p.totalBet));
  if (maxBet > prevLevel) {
    const remaining = players
      .filter((p) => !p.folded && p.totalBet > prevLevel)
      .reduce((sum, p) => sum + (p.totalBet - prevLevel), 0);
    const eligible = players.filter((p) => !p.folded && !p.allIn).map((p) => p.playerId);
    if (eligible.length > 0 && remaining > 0) {
      pots.push({ amount: remaining, eligible });
    }
  }

  return pots;
}

function advancePhase(state: HoldemState): HoldemState {
  const phaseOrder: HoldemPhase[] = ['ante', 'preflop', 'flop', 'turn', 'river', 'showdown'];
  const currentIdx = phaseOrder.indexOf(state.phase);
  const nextPhase = phaseOrder[currentIdx + 1] ?? 'showdown';

  if (nextPhase === 'showdown') {
    return resolveShowdown(state);
  }

  // Reset bets for new round
  const players = state.holdemPlayers.map((p) => ({ ...p, bet: 0, acted: false }));

  // Deal community cards
  let deck = [...state.deck];
  let communityCards = [...state.communityCards];

  if (nextPhase === 'flop') {
    const three = deck.splice(0, 3).map((c) => ({ ...c, faceUp: true }));
    communityCards = [...communityCards, ...three];
  } else if (nextPhase === 'turn' || nextPhase === 'river') {
    const one = { ...deck.shift()!, faceUp: true };
    communityCards = [...communityCards, one];
  }

  // First to act is left of dealer
  const firstActor = (state.dealerIndex + 1) % state.players.length;
  const firstActive = players.findIndex((p, i) => i >= firstActor && !p.folded && !p.allIn)
    !== -1
    ? players.findIndex((p, i) => i >= firstActor && !p.folded && !p.allIn)
    : players.findIndex((p) => !p.folded && !p.allIn);

  return {
    ...state,
    holdemPlayers: players,
    deck,
    communityCards,
    phase: nextPhase,
    currentBet: 0,
    lastRaiserIndex: null,
    currentPlayerIndex: firstActive !== -1 ? firstActive : 0,
  };
}

function resolveShowdown(state: HoldemState): HoldemState {
  const active = state.holdemPlayers.filter((p) => !p.folded);
  const sidePots = calculateSidePots(state.holdemPlayers, state.pot);

  const evaluated = active.map((p) => ({
    playerId: p.playerId,
    evaluated: getBestHand(p.holeCards, state.communityCards),
    chips: p.chips,
  }));

  const playerChipAdjustments: Record<string, number> = {};

  for (const pot of sidePots) {
    const eligible = evaluated.filter((e) => pot.eligible.includes(e.playerId));
    if (eligible.length === 0) continue;

    const best = Math.max(...eligible.map((e) => e.evaluated.score));
    const potWinners = eligible.filter((e) => e.evaluated.score === best);
    const perWinner = Math.floor(pot.amount / potWinners.length);
    const remainder = pot.amount % potWinners.length;

    for (let i = 0; i < potWinners.length; i++) {
      const pid = potWinners[i].playerId;
      playerChipAdjustments[pid] = (playerChipAdjustments[pid] ?? 0) + perWinner + (i === 0 ? remainder : 0);
    }
  }

  const newPlayers = state.holdemPlayers.map((p) => ({
    ...p,
    chips: p.chips + (playerChipAdjustments[p.playerId] ?? 0),
  }));

  const winnerIds = Object.entries(playerChipAdjustments)
    .filter(([, adj]) => adj > 0)
    .map(([id]) => id);

  const scores: Record<string, number> = {};
  for (const p of newPlayers) scores[p.playerId] = p.chips;

  return {
    ...state,
    holdemPlayers: newPlayers,
    phase: 'showdown',
    status: 'finished',
    winners: winnerIds,
    scores,
    pot: 0,
    sidePots: [],
  };
}

export function applyAction(state: HoldemState, action: GameAction): HoldemState {
  const s = { ...state, updatedAt: new Date().toISOString(), turnCount: (state.turnCount ?? 0) + 1 };

  switch (action.type) {
    case 'post-blind': {
      const pIdx = s.holdemPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;

      const isSmallBlind = pIdx === s.smallBlindIndex;
      const isBigBlind = pIdx === s.bigBlindIndex;
      const blindAmount = isSmallBlind ? s.smallBlind : isBigBlind ? s.bigBlind : 0;
      if (blindAmount === 0) return state;

      const players = [...s.holdemPlayers.map((p) => ({ ...p }))];
      const p = players[pIdx];
      const actual = Math.min(blindAmount, p.chips);
      p.chips -= actual;
      p.bet = actual;
      p.totalBet = actual;
      p.isSmallBlind = isSmallBlind;
      p.isBigBlind = isBigBlind;
      p.acted = isBigBlind; // BB acts last preflop

      const allBlindsPosted = players[s.smallBlindIndex].totalBet > 0 && players[s.bigBlindIndex].totalBet > 0;

      if (allBlindsPosted) {
        // Deal hole cards
        const deck = shuffle(createStandardDeck(), s.seed ? s.seed + s.turnCount : undefined);
        let deckCopy = [...deck];
        const newPlayers = players.map((pl) => {
          const cards = deckCopy.splice(0, 2).map((c) => ({ ...c, faceUp: true }));
          return { ...pl, holeCards: cards, acted: pl.isBigBlind };
        });

        const pot = newPlayers.reduce((sum, pl) => sum + pl.totalBet, 0);
        const newBets = newPlayers.map((pl) => ({ ...pl, bet: 0 }));

        // First to act preflop: left of big blind
        const firstActor = (s.bigBlindIndex + 1) % s.players.length;

        return {
          ...s,
          holdemPlayers: newBets,
          deck: deckCopy,
          pot,
          phase: 'preflop',
          currentBet: s.bigBlind,
          currentPlayerIndex: firstActor,
        };
      }

      const nextIdx = isBigBlind ? s.bigBlindIndex : s.smallBlindIndex;
      return { ...s, holdemPlayers: players, currentPlayerIndex: nextIdx };
    }

    case 'fold': {
      const pIdx = s.holdemPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;

      const players = s.holdemPlayers.map((p, i) =>
        i === pIdx ? { ...p, folded: true, acted: true } : p
      );

      const active = activePlayers(players);
      if (active.length === 1) {
        const winner = active[0];
        const newPlayers = players.map((p) =>
          p.playerId === winner.playerId ? { ...p, chips: p.chips + s.pot } : p
        );
        const scores: Record<string, number> = {};
        for (const p of newPlayers) scores[p.playerId] = p.chips;
        return {
          ...s,
          holdemPlayers: newPlayers,
          phase: 'showdown',
          status: 'finished',
          winners: [winner.playerId],
          scores,
          pot: 0,
        };
      }

      const nextIdx = nextActivePlayer(players, pIdx);
      const shouldAdvance = allActed(players, s.currentBet);

      if (shouldAdvance) return advancePhase({ ...s, holdemPlayers: players, currentPlayerIndex: nextIdx });
      return { ...s, holdemPlayers: players, currentPlayerIndex: nextIdx };
    }

    case 'check': {
      const pIdx = s.holdemPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1 || s.holdemPlayers[pIdx].totalBet < s.currentBet) return state;

      const players = s.holdemPlayers.map((p, i) =>
        i === pIdx ? { ...p, acted: true } : p
      );

      const nextIdx = nextActivePlayer(players, pIdx);
      const shouldAdvance = allActed(players, s.currentBet);

      if (shouldAdvance) return advancePhase({ ...s, holdemPlayers: players, currentPlayerIndex: nextIdx });
      return { ...s, holdemPlayers: players, currentPlayerIndex: nextIdx };
    }

    case 'call': {
      const pIdx = s.holdemPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;

      const players = s.holdemPlayers.map((p) => ({ ...p }));
      const p = players[pIdx];
      const callAmount = Math.min(s.currentBet - p.totalBet, p.chips);

      p.chips -= callAmount;
      p.bet += callAmount;
      p.totalBet += callAmount;
      p.acted = true;
      if (p.chips === 0) p.allIn = true;

      const pot = s.pot + callAmount;
      const nextIdx = nextActivePlayer(players, pIdx);
      const shouldAdvance = allActed(players, s.currentBet);

      if (shouldAdvance) return advancePhase({ ...s, holdemPlayers: players, pot, currentPlayerIndex: nextIdx });
      return { ...s, holdemPlayers: players, pot, currentPlayerIndex: nextIdx };
    }

    case 'raise': {
      const { amount } = action.payload as { amount: number };
      const pIdx = s.holdemPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;

      const players = s.holdemPlayers.map((p) => ({ ...p }));
      const p = players[pIdx];
      const callAmount = s.currentBet - p.totalBet;
      const raiseAmount = callAmount + amount;
      const actual = Math.min(raiseAmount, p.chips);

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

      return {
        ...s,
        holdemPlayers: players,
        pot,
        currentBet: newCurrentBet,
        lastRaiserIndex: pIdx,
        currentPlayerIndex: nextIdx,
      };
    }

    case 'all-in': {
      const pIdx = s.holdemPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;

      const players = s.holdemPlayers.map((p) => ({ ...p }));
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
      const shouldAdvance = allActed(players, newCurrentBet);

      if (shouldAdvance) return advancePhase({ ...s, holdemPlayers: players, pot, currentBet: newCurrentBet, currentPlayerIndex: nextIdx });
      return { ...s, holdemPlayers: players, pot, currentBet: newCurrentBet, currentPlayerIndex: nextIdx };
    }

    default:
      return state;
  }
}

export function getLegalActions(state: HoldemState, playerId: string): GameAction[] {
  const actions: GameAction[] = [];
  const pIdx = state.holdemPlayers.findIndex((p) => p.playerId === playerId);
  if (pIdx === -1) return actions;
  const p = state.holdemPlayers[pIdx];
  if (p.folded || p.allIn) return actions;

  if (state.phase === 'ante') {
    if (pIdx === state.smallBlindIndex && p.totalBet === 0) {
      actions.push({ type: 'post-blind', playerId });
    } else if (pIdx === state.bigBlindIndex && p.totalBet === 0) {
      actions.push({ type: 'post-blind', playerId });
    }
    return actions;
  }

  if (state.currentPlayerIndex !== pIdx) return actions;

  const callAmount = state.currentBet - p.totalBet;
  if (callAmount === 0) {
    actions.push({ type: 'check', playerId });
  } else {
    actions.push({ type: 'call', playerId });
  }
  actions.push({ type: 'fold', playerId });
  if (p.chips > callAmount) {
    actions.push({ type: 'raise', playerId, payload: { amount: state.bigBlind } });
  }
  if (p.chips > 0) {
    actions.push({ type: 'all-in', playerId });
  }

  return actions;
}

export function isTerminal(state: HoldemState): boolean {
  return state.status === 'finished';
}

export function getWinners(state: HoldemState): string[] {
  return state.winners;
}

export function getBotAction(
  state: HoldemState,
  botPlayerId: string,
  difficulty: BotDifficulty
): GameAction {
  const pIdx = state.holdemPlayers.findIndex((p) => p.playerId === botPlayerId);
  if (pIdx === -1) return { type: 'fold', playerId: botPlayerId };
  const p = state.holdemPlayers[pIdx];

  if (state.phase === 'ante') {
    return { type: 'post-blind', playerId: botPlayerId };
  }

  // Evaluate hand strength
  const evaluated = getBestHand(p.holeCards, state.communityCards);
  const handRankValue: Record<string, number> = {
    'high-card': 0, 'pair': 1, 'two-pair': 2, 'three-of-a-kind': 3,
    'straight': 4, 'flush': 5, 'full-house': 6, 'four-of-a-kind': 7,
    'straight-flush': 8, 'royal-flush': 9,
  };
  const strength = handRankValue[evaluated.rank] ?? 0;
  const callAmount = state.currentBet - p.totalBet;

  if (difficulty === 'easy') {
    if (strength >= 2) return callAmount === 0 ? { type: 'check', playerId: botPlayerId } : { type: 'call', playerId: botPlayerId };
    if (strength === 1) return callAmount === 0 ? { type: 'check', playerId: botPlayerId } : { type: 'fold', playerId: botPlayerId };
    return callAmount === 0 ? { type: 'check', playerId: botPlayerId } : { type: 'fold', playerId: botPlayerId };
  }

  if (strength >= 5) {
    return { type: 'raise', playerId: botPlayerId, payload: { amount: state.bigBlind * 3 } };
  }
  if (strength >= 3) {
    return callAmount === 0 ? { type: 'check', playerId: botPlayerId } : { type: 'call', playerId: botPlayerId };
  }
  if (strength >= 1) {
    return callAmount <= state.bigBlind
      ? { type: 'call', playerId: botPlayerId }
      : { type: 'fold', playerId: botPlayerId };
  }

  // Preflop: call if small bet
  if (state.phase === 'preflop' && callAmount <= state.bigBlind) {
    return { type: 'call', playerId: botPlayerId };
  }

  return callAmount === 0 ? { type: 'check', playerId: botPlayerId } : { type: 'fold', playerId: botPlayerId };
}
