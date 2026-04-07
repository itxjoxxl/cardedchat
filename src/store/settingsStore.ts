import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  soundEnabled: boolean;
  animationSpeed: 'slow' | 'normal' | 'fast';
  cardBackColor: 'blue' | 'red' | 'green' | 'purple';
  // Actions
  toggleSound(): void;
  setAnimationSpeed(s: 'slow' | 'normal' | 'fast'): void;
  setCardBackColor(c: string): void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      soundEnabled: true,
      animationSpeed: 'normal',
      cardBackColor: 'blue',

      toggleSound() {
        set((s) => ({ soundEnabled: !s.soundEnabled }));
      },

      setAnimationSpeed(s: 'slow' | 'normal' | 'fast') {
        set({ animationSpeed: s });
      },

      setCardBackColor(c: string) {
        const valid = ['blue', 'red', 'green', 'purple'];
        if (valid.includes(c)) {
          set({ cardBackColor: c as 'blue' | 'red' | 'green' | 'purple' });
        }
      },
    }),
    {
      name: 'carded:settings',
    }
  )
);
