export type BotDifficulty = 'easy' | 'medium' | 'hard';

export interface BotConfig {
  difficulty: BotDifficulty;
  thinkTimeMs: [number, number]; // min/max delay before acting
  bluffFrequency: number; // 0-1
  reactionTimeMs?: [number, number]; // for Snap
}

export const BOT_CONFIGS: Record<BotDifficulty, BotConfig> = {
  easy: {
    difficulty: 'easy',
    thinkTimeMs: [800, 1800],
    bluffFrequency: 0,
    reactionTimeMs: [1200, 2000],
  },
  medium: {
    difficulty: 'medium',
    thinkTimeMs: [400, 900],
    bluffFrequency: 0.1,
    reactionTimeMs: [600, 1100],
  },
  hard: {
    difficulty: 'hard',
    thinkTimeMs: [150, 400],
    bluffFrequency: 0.2,
    reactionTimeMs: [150, 350],
  },
};

export function randomThinkTime(config: BotConfig): number {
  const [min, max] = config.thinkTimeMs;
  return Math.floor(Math.random() * (max - min) + min);
}

export function randomReactionTime(config: BotConfig): number {
  const [min, max] = config.reactionTimeMs ?? [500, 1000];
  return Math.floor(Math.random() * (max - min) + min);
}
