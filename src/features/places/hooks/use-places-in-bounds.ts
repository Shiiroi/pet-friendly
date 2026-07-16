import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPlacesInBounds } from '../api/get-places-in-bounds';
import { type MapBounds, type PlaceInBounds } from '../../../shared/types/geo';

/**
 * Custom hook wrapping TanStack useQuery to fetch pet-friendly places in map bounds.
 * 
 * WHY WE DEBOUNCE AND ROUND BOUNDS:
 * - Panning or zooming generates highly frequent coordinate updates down to tiny decimals.
 * - If we query on every minor movement, we'd trigger a massive number of network requests and
 *   destroy cache hits.
 * - We round coordinates to 4 decimal places (~11m resolution) to group nearby pans.
 * - We debounce the state update by 500ms so that requests only fire once the user stops panning.
 * 
 * @param {MapBounds | null} bounds - The active map coordinates bounds.
 * @returns React Query result containing places array and query state.
 */
export function usePlacesInBounds(bounds: MapBounds | null) {
  const [debouncedBounds, setDebouncedBounds] = useState<MapBounds | null>(null);

  useEffect(() => {
    if (!bounds) return;

    // Round bounds to 4 decimal places to reduce minor coordinate cache key churn
    const rounded: MapBounds = {
      minLat: Math.round(bounds.minLat * 10000) / 10000,
      minLng: Math.round(bounds.minLng * 10000) / 10000,
      maxLat: Math.round(bounds.maxLat * 10000) / 10000,
      maxLng: Math.round(bounds.maxLng * 10000) / 10000,
    };

    // Update debounced bounds after 500ms delay of no movements
    const handler = setTimeout(() => {
      setDebouncedBounds((prev) => {
        if (
          prev &&
          prev.minLat === rounded.minLat &&
          prev.minLng === rounded.minLng &&
          prev.maxLat === rounded.maxLat &&
          prev.maxLng === rounded.maxLng
        ) {
          return prev;
        }
        return rounded;
      });
    }, 500);

    return () => {
      clearTimeout(handler);
    };
  }, [bounds?.minLat, bounds?.minLng, bounds?.maxLat, bounds?.maxLng]);

  return useQuery<PlaceInBounds[]>({
    queryKey: ['places-in-bounds', debouncedBounds],
    queryFn: () => {
      if (!debouncedBounds) return [];
      return getPlacesInBounds(
        debouncedBounds.minLat,
        debouncedBounds.minLng,
        debouncedBounds.maxLat,
        debouncedBounds.maxLng
      );
    },
    enabled: !!debouncedBounds,
    placeholderData: (previousData) => previousData,
  });
}
