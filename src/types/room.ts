export interface Room {
  id: string;
  code: string; // 6-char
  gameId: string;
  hostPlayerId: string;
  phase: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  players: RoomPlayer[];
}

export interface RoomPlayer {
  playerId: string;
  name: string;
  avatar: string;
  seatIndex: number;
  isReady: boolean;
}

export interface GameEvent {
  roomId: string;
  sequence: number;
  playerId: string;
  action: import('./game').GameAction;
}
