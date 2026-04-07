export interface PlayerProfile {
  id: string;       // nanoid(12) - permanent
  name: string;
  avatar: string;   // emoji
  createdAt: string; // ISO
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isBot: boolean;
  isLocal: boolean; // is this the local human player
  seatIndex: number;
}

export type BotDifficulty = 'easy' | 'medium' | 'hard';
