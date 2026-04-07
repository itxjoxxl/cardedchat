import { Player } from './player';

export type GamePhase =
  // Generic
  | 'waiting'
  | 'setup'
  | 'playing'
  | 'ended'
  // Blackjack
  | 'betting'
  | 'dealing'
  | 'player'
  | 'dealer'
  | 'payout'
  // War
  | 'flip'
  | 'war'
  | 'collect'
  // Go Fish / Crazy Eights / Old Maid / Uno / Hearts / Spades
  | 'discard-pairs'
  | 'draw-phase'
  // Poker
  | 'ante'
  | 'preflop'
  | 'flop'
  | 'turn'
  | 'river'
  | 'showdown'
  | 'first-bet'
  | 'draw'
  | 'second-bet'
  // Rummy / Gin
  | 'draw'
  | 'meld'
  | 'discard'
  // Solitaire
  | 'active'
  | 'won'
  // Pass phase for hearts
  | 'pass';

export type GameStatus = 'idle' | 'active' | 'paused' | 'finished' | 'playing' | 'ended';

export type GameId =
  | 'blackjack'
  | 'war'
  | 'go-fish'
  | 'crazy-eights'
  | 'solitaire'
  | 'old-maid'
  | 'snap'
  | 'five-card-draw'
  | 'texas-holdem'
  | 'rummy'
  | 'gin-rummy'
  | 'uno'
  | 'hearts'
  | 'spades';

export interface BaseGameState {
  gameId: GameId;
  roomId?: string;
  players: Player[];
  currentPlayerIndex: number;
  phase?: string;
  status: GameStatus;
  winners: string[]; // player IDs
  scores: Record<string, number>; // playerId -> score
  turnCount?: number;
  seed?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface GameAction {
  type: string;
  playerId?: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
}

export interface GameResult {
  gameId: GameId;
  roomId?: string;
  winners: string[]; // player IDs
  scores: Record<string, number>;
  durationMs: number;
  turnCount: number;
  finishedAt: string;
}
