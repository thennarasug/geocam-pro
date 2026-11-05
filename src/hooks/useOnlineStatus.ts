import { useState, useEffect } from 'react';
import { syncPendingPhotos } from '../services/geocodingSync';
import { playSuccessChirp } from '../utils/audio';

export function useOnlineStatus(autoSync = true) {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [lastSyncResult, setLastSyncResult] = useState<{ synced: number; failed: number } | null>(null);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (autoSync) {
        console.log('Reconnected to internet. Auto-syncing pending geotags...');
        try {
          const res = await syncPendingPhotos();
          if (res.synced > 0) {
            playSuccessChirp();
            setLastSyncResult(res);
          }
        } catch (err) {
          console.error('Auto sync error on reconnect', err);
        }
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSync]);

  return { isOnline, lastSyncResult };
}
