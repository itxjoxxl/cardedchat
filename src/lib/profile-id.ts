import { nanoid } from 'nanoid';
import { loadProfile, saveProfile, type StoredProfile } from './storage';

/** Returns the existing profile ID or generates a new one (stored immediately). */
export function getOrCreateProfileId(): string {
  const existing = loadProfile();
  if (existing?.id) return existing.id;

  const id = nanoid(12);
  // Persist a minimal shell so the ID survives page reloads even before the
  // user finishes setup.
  saveProfile({
    id,
    name: '',
    avatar: '',
    createdAt: new Date().toISOString(),
  });
  return id;
}

/** Encode a profile as a URL-safe base64 restore code. */
export function encodeRestoreCode(profile: StoredProfile): string {
  return btoa(JSON.stringify(profile))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/** Decode a restore code back to a StoredProfile, or null on failure. */
export function decodeRestoreCode(code: string): StoredProfile | null {
  try {
    const padded = code.replace(/-/g, '+').replace(/_/g, '/');
    const padAmount = (4 - (padded.length % 4)) % 4;
    const decoded = atob(padded + '='.repeat(padAmount));
    return JSON.parse(decoded) as StoredProfile;
  } catch {
    return null;
  }
}
