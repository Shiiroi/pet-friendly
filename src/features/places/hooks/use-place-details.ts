import { useQuery } from '@tanstack/react-query';
import { getPlaceDetailsRecord } from '../api/get-place-details';

/**
 * TanStack Query hook to lazy-load detailed record information on demand when a user taps an individual place marker.
 */
export function usePlaceDetails(placeId: string | null | undefined) {
  return useQuery({
    queryKey: ['place-details', placeId],
    queryFn: () => (placeId ? getPlaceDetailsRecord(placeId) : null),
    enabled: !!placeId,
    staleTime: 1000 * 60 * 15, // Cache details for 15 minutes
  });
}
