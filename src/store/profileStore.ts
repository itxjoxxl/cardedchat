import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  loadProfile,
  loadStats,
  saveProfile,
  saveStats,
  recordGameResult,
  type StoredProfile,
  type AllStats,
} from '@/lib/storage';
import {
  getOrCreateProfileId,
  encodeRestoreCode,
  decodeRestoreCode,
} from '@/lib/profile-id';

const MAX_NAME_LENGTH = 20;
const DEFAULT_AVATAR = '😀';

function cleanName(name: string): string {
  return String(name ?? '').trim().slice(0, MAX_NAME_LENGTH);
}

function cleanAvatar(avatar: string): string {
  const value = String(avatar ?? '').trim();
  return value || DEFAULT_AVATAR;
}

interface ProfileStore {
  profile: StoredProfile | null;
  stats: AllStats;
  isSetupComplete: boolean;
  // Actions
  initProfile(): void;
  setProfile(profile: StoredProfile): void;
  updateName(name: string): void;
  updateAvatar(avatar: string): void;
  recordResult(gameId: string, result: 'win' | 'loss' | 'draw'): void;
  restoreFromCode(code: string): boolean;
  getRestoreCode(): string;
}

export const useProfileStore = create<ProfileStore>()(
  persist(
    (set, get) => ({
      profile: null,
      stats: {},
      isSetupComplete: false,

      initProfile() {
        const stored = loadProfile();
        const allStats = loadStats();

        const sanitizedProfile = stored
          ? {
              ...stored,
              name: cleanName(stored.name),
              avatar: cleanAvatar(stored.avatar),
              createdAt: stored.createdAt ?? new Date().toISOString(),
            }
          : null;

        if (sanitizedProfile?.name && sanitizedProfile?.avatar) {
          if (JSON.stringify(sanitizedProfile) !== JSON.stringify(stored)) {
            saveProfile(sanitizedProfile);
          }
          set({ profile: sanitizedProfile, stats: allStats, isSetupComplete: true });
          return;
        }

        // Create/retrieve ID but don't mark setup complete until name+avatar are set
        const id = getOrCreateProfileId();
        const shell: StoredProfile = {
          id,
          name: cleanName(stored?.name ?? ''),
          avatar: stored?.avatar ? cleanAvatar(stored.avatar) : '',
          createdAt: stored?.createdAt ?? new Date().toISOString(),
        };
        set({ profile: shell, stats: allStats, isSetupComplete: false });
      },

      setProfile(profile: StoredProfile) {
        const sanitized: StoredProfile = {
          ...profile,
          name: cleanName(profile.name),
          avatar: cleanAvatar(profile.avatar),
          createdAt: profile.createdAt ?? new Date().toISOString(),
        };
        saveProfile(sanitized);
        set({
          profile: sanitized,
          isSetupComplete: !!(sanitized.name && sanitized.avatar),
        });
      },

      updateName(name: string) {
        const current = get().profile;
        if (!current) return;
        const cleanedName = cleanName(name);
        const updated: StoredProfile = { ...current, name: cleanedName };
        saveProfile(updated);
        set({
          profile: updated,
          isSetupComplete: !!(cleanedName && updated.avatar),
        });
      },

      updateAvatar(avatar: string) {
        const current = get().profile;
        if (!current) return;
        const cleanedAvatar = cleanAvatar(avatar);
        const updated: StoredProfile = { ...current, avatar: cleanedAvatar };
        saveProfile(updated);
        set({
          profile: updated,
          isSetupComplete: !!(updated.name && cleanedAvatar),
        });
      },

      recordResult(gameId: string, result: 'win' | 'loss' | 'draw') {
        recordGameResult(gameId, result);
        const updated = loadStats();
        set({ stats: updated });
      },

      restoreFromCode(code: string): boolean {
        const decoded = decodeRestoreCode(code);
        if (!decoded || !decoded.id || !decoded.name) return false;
        const sanitized: StoredProfile = {
          ...decoded,
          name: cleanName(decoded.name),
          avatar: cleanAvatar(decoded.avatar),
          createdAt: decoded.createdAt ?? new Date().toISOString(),
        };
        saveProfile(sanitized);
        set({
          profile: sanitized,
          isSetupComplete: !!(sanitized.name && sanitized.avatar),
        });
        return true;
      },

      getRestoreCode(): string {
        const profile = get().profile;
        if (!profile) return '';
        return encodeRestoreCode(profile);
      },
    }),
    {
      name: 'carded:profile-store',
      // Only persist the profile snapshot and setup flag;
      // raw stats live in their own localStorage key via storage helpers.
      partialize: (state) => ({
        profile: state.profile,
        isSetupComplete: state.isSetupComplete,
      }),
    }
  )
);
