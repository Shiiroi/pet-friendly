import { useQuery } from '@tanstack/react-query';
import { getAllPlaces } from '../api/get-all-places';
import type { PlaceInBounds } from '../../../shared/types/geo';

/**
 * TanStack Query hook that fetches all basic marker locations once on initial load
 * and caches them indefinitely in client memory. Pan and zoom events use this memory cache.
 */
export function useAllPlaces() {
  return useQuery<PlaceInBounds[]>({
    queryKey: ['all-places'],
    queryFn: getAllPlaces,
    staleTime: Infinity, // Keep cached indefinitely in client memory
    gcTime: 1000 * 60 * 60 * 24, // Retain cache for 24 hours
  });
}
