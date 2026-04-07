import { supabase } from './supabase';
import type { Room, RoomPlayer, GameEvent } from '@/types/room';
import type { GameAction } from '@/types/game';
import type { Player } from '@/types/player';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/I/1

/** Generate a 6-character uppercase alphanumeric room code. */
export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += SAFE_CHARS[Math.floor(Math.random() * SAFE_CHARS.length)];
  }
  return code;
}

// ---------------------------------------------------------------------------
// Room CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new room in Supabase and return it, or null if offline.
 */
export async function createRoom(
  gameId: string,
  hostPlayer: Player,
  maxPlayers: number
): Promise<Room | null> {
  if (!supabase) return null;

  const code = generateRoomCode();
  const hostRoomPlayer: RoomPlayer = {
    playerId: hostPlayer.id,
    name: hostPlayer.name,
    avatar: hostPlayer.avatar,
    seatIndex: hostPlayer.seatIndex ?? 0,
    isReady: false,
  };

  const room: Room = {
    id: crypto.randomUUID(),
    code,
    gameId,
    hostPlayerId: hostPlayer.id,
    phase: 'waiting',
    maxPlayers,
    players: [hostRoomPlayer],
  };

  const { data, error } = await supabase
    .from('rooms')
    .insert({ ...room, players: room.players })
    .select()
    .single();

  if (error) {
    console.error('[realtime] createRoom error', error);
    return null;
  }

  return data as Room;
}

/**
 * Join an existing room by code.  Returns the updated room or null.
 */
export async function joinRoom(
  code: string,
  player: Player
): Promise<Room | null> {
  if (!supabase) return null;

  const existing = await getRoomState(code);
  if (!existing) return null;

  if (existing.phase !== 'waiting') {
    console.warn('[realtime] joinRoom: cannot join — game already in progress');
    return null;
  }

  if (existing.players.length >= existing.maxPlayers) {
    console.warn('[realtime] joinRoom: room is full');
    return null;
  }

  if (existing.players.some((p) => p.playerId === player.id)) {
    // Already in room — return as-is
    return existing;
  }

  const newPlayer: RoomPlayer = {
    playerId: player.id,
    name: player.name,
    avatar: player.avatar,
    seatIndex: existing.players.length,
    isReady: false,
  };

  const updatedPlayers = [...existing.players, newPlayer];

  const { data, error } = await supabase
    .from('rooms')
    .update({ players: updatedPlayers })
    .eq('code', code)
    .select()
    .single();

  if (error) {
    console.error('[realtime] joinRoom error', error);
    return null;
  }

  return data as Room;
}

/**
 * Fetch current room state by code.
 */
export async function getRoomState(code: string): Promise<Room | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code)
    .single();

  if (error) {
    console.error('[realtime] getRoomState error', error);
    return null;
  }

  return data as Room;
}

/**
 * Overwrite room state (used by host to push game-level updates).
 */
export async function updateRoomState(
  roomId: string,
  state: Partial<Room>
): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase
    .from('rooms')
    .update(state)
    .eq('id', roomId);

  if (error) {
    console.error('[realtime] updateRoomState error', error);
  }
}

/**
 * Mark a player as ready.
 */
export async function setPlayerReady(
  code: string,
  playerId: string
): Promise<void> {
  if (!supabase) return;

  const room = await getRoomState(code);
  if (!room) return;

  const updatedPlayers = room.players.map((p) =>
    p.playerId === playerId ? { ...p, isReady: true } : p
  );

  const { error } = await supabase
    .from('rooms')
    .update({ players: updatedPlayers })
    .eq('code', code);

  if (error) {
    console.error('[realtime] setPlayerReady error', error);
  }
}

// ---------------------------------------------------------------------------
// Realtime broadcasts
// ---------------------------------------------------------------------------

export interface RoomCallbacks {
  onPlayerJoin?: (player: RoomPlayer) => void;
  onPlayerLeave?: (playerId: string) => void;
  onGameAction?: (event: GameEvent) => void;
  onGameStarted?: (payload: { seed: number; playerOrder: string[] }) => void;
  onGameEnded?: (payload: { winners: string[] }) => void;
}

/**
 * Subscribe to all realtime events for a room.
 * Returns an unsubscribe function.
 */
export function subscribeToRoom(
  code: string,
  callbacks: RoomCallbacks
): () => void {
  if (!supabase) return () => {};

  const channel = supabase.channel(`room:${code}`, {
    config: { broadcast: { self: false } },
  });

  channel
    .on('broadcast', { event: 'player_join' }, ({ payload }) => {
      callbacks.onPlayerJoin?.(payload as RoomPlayer);
    })
    .on('broadcast', { event: 'player_leave' }, ({ payload }) => {
      callbacks.onPlayerLeave?.((payload as { playerId: string }).playerId);
    })
    .on('broadcast', { event: 'game_action' }, ({ payload }) => {
      callbacks.onGameAction?.(payload as GameEvent);
    })
    .on('broadcast', { event: 'game_started' }, ({ payload }) => {
      callbacks.onGameStarted?.(
        payload as { seed: number; playerOrder: string[] }
      );
    })
    .on('broadcast', { event: 'game_ended' }, ({ payload }) => {
      callbacks.onGameEnded?.(payload as { winners: string[] });
    })
    .subscribe();

  return () => {
    void supabase!.removeChannel(channel);
  };
}

/**
 * Broadcast a game action to all players in the room.
 */
export async function broadcastGameAction(
  code: string,
  playerId: string,
  sequence: number,
  action: GameAction
): Promise<void> {
  if (!supabase) return;

  const channel = supabase.channel(`room:${code}`);
  await channel.send({
    type: 'broadcast',
    event: 'game_action',
    payload: { roomId: code, sequence, playerId, action } satisfies GameEvent,
  });
}

/**
 * Broadcast that the game has started (host only).
 */
export async function broadcastGameStarted(
  code: string,
  seed: number,
  playerOrder: string[]
): Promise<void> {
  if (!supabase) return;

  const channel = supabase.channel(`room:${code}`);
  await channel.send({
    type: 'broadcast',
    event: 'game_started',
    payload: { seed, playerOrder },
  });
}

/**
 * Broadcast that the game has ended.
 */
export async function broadcastGameEnded(
  code: string,
  winners: string[]
): Promise<void> {
  if (!supabase) return;

  const channel = supabase.channel(`room:${code}`);
  await channel.send({
    type: 'broadcast',
    event: 'game_ended',
    payload: { winners },
  });
}
