import { env } from '../../config/env';

/**
 * Retrieves the current user GPS coordinates using HTML5 Geolocation API.
 * 
 * @returns {Promise<{ latitude: number; longitude: number }>} User coordinates.
 */
export function getCurrentPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by this browser.'));
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err)
    );
  });
}

/**
 * Calculates the geodesic distance in meters between two lat/lng coordinates
 * using the Haversine formula and checks if it falls within the radius boundary.
 * 
 * @returns {boolean} True if within radius.
 */
export function isWithinRadius(
  targetLat: number,
  targetLng: number,
  userLat: number,
  userLng: number,
  radiusMeters: number
): boolean {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (targetLat * Math.PI) / 180;
  const phi2 = (userLat * Math.PI) / 180;
  const deltaPhi = ((userLat - targetLat) * Math.PI) / 180;
  const deltaLambda = ((userLng - targetLng) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c;
  return distance <= radiusMeters;
}

/**
 * Validates whether the device is within proximity boundaries of the place.
 * 
 * WHY GEOFENCING PROXIMITY:
 * - Ensures reviewers are physically located at the place when contributing,
 *   preventing armchair spam reports.
 * 
 * WHY DEV TOGGLE (VITE_ENFORCE_GEOFENCE):
 * - Allows Vince to seed initial data records from his computer during development
 *   without having to physically travel to every place.
 * - When false, logs a warning but resolves to true to allow testing flow.
 */
export async function checkGeofence(
  targetLat: number,
  targetLng: number,
  radiusMeters: number = 100
): Promise<boolean> {
  const enforce = env.VITE_ENFORCE_GEOFENCE;

  if (!enforce) {
    console.warn(
      'Geofence check skipped -- VITE_ENFORCE_GEOFENCE is false, this must be true before real launch'
    );
    return true;
  }

  try {
    const { latitude, longitude } = await getCurrentPosition();
    return isWithinRadius(targetLat, targetLng, latitude, longitude, radiusMeters);
  } catch (error) {
    console.error('[Geofence Proximity Failed] Could not access user GPS:', error);
    return false;
  }
}
