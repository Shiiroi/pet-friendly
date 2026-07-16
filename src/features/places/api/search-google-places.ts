/**
 * NOTE ON CONCEPTS:
 * This file handles searching for general geographical locations, cities, or addresses via Google Places
 * (with an OpenStreetMap Nominatim fallback) to help users center the map view.
 * 
 * SEPARATION OF CONCERNS:
 * - This search queries external mapping directories (Google/OSM) to locate general reference points.
 * - It does NOT query or modify our own Supabase `places` table, which strictly holds user-submitted
 *   pet-friendly verification records.
 */

export interface GeocodingResult {
  /** Unique identifier for the search result. */
  id: string;
  /** Primary label representing the location name. */
  displayName: string;
  /** Full text address. */
  address: string;
  /** Latitude coordinate. */
  lat: number;
  /** Longitude coordinate. */
  lng: number;
}

/**
 * Searches geocoding directories to resolve address queries into coordinates.
 * 
 * WHY DUAL-ENGINE:
 * To avoid requiring developers or users to instantly purchase or configure a billed
 * Google Maps API Key for local development, we attempt to use the Google Places JS SDK if loaded,
 * and seamlessly fall back to the free, public OpenStreetMap Nominatim search API.
 * 
 * @param {string} query - The search query text entered by the user (e.g., "Quezon City").
 * @returns {Promise<GeocodingResult[]>} Resolved coordinate results.
 */
export async function searchGooglePlaces(query: string): Promise<GeocodingResult[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  // Check if the Google Maps JS SDK library has been successfully loaded on the window
  const hasGoogleSDK = typeof window !== 'undefined' && (window as any).google?.maps?.places;

  if (hasGoogleSDK) {
    return new Promise((resolve) => {
      const autocompleteService = new (window as any).google.maps.places.AutocompleteService();
      const geocoder = new (window as any).google.maps.Geocoder();

      autocompleteService.getPlacePredictions(
        { input: query, componentRestrictions: { country: 'ph' } },
        (predictions: any[] | null, status: any) => {
          if (status !== 'OK' || !predictions) {
            return resolve([]);
          }

          // Map predictions to geocoder promises to resolve lat/lng
          const detailPromises = predictions.slice(0, 5).map((pred) => {
            return new Promise<GeocodingResult | null>((detailResolve) => {
              geocoder.geocode({ placeId: pred.place_id }, (results: any[] | null, geoStatus: any) => {
                if (geoStatus !== 'OK' || !results || !results[0]) {
                  return detailResolve(null);
                }
                const loc = results[0].geometry.location;
                detailResolve({
                  id: pred.place_id,
                  displayName: pred.structured_formatting.main_text,
                  address: pred.description,
                  lat: loc.lat(),
                  lng: loc.lng(),
                });
              });
            });
          });

          Promise.all(detailPromises).then((results) => {
            resolve(results.filter((r): r is GeocodingResult => r !== null));
          });
        }
      );
    });
  }

  // FALLBACK: OpenStreetMap Nominatim API
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=5&countrycodes=ph`;
    
    // User-Agent is requested by Nominatim Usage Policy to avoid rate limit bans
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim query failed with status: ${response.status}`);
    }

    const data = await response.json();
    
    return data.map((item: any) => ({
      id: `osm-${item.place_id}`,
      displayName: item.name || item.display_name.split(',')[0],
      address: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (error) {
    console.error('[Geocoding Fallback Failed] Nominatim search failed:', error);
    return [];
  }
}
