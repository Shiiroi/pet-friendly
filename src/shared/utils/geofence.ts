import { env } from '../../config/env';

/**
 * Named constant defining our maximum contribution distance radius in meters.
 * 
 * WHY 300 METERS:
 * Loose enough to accommodate typical urban high-rise GPS reflections and drifts,
 * but tight enough to verify that a device is physically on-site.
 */
export const GEOFENCE_RADIUS_METERS = 300;

export class GeolocationError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = 'GeolocationError';
  }
}

/**
 * Retrieves the current user GPS coordinates using HTML5 Geolocation API,
 * wrapping browser errors with distinct descriptions.
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
      (err) => {
        let message = 'An unknown GPS error occurred.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = 'GPS access permission was denied. Please enable location services in your browser settings.';
            break;
          case err.POSITION_UNAVAILABLE:
            message = 'GPS location information is unavailable. Please verify your device has active satellites/signal connection.';
            break;
          case err.TIMEOUT:
            message = 'GPS location request timed out. Please try moving closer to a window or outdoors.';
            break;
        }
        reject(new GeolocationError(err.code, message));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
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
  radiusMeters: number = GEOFENCE_RADIUS_METERS
): Promise<boolean> {
  const enforce = env.VITE_ENFORCE_GEOFENCE;

  try {
    const { latitude, longitude } = await getCurrentPosition();
    const isInside = isWithinRadius(targetLat, targetLng, latitude, longitude, radiusMeters);

    if (!enforce) {
      console.warn(
        `[Geofence Skip] User is physically ${
          isInside ? 'INSIDE' : 'OUTSIDE'
        } the required radius. Skipping block since VITE_ENFORCE_GEOFENCE is false.`
      );
      return true;
    }

    return isInside;
  } catch (error) {
    if (!enforce) {
      console.warn(
        `[Geofence Skip] GPS coordinates lookup failed (${
          (error as Error).message
        }). Skipping block since VITE_ENFORCE_GEOFENCE is false.`
      );
      return true;
    }
    throw error;
  }
}
