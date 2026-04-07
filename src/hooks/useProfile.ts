import { useEffect } from 'react';
import { useProfileStore } from '@/store/profileStore';

export function useProfile() {
  const store = useProfileStore();

  useEffect(() => {
    store.initProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    profile: store.profile,
    stats: store.stats,
    isSetupComplete: store.isSetupComplete,
    updateName: store.updateName,
    updateAvatar: store.updateAvatar,
    recordResult: store.recordResult,
    restoreFromCode: store.restoreFromCode,
    getRestoreCode: store.getRestoreCode,
  };
}
