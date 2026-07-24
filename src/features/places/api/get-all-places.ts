import { supabase } from '../../../shared/api/supabase-client';
import type { PlaceInBounds } from '../../../shared/types/geo';

/**
 * Queries all pet-friendly places once from Supabase for client-side memory caching & Supercluster.
 */
export async function getAllPlaces(): Promise<PlaceInBounds[]> {
  const { data, error } = await supabase.rpc('get_places_in_bounds', {
    min_lat: -90,
    min_lng: -180,
    max_lat: 90,
    max_lng: 180,
  });

  if (error) {
    console.error('[Supabase RPC Error] Failed to fetch all places:', error);
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
    operating_hours: row.operating_hours || null,
    pet_menu_details: row.pet_menu_details || null,
    menu_photos: row.menu_photos || [],
  }));
}
