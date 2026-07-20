import { supabase } from '../../../shared/api/supabase-client';
import { type PlaceInBounds } from '../../../shared/types/geo';


/**
 * Queries pet-friendly places that lie within the specified geographic coordinates bounding box.
 * 
 * WHY WE FETCH UNCONFIRMED PLACES:
 * - We return all matching places regardless of their agreement counts (agreeing_devices).
 * - Low-confidence entries (agreeing_devices < 2) are not hidden but are returned to the client 
 *   to render visually muted. This maintains transparency about confidence without hiding contributions.
 * 
 * @param {number} minLat - Southern boundary.
 * @param {number} minLng - Western boundary.
 * @param {number} maxLat - Northern boundary.
 * @param {number} maxLng - Eastern boundary.
 * @returns {Promise<PlaceInBounds[]>} Array of places located in the bounding box.
 */
export async function getPlacesInBounds(
  minLat: number,
  minLng: number,
  maxLat: number,
  maxLng: number
): Promise<PlaceInBounds[]> {
  const { data, error } = await supabase.rpc('get_places_in_bounds', {
    min_lat: minLat,
    min_lng: minLng,
    max_lat: maxLat,
    max_lng: maxLng,
  });

  if (error) {
    console.error('[Supabase RPC Error] Failed to fetch places in bounds:', error);
    throw error;
  }

  return ((data as any) || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    address: row.address || '',
    city: row.city || null,
    latitude: row.latitude,
    longitude: row.longitude,
    category: row.category || '',
    status: row.status,
    claim: (row.claim as PlaceInBounds['claim']) || null,
    agreeing_devices: row.agreeing_devices,
    runner_up_claim: (row.runner_up_claim as PlaceInBounds['runner_up_claim']) || null,
    runner_up_agreeing_devices: row.runner_up_agreeing_devices || 0,
    pet_menu: (row.pet_menu as PlaceInBounds['pet_menu']) || null,
    pet_menu_agreeing_devices: row.pet_menu_agreeing_devices || 0,
    runner_up_pet_menu: (row.runner_up_pet_menu as PlaceInBounds['runner_up_pet_menu']) || null,
    pet_menu_runner_up_agreeing_devices: row.pet_menu_runner_up_agreeing_devices || 0,
    price_range: (row.price_range as PlaceInBounds['price_range']) || null,
    price_range_agreeing_devices: row.price_range_agreeing_devices || 0,
    runner_up_price_range: (row.runner_up_price_range as PlaceInBounds['runner_up_price_range']) || null,
    price_range_runner_up_agreeing_devices: row.price_range_runner_up_agreeing_devices || 0,
  }));
}
