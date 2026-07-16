import React, { useState, useEffect, useRef } from 'react';
import { theme } from '../../../shared/styles/theme';
import { searchGooglePlaces, type GeocodingResult } from '../api/search-google-places';
import type { PlaceInBounds } from '../../../shared/types/geo';

interface PlaceSearchBarProps {
  /** The list of places currently loaded in the map bounds for local filtering. */
  loadedPlaces: PlaceInBounds[];
  /** Callback triggered when a local pin is selected. */
  onSelectLocalPlace: (place: PlaceInBounds) => void;
  /** Callback triggered when an external location is selected to center the map. */
  onSelectGeocodePlace: (lat: number, lng: number, name: string, address: string) => void;
}

/**
 * Unified geocoding location and local pin text search bar.
 */
export const PlaceSearchBar: React.FC<PlaceSearchBarProps> = ({
  loadedPlaces,
  onSelectLocalPlace,
  onSelectGeocodePlace,
}) => {
  const [query, setQuery] = useState('');
  const [geocodeResults, setGeocodeResults] = useState<GeocodingResult[]>([]);
  const [localResults, setLocalResults] = useState<PlaceInBounds[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (query.trim().length < 3) {
      setGeocodeResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const results = await searchGooglePlaces(query);
        setGeocodeResults(results);
      } catch (err) {
        console.error('[Search Query Autocomplete Failed]:', err);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

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
    setIsOpen(false);
  };

  const handleSelectGeocode = (res: GeocodingResult) => {
    onSelectGeocodePlace(res.lat, res.lng, res.displayName, res.address);
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
