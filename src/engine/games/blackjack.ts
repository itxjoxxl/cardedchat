import { Card } from '@/types';
import { BaseGameState, GameAction, Player } from '@/types';
import { createMultiDeck, shuffle } from '../deck';
import { getRankValueBlackjack } from '../card-utils';
import { BotDifficulty, BOT_CONFIGS } from '../bot/difficulty';

export type BlackjackPhase = 'betting' | 'dealing' | 'player' | 'dealer' | 'payout';

export interface BlackjackHand {
  cards: Card[];
  bet: number;
  doubled: boolean;
  split: boolean;
  done: boolean; // stand, bust, or blackjack
  result?: 'win' | 'lose' | 'push' | 'blackjack' | 'bust';
  insuranceBet?: number;
}

export interface BlackjackPlayer {
  playerId: string;
  chips: number;
  hands: BlackjackHand[];
  activeHandIndex: number;
  insuranceDecided: boolean;
}

export interface BlackjackState extends BaseGameState {
  gameId: 'blackjack';
  phase: BlackjackPhase;
  shoe: Card[]; // 6-deck
  dealerHand: Card[];
  dealerDone: boolean;
  bjPlayers: BlackjackPlayer[];
  insuranceAvailable: boolean;
}

function handValue(cards: Card[]): number {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    const v = getRankValueBlackjack(card.rank);
    total += v;
    if (card.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function isBust(cards: Card[]): boolean {
  return handValue(cards) > 21;
}

function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards) === 21;
}

function isSoftHand(cards: Card[]): boolean {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    total += getRankValueBlackjack(card.rank);
    if (card.rank === 'A') aces++;
  }
  // Soft if we have an ace counted as 11 (total wouldn't bust)
  return aces > 0 && total <= 21;
}

export function createInitialState(
  players: Player[],
  options: { startingChips?: number } = {},
  seed?: number
): BlackjackState {
  const shoe = shuffle(createMultiDeck(6), seed);
  const startingChips = options.startingChips ?? 1000;

  const bjPlayers: BlackjackPlayer[] = players.map((p) => ({
    playerId: p.id,
    chips: startingChips,
    hands: [],
    activeHandIndex: 0,
    insuranceDecided: false,
  }));

  const scores: Record<string, number> = {};
  for (const p of players) {
    scores[p.id] = startingChips;
  }

  return {
    gameId: 'blackjack',
    players,
    currentPlayerIndex: 0,
    phase: 'betting',
    status: 'active',
    winners: [],
    scores,
    turnCount: 0,
    shoe,
    dealerHand: [],
    dealerDone: false,
    bjPlayers,
    insuranceAvailable: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seed,
  };
}

function drawCard(shoe: Card[]): { card: Card; shoe: Card[] } {
  const newShoe = [...shoe];
  const card = { ...newShoe.shift()!, faceUp: true };
  return { card, shoe: newShoe };
}

export function applyAction(state: BlackjackState, action: GameAction): BlackjackState {
  const s = { ...state, updatedAt: new Date().toISOString(), turnCount: (state.turnCount ?? 0) + 1 };

  switch (action.type) {
    case 'bet': {
      const amount = action.payload?.amount as number;
      const pIdx = s.bjPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1 || amount <= 0 || amount > s.bjPlayers[pIdx].chips) return state;

      const bjPlayers = [...s.bjPlayers];
      const player = { ...bjPlayers[pIdx] };
      player.chips -= amount;
      player.hands = [{ cards: [], bet: amount, doubled: false, split: false, done: false }];
      player.activeHandIndex = 0;
      player.insuranceDecided = false;
      bjPlayers[pIdx] = player;

      // Check if all players have bet
      const allBet = bjPlayers.every((p) => p.hands.length > 0);

      if (allBet) {
        // Deal 2 cards to each player + dealer
        let shoe = [...s.shoe];
        const newBjPlayers = bjPlayers.map((p) => ({ ...p, hands: p.hands.map((h) => ({ ...h })) }));

        // Round 1: one to each player, one to dealer (face down)
        for (const p of newBjPlayers) {
          const { card, shoe: newShoe } = drawCard(shoe);
          shoe = newShoe;
          p.hands[0].cards = [card];
        }
        let dealerCard1: Card;
        { const { card, shoe: newShoe } = drawCard(shoe); dealerCard1 = { ...card, faceUp: false }; shoe = newShoe; }

        // Round 2: one to each player, one to dealer (face up)
        for (const p of newBjPlayers) {
          const { card, shoe: newShoe } = drawCard(shoe);
          shoe = newShoe;
          p.hands[0].cards = [...p.hands[0].cards, card];
        }
        let dealerCard2: Card;
        { const { card, shoe: newShoe } = drawCard(shoe); dealerCard2 = card; shoe = newShoe; }

        const dealerHand = [dealerCard1, dealerCard2];
        const insuranceAvailable = dealerCard2.rank === 'A';

        return {
          ...s,
          shoe,
          bjPlayers: newBjPlayers,
          dealerHand,
          dealerDone: false,
          phase: 'player',
          insuranceAvailable,
          currentPlayerIndex: 0,
        };
      }

      // Advance to next player who hasn't bet
      const nextIdx = bjPlayers.findIndex((p) => p.hands.length === 0);
      return { ...s, bjPlayers, phase: 'betting', currentPlayerIndex: nextIdx === -1 ? 0 : nextIdx };
    }

    case 'insurance': {
      const pIdx = s.bjPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;
      const bjPlayers = [...s.bjPlayers];
      const player = { ...bjPlayers[pIdx] };
      const insuranceBet = Math.floor(player.hands[0].bet / 2);
      if (player.chips < insuranceBet) return state;
      player.chips -= insuranceBet;
      player.hands = [{ ...player.hands[0], insuranceBet }];
      player.insuranceDecided = true;
      bjPlayers[pIdx] = player;
      return { ...s, bjPlayers };
    }

    case 'no-insurance': {
      const pIdx = s.bjPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;
      const bjPlayers = [...s.bjPlayers];
      bjPlayers[pIdx] = { ...bjPlayers[pIdx], insuranceDecided: true };
      return { ...s, bjPlayers };
    }

    case 'hit': {
      const pIdx = s.bjPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;

      let shoe = [...s.shoe];
      const { card, shoe: newShoe } = drawCard(shoe);
      shoe = newShoe;

      const bjPlayers = [...s.bjPlayers];
      const player = { ...bjPlayers[pIdx] };
      const hIdx = player.activeHandIndex;
      const hand = { ...player.hands[hIdx] };
      hand.cards = [...hand.cards, card];

      if (isBust(hand.cards)) {
        hand.done = true;
        hand.result = 'bust';
      }

      player.hands = [...player.hands];
      player.hands[hIdx] = hand;
      bjPlayers[pIdx] = player;

      const { bjPlayers: advanced, phase, dealerHand, dealerDone } = advanceTurn({ ...s, shoe, bjPlayers });

      return { ...s, shoe, bjPlayers: advanced, phase, dealerHand, dealerDone };
    }

    case 'stand': {
      const pIdx = s.bjPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;

      const bjPlayers = [...s.bjPlayers];
      const player = { ...bjPlayers[pIdx] };
      const hIdx = player.activeHandIndex;
      const hand = { ...player.hands[hIdx], done: true };
      player.hands = [...player.hands];
      player.hands[hIdx] = hand;
      bjPlayers[pIdx] = player;

      const { bjPlayers: advanced, phase, dealerHand, dealerDone } = advanceTurn({ ...s, bjPlayers });

      return { ...s, bjPlayers: advanced, phase, dealerHand, dealerDone };
    }

    case 'double': {
      const pIdx = s.bjPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;

      const bjPlayers = [...s.bjPlayers];
      const player = { ...bjPlayers[pIdx] };
      const hIdx = player.activeHandIndex;
      const hand = { ...player.hands[hIdx] };

      if (player.chips < hand.bet) return state;
      player.chips -= hand.bet;
      hand.bet *= 2;
      hand.doubled = true;

      let shoe = [...s.shoe];
      const { card, shoe: newShoe } = drawCard(shoe);
      shoe = newShoe;
      hand.cards = [...hand.cards, card];
      hand.done = true;
      if (isBust(hand.cards)) hand.result = 'bust';

      player.hands = [...player.hands];
      player.hands[hIdx] = hand;
      bjPlayers[pIdx] = player;

      const { bjPlayers: advanced, phase, dealerHand, dealerDone } = advanceTurn({ ...s, shoe, bjPlayers });

      return { ...s, shoe, bjPlayers: advanced, phase, dealerHand, dealerDone };
    }

    case 'split': {
      const pIdx = s.bjPlayers.findIndex((p) => p.playerId === action.playerId);
      if (pIdx === -1) return state;

      const bjPlayers = [...s.bjPlayers];
      const player = { ...bjPlayers[pIdx] };
      const hIdx = player.activeHandIndex;
      const hand = player.hands[hIdx];

      if (hand.cards.length !== 2 || hand.cards[0].rank !== hand.cards[1].rank) return state;
      if (player.chips < hand.bet) return state;

      player.chips -= hand.bet;

      let shoe = [...s.shoe];
      const { card: c1, shoe: s1 } = drawCard(shoe);
      shoe = s1;
      const { card: c2, shoe: s2 } = drawCard(shoe);
      shoe = s2;

      const hand1: BlackjackHand = { cards: [hand.cards[0], c1], bet: hand.bet, doubled: false, split: true, done: false };
      const hand2: BlackjackHand = { cards: [hand.cards[1], c2], bet: hand.bet, doubled: false, split: true, done: false };

      player.hands = [...player.hands.slice(0, hIdx), hand1, hand2, ...player.hands.slice(hIdx + 1)];
      bjPlayers[pIdx] = player;

      return { ...s, shoe, bjPlayers };
    }

    default:
      return state;
  }
}

interface TurnAdvanceResult {
  bjPlayers: BlackjackPlayer[];
  phase: BlackjackPhase;
  dealerHand: Card[];
  dealerDone: boolean;
}

function advanceTurn(s: BlackjackState): TurnAdvanceResult {
  const bjPlayers = [...s.bjPlayers];

  // Find next active hand among current and subsequent players
  for (let pi = s.currentPlayerIndex; pi < bjPlayers.length; pi++) {
    const player = { ...bjPlayers[pi] };
    // Try to advance to next hand for this player
    let startHand = pi === s.currentPlayerIndex ? player.activeHandIndex : 0;

    // If current hand is done, move to next
    if (pi === s.currentPlayerIndex && player.hands[startHand]?.done) {
      startHand++;
    }

    for (let hi = startHand; hi < player.hands.length; hi++) {
      if (!player.hands[hi].done) {
        player.activeHandIndex = hi;
        bjPlayers[pi] = player;
        return { bjPlayers, phase: 'player', dealerHand: s.dealerHand, dealerDone: false };
      }
    }
  }

  // All players done - dealer plays
  let dealerHand = [...s.dealerHand];
  // Reveal hole card
  dealerHand[0] = { ...dealerHand[0], faceUp: true };

  let shoe = [...s.shoe];
  // Dealer hits until >= 17 (stands on soft 17)
  while (handValue(dealerHand) < 17 || (handValue(dealerHand) === 17 && isSoftHand(dealerHand))) {
    const { card, shoe: newShoe } = drawCard(shoe);
    dealerHand = [...dealerHand, card];
    shoe = newShoe;
  }

  // Resolve hands
  const dealerVal = handValue(dealerHand);
  const dealerBust = dealerVal > 21;
  const resolvedPlayers = bjPlayers.map((p) => {
    const hands = p.hands.map((h) => {
      if (h.result === 'bust') return h;
      const playerVal = handValue(h.cards);
      const pBj = isBlackjack(h.cards);
      const dBj = isBlackjack(s.dealerHand);
      let result: BlackjackHand['result'];
      if (pBj && !dBj) result = 'blackjack';
      else if (pBj && dBj) result = 'push';
      else if (dBj) result = 'lose';
      else if (dealerBust) result = 'win';
      else if (playerVal > dealerVal) result = 'win';
      else if (playerVal === dealerVal) result = 'push';
      else result = 'lose';
      return { ...h, result, done: true };
    });
    return { ...p, hands };
  });

  // Payout
  const paidPlayers = resolvedPlayers.map((p) => {
    let chips = p.chips;
    for (const h of p.hands) {
      if (h.result === 'win') chips += h.bet * 2;
      else if (h.result === 'push') chips += h.bet;
      else if (h.result === 'blackjack') chips += Math.floor(h.bet * 2.5);

      // Insurance payout
      if (h.insuranceBet && isBlackjack(s.dealerHand)) {
        chips += h.insuranceBet * 3; // 2:1 payout + back the bet
      } else if (h.insuranceBet) {
        // Insurance lost (already deducted)
      }
    }
    return { ...p, chips };
  });

  const scores: Record<string, number> = {};
  for (const p of paidPlayers) {
    scores[p.playerId] = p.chips;
  }

  return {
    bjPlayers: paidPlayers,
    phase: 'payout',
    dealerHand,
    dealerDone: true,
  };
}

export function getLegalActions(state: BlackjackState, playerId: string): GameAction[] {
  const actions: GameAction[] = [];
  const pIdx = state.bjPlayers.findIndex((p) => p.playerId === playerId);
  if (pIdx === -1) return actions;
  const player = state.bjPlayers[pIdx];

  if (state.phase === 'betting') {
    actions.push({ type: 'bet', playerId, payload: { amount: 10 } });
    return actions;
  }

  if (state.phase === 'player' && state.currentPlayerIndex === pIdx) {
    const hand = player.hands[player.activeHandIndex];
    if (!hand || hand.done) return actions;

    if (state.insuranceAvailable && !player.insuranceDecided) {
      actions.push({ type: 'insurance', playerId });
      actions.push({ type: 'no-insurance', playerId });
      return actions;
    }

    actions.push({ type: 'hit', playerId });
    actions.push({ type: 'stand', playerId });

    const val = handValue(hand.cards);
    if (hand.cards.length === 2 && [9, 10, 11].includes(val) && player.chips >= hand.bet) {
      actions.push({ type: 'double', playerId });
    }
    if (
      hand.cards.length === 2 &&
      hand.cards[0].rank === hand.cards[1].rank &&
      player.chips >= hand.bet
    ) {
      actions.push({ type: 'split', playerId });
    }
  }

  return actions;
}

export function isTerminal(state: BlackjackState): boolean {
  return state.phase === 'payout';
}

export function getWinners(state: BlackjackState): string[] {
  if (!isTerminal(state)) return [];
  const maxChips = Math.max(...state.bjPlayers.map((p) => p.chips));
  return state.bjPlayers.filter((p) => p.chips === maxChips).map((p) => p.playerId);
}

export function getBotAction(
  state: BlackjackState,
  botPlayerId: string,
  difficulty: BotDifficulty
): GameAction {
  const pIdx = state.bjPlayers.findIndex((p) => p.playerId === botPlayerId);
  const player = state.bjPlayers[pIdx];

  if (state.phase === 'betting') {
    const bet = difficulty === 'hard' ? 50 : difficulty === 'medium' ? 25 : 10;
    const safeBet = Math.min(bet, player.chips);
    return { type: 'bet', playerId: botPlayerId, payload: { amount: safeBet } };
  }

  if (state.insuranceAvailable && !player.insuranceDecided) {
    // Only take insurance on hard difficulty and with good count
    if (difficulty === 'hard') {
      return { type: 'insurance', playerId: botPlayerId };
    }
    return { type: 'no-insurance', playerId: botPlayerId };
  }

  const hand = player.hands[player.activeHandIndex];
  const val = handValue(hand.cards);
  const dealerUpCard = state.dealerHand.find((c) => c.faceUp);
  const dealerVal = dealerUpCard ? getRankValueBlackjack(dealerUpCard.rank) : 7;

  // Basic strategy (medium/hard)
  if (difficulty === 'easy') {
    // Simple: hit under 17
    return val < 17
      ? { type: 'hit', playerId: botPlayerId }
      : { type: 'stand', playerId: botPlayerId };
  }

  // Double down
  if (hand.cards.length === 2 && player.chips >= hand.bet) {
    if (val === 11) return { type: 'double', playerId: botPlayerId };
    if (val === 10 && dealerVal < 10) return { type: 'double', playerId: botPlayerId };
    if (val === 9 && dealerVal >= 3 && dealerVal <= 6) return { type: 'double', playerId: botPlayerId };
  }

  // Split pairs
  if (hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank && player.chips >= hand.bet) {
    const pairRank = hand.cards[0].rank;
    if (pairRank === 'A' || pairRank === '8') return { type: 'split', playerId: botPlayerId };
    if ((pairRank === '2' || pairRank === '3' || pairRank === '7') && dealerVal <= 7) return { type: 'split', playerId: botPlayerId };
    if (pairRank === '6' && dealerVal <= 6) return { type: 'split', playerId: botPlayerId };
    if (pairRank === '9' && dealerVal !== 7 && dealerVal <= 9) return { type: 'split', playerId: botPlayerId };
    if (pairRank === '4' && (dealerVal === 5 || dealerVal === 6)) return { type: 'split', playerId: botPlayerId };
  }

  // Soft hand strategy
  const hasAce = hand.cards.some((c) => c.rank === 'A');
  if (hasAce && val <= 21) {
    if (val >= 19) return { type: 'stand', playerId: botPlayerId };
    if (val === 18) return dealerVal <= 8 ? { type: 'stand', playerId: botPlayerId } : { type: 'hit', playerId: botPlayerId };
    return { type: 'hit', playerId: botPlayerId };
  }

  // Hard hand strategy
  if (val >= 17) return { type: 'stand', playerId: botPlayerId };
  if (val >= 13 && dealerVal <= 6) return { type: 'stand', playerId: botPlayerId };
  if (val === 12 && dealerVal >= 4 && dealerVal <= 6) return { type: 'stand', playerId: botPlayerId };
  return { type: 'hit', playerId: botPlayerId };
}
