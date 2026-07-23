import React, { useState, useEffect } from 'react';
import { theme } from '../../../shared/styles/theme';
import type { PlaceInBounds } from '../../../shared/types/geo';

interface BrowsableListProps {
  /** Places currently loaded on the screen or in map bounds. */
  places: PlaceInBounds[];
  /** Callback triggered when a place card is clicked. */
  onSelectPlace: (place: PlaceInBounds) => void;
  /** Users active geolocation coordinates for distance calculations. */
  userCoords: { latitude: number; longitude: number } | null;
}

/**
 * Renders a browsable, filterable, and sortable directory list of places.
 */
export const BrowsableList: React.FC<BrowsableListProps> = ({
  places,
  onSelectPlace,
  userCoords,
}) => {
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState<'most_confirmed' | 'nearest'>('most_confirmed');

  // Automatically fall back to sorting by most confirmed if userCoords disappears
  useEffect(() => {
    if (!userCoords && sortBy === 'nearest') {
      setSortBy('most_confirmed');
    }
  }, [userCoords, sortBy]);

  // Compute unique filter lists from active bounds dataset
  const cities = Array.from(new Set(places.map((p) => p.city).filter(Boolean))) as string[];
  const categories = Array.from(new Set(places.flatMap((p) => p.categories || []).filter(Boolean))) as string[];

  /**
   * Helper utilizing the Haversine formula to compute geodesic distance in kilometers.
   */
  const getDistance = (place: PlaceInBounds) => {
    if (!userCoords) return Infinity;
    const R = 6371; // Earth radius in km
    const dLat = ((place.latitude - userCoords.latitude) * Math.PI) / 180;
    const dLng = ((place.longitude - userCoords.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userCoords.latitude * Math.PI) / 180) *
        Math.cos((place.latitude * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const filtered = places.filter((p) => {
    const cityMatch = !selectedCity || p.city === selectedCity;
    const catMatch = !selectedCategory || (p.categories && p.categories.includes(selectedCategory));
    return cityMatch && catMatch;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'nearest' && userCoords) {
      return getDistance(a) - getDistance(b);
    }
    return b.agreeing_devices - a.agreeing_devices;
  });

  const claimLabels: Record<string, string> = {
    allowed: 'Allowed',
    not_allowed: 'Not Allowed',
    outdoor_only: 'Outdoor Only',
  };

  const claimColors: Record<string, string> = {
    allowed: theme.colors.allowed,
    not_allowed: theme.colors.notAllowed,
    outdoor_only: theme.colors.outdoorOnly,
  };

  return (
    <div
      style={{
        padding: '60px 24px',
        backgroundColor: theme.colors.background,
        fontFamily: theme.fonts.body,
        color: theme.colors.textDark,
      }}
    >
      <div style={{ maxWidth: '960px', margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: theme.fonts.heading,
            fontSize: '28px',
            color: theme.colors.terracotta,
            margin: '0 0 24px 0',
          }}
        >
          Explore Pet-Friendly Places 🐾
        </h2>

        {/* Filters and Sorting Selection controls bar */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '32px',
            backgroundColor: '#ffffff',
            padding: '16px',
            borderRadius: '16px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: theme.colors.textMuted, marginBottom: '6px' }}>
              Filter by City
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: `1px solid ${theme.colors.borderLight}`,
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: theme.colors.textMuted, marginBottom: '6px' }}>
              Filter by Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: `1px solid ${theme.colors.borderLight}`,
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: theme.colors.textMuted, marginBottom: '6px' }}>
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '8px',
                border: `1px solid ${theme.colors.borderLight}`,
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="most_confirmed">Most Confirmed</option>
              {userCoords && <option value="nearest">Nearest</option>}
            </select>
          </div>
        </div>

        {/* Results grid */}
        {sorted.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.02)',
              border: `1px solid ${theme.colors.borderLight}`,
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🐶</div>
            <h3 style={{ fontFamily: theme.fonts.heading, fontSize: '20px', color: theme.colors.terracotta, margin: '0 0 8px 0' }}>
              No places found
            </h3>
            <p style={{ color: theme.colors.textMuted, fontSize: '14px', margin: 0 }}>
              Try panning the map or adjusting the filters.
            </p>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '24px',
            }}
          >
            {sorted.map((place) => {
              const dist = getDistance(place);
              const isConfirmed = place.agreeing_devices >= 2 && place.claim !== null;
              
              return (
                <div
                  key={place.id}
                  onClick={() => onSelectPlace(place)}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    border: `1px solid ${theme.colors.borderLight}`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(224, 122, 95, 0.1)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.03)';
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {place.categories && place.categories.length > 0 ? (
                          place.categories.map((cat) => (
                            <span
                              key={cat}
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                backgroundColor: theme.colors.softPink,
                                color: theme.colors.terracotta,
                                padding: '2px 8px',
                                borderRadius: '4px',
                              }}
                            >
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              backgroundColor: theme.colors.softPink,
                              color: theme.colors.terracotta,
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            General
                          </span>
                        )}
                      </div>
                      {userCoords && dist !== Infinity && (
                        <span style={{ fontSize: '11px', color: theme.colors.textMuted }}>
                          {dist.toFixed(1)} km away
                        </span>
                      )}
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px 0', color: theme.colors.textDark }}>
                      {place.name}
                    </h3>
                    <p style={{ fontSize: '12px', color: theme.colors.textMuted, margin: '0 0 16px 0' }}>
                      {place.address}
                    </p>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${theme.colors.borderLight}`, paddingTop: '12px', marginTop: '12px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: place.claim ? claimColors[place.claim] : '#9ca3af',
                      }}
                    >
                      {place.claim ? claimLabels[place.claim] : 'Unreported'}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        color: isConfirmed ? '#059669' : '#b45309',
                        backgroundColor: isConfirmed ? '#ecfdf5' : '#fffbeb',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 500,
                      }}
                    >
                      {isConfirmed ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
