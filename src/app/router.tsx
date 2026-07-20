import React, { useState, useEffect, useRef } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../shared/api/supabase-client';
import { getDeviceId } from '../shared/utils/device-id';
import { Hero, BrowsableList, HowItWorks, FAQ } from '../features/home';
import { MapView } from '../features/map';
import { 
  PlaceSearchBar, 
  PlaceDetail, 
  usePlacesInBounds, 
  loadGoogleMapsScript,
  AddPlaceForm
} from '../features/places';
import { useReportsForPlace, ReportForm, FlagButton } from '../features/reports';
import { NicknamePrompt } from '../features/devices';
import { useOutboxSync } from '../shared/outbox/use-outbox-sync';
import { type PlaceInBounds, type MapBounds } from '../shared/types/geo';
import { theme } from '../shared/styles/theme';
import { env } from '../config/env';

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
  const [userCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Form rendering states
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [reportingPlace, setReportingPlace] = useState<PlaceInBounds | null>(null);
  const [flaggingPlace, setFlaggingPlace] = useState<PlaceInBounds | null>(null);
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(false);

  const queryClient = useQueryClient();
  const listRef = useRef<HTMLDivElement>(null);

  // Synchronize outbox queue from IndexedDB to remote Supabase database on network recovery
  const { syncStatus } = useOutboxSync();

  // Fetch pet-friendly locations within active viewport bounding box
  const { data: places = [] } = usePlacesInBounds(bounds);

  // Fetch policy reviews timeline if a database place card is selected
  const { 
    data: reports = [], 
    isLoading: isReportsLoading, 
    error: reportsError 
  } = useReportsForPlace(selectedPlace?.id || '');

  // Initialize the Google Maps SDK script dynamically on mount
  useEffect(() => {
    if (env.VITE_GOOGLE_PLACES_API_KEY) {
      loadGoogleMapsScript(env.VITE_GOOGLE_PLACES_API_KEY).catch((err) => {
        console.error('[Google Maps SDK Load Failed]:', err);
      });
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

  const handleFormSuccess = () => {
    // Invalidate cached query keys to trigger automatic viewport markers reload
    queryClient.invalidateQueries({ queryKey: ['places-in-bounds'] });
    queryClient.invalidateQueries({ queryKey: ['reports-for-place'] });
    queryClient.invalidateQueries({ queryKey: ['home-stats'] });
    setGhostPlace(null);
  };

  const handleNicknameSubmit = async (nickname: string) => {
    try {
      const { error } = await supabase
        .from('devices')
        .update({ nickname })
        .eq('device_id', getDeviceId());

      if (error) throw error;
      localStorage.setItem('compaws_nickname', nickname);
      localStorage.setItem('nickname_prompted', 'true');
    } catch (err) {
      console.error('[Nickname Update Failed]:', err);
    }
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
              hideExplainer={!!selectedPlace || isAddingPlace}
            />

            {/* Input Overlay */}
            <PlaceSearchBar
              loadedPlaces={places}
              onSelectLocalPlace={handleSelectLocalPlace}
              onSelectGeocodePlace={handleSelectGeocodePlace}
            />

            {/* Details Panel Drawer overlay */}
            {selectedPlace && !isGhostSelected && !isAddingPlace && !reportingPlace && !flaggingPlace && (
              <PlaceDetail
                place={selectedPlace}
                isGhost={false}
                onClose={handleClosePanel}
                reports={reports}
                isLoading={isReportsLoading}
                error={reportsError}
                onReportClick={() => setReportingPlace(selectedPlace)}
                onFlagClick={() => setFlaggingPlace(selectedPlace)}
              />
            )}

            {/* Ghost Detail panel redirecting to Add Form */}
            {isGhostSelected && ghostPlace && !isAddingPlace && (
              <PlaceDetail
                place={ghostPlace}
                isGhost={true}
                onClose={handleClosePanel}
                reports={[]}
                isLoading={false}
                error={null}
                onAddPlaceClick={() => {
                  setIsAddingPlace(true);
                  setIsGhostSelected(false);
                }}
              />
            )}

            {/* Add New Place Form Overlay panel */}
            {isAddingPlace && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  zIndex: 1100,
                  overflowY: 'auto',
                  padding: '20px',
                  boxSizing: 'border-box',
                }}
              >
                <AddPlaceForm
                  initialPlace={ghostPlace}
                  onClose={() => {
                    setIsAddingPlace(false);
                    setGhostPlace(null);
                  }}
                  onSuccess={handleFormSuccess}
                  onTriggerNicknamePrompt={() => setShowNicknamePrompt(true)}
                />
              </div>
            )}

            {/* Report existing Spot Form Overlay panel */}
            {reportingPlace && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  zIndex: 1100,
                  overflowY: 'auto',
                  padding: '20px',
                  boxSizing: 'border-box',
                }}
              >
                <ReportForm
                  place={reportingPlace}
                  onClose={() => setReportingPlace(null)}
                  onSuccess={handleFormSuccess}
                  onTriggerNicknamePrompt={() => setShowNicknamePrompt(true)}
                />
              </div>
            )}

            {/* Flag spot overlay panel */}
            {flaggingPlace && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  zIndex: 1100,
                  overflowY: 'auto',
                  padding: '20px',
                  boxSizing: 'border-box',
                }}
              >
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', color: '#ef4444' }}>
                  Flag Spot: {flaggingPlace.name}
                </h3>
                <FlagButton
                  place={flaggingPlace}
                  onSuccess={() => {
                    setFlaggingPlace(null);
                    handleFormSuccess();
                  }}
                  onTriggerNicknamePrompt={() => setShowNicknamePrompt(true)}
                />
                <button
                  onClick={() => setFlaggingPlace(null)}
                  style={{
                    width: '100%',
                    marginTop: '16px',
                    padding: '10px',
                    backgroundColor: '#f3f4f6',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  Cancel Flag Action
                </button>
              </div>
            )}

            {/* Toggle add place button overlay */}
            {!isAddingPlace && !reportingPlace && !flaggingPlace && !selectedPlace && !isGhostSelected && (
              <button
                onClick={() => {
                  setIsAddingPlace(true);
                  handleClosePanel();
                }}
                style={{
                  position: 'absolute',
                  bottom: '24px',
                  right: '24px',
                  backgroundColor: theme.colors.terracotta,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '10px 20px',
                  fontWeight: 700,
                  fontSize: '13px',
                  zIndex: 1000,
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(224, 122, 95, 0.3)',
                }}
              >
                Add a New Spot 🐾
              </button>
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

      {/* Nickname prompting dialog overlay */}
      <NicknamePrompt
        isOpen={showNicknamePrompt}
        onClose={() => setShowNicknamePrompt(false)}
        onSubmitNickname={handleNicknameSubmit}
      />

      {/* 6. Sync status toast indicator */}
      {syncStatus && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: theme.colors.terracotta,
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '50px',
            boxShadow: '0 8px 20px rgba(224, 122, 95, 0.3)',
            zIndex: 3000,
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: theme.fonts.body,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>{syncStatus}</span>
        </div>
      )}

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
