const PROFILE_KEY = 'carded:profile';
const STATS_KEY = 'carded:stats';

export interface StoredProfile {
  id: string;
  name: string;
  avatar: string;
  createdAt: string;
}

export interface GameStats {
  played: number;
  won: number;
  lost: number;
  drawn: number;
  streak: number;
  bestStreak: number;
  lastPlayed: string;
}

export type AllStats = Record<string, GameStats>;

export function loadProfile(): StoredProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredProfile;
  } catch {
    return null;
  }
}

export function saveProfile(profile: StoredProfile): void {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function loadStats(): AllStats {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as AllStats;
  } catch {
    return {};
  }
}

export function saveStats(stats: AllStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

export function recordGameResult(
  gameId: string,
  result: 'win' | 'loss' | 'draw'
): void {
  const stats = loadStats();
  const existing: GameStats = stats[gameId] ?? {
    played: 0,
    won: 0,
    lost: 0,
    drawn: 0,
    streak: 0,
    bestStreak: 0,
    lastPlayed: new Date().toISOString(),
  };

  existing.played += 1;
  existing.lastPlayed = new Date().toISOString();

  if (result === 'win') {
    existing.won += 1;
    existing.streak = existing.streak > 0 ? existing.streak + 1 : 1;
    if (existing.streak > existing.bestStreak) {
      existing.bestStreak = existing.streak;
    }
  } else if (result === 'loss') {
    existing.lost += 1;
    existing.streak = existing.streak < 0 ? existing.streak - 1 : -1;
  } else {
    existing.drawn += 1;
    existing.streak = 0;
  }

  stats[gameId] = existing;
  saveStats(stats);
}
