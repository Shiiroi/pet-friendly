const DEVICE_ID_KEY = 'pet-friendly-ph-device-id';

/**
 * Retrieves the stable anonymous device identifier from localStorage.
 * If no identifier exists, a new UUID is generated and persisted.
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  
  return deviceId;
}
