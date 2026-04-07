import { Card, Suit, Rank, Player } from '@/types';
import { BaseGameState, GameAction } from '@/types';
import { createStandardDeck, shuffle } from '../deck';
import { getRankValue } from '../card-utils';
import { BotDifficulty } from '../bot/difficulty';

export type SolitairePhase = 'active' | 'won' | 'ended';

export interface SolitaireState extends BaseGameState {
  gameId: 'solitaire';
  phase: SolitairePhase;
  foundations: [Card[], Card[], Card[], Card[]]; // 4 suit piles (A->K)
  tableau: [Card[], Card[], Card[], Card[], Card[], Card[], Card[]]; // 7 columns
  stock: Card[];
  waste: Card[];
  moves: number;
}

const RANK_ORDER: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUIT_FOUNDATION_INDEX: Record<Suit, number> = {
  spades: 0,
  hearts: 1,
  diamonds: 2,
  clubs: 3,
};

function rankIndex(rank: Rank): number {
  return RANK_ORDER.indexOf(rank);
}

function isRed(card: Card): boolean {
  return card.color === 'red';
}

export function createInitialState(
  players: Player[],
  _options: Record<string, unknown> = {},
  seed?: number
): SolitaireState {
  const deck = shuffle(createStandardDeck(), seed);

  // Deal tableau: column i gets i+1 cards, last card face up
  const tableau: Card[][] = [];
  let deckIndex = 0;
  for (let col = 0; col < 7; col++) {
    const column: Card[] = [];
    for (let row = 0; row <= col; row++) {
      const card = { ...deck[deckIndex++], faceUp: row === col };
      column.push(card);
    }
    tableau.push(column);
  }

  // Remaining cards go to stock (face down)
  const stock = deck.slice(deckIndex).map((c) => ({ ...c, faceUp: false }));

  const scores: Record<string, number> = {};
  for (const p of players) scores[p.id] = 0;

  return {
    gameId: 'solitaire',
    players,
    currentPlayerIndex: 0,
    phase: 'active',
    status: 'active',
    winners: [],
    scores,
    turnCount: 0,
    foundations: [[], [], [], []],
    tableau: tableau as SolitaireState['tableau'],
    stock,
    waste: [],
    moves: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    seed,
  };
}

function canPlaceOnFoundation(card: Card, foundation: Card[]): boolean {
  if (foundation.length === 0) return card.rank === 'A';
  const top = foundation[foundation.length - 1];
  return top.suit === card.suit && rankIndex(card.rank) === rankIndex(top.rank) + 1;
}

function canPlaceOnTableau(card: Card, column: Card[]): boolean {
  if (column.length === 0) return card.rank === 'K';
  const top = column[column.length - 1];
  if (!top.faceUp) return false;
  return isRed(card) !== isRed(top) && rankIndex(card.rank) === rankIndex(top.rank) - 1;
}

function checkWon(state: SolitaireState): boolean {
  return state.foundations.every((f) => f.length === 13);
}

function revealTopTableau(tableau: Card[][]): Card[][] {
  return tableau.map((col) => {
    if (col.length === 0) return col;
    const top = col[col.length - 1];
    if (!top.faceUp) {
      return [...col.slice(0, -1), { ...top, faceUp: true }];
    }
    return col;
  });
}

export function applyAction(state: SolitaireState, action: GameAction): SolitaireState {
  const s = { ...state, updatedAt: new Date().toISOString(), turnCount: (state.turnCount ?? 0) + 1, moves: state.moves + 1 };

  switch (action.type) {
    case 'stockToWaste': {
      if (s.stock.length === 0) {
        // Recycle waste to stock
        if (s.waste.length === 0) return state;
        const newStock = [...s.waste].reverse().map((c) => ({ ...c, faceUp: false }));
        return { ...s, stock: newStock, waste: [] };
      }
      const stock = [...s.stock];
      const card = { ...stock.pop()!, faceUp: true };
      return { ...s, stock, waste: [...s.waste, card] };
    }

    case 'wasteToTableau': {
      const { colIndex } = action.payload as { colIndex: number };
      if (s.waste.length === 0) return state;
      const card = s.waste[s.waste.length - 1];
      const col = s.tableau[colIndex];
      if (!canPlaceOnTableau(card, col)) return state;

      const newWaste = s.waste.slice(0, -1);
      const newTableau = s.tableau.map((c, i) =>
        i === colIndex ? [...c, { ...card, faceUp: true }] : c
      ) as SolitaireState['tableau'];

      return { ...s, waste: newWaste, tableau: newTableau };
    }

    case 'wasteToFoundation': {
      if (s.waste.length === 0) return state;
      const card = s.waste[s.waste.length - 1];
      const fIdx = SUIT_FOUNDATION_INDEX[card.suit];
      if (!canPlaceOnFoundation(card, s.foundations[fIdx])) return state;

      const newWaste = s.waste.slice(0, -1);
      const newFoundations = s.foundations.map((f, i) =>
        i === fIdx ? [...f, { ...card, faceUp: true }] : f
      ) as SolitaireState['foundations'];

      const newState = { ...s, waste: newWaste, foundations: newFoundations };
      if (checkWon(newState)) {
        const pid = s.players[0]?.id ?? 'player';
        return { ...newState, phase: 'won', status: 'finished', winners: [pid] };
      }
      return newState;
    }

    case 'tableauToFoundation': {
      const { fromCol, cardId } = action.payload as { fromCol: number; cardId: string };
      const col = [...s.tableau[fromCol]];
      const cardIdx = col.findIndex((c) => c.id === cardId);
      if (cardIdx === -1 || cardIdx !== col.length - 1) return state;

      const card = col[cardIdx];
      const fIdx = SUIT_FOUNDATION_INDEX[card.suit];
      if (!canPlaceOnFoundation(card, s.foundations[fIdx])) return state;

      col.pop();
      const newTableau = s.tableau.map((c, i) => i === fromCol ? col : c) as SolitaireState['tableau'];
      const newFoundations = s.foundations.map((f, i) =>
        i === fIdx ? [...f, { ...card, faceUp: true }] : f
      ) as SolitaireState['foundations'];

      const newTableauRevealed = revealTopTableau(newTableau) as SolitaireState['tableau'];
      const newState = { ...s, tableau: newTableauRevealed, foundations: newFoundations };
      if (checkWon(newState)) {
        const pid = s.players[0]?.id ?? 'player';
        return { ...newState, phase: 'won', status: 'finished', winners: [pid] };
      }
      return newState;
    }

    case 'tableauToTableau': {
      const { fromCol, toCol, cardId } = action.payload as { fromCol: number; toCol: number; cardId: string };
      const fromColumn = [...s.tableau[fromCol]];
      const cardIdx = fromColumn.findIndex((c) => c.id === cardId);
      if (cardIdx === -1 || !fromColumn[cardIdx].faceUp) return state;

      const movingCards = fromColumn.slice(cardIdx);
      const targetCol = s.tableau[toCol];

      if (!canPlaceOnTableau(movingCards[0], targetCol)) return state;

      const newFrom = fromColumn.slice(0, cardIdx);
      const newTo = [...targetCol, ...movingCards.map((c) => ({ ...c, faceUp: true }))];

      let newTableau = s.tableau.map((col, i) => {
        if (i === fromCol) return newFrom;
        if (i === toCol) return newTo;
        return col;
      }) as SolitaireState['tableau'];

      newTableau = revealTopTableau(newTableau) as SolitaireState['tableau'];

      return { ...s, tableau: newTableau };
    }

    case 'autoComplete': {
      // Auto-move all face-up cards to foundations if possible
      let newState = { ...s };
      let moved = true;
      while (moved) {
        moved = false;
        // Try waste
        if (newState.waste.length > 0) {
          const card = newState.waste[newState.waste.length - 1];
          const fIdx = SUIT_FOUNDATION_INDEX[card.suit];
          if (canPlaceOnFoundation(card, newState.foundations[fIdx])) {
            const newFoundations = newState.foundations.map((f, i) =>
              i === fIdx ? [...f, { ...card, faceUp: true }] : f
            ) as SolitaireState['foundations'];
            newState = { ...newState, waste: newState.waste.slice(0, -1), foundations: newFoundations };
            moved = true;
            continue;
          }
        }
        // Try tableau columns
        for (let col = 0; col < 7; col++) {
          const column = newState.tableau[col];
          if (column.length === 0) continue;
          const card = column[column.length - 1];
          if (!card.faceUp) continue;
          const fIdx = SUIT_FOUNDATION_INDEX[card.suit];
          if (canPlaceOnFoundation(card, newState.foundations[fIdx])) {
            const newCol = column.slice(0, -1);
            const newTableau = newState.tableau.map((c, i) => i === col ? newCol : c) as SolitaireState['tableau'];
            const newFoundations = newState.foundations.map((f, i) =>
              i === fIdx ? [...f, { ...card, faceUp: true }] : f
            ) as SolitaireState['foundations'];
            newState = {
              ...newState,
              tableau: revealTopTableau(newTableau) as SolitaireState['tableau'],
              foundations: newFoundations,
            };
            moved = true;
            break;
          }
        }
      }

      if (checkWon(newState)) {
        const pid = s.players[0]?.id ?? 'player';
        return { ...newState, phase: 'won', status: 'finished', winners: [pid] };
      }
      return newState;
    }

    default:
      return state;
  }
}

export function getLegalActions(state: SolitaireState, playerId: string): GameAction[] {
  const actions: GameAction[] = [];
  if (state.phase !== 'active') return actions;

  // Stock to waste
  actions.push({ type: 'stockToWaste', playerId });

  // Waste to foundation
  if (state.waste.length > 0) {
    const card = state.waste[state.waste.length - 1];
    const fIdx = SUIT_FOUNDATION_INDEX[card.suit];
    if (canPlaceOnFoundation(card, state.foundations[fIdx])) {
      actions.push({ type: 'wasteToFoundation', playerId });
    }
    // Waste to tableau
    for (let col = 0; col < 7; col++) {
      if (canPlaceOnTableau(card, state.tableau[col])) {
        actions.push({ type: 'wasteToTableau', playerId, payload: { colIndex: col } });
      }
    }
  }

  // Tableau to foundation and tableau to tableau
  for (let fromCol = 0; fromCol < 7; fromCol++) {
    const column = state.tableau[fromCol];
    if (column.length === 0) continue;

    // Top card to foundation
    const topCard = column[column.length - 1];
    if (topCard.faceUp) {
      const fIdx = SUIT_FOUNDATION_INDEX[topCard.suit];
      if (canPlaceOnFoundation(topCard, state.foundations[fIdx])) {
        actions.push({
          type: 'tableauToFoundation',
          playerId,
          payload: { fromCol, cardId: topCard.id },
        });
      }
    }

    // All face-up sequences to other tableau columns
    const firstFaceUp = column.findIndex((c) => c.faceUp);
    if (firstFaceUp !== -1) {
      for (let cardIdx = firstFaceUp; cardIdx < column.length; cardIdx++) {
        const card = column[cardIdx];
        for (let toCol = 0; toCol < 7; toCol++) {
          if (toCol === fromCol) continue;
          if (canPlaceOnTableau(card, state.tableau[toCol])) {
            actions.push({
              type: 'tableauToTableau',
              playerId,
              payload: { fromCol, toCol, cardId: card.id },
            });
          }
        }
      }
    }
  }

  // Auto-complete if all cards are face-up
  const allFaceUp = state.tableau.every((col) => col.every((c) => c.faceUp));
  if (allFaceUp && state.stock.length === 0) {
    actions.push({ type: 'autoComplete', playerId });
  }

  return actions;
}

export function isTerminal(state: SolitaireState): boolean {
  return state.phase === 'won' || state.phase === 'ended';
}

export function getWinners(state: SolitaireState): string[] {
  return state.winners;
}

export function getBotAction(
  state: SolitaireState,
  botPlayerId: string,
  _difficulty: BotDifficulty
): GameAction {
  const actions = getLegalActions(state, botPlayerId);

  // Priority: foundation moves > tableau moves > stock
  const foundationMove = actions.find(
    (a) => a.type === 'tableauToFoundation' || a.type === 'wasteToFoundation'
  );
  if (foundationMove) return foundationMove;

  const tableauMove = actions.find((a) => a.type === 'tableauToTableau');
  if (tableauMove) return tableauMove;

  const wasteToTableau = actions.find((a) => a.type === 'wasteToTableau');
  if (wasteToTableau) return wasteToTableau;

  return actions[0] ?? { type: 'stockToWaste', playerId: botPlayerId };
}
