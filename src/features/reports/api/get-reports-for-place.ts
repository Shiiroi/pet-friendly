import { supabase } from '../../../shared/api/supabase-client';
import { type ReportItem } from '../../../shared/types/geo';

/**
 * Fetches historical policy reports submitted for a specific place.
 * 
 * WHY WE QUERY DIRECTLY:
 * We pull raw historical reports from `pet_policy_reports` to build the place detail timeline,
 * showing notes and submit dates, while the parent place maps the pre-calculated consensus summary.
 * 
 * @param {string} placeId - The place UUID.
 * @returns {Promise<ReportItem[]>} Array of reports sorted from newest to oldest.
 */
export async function getReportsForPlace(placeId: string): Promise<ReportItem[]> {
  const { data, error } = await supabase
    .from('pet_policy_reports')
    .select('claim, notes, created_at, device_id, devices(nickname)')
    .eq('place_id', placeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase Error] Failed to fetch reports for place:', error);
    throw error;
  }

  return (data || []).map((row: any) => ({
    claim: row.claim,
    notes: row.notes,
    created_at: row.created_at,
    device_id: row.device_id,
    nickname: row.devices?.nickname || null,
  }));
}
