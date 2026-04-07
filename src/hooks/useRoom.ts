import { useEffect, useCallback } from 'react';
import { useRoomStore } from '@/store/roomStore';
import { useGameStore } from '@/store/gameStore';
import { useProfileStore } from '@/store/profileStore';
import {
  subscribeToRoom,
  createRoom as realtimeCreateRoom,
  joinRoom as realtimeJoinRoom,
  setPlayerReady as realtimeSetPlayerReady,
  broadcastGameStarted,
  updateRoomState,
} from '@/lib/realtime';
import type { Player } from '@/types/player';
import type { RoomPlayer } from '@/types/room';

export function useRoom(code?: string) {
  const roomStore = useRoomStore();
  const gameStore = useGameStore();
  const { profile } = useProfileStore();

  // Subscribe to the room channel whenever the code is known
  useEffect(() => {
    if (!code) return;

    const unsubscribe = subscribeToRoom(code, {
      onPlayerJoin(player: RoomPlayer) {
        roomStore.addPlayer(player);
      },

      onPlayerLeave(playerId: string) {
        roomStore.removePlayer(playerId);
      },

      onGameAction({ action }) {
        // Route incoming actions through the game store's apply path.
        // useGame will detect the state change via subscription.
        gameStore.applyAction(action);
      },

      onGameStarted({ seed, playerOrder }) {
        const room = roomStore.room;
        if (!room) return;
        // Re-order players to match host-determined seat order
        const orderedPlayers: Player[] = playerOrder
          .map((pid, idx) => {
            const rp = room.players.find((p) => p.playerId === pid);
            if (!rp) return null;
            return {
              id: rp.playerId,
              name: rp.name,
              avatar: rp.avatar,
              isBot: false as boolean,
              isLocal: rp.playerId === profile?.id,
              seatIndex: idx,
            } as Player;
          })
          .filter((p): p is Player => p !== null);

        gameStore.startGame(room.gameId as import('@/types/game').GameId, orderedPlayers, {}, seed);
      },

      onGameEnded({ winners }) {
        const state = gameStore.state;
        if (!state) return;
        gameStore._setState({ ...state, status: 'ended', winners });
      },
    });

    return unsubscribe;
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Exposed actions
  // ---------------------------------------------------------------------------

  const createRoom = useCallback(
    async (gameId: string, maxPlayers: number) => {
      if (!profile) return null;

      const hostPlayer: Player = {
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        isBot: false,
        isLocal: true,
        seatIndex: 0,
      };

      const room = await realtimeCreateRoom(gameId, hostPlayer, maxPlayers);
      if (room) {
        roomStore.setRoom(room);
        // Mark self as host
        useRoomStore.setState({ isHost: true });
      }
      return room;
    },
    [profile, roomStore]
  );

  const joinRoom = useCallback(
    async (roomCode: string) => {
      if (!profile) return null;

      const player: Player = {
        id: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        isBot: false,
        isLocal: true,
        seatIndex: 0, // host will assign a real seat
      };

      const room = await realtimeJoinRoom(roomCode, player);
      if (room) {
        roomStore.setRoom(room);
        useRoomStore.setState({ isHost: room.hostPlayerId === profile.id });
      }
      return room;
    },
    [profile, roomStore]
  );

  const setReady = useCallback(async () => {
    if (!code || !profile) return;
    roomStore.setPlayerReady(profile.id);
    await realtimeSetPlayerReady(code, profile.id);
  }, [code, profile, roomStore]);

  const startGame = useCallback(async () => {
    const room = roomStore.room;
    if (!room || !profile || room.hostPlayerId !== profile.id) return;

    const seed = Math.floor(Math.random() * 2 ** 31);
    const playerOrder = room.players.map((p) => p.playerId);

    await updateRoomState(room.id, { phase: 'playing' });
    await broadcastGameStarted(room.code, seed, playerOrder);

    // Also trigger locally for the host
    const orderedPlayers: Player[] = playerOrder
      .map((pid, idx) => {
        const rp = room.players.find((p) => p.playerId === pid);
        if (!rp) return null;
        return {
          id: rp.playerId,
          name: rp.name,
          avatar: rp.avatar,
          isBot: false as boolean,
          isLocal: rp.playerId === profile.id,
          seatIndex: idx,
        } as Player;
      })
      .filter((p): p is Player => p !== null);

    gameStore.startGame(room.gameId as import('@/types/game').GameId, orderedPlayers, {}, seed);
    gameStore.setOnlineMode(room.code);
  }, [roomStore, gameStore, profile]);

  return {
    room: roomStore.room,
    isHost: roomStore.isHost,
    createRoom,
    joinRoom,
    setReady,
    startGame,
  };
}
