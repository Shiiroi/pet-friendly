import { useEffect, useState } from 'react';

/**
 * Monitors browser online/offline status and flushes pending offline
 * reports from IndexedDB to the database upon reconnection.
 */
export function useOutboxSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      
      // ========================================================================
      // TODO: Implement flush-on-reconnect logic:
      // - Query all pending reports from `getPendingReports()`.
      // - Map and post them to Supabase using the anon client.
      // - Delete synced entries via `deletePendingReport(id)` on success.
      // ========================================================================
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check to flush any reports queued during a previous offline session
    if (navigator.onLine) {
      // TODO: Trigger initial outbox flush-on-startup
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
