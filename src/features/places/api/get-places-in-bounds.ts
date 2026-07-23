import { supabase } from '../../../shared/api/supabase-client';
import { type PlaceInBounds } from '../../../shared/types/geo';


/**
 * Queries pet-friendly places located within the specified bounding box coordinates.
 * 
 * Unconfirmed places rationale:
 * - Returns all matching places regardless of agreement count (`agreeing_devices`).
 * - Low-confidence entries (`agreeing_devices` < 2) render visually muted on the frontend to maintain transparency.
 * 
 * @param {number} minLat - Southern latitude boundary.
 * @param {number} minLng - Western longitude boundary.
 * @param {number} maxLat - Northern latitude boundary.
 * @param {number} maxLng - Eastern longitude boundary.
 * @returns {Promise<PlaceInBounds[]>} Places located within the specified bounding box.
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
    categories: row.categories || [],
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
