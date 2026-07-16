import { supabase } from '../api/supabase-client';

const DEVICE_ID_KEY = 'pet-friendly-ph-device-id';

/**
 * Retrieves the stable anonymous device identifier from localStorage.
 * If no identifier exists, a new UUID is generated, persisted locally,
 * and registered in the remote Supabase database.
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
    
    // Register the new device anonymously in Supabase
    supabase
      .from('devices')
      .insert({ device_id: deviceId })
      .then(({ error }) => {
        if (error) {
          console.error('[Device Registration Failed] Error registering device:', error);
        }
      });
  }
  
  return deviceId;
}
