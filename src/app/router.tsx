import React, { useState, useEffect, useRef } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { Hero, BrowsableList, HowItWorks, FAQ } from '../features/home';
import { MapView } from '../features/map';
import { PlaceSearchBar, PlaceDetail, usePlacesInBounds } from '../features/places';
import { useReportsForPlace } from '../features/reports';
import { type PlaceInBounds, type MapBounds } from '../shared/types/geo';
import { theme } from '../shared/styles/theme';

/**
 * Main application dashboard containing sequential homepage sections:
 * Hero -> Directory Search/List -> MapView -> Explainer -> FAQ
 */
const HomePage: React.FC = () => {
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<PlaceInBounds | null>(null);
  const [ghostPlace, setGhostPlace] = useState<{ latitude: number; longitude: number; name: string; address: string } | null>(null);
  const [isGhostSelected, setIsGhostSelected] = useState(false);
  const [centerOverride, setCenterOverride] = useState<[number, number] | null>(null);
  const [userCoords, setUserCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const listRef = useRef<HTMLDivElement>(null);

  // Fetch pet-friendly locations within active viewport bounding box
  const { data: places = [] } = usePlacesInBounds(bounds);

  // Fetch policy reviews timeline if a database place card is selected
  const { 
    data: reports = [], 
    isLoading: isReportsLoading, 
    error: reportsError 
  } = useReportsForPlace(selectedPlace?.id || '');

  // Fetch user location coordinate pointers for proximity sorting
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => {
          console.warn('[Home Geolocation Disabled]:', err.message);
        }
      );
    }
  }, []);

  const handleSelectLocalPlace = (place: PlaceInBounds) => {
    setCenterOverride([place.latitude, place.longitude]);
    setSelectedPlace(place);
    setGhostPlace(null);
    setIsGhostSelected(false);
  };

  const handleSelectGeocodePlace = (lat: number, lng: number, name: string, address: string) => {
    setCenterOverride([lat, lng]);
    const ghost = { latitude: lat, longitude: lng, name, address };
    setGhostPlace(ghost);
    setIsGhostSelected(true);
    setSelectedPlace(null);
  };

  const handleSelectGhostPin = () => {
    setIsGhostSelected(true);
    setSelectedPlace(null);
  };

  const handleClosePanel = () => {
    setSelectedPlace(null);
    setGhostPlace(null);
    setIsGhostSelected(false);
  };

  const handleScrollToDirectory = () => {
    listRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ backgroundColor: theme.colors.background, minHeight: '100vh', overflowX: 'hidden' }}>
      {/* 1. Hero banner with aggregates */}
      <Hero onBrowseClick={handleScrollToDirectory} />

      {/* 2. Directory lists and map view envelope */}
      <div ref={listRef} style={{ maxWidth: '960px', margin: '0 auto', padding: '40px 24px 0 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 3. Map View Wrapper container */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '480px',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 8px 25px rgba(224, 122, 95, 0.08)',
              border: `3px solid ${theme.colors.softPink}`,
              boxSizing: 'border-box',
            }}
          >
            {/* Embedded interactive map */}
            <MapView
              places={places}
              onBoundsChange={setBounds}
              onSelectPlace={handleSelectLocalPlace}
              centerOverride={centerOverride}
              ghostPlace={ghostPlace}
              onSelectGhostPlace={handleSelectGhostPin}
            />

            {/* Input Overlay */}
            <PlaceSearchBar
              loadedPlaces={places}
              onSelectLocalPlace={handleSelectLocalPlace}
              onSelectGeocodePlace={handleSelectGeocodePlace}
            />

            {/* Details Panel Drawer overlay */}
            {(selectedPlace || (isGhostSelected && ghostPlace)) && (
              <PlaceDetail
                place={isGhostSelected ? ghostPlace! : selectedPlace!}
                isGhost={isGhostSelected}
                onClose={handleClosePanel}
                reports={reports}
                isLoading={isReportsLoading}
                error={reportsError}
              />
            )}
          </div>
        </div>
      </div>

      {/* Directory cards */}
      <BrowsableList
        places={places}
        onSelectPlace={handleSelectLocalPlace}
        userCoords={userCoords}
      />

      {/* 4. How It Works explainer */}
      <HowItWorks />

      {/* 5. FAQ accordions */}
      <FAQ />

      {/* TODO: Quezon city directory etc. is deferred to the next seed phases */}
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
]);
