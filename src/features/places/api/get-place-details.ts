import { supabase } from '../../../shared/api/supabase-client';

/**
 * Lazy-loads full detailed record information (reports, disputes, operating hours) for a specific place from Supabase on demand when clicked.
 */
export async function getPlaceDetailsRecord(placeId: string) {
  const { data, error } = await supabase
    .from('places')
    .select(`
      *,
      pet_policy_reports (*),
      place_disputes (*)
    `)
    .eq('id', placeId)
    .single();

  if (error) {
    console.error('[Supabase Error] Failed to fetch full place details record:', error);
    throw error;
  }

  return data;
}
