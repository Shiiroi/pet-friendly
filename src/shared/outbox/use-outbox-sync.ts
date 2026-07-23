import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../api/supabase-client';
import { getPendingReports, deletePendingReport, type PendingReport } from './outbox-db';
import { getDeviceId } from '../utils/device-id';

/**
 * Pushes queued offline reports from IndexedDB to Supabase when network connectivity recovers.
 */
export function useOutboxSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const flushOutbox = useCallback(async () => {
    if (!navigator.onLine || isSyncing) return;
    
    let pending: PendingReport[];
    try {
      pending = await getPendingReports();
    } catch (err) {
      console.error('[Outbox Sync] Failed to read IndexedDB outbox queue:', err);
      return;
    }

    // Sort unsynced items from oldest to newest to preserve timeline order
    const unsynced = pending
      .filter((item) => !item.synced)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (unsynced.length === 0) {
      return;
    }

    setIsSyncing(true);
    setSyncStatus(`Syncing ${unsynced.length} pending report${unsynced.length > 1 ? 's' : ''}... 🐾`);

    // Register device ID in Supabase before uploading reports to prevent foreign key errors
    try {
      const deviceId = getDeviceId();
      const { error: deviceError } = await supabase
        .from('devices')
        .upsert({ device_id: deviceId }, { onConflict: 'device_id' });

      if (deviceError) {
        console.error('[Outbox Sync] Failed to ensure device registration:', deviceError);
        setIsSyncing(false);
        setSyncStatus(null);
        return;
      }
    } catch (deviceExc) {
      console.error('[Outbox Sync] Exception during device registration check:', deviceExc);
      setIsSyncing(false);
      setSyncStatus(null);
      return;
    }

    let succeededCount = 0;

    for (const entry of unsynced) {
      try {
        let error: any = null;

        // Route payload to target API endpoint
        if (entry.type === 'report') {
          const res = await supabase.from('pet_policy_reports').insert(entry.payload);
          error = res.error;
        } else if (entry.type === 'place') {
          const res = await supabase.rpc('create_place_with_report', {
            p_name: entry.payload.p_name,
            p_address: entry.payload.p_address,
            p_city: entry.payload.p_city,
            p_province: entry.payload.p_province,
            p_categories: entry.payload.p_categories || (entry.payload.p_category ? [entry.payload.p_category] : []),
            p_latitude: entry.payload.p_latitude,
            p_longitude: entry.payload.p_longitude,
            p_device_id: entry.payload.p_device_id,
            p_claim: entry.payload.p_claim,
            p_pet_menu: entry.payload.p_pet_menu,
            p_price_range: entry.payload.p_price_range,
            p_notes: entry.payload.p_notes,
          });
          error = res.error;
        } else if (entry.type === 'flag') {
          const res = await supabase.from('flags').insert(entry.payload);
          error = res.error;
        }

        if (error) {
          console.error(`[Outbox Sync] Failed to sync report ${entry.id}:`, error);
          break; // Stop immediately on error to retry during next sync cycle
        }

        // Remove synced item from local IndexedDB
        await deletePendingReport(entry.id);
        succeededCount++;
      } catch (err) {
        console.error(`[Outbox Sync] Exception thrown replaying report ${entry.id}:`, err);
        break; // Stop execution on error
      }
    }

    // Display temporary success status message
    if (succeededCount > 0) {
      setSyncStatus(`All synced ✓ (${succeededCount} contribution${succeededCount > 1 ? 's' : ''} uploaded)`);
      setTimeout(() => {
        setSyncStatus(null);
      }, 3000);
    } else {
      setSyncStatus(null);
    }
    setIsSyncing(false);
  }, [isSyncing]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushOutbox();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        flushOutbox();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Flush outbox on application startup when online
    if (navigator.onLine) {
      flushOutbox();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushOutbox]);

  return {
    isOnline,
    isSyncing,
    syncStatus,
  };
}
