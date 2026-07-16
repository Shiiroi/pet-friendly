import { useQuery } from '@tanstack/react-query';
import { getReportsForPlace } from '../api/get-reports-for-place';
import { type ReportItem } from '../../../shared/types/geo';

/**
 * React Query hook to fetch and cache historical reports for a place.
 * 
 * @param {string} placeId - The place UUID.
 * @returns React Query query result.
 */
export function useReportsForPlace(placeId: string) {
  return useQuery<ReportItem[]>({
    queryKey: ['reports-for-place', placeId],
    queryFn: () => getReportsForPlace(placeId),
    enabled: !!placeId,
  });
}
