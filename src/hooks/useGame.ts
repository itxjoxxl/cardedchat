import { useEffect, useRef, useCallback, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useProfileStore } from '@/store/profileStore';
import { useRoomStore } from '@/store/roomStore';
import { broadcastGameAction } from '@/lib/realtime';
import type { GameAction, BaseGameState, GameId } from '@/types/game';
import type { Player } from '@/types/player';

// ---------------------------------------------------------------------------
// Engine interface
// ---------------------------------------------------------------------------

interface GameEngine {
  createInitialState: (
    players: Player[],
    options?: Record<string, unknown>,
    seed?: number
  ) => BaseGameState;
  applyAction: (state: BaseGameState, action: GameAction) => BaseGameState;
  getLegalActions: (state: BaseGameState, playerId: string) => GameAction[];
  isTerminal: (state: BaseGameState) => boolean;
  getWinners: (state: BaseGameState) => string[];
  getBotAction: (
    state: BaseGameState,
    playerId: string,
    difficulty: string
  ) => GameAction;
}

// Lazy engine map — each import is cast via unknown to satisfy the generic
// GameEngine interface (concrete engine states extend BaseGameState).
const engineMap: Record<GameId, () => Promise<GameEngine>> = {
  blackjack: () =>
    import('@/engine/games/blackjack') as unknown as Promise<GameEngine>,
  war: () =>
    import('@/engine/games/war') as unknown as Promise<GameEngine>,
  solitaire: () =>
    import('@/engine/games/solitaire') as unknown as Promise<GameEngine>,
  'go-fish': () =>
    import('@/engine/games/go-fish') as unknown as Promise<GameEngine>,
  'crazy-eights': () =>
    import('@/engine/games/crazy-eights') as unknown as Promise<GameEngine>,
  'old-maid': () =>
    import('@/engine/games/old-maid') as unknown as Promise<GameEngine>,
  snap: () =>
    import('@/engine/games/snap') as unknown as Promise<GameEngine>,
  'five-card-draw': () =>
    import('@/engine/games/five-card-draw') as unknown as Promise<GameEngine>,
  'texas-holdem': () =>
    import('@/engine/games/texas-holdem') as unknown as Promise<GameEngine>,
  uno: () =>
    import('@/engine/games/uno') as unknown as Promise<GameEngine>,
  rummy: () =>
    import('@/engine/games/rummy') as unknown as Promise<GameEngine>,
  'gin-rummy': () =>
    import('@/engine/games/gin-rummy') as unknown as Promise<GameEngine>,
  hearts: () =>
    import('@/engine/games/hearts') as unknown as Promise<GameEngine>,
  spades: () =>
    import('@/engine/games/spades') as unknown as Promise<GameEngine>,
};

function noopEngine(): GameEngine {
  return {
    createInitialState: (players) => ({
      gameId: 'war' as GameId,
      players,
      currentPlayerIndex: 0,
      phase: 'waiting' as const,
      status: 'idle' as const,
      winners: [],
      scores: {},
      turnCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
    applyAction: (state) => state,
    getLegalActions: () => [],
    isTerminal: () => false,
    getWinners: () => [],
    getBotAction: (_state, playerId) => ({
      type: 'NOOP',
      playerId,
    }),
  };
}

// ---------------------------------------------------------------------------
// Bot think-time (ms) per difficulty
// ---------------------------------------------------------------------------

const BOT_DELAY: Record<string, number> = {
  easy: 1200,
  medium: 800,
  hard: 400,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGame(_gameId?: string) {
  const {
    gameId,
    state,
    isOnline,
    roomCode,
    botDifficulty,
    _setState,
    endGame,
    startGame: storeStartGame,
  } = useGameStore();

  const { profile } = useProfileStore();
  const { incrementSequence } = useRoomStore();

  const engineRef = useRef<GameEngine | null>(null);
  const [engineLoaded, setEngineLoaded] = useState(false);
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the engine and create initial state whenever gameId changes
  useEffect(() => {
    if (!gameId) return;
    const loader = engineMap[gameId];
    if (!loader) {
      console.error(`[useGame] No engine registered for gameId: ${gameId}`);
      return;
    }

    setEngineLoaded(false);
    loader()
      .then((mod) => {
        engineRef.current = mod;
        setEngineLoaded(true);

        // If the store only has a shell state (status: 'idle'), initialise via engine
        const current = useGameStore.getState().state;
        if (current && current.status === 'idle' && mod.createInitialState) {
          try {
            const realState = mod.createInitialState(
              current.players,
              {},
              current.seed
            );
            _setState(realState);
          } catch (err) {
            console.error(`[useGame] createInitialState failed for ${gameId}:`, err);
            _setState({
              ...current,
              status: 'finished',
              winners: [],
              phase: 'error',
            } as BaseGameState);
          }
        }
      })
      .catch((err) => {
        console.error(`[useGame] failed to load engine for ${gameId}:`, err);
      });
  }, [gameId, _setState]);

  // Derived values
  const currentPlayer =
    state && state.players[state.currentPlayerIndex]
      ? state.players[state.currentPlayerIndex]
      : null;

  const myPlayerId = profile?.id ?? null;
  const isMyTurn =
    !!currentPlayer && currentPlayer.id === myPlayerId && !currentPlayer.isBot;

  const legalActions: GameAction[] =
    engineRef.current && state && myPlayerId && engineLoaded
      ? engineRef.current.getLegalActions(state, myPlayerId)
      : [];

  // ---------------------------------------------------------------------------
  // doAction: apply an action locally and broadcast if online
  // ---------------------------------------------------------------------------
  const doAction = useCallback(
    (action: GameAction) => {
      if (!engineRef.current || !state) return;

      // Attach the local playerId when UI-triggered actions do not include one.
      // Several engines, especially Blackjack, rely on action.playerId and will
      // silently ignore actions like bet/hit/stand when it is missing.
      const enrichedAction: GameAction = {
        ...action,
        playerId: action.playerId ?? myPlayerId ?? undefined,
      };

      const nextState = engineRef.current.applyAction(state, enrichedAction);
      _setState(nextState);

      if (isOnline && roomCode && myPlayerId) {
        const seq = incrementSequence();
        broadcastGameAction(roomCode, myPlayerId, seq, enrichedAction).catch((err) =>
          console.error('[useGame] broadcastGameAction failed', err)
        );
      }

      // Check terminal — mark finished but don't clear state yet (let ResultOverlay show)
      if (engineRef.current.isTerminal(nextState)) {
        const winners = engineRef.current.getWinners(nextState);
        const finishedState: BaseGameState = { ...nextState, status: 'finished' as const, winners };
        _setState(finishedState);

        // Record stat for local player
        if (gameId && myPlayerId) {
          const isWinner = winners.includes(myPlayerId);
          const result: 'win' | 'loss' | 'draw' =
            winners.length === 0 ? 'draw'
            : isWinner ? 'win'
            : 'loss';
          useProfileStore.getState().recordResult(gameId, result);
        }
      }
    },
    [state, isOnline, roomCode, myPlayerId, _setState, incrementSequence, endGame]
  );

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Remote action drain — apply any queued online actions through the engine
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!engineLoaded || !engineRef.current || !state) return;
    const pending = useGameStore.getState().drainRemoteActions();
    if (pending.length === 0) return;
    let s = state;
    for (const action of pending) {
      try {
        s = engineRef.current.applyAction(s, action);
      } catch (err) {
        console.error('[useGame] remote applyAction error', err);
      }
    }
    // Check terminal after applying remote actions
    if (engineRef.current.isTerminal(s)) {
      const winners = engineRef.current.getWinners(s);
      s = { ...s, status: 'finished' as const, winners };
    }
    _setState(s);
  }, [state, engineLoaded, _setState]);

  // ---------------------------------------------------------------------------
  // Bot turns — fire whenever it becomes a bot's turn
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!engineLoaded || !state) return;
    if (state.status !== 'active' && state.status !== 'playing') return;
    if (!currentPlayer?.isBot) return;

    const delay = BOT_DELAY[botDifficulty] ?? 800;
    const snapshotState = state;
    const snapshotPlayer = currentPlayer;

    botTimerRef.current = setTimeout(() => {
      if (!engineRef.current) return;
      try {
        const action = engineRef.current.getBotAction(
          snapshotState,
          snapshotPlayer.id,
          botDifficulty
        );
        if (action && action.type) doAction(action);
      } catch (err) {
        console.error('[useGame] getBotAction error', err);
      }
    }, delay);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [
    engineLoaded,
    state,
    currentPlayer,
    botDifficulty,
    doAction,
  ]);

  const restart = useCallback(() => {
    if (!state || !engineRef.current) return;
    // Directly create a fresh initial state. Do NOT go through storeStartGame() because
    // that sets status:'idle' and the engine useEffect won't re-fire (gameId unchanged),
    // leaving the game frozen on a blank idle state forever.
    try {
      const fresh = engineRef.current.createInitialState(state.players, {});
      _setState(fresh);
    } catch (err) {
      console.error('[useGame] restart failed:', err);
    }
  }, [state, _setState]);

  return {
    state,
    legalActions,
    doAction,
    isMyTurn,
    currentPlayer,
    engineLoaded,
    restart,
    /** Convenience: start an offline game directly from a component */
    startGame: storeStartGame,
  };
}
