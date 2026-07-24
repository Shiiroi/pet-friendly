import React, { useState, useEffect, useRef } from 'react';
import { theme } from '../../../shared/styles/theme';
import { 
  searchGooglePlaces, 
  getPlaceDetails, 
  type GeocodingResult 
} from '../api/search-google-places';
import type { PlaceInBounds } from '../../../shared/types/geo';

import type { WeeklyOperatingHours } from '../types/hours';

interface PlaceSearchBarProps {
  /** The list of places currently loaded in the map bounds for local filtering. */
  loadedPlaces: PlaceInBounds[];
  /** Callback triggered when a local pin is selected. */
  onSelectLocalPlace: (place: PlaceInBounds) => void;
  /** Callback triggered when an external location is selected to center the map. */
  onSelectGeocodePlace: (
    lat: number,
    lng: number,
    name: string,
    address: string,
    openingHours?: WeeklyOperatingHours | null,
    city?: string,
    province?: string
  ) => void;
  /** Optional custom container style overrides (e.g. for form modals). */
  containerStyle?: React.CSSProperties;
}

/**
 * Unified geocoding location and local pin text search bar.
 */
export const PlaceSearchBar: React.FC<PlaceSearchBarProps> = ({
  loadedPlaces,
  onSelectLocalPlace,
  onSelectGeocodePlace,
  containerStyle,
}) => {
  const [query, setQuery] = useState('');
  const [geocodeResults, setGeocodeResults] = useState<GeocodingResult[]>([]);
  const [localResults, setLocalResults] = useState<PlaceInBounds[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  // Reference holding the current typing session token
  const sessionTokenRef = useRef<any>(null);

  useEffect(() => {
    if (!query.trim()) {
      setLocalResults([]);
      return;
    }
    const filtered = loadedPlaces.filter((p) =>
      p.name.toLowerCase().includes(query.toLowerCase())
    );
    setLocalResults(filtered);
  }, [query, loadedPlaces]);

  // Geocoder autocomplete lookup with session token synchronization
  useEffect(() => {
    if (query.trim().length < 3) {
      setGeocodeResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        // Instantiate a new session token when user typing session starts
        if (!sessionTokenRef.current && typeof window !== 'undefined' && (window as any).google?.maps) {
          const { AutocompleteSessionToken } = await (window as any).google.maps.importLibrary("places");
          sessionTokenRef.current = new AutocompleteSessionToken();
        }

        const results = await searchGooglePlaces(query, sessionTokenRef.current);
        setGeocodeResults(results);
      } catch (err) {
        console.error('[Search Query Autocomplete Failed]:', err);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLocal = (place: PlaceInBounds) => {
    onSelectLocalPlace(place);
    setQuery(place.name);
    // Reset active session token
    sessionTokenRef.current = null;
    setIsOpen(false);
  };

  const handleSelectGeocode = async (res: GeocodingResult) => {
    let lat = res.lat;
    let lng = res.lng;
    let openingHours: WeeklyOperatingHours | null | undefined = null;
    let city: string | undefined;
    let province: string | undefined;

    // If it's a Google prediction, lazy-resolve coordinates and details upon click
    if (lat === undefined || lng === undefined) {
      const coords = await getPlaceDetails(res.id, sessionTokenRef.current);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
        openingHours = coords.openingHours;
        city = coords.city;
        province = coords.province;
      }
    }

    // Reset the session token, terminating the current session naturally
    sessionTokenRef.current = null;

    if (lat !== undefined && lng !== undefined) {
      // Duplicate Safeguard: Check if place already exists in loaded places
      const existingMatch = loadedPlaces.find((p) => {
        const normSearchName = res.displayName.trim().toLowerCase();
        const normPlaceName = p.name.trim().toLowerCase();
        const isNameMatch = normSearchName.includes(normPlaceName) || normPlaceName.includes(normSearchName);
        const dist = Math.hypot(lat! - p.latitude, lng! - p.longitude);
        return (isNameMatch && dist < 0.001) || dist < 0.0003;
      });

      if (existingMatch) {
        handleSelectLocal(existingMatch);
        return;
      }

      onSelectGeocodePlace(lat, lng, res.displayName, res.address, openingHours, city, province);
    }
    setQuery(res.displayName);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 48px)',
        maxWidth: '480px',
        zIndex: 1000,
        fontFamily: theme.fonts.body,
        ...containerStyle,
      }}
    >
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Search café, mall, city, or address... 🐾"
        style={{
          width: '100%',
          padding: '14px 20px',
          fontSize: '15px',
          border: `2px solid ${theme.colors.softPink}`,
          borderRadius: '24px',
          boxShadow: '0 8px 24px rgba(224, 122, 95, 0.12)',
          backgroundColor: '#ffffff',
          color: theme.colors.textDark,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {isOpen && query.trim().length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '56px',
            left: 0,
            right: 0,
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            maxHeight: '320px',
            overflowY: 'auto',
            border: `1px solid ${theme.colors.borderLight}`,
          }}
        >
          {localResults.length > 0 && (
            <div>
              <div
                style={{
                  padding: '8px 16px',
                  backgroundColor: theme.colors.softPink,
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: theme.colors.terracotta,
                  letterSpacing: '0.5px',
                  fontFamily: theme.fonts.heading,
                }}
              >
                Pins on Map
              </div>
              {localResults.map((place) => (
                <button
                  key={place.id}
                  onClick={() => handleSelectLocal(place)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${theme.colors.borderLight}`,
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: theme.colors.textDark,
                    display: 'block',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{place.name}</div>
                  <div style={{ fontSize: '11px', color: theme.colors.textMuted }}>{place.address}</div>
                </button>
              ))}
            </div>
          )}

          {geocodeResults.length > 0 && (
            <div>
              <div
                style={{
                  padding: '8px 16px',
                  backgroundColor: theme.colors.softPink,
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  color: theme.colors.terracotta,
                  letterSpacing: '0.5px',
                  fontFamily: theme.fonts.heading,
                }}
              >
                Search Locations
              </div>
              {geocodeResults.map((res) => (
                <button
                  key={res.id}
                  onClick={() => handleSelectGeocode(res)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderBottom: `1px solid ${theme.colors.borderLight}`,
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: theme.colors.textDark,
                    display: 'block',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{res.displayName}</div>
                  <div style={{ fontSize: '11px', color: theme.colors.textMuted }}>{res.address}</div>
                </button>
              ))}
            </div>
          )}

          {localResults.length === 0 && geocodeResults.length === 0 && (
            <div style={{ padding: '16px', fontSize: '13px', color: theme.colors.textMuted, textAlign: 'center' }}>
              No furbaby spots found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
