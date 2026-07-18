import { supabase } from '../api/supabase-client';
import { uuidv4 } from './uuid';

const DEVICE_ID_KEY = 'compaws-device-id';

/**
 * Retrieves the persistent device ID from localStorage. If not found,
 * generates a new UUID, saves it locally, and registers it in the database.
 * 
 * @returns {string} Persistent device UUID.
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = uuidv4();
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
