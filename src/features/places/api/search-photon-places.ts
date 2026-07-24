/**
 * OSM-based Geocoding — Photon (Komoot) primary, Nominatim fallback.
 *
 * Both services are ODbL-licensed: legal to store results permanently.
 * - Photon: https://photon.komoot.io — no rate limit, CORS-friendly
 * - Nominatim: https://nominatim.openstreetmap.org — fallback, 1 req/sec
 */

const PHOTON_BASE   = 'https://photon.komoot.io';
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export interface PhotonPlaceResult {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  city: string;
  province: string;
  country: string;
  osmKey?: string;
  osmValue?: string;
}

export interface ReverseGeocodeResult {
  address: string;
  city: string;
  province: string;
  name?: string;
}

/** Bounding box coordinates for the Philippines */
export const PH_BBOX = {
  minLng: 116.0,
  minLat: 4.5,
  maxLng: 127.0,
  maxLat: 21.5,
};

/** Checks if given coordinates fall strictly within the Philippines bounding box */
export function isWithinPH(lat: number, lng: number): boolean {
  return (
    lat >= PH_BBOX.minLat &&
    lat <= PH_BBOX.maxLat &&
    lng >= PH_BBOX.minLng &&
    lng <= PH_BBOX.maxLng
  );
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function parseProvince(state: string, city: string): string {
  const ncrPattern =
    /ncr|national capital region|metro manila|quezon city|manila|makati|taguig|pasig|mandaluyong|san juan|pasay|paranaque|las pinas|muntinlupa|marikina|valenzuela|malabon|navotas|pateros|caloocan/i;
  if (ncrPattern.test(state) || ncrPattern.test(city)) return 'Metro Manila';
  return state || city || 'Metro Manila';
}

// ---------------------------------------------------------------------------
// Photon helpers
// ---------------------------------------------------------------------------

function parsePhotonProps(props: any, query: string) {
  const parts: string[] = [];
  if (props.housenumber) parts.push(props.housenumber);
  if (props.street) parts.push(props.street);
  if (props.district && props.district !== props.city) parts.push(props.district);
  const cityName = props.city || props.town || props.village || props.municipality || '';
  if (cityName) parts.push(cityName);
  if (props.state) parts.push(props.state);

  const name = props.name || props.street || props.city || query;
  const city = props.city || props.town || props.village || props.district || props.municipality || 'General';
  const province = parseProvince(props.state || props.county || '', city);
  const address = parts.length >= 2 ? parts.join(', ') : props.name || 'Philippines';
  return { name, city, province, address };
}

// ---------------------------------------------------------------------------
// Nominatim helpers
// ---------------------------------------------------------------------------

function parseNominatimAddr(addr: any, displayName: string, queryFallback = '') {
  const parts: string[] = [];
  if (addr?.house_number) parts.push(addr.house_number);
  if (addr?.road || addr?.pedestrian) parts.push(addr.road || addr.pedestrian);
  if (addr?.suburb || addr?.neighbourhood) parts.push(addr.suburb || addr.neighbourhood);
  const city = addr?.city || addr?.town || addr?.village || addr?.municipality || addr?.county || '';
  if (city) parts.push(city);
  if (addr?.state) parts.push(addr.state);

  const name =
    addr?.amenity || addr?.shop || addr?.tourism || addr?.road || addr?.pedestrian || queryFallback;
  const cityResult = addr?.city || addr?.town || addr?.village || addr?.municipality || addr?.county || 'General';
  const province = parseProvince(addr?.state || addr?.region || '', cityResult);
  const address = parts.length >= 2 ? parts.join(', ') : displayName || 'Philippines';
  return { name, city: cityResult, province, address };
}

// ---------------------------------------------------------------------------
// Forward search — Photon primary, Nominatim fallback
// ---------------------------------------------------------------------------

async function searchViaPhoton(query: string, lat: number, lng: number): Promise<PhotonPlaceResult[]> {
  const url = `${PHOTON_BASE}/api/?q=${encodeURIComponent(query)}&lat=${lat}&lon=${lng}&limit=8&lang=en&bbox=${PH_BBOX.minLng},${PH_BBOX.minLat},${PH_BBOX.maxLng},${PH_BBOX.maxLat}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Photon HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.features)) return [];

  return data.features
    .map((f: any) => {
      const [fLng, fLat] = f.geometry?.coordinates || [lng, lat];
      if (!isWithinPH(fLat, fLng)) return null;
      const props = f.properties || {};
      const { name, city, province, address } = parsePhotonProps(props, query);
      return {
        id: `osm-${props.osm_type || 'N'}-${props.osm_id || Math.random().toString(36).slice(2)}`,
        name, address, lat: fLat, lng: fLng, city, province,
        country: props.country || 'Philippines',
        osmKey: props.osm_key, osmValue: props.osm_value,
      };
    })
    .filter((x: any): x is PhotonPlaceResult => x !== null);
}

async function searchViaNominatim(query: string, lat: number, lng: number): Promise<PhotonPlaceResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    addressdetails: '1',
    countrycodes: 'ph',
    limit: '8',
    viewbox: `${lng - 1},${lat + 1},${lng + 1},${lat - 1}`,
    bounded: '0',
  });
  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`);
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const results: any[] = await res.json();
  if (!Array.isArray(results)) return [];

  return results
    .filter((r) => isWithinPH(parseFloat(r.lat), parseFloat(r.lon)))
    .map((r) => {
      const rLat = parseFloat(r.lat);
      const rLng = parseFloat(r.lon);
      const addr = r.address || {};
      const { name, city, province, address } = parseNominatimAddr(addr, r.display_name, query);
      return {
        id: `osm-${r.osm_type || 'N'}-${r.osm_id || Math.random().toString(36).slice(2)}`,
        name: r.name || name, address, lat: rLat, lng: rLng, city, province,
        country: addr.country || 'Philippines',
        osmKey: r.class, osmValue: r.type,
      };
    });
}

/**
 * Searches for places restricted to the Philippines.
 * Tries Photon first (no rate limit, CORS-friendly), falls back to Nominatim.
 */
export async function searchPhotonPlaces(
  query: string,
  lat = 14.5995,
  lng = 120.9842
): Promise<PhotonPlaceResult[]> {
  if (!query || query.trim().length < 2) return [];

  const q = query.trim();

  try {
    return await searchViaPhoton(q, lat, lng);
  } catch (photonErr) {
    console.warn('[Photon search unavailable, trying Nominatim]:', photonErr);
    try {
      return await searchViaNominatim(q, lat, lng);
    } catch (nomErr) {
      console.error('[Nominatim Search Failed]:', nomErr);
      return [];
    }
  }
}

// ---------------------------------------------------------------------------
// Reverse geocode — Photon primary, Nominatim fallback
// ---------------------------------------------------------------------------

async function reverseViaPhoton(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  const res = await fetch(`${PHOTON_BASE}/reverse?lat=${lat}&lon=${lng}&lang=en`);
  if (!res.ok) throw new Error(`Photon reverse HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data.features) || data.features.length === 0) return null;

  const props = data.features[0].properties || {};
  const { city, province, address } = parsePhotonProps(props, '');
  return { address, city, province, name: props.name || undefined };
}

async function reverseViaNominatim(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  const params = new URLSearchParams({
    lat: lat.toString(), lon: lng.toString(),
    format: 'json', addressdetails: '1', zoom: '16',
  });
  const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`);
  if (!res.ok) throw new Error(`Nominatim reverse HTTP ${res.status}`);
  const data = await res.json();
  if (!data || data.error) return null;

  const addr = data.address || {};
  const { city, province, address } = parseNominatimAddr(addr, data.display_name);
  const name = data.name || addr.amenity || addr.shop || addr.tourism || addr.building || undefined;
  return { address, city, province, name };
}

/**
 * Reverse-geocodes lat/lng coordinates into address, city, and province.
 * Tries Photon first, falls back to Nominatim.
 */
export async function reversePhotonGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  if (!isWithinPH(lat, lng)) return null;

  try {
    return await reverseViaPhoton(lat, lng);
  } catch (photonErr) {
    console.warn('[Photon reverse unavailable, trying Nominatim]:', photonErr);
    try {
      return await reverseViaNominatim(lat, lng);
    } catch (nomErr) {
      console.error('[Reverse geocode failed on both services]:', nomErr);
      return null;
    }
  }
}
