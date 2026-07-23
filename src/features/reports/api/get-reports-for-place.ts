import { supabase } from '../../../shared/api/supabase-client';
import { type ReportItem } from '../../../shared/types/geo';

/**
 * Fetches historical policy reports submitted for a specific place.
 * 
 * Queries raw reports from pet_policy_reports to build the detail timeline.
 * 
 * @param {string} placeId - The place UUID.
 * @returns {Promise<ReportItem[]>} Array of reports sorted from newest to oldest.
 */
export async function getReportsForPlace(placeId: string): Promise<ReportItem[]> {
  const { data, error } = await supabase
    .from('pet_policy_reports')
    .select('claim, pet_menu, price_range, notes, created_at, device_id, devices(nickname)')
    .eq('place_id', placeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase Error] Failed to fetch reports for place:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    claim: row.claim,
    pet_menu: row.pet_menu,
    price_range: row.price_range,
    notes: row.notes,
    created_at: row.created_at,
    device_id: row.device_id,
    nickname: row.devices?.nickname || null,
  }));
}
