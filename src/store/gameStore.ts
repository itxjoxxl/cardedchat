import { create } from 'zustand';
import type { Player, BotDifficulty } from '@/types/player';
import type { GameAction, BaseGameState, GameId } from '@/types/game';

interface GameStore {
  gameId: GameId | null;
  state: BaseGameState | null;
  isOnline: boolean;
  roomCode: string | null;
  botDifficulty: BotDifficulty;
  /** Queue of incoming remote actions waiting to be processed by the engine in useGame */
  pendingRemoteActions: GameAction[];
  // Actions
  startGame(
    gameId: GameId,
    players: Player[],
    options?: Record<string, unknown>,
    seed?: number
  ): void;
  applyAction(action: GameAction): void;
  /** Enqueue a remote action to be applied by the engine once it is loaded */
  queueRemoteAction(action: GameAction): void;
  /** Drain and return all queued remote actions, clearing the queue */
  drainRemoteActions(): GameAction[];
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
  pendingRemoteActions: [],

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
    // Kept for API compatibility — use queueRemoteAction for incoming online actions.
  },

  queueRemoteAction(action: GameAction) {
    set((s) => ({ pendingRemoteActions: [...s.pendingRemoteActions, action] }));
  },

  drainRemoteActions() {
    const actions = get().pendingRemoteActions;
    if (actions.length === 0) return [];
    set({ pendingRemoteActions: [] });
    return actions;
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
