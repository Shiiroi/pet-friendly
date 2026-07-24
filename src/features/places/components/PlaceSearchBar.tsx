import React, { useState, useEffect, useRef } from 'react';
import { theme } from '../../../shared/styles/theme';
import { searchPhotonPlaces, type PhotonPlaceResult } from '../api/search-photon-places';
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
  /** Callback to trigger manual pin drop mode */
  onStartPinDrop?: (queryHint?: string) => void;
  /** Optional custom container style overrides (e.g. for form modals). */
  containerStyle?: React.CSSProperties;
}

/**
 * Unified open-source OSM geocoding location and local pin text search bar.
 */
export const PlaceSearchBar: React.FC<PlaceSearchBarProps> = ({
  loadedPlaces,
  onSelectLocalPlace,
  onSelectGeocodePlace,
  onStartPinDrop,
  containerStyle,
}) => {
  const [query, setQuery] = useState('');
  const [geocodeResults, setGeocodeResults] = useState<PhotonPlaceResult[]>([]);
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

  // Photon OSM Geocoder lookup with 300ms debounce
  useEffect(() => {
    if (query.trim().length < 2) {
      setGeocodeResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const results = await searchPhotonPlaces(query);
        setGeocodeResults(results);
      } catch (err) {
        console.error('[Photon Autocomplete Search Failed]:', err);
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
    setIsOpen(false);
  };

  const handleSelectGeocode = (res: PhotonPlaceResult) => {
    setQuery(res.name);
    setIsOpen(false);
    onSelectGeocodePlace(res.lat, res.lng, res.name, res.address, null, res.city, res.province);
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
                  <div style={{ fontWeight: 600 }}>{res.name}</div>
                  <div style={{ fontSize: '11px', color: theme.colors.textMuted }}>{res.address}</div>
                </button>
              ))}
            </div>
          )}

          {/* Affordance: Can't find your spot? Drop a pin on map */}
          {onStartPinDrop && (
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onStartPinDrop(query);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#fffcfb',
                border: 'none',
                borderTop: `1px dashed ${theme.colors.terracotta}`,
                color: theme.colors.terracotta,
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              Can&apos;t find your spot? 📍 Drop a pin on map
            </button>
          )}

          {localResults.length === 0 && geocodeResults.length === 0 && !onStartPinDrop && (
            <div style={{ padding: '16px', fontSize: '13px', color: theme.colors.textMuted, textAlign: 'center' }}>
              No furbaby spots found
            </div>
          )}
        </div>
      )}
    </div>
  );
};
