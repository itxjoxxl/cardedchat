import { create } from 'zustand';
import type { Room, RoomPlayer } from '@/types/room';

interface RoomStore {
  room: Room | null;
  isHost: boolean;
  eventSequence: number;
  // Actions
  setRoom(room: Room): void;
  clearRoom(): void;
  addPlayer(player: RoomPlayer): void;
  removePlayer(playerId: string): void;
  setPlayerReady(playerId: string): void;
  incrementSequence(): number;
}

export const useRoomStore = create<RoomStore>()((set, get) => ({
  room: null,
  isHost: false,
  eventSequence: 0,

  setRoom(room: Room) {
    set({ room });
  },

  clearRoom() {
    set({ room: null, isHost: false, eventSequence: 0 });
  },

  addPlayer(player: RoomPlayer) {
    const { room } = get();
    if (!room) return;
    // Avoid duplicates
    if (room.players.some((p) => p.playerId === player.playerId)) return;
    set({ room: { ...room, players: [...room.players, player] } });
  },

  removePlayer(playerId: string) {
    const { room } = get();
    if (!room) return;
    set({
      room: {
        ...room,
        players: room.players.filter((p) => p.playerId !== playerId),
      },
    });
  },

  setPlayerReady(playerId: string) {
    const { room } = get();
    if (!room) return;
    set({
      room: {
        ...room,
        players: room.players.map((p) =>
          p.playerId === playerId ? { ...p, isReady: true } : p
        ),
      },
    });
  },

  incrementSequence(): number {
    const next = get().eventSequence + 1;
    set({ eventSequence: next });
    return next;
  },
}));
