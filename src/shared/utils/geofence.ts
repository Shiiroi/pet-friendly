import { env } from '../../config/env';

/**
 * Defines the maximum allowed distance in meters between a device and a place.
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
 * Retrieves current device GPS coordinates with the HTML5 Geolocation API.
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
 * Calculates distance between two coordinate pairs with the Haversine formula.
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
 * Verifies that the device is located near the target place.
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
