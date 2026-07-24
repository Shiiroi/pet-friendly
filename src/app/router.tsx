import React, { useState, useRef } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { FaFlag } from 'react-icons/fa';
import { supabase } from '../shared/api/supabase-client';
import { getDeviceId } from '../shared/utils/device-id';
import { Hero, BrowsableList, HowItWorks, FAQ } from '../features/home';
import { MapView } from '../features/map';
import { 
  PlaceSearchBar, 
  PlaceDetail, 
  useAllPlaces,
  usePlaceDetails,
  reversePhotonGeocode,
  type ReverseGeocodeResult,
} from '../features/places';
import { PinDropFormPanel } from '../features/places/components/PinDropFormPanel';
import { PlaceAddedModal } from '../features/places/components/PlaceAddedModal';
import { useReportsForPlace, ReportForm, FlagButton } from '../features/reports';
import { NicknamePrompt } from '../features/devices';
import { useOutboxSync } from '../shared/outbox/use-outbox-sync';
import { type PlaceInBounds } from '../shared/types/geo';
import { theme } from '../shared/styles/theme';

const HomePage: React.FC = () => {
  const [selectedPlace, setSelectedPlace] = useState<PlaceInBounds | null>(null);
  const [ghostPlace, setGhostPlace] = useState<{ latitude: number; longitude: number; name: string; address: string } | null>(null);
  const [isGhostSelected, setIsGhostSelected] = useState(false);
  const [centerOverride, setCenterOverride] = useState<[number, number] | null>(null);
  const [userCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Grab / Angkas / FoodPanda style Pin Drop Mode states
  const [isPinDropActive, setIsPinDropActive] = useState(false);
  const [pinDropCenter, setPinDropCenter] = useState<{ lat: number; lng: number }>({ lat: 14.5995, lng: 120.9842 });
  const [pinDropSourceHint, setPinDropSourceHint] = useState<'search' | 'pin_drop'>('pin_drop');
  const [pinDropQueryName, setPinDropQueryName] = useState('');
  const [reverseGeocodeResult, setReverseGeocodeResult] = useState<ReverseGeocodeResult | null>(null);
  const [isReverseLoading, setIsReverseLoading] = useState(false);
  const [isPinSubmitting, setIsPinSubmitting] = useState(false);

  // Form rendering states
  const [reportingPlace, setReportingPlace] = useState<PlaceInBounds | null>(null);
  const [flaggingPlace, setFlaggingPlace] = useState<PlaceInBounds | null>(null);
  const [showNicknamePrompt, setShowNicknamePrompt] = useState(false);
  const [placeAdded, setPlaceAdded] = useState<{ id: string; name: string; hours?: any } | null>(null);

  const queryClient = useQueryClient();
  const listRef = useRef<HTMLDivElement>(null);

  // Synchronize outbox queue from IndexedDB to remote Supabase database on network recovery
  const { syncStatus } = useOutboxSync();

  // Client-side memory dataset (TanStack Query): Fetches once on initial load, zero Supabase API calls on pan/zoom
  const { data: places = [] } = useAllPlaces();

  // Lazy-load full place details record from Supabase on demand when an individual place is selected
  usePlaceDetails(selectedPlace?.id);

  // Fetch policy reviews timeline if a database place card is selected
  const { 
    data: reports = [], 
    isLoading: isReportsLoading, 
    error: reportsError 
  } = useReportsForPlace(selectedPlace?.id || '');


  const handleSelectLocalPlace = (place: PlaceInBounds) => {
    setCenterOverride([place.latitude, place.longitude]);
    setSelectedPlace(place);
    setGhostPlace(null);
    setIsGhostSelected(false);
  };

  const triggerReverseGeocode = async (lat: number, lng: number) => {
    setIsReverseLoading(true);
    try {
      const res = await reversePhotonGeocode(lat, lng);
      if (res) {
        setReverseGeocodeResult(res);
      }
    } catch (err) {
      console.error('[Reverse Geocode Failed]:', err);
    } finally {
      setIsReverseLoading(false);
    }
  };

  const handleSelectGeocodePlace = (
    lat: number,
    lng: number,
    name: string,
    address: string,
    _openingHours?: any,
    city?: string,
    province?: string
  ) => {
    setCenterOverride([lat, lng]);
    setPinDropCenter({ lat, lng });
    setPinDropSourceHint('search');
    setPinDropQueryName(name);
    setReverseGeocodeResult({
      address: address || `${name}, ${city || ''}`,
      city: city || '',
      province: province || 'Metro Manila',
      name,
    });
    setIsPinDropActive(true);
    setSelectedPlace(null);
    setGhostPlace(null);
  };

  const handleStartPinDrop = (queryHint?: string) => {
    setIsPinDropActive(true);
    setPinDropSourceHint('pin_drop');
    setPinDropQueryName(queryHint || '');
    setSelectedPlace(null);
    setGhostPlace(null);
    triggerReverseGeocode(pinDropCenter.lat, pinDropCenter.lng);
  };

  const handleCenterPinMove = (lat: number, lng: number) => {
    setPinDropCenter({ lat, lng });
    triggerReverseGeocode(lat, lng);
  };

  const handleCancelPinDrop = () => {
    setIsPinDropActive(false);
    setReverseGeocodeResult(null);
    setPinDropQueryName('');
  };

  const handleConfirmPinDrop = async (data: {
    name: string;
    address: string;
    city: string;
    province: string;
    categories: string[];
    claim: 'allowed' | 'outdoor_only';
    priceRange: 'budget' | 'mid' | 'splurge';
    lat: number;
    lng: number;
  }) => {
    setIsPinSubmitting(true);
    try {
      const { data: newPlaceId, error } = await supabase.rpc('create_place_with_report', {
        p_name: data.name,
        p_address: data.address,
        p_city: data.city,
        p_province: data.province,
        p_categories: data.categories,
        p_latitude: data.lat,
        p_longitude: data.lng,
        p_device_id: getDeviceId(),
        p_claim: data.claim,
        p_pet_menu: 'not_sure',
        p_price_range: data.priceRange,
        p_notes: '',
        p_operating_hours: null,
      });

      if (error) throw error;
      if (!newPlaceId) throw new Error('Transaction returned empty response.');

      handleFormSuccess();

      const prompted = localStorage.getItem('nickname_prompted');
      if (!prompted) setShowNicknamePrompt(true);

      setPlaceAdded({ id: newPlaceId, name: data.name });
      setIsPinDropActive(false);
    } catch (err: any) {
      console.error('[Create Place Failed]:', err);
      alert(err.message || 'Failed to save spot. Please try again.');
    } finally {
      setIsPinSubmitting(false);
    }
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
    queryClient.invalidateQueries({ queryKey: ['all-places'] });
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
              onBoundsChange={() => {}}
              onSelectPlace={handleSelectLocalPlace}
              centerOverride={centerOverride}
              ghostPlace={ghostPlace}
              onSelectGhostPlace={handleSelectGhostPin}
              hideExplainer={!!selectedPlace || isPinDropActive}
              isPinDropActive={isPinDropActive}
              onCenterPinMove={handleCenterPinMove}
            />

            {/* Input Overlay */}
            <PlaceSearchBar
              loadedPlaces={places}
              onSelectLocalPlace={handleSelectLocalPlace}
              onSelectGeocodePlace={handleSelectGeocodePlace}
              onStartPinDrop={handleStartPinDrop}
            />

            {/* Details Panel Drawer overlay */}
            {selectedPlace && !isGhostSelected && !isPinDropActive && !reportingPlace && !flaggingPlace && (
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
                <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 800, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px', fontFamily: theme.fonts.heading }}>
                  <FaFlag size={16} /> Report Place: {flaggingPlace.name}
                </h3>
                <FlagButton
                  place={flaggingPlace}
                  initialOpen={true}
                  onClose={() => setFlaggingPlace(null)}
                  onSuccess={() => {
                    setFlaggingPlace(null);
                    handleFormSuccess();
                  }}
                  onTriggerNicknamePrompt={() => setShowNicknamePrompt(true)}
                />
              </div>
            )}

            {/* Toggle add place button overlay */}
            {!isPinDropActive && !reportingPlace && !flaggingPlace && !selectedPlace && !isGhostSelected && (
              <button
                onClick={() => {
                  handleClosePanel();
                  handleStartPinDrop();
                }}
                style={{
                  position: 'absolute',
                  bottom: '24px',
                  right: '24px',
                  backgroundColor: theme.colors.terracotta,
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '20px',
                  padding: '12px 22px',
                  fontWeight: 800,
                  fontSize: '13px',
                  zIndex: 1000,
                  cursor: 'pointer',
                  boxShadow: '0 6px 20px rgba(224, 122, 95, 0.35)',
                  fontFamily: theme.fonts.heading,
                }}
              >
                + Add Spot 🐾
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grab / Angkas / FoodPanda style Pin Drop Form Panel */}
      {isPinDropActive && (
        <PinDropFormPanel
          lat={pinDropCenter.lat}
          lng={pinDropCenter.lng}
          reverseResult={reverseGeocodeResult}
          isReverseLoading={isReverseLoading}
          sourceHint={pinDropSourceHint}
          initialPlaceName={pinDropQueryName}
          onConfirm={handleConfirmPinDrop}
          onCancel={handleCancelPinDrop}
          isSubmitting={isPinSubmitting}
        />
      )}
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

      {/* Post-submission progressive disclosure — shown after a new place is added */}
      {placeAdded && (
        <PlaceAddedModal
          placeId={placeAdded.id}
          placeName={placeAdded.name}
          autoHours={placeAdded.hours}
          onDone={() => setPlaceAdded(null)}
        />
      )}

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
