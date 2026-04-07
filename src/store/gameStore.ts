import { create } from 'zustand';
import type { Player, BotDifficulty } from '@/types/player';
import type { GameAction, BaseGameState, GameId } from '@/types/game';

interface GameStore {
  gameId: GameId | null;
  state: BaseGameState | null;
  isOnline: boolean;
  roomCode: string | null;
  botDifficulty: BotDifficulty;
  // Actions
  startGame(
    gameId: GameId,
    players: Player[],
    options?: Record<string, unknown>,
    seed?: number
  ): void;
  applyAction(action: GameAction): void;
  setOnlineMode(roomCode: string): void;
  endGame(): void;
  setBotDifficulty(d: BotDifficulty): void;
  // Internal – called by useGame after the engine processes an action
  _setState(state: BaseGameState): void;
}

export const useGameStore = create<GameStore>()((set, get) => ({
  gameId: null,
  state: null,
  isOnline: false,
  roomCode: null,
  botDifficulty: 'medium',

  startGame(
    gameId: GameId,
    players: Player[],
    _options?: Record<string, unknown>,
    seed?: number
  ) {
    // The engine hook (useGame) will call _setState with the real initial state
    // after loading the engine module.  Here we record the game identity so
    // useGame knows which engine to load.
    const now = new Date().toISOString();
    const baseState: BaseGameState = {
      gameId,
      players,
      currentPlayerIndex: 0,
      phase: 'waiting',
      status: 'idle',
      winners: [],
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      turnCount: 0,
      seed,
      createdAt: now,
      updatedAt: now,
    };
    set({ gameId, state: baseState, isOnline: get().isOnline });
  },

  applyAction(_action: GameAction) {
    // The useGame hook owns the engine reducer call.
    // This method exists as a hook point for the online path so that
    // incoming remote actions can be routed here; useGame subscribes to
    // state changes and picks up new actions via its own doAction.
    // No-op in the store itself — useGame calls _setState directly.
  },

  setOnlineMode(roomCode: string) {
    set({ isOnline: true, roomCode });
  },

  endGame() {
    set({ gameId: null, state: null, isOnline: false, roomCode: null });
  },

  setBotDifficulty(d: BotDifficulty) {
    set({ botDifficulty: d });
  },

  _setState(state: BaseGameState) {
    set({ state });
  },
}));
