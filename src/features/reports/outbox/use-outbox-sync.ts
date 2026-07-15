import { useEffect, useState } from 'react';

export function useOutboxSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      
      // ========================================================================
      // TODO: Implement flush-on-reconnect logic here.
      // - Iterate through all pending-reports in IndexedDB.
      // - Attempt to post them to the Supabase database.
      // - If successful, delete them or mark them as synced in the outbox.
      // ========================================================================
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync trigger if app starts up online
    if (navigator.onLine) {
      // TODO: Handle initial flush-on-startup checks
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
  };
}
