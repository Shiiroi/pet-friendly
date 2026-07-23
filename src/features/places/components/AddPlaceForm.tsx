import React, { useState, useEffect } from 'react';
import { supabase } from '../../../shared/api/supabase-client';
import { getDeviceId } from '../../../shared/utils/device-id';
import { uuidv4 } from '../../../shared/utils/uuid';
import { addPendingReport } from '../../../shared/outbox/outbox-db';
import { PlaceSearchBar } from './PlaceSearchBar';
import { getPlaceDetails } from '../api/search-google-places';
import { CityCombobox } from './CityCombobox';

interface AddPlaceFormProps {
  onClose: () => void;
  onSuccess: () => void;
  onTriggerNicknamePrompt: () => void;
  initialPlace?: { name: string; address: string; latitude: number; longitude: number } | null;
}

interface SelectedSearch {
  id: string;
  name: string;
  address: string;
  lat?: number;
  lng?: number;
}

function extractCityFromAddress(address: string): string {
  if (!address) return '';
  const parts = address.split(',').map((p) => p.trim());
  if (parts.length >= 3) {
    return parts[parts.length - 3];
  }
  if (parts.length >= 2) {
    return parts[parts.length - 2];
  }
  return '';
}

export const AddPlaceForm: React.FC<AddPlaceFormProps> = ({
  onClose,
  onSuccess,
  onTriggerNicknamePrompt,
  initialPlace,
}) => {
  const [selectedPlace, setSelectedPlace] = useState<SelectedSearch | null>(() => {
    if (initialPlace) {
      return {
        id: `custom-${uuidv4()}`,
        name: initialPlace.name,
        address: initialPlace.address,
        lat: initialPlace.latitude,
        lng: initialPlace.longitude,
      };
    }
    return null;
  });

  const [city, setCity] = useState(() => {
    if (initialPlace?.address) {
      return extractCityFromAddress(initialPlace.address);
    }
    return '';
  });

  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Café']);
  const [claim, setClaim] = useState<'allowed' | 'not_allowed' | 'outdoor_only'>('allowed');
  const [petMenu, setPetMenu] = useState<'yes' | 'no' | 'unsure'>('unsure');
  const [priceRange, setPriceRange] = useState<'budget' | 'mid' | 'splurge'>('mid');
  const [reqDiaper, setReqDiaper] = useState(true);
  const [reqCaged, setReqCaged] = useState(false);
  const [reqStroller, setReqStroller] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const categories = ['Café', 'Restaurant', 'Park', 'Mall', 'Hotel', 'Shop', 'Museum', 'Gym', 'Other'];

  // ESC key to close modal listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        return prev.filter((c) => c !== cat);
      }
      if (prev.length >= 3) {
        return prev; // Maximum 3 categories allowed
      }
      return [...prev, cat];
    });
  };

  const handleSelectSearch = (lat: number, lng: number, name: string, address: string) => {
    setSelectedPlace({ id: `custom-${uuidv4()}`, name, address, lat, lng });
    setCity(extractCityFromAddress(address));
    setErrorMsg(null);
  };

  const handleSelectLocal = () => {
    setErrorMsg('This spot is already tracked in our directory! Please use the place details card to confirm or suggest updates.');
  };

  // Field validation rules
  const isCityValid = city.trim().length > 0;
  const isCategoriesValid = selectedCategories.length > 0 && selectedCategories.length <= 3;
  const isPlaceValid = !!selectedPlace && selectedPlace.name.trim().length > 0;
  const isFormValid = isPlaceValid && isCityValid && isCategoriesValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      if (!selectedPlace) setErrorMsg('Please enter or select a place from search.');
      else if (!isCityValid) setErrorMsg('Please select a city.');
      else if (!isCategoriesValid) setErrorMsg('Please select at least 1 category (maximum 3).');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    let resolvedLat = 0;
    let resolvedLng = 0;

    try {
      if (selectedPlace.lat !== undefined && selectedPlace.lng !== undefined) {
        resolvedLat = selectedPlace.lat;
        resolvedLng = selectedPlace.lng;
      } else {
        const details = await getPlaceDetails(selectedPlace.id);
        if (details) {
          resolvedLat = details.lat;
          resolvedLng = details.lng;
        } else {
          throw new Error('Coordinates could not be resolved from search results.');
        }
      }

      const reqs: string[] = [];
      if (reqDiaper) reqs.push('diaper');
      if (reqCaged) reqs.push('caged');
      if (reqStroller) reqs.push('stroller');

      const formattedRequirements = reqs.join(', ');
      const dbPetMenu = petMenu === 'unsure' ? 'not_sure' : petMenu;

      const { data: newPlaceId, error } = await supabase.rpc('create_place_with_report', {
        p_name: selectedPlace.name,
        p_address: selectedPlace.address,
        p_city: city.trim(),
        p_province: '',
        p_categories: selectedCategories,
        p_latitude: resolvedLat,
        p_longitude: resolvedLng,
        p_device_id: getDeviceId(),
        p_claim: claim,
        p_pet_menu: dbPetMenu,
        p_price_range: priceRange,
        p_notes: formattedRequirements,
      });

      if (error) throw error;
      if (!newPlaceId) throw new Error('Transaction returned empty response.');

      onTriggerNicknamePrompt();
      onSuccess();
      onClose();
    } catch (err: any) {
      if (err instanceof Error && (err.message.includes('fetch') || err.message.includes('NetworkError'))) {
        try {
          const reqs: string[] = [];
          if (reqDiaper) reqs.push('diaper');
          if (reqCaged) reqs.push('caged');
          if (reqStroller) reqs.push('stroller');
          const formattedRequirements = reqs.join(', ');
          const dbPetMenu = petMenu === 'unsure' ? 'not_sure' : petMenu;

          await addPendingReport('place', {
            p_name: selectedPlace.name,
            p_address: selectedPlace.address,
            p_city: city.trim(),
            p_province: '',
            p_categories: selectedCategories,
            p_latitude: resolvedLat,
            p_longitude: resolvedLng,
            p_device_id: getDeviceId(),
            p_claim: claim,
            p_pet_menu: dbPetMenu,
            p_price_range: priceRange,
            p_notes: formattedRequirements,
          });
          alert("Network failure. Saved! We'll register this place once you're back online. 🐾");
          onTriggerNicknamePrompt();
          onSuccess();
          onClose();
          return;
        } catch (dbErr) {
          setErrorMsg('Failed to cache spot offline: ' + (dbErr as Error).message);
        }
      } else {
        setErrorMsg(err.message || 'Failed to add place.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '16px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#111827' }}>
              Add New Spot 🐾
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
              Share a pet-friendly location with the community.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '16px',
              color: '#4b5563',
            }}
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#991b1b',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 1. Place Name Field */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#374151', marginBottom: '6px' }}>
              Place Name *
            </label>
            {!selectedPlace ? (
              <PlaceSearchBar
                loadedPlaces={[]}
                onSelectLocalPlace={handleSelectLocal}
                onSelectGeocodePlace={handleSelectSearch}
              />
            ) : (
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={selectedPlace.name}
                  onChange={(e) => setSelectedPlace({ ...selectedPlace, name: e.target.value })}
                  placeholder="Enter the place name"
                  required
                  style={{
                    flex: 1,
                    height: '44px',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    color: '#1f2937',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlace(null);
                    setCity('');
                  }}
                  style={{
                    height: '44px',
                    padding: '0 12px',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    color: '#4b5563',
                    fontWeight: 500,
                  }}
                >
                  Change
                </button>
              </div>
            )}
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
              Start typing to search for an existing place or enter a new one.
            </p>
          </div>

          {/* 2. Address Field */}
          {selectedPlace && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#374151', marginBottom: '6px' }}>
                Address *
              </label>
              <input
                type="text"
                value={selectedPlace.address}
                onChange={(e) => setSelectedPlace({ ...selectedPlace, address: e.target.value })}
                placeholder="Search for an address"
                required
                style={{
                  width: '100%',
                  height: '44px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                Search by street, building, or landmark.
              </p>
            </div>
          )}

          {/* 3. City Combobox Field */}
          {selectedPlace && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#374151', marginBottom: '6px' }}>
                City *
              </label>
              <CityCombobox
                value={city}
                onChange={setCity}
                error={!isCityValid ? 'Please select a city.' : null}
                placeholder="Search or select a city"
              />
              {!isCityValid ? (
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#ef4444' }}>
                  Please select a city.
                </p>
              ) : (
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                  Select or type the city/municipality.
                </p>
              )}
            </div>
          )}

          {/* 4. Categories / Tags Field */}
          {selectedPlace && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontWeight: 600, fontSize: '13px', color: '#374151' }}>
                  Categories / Tags *
                </label>
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: selectedCategories.length === 3 ? '#e07a5f' : '#6b7280',
                  }}
                >
                  {selectedCategories.length} / 3 selected
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {categories.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  const isMaxReached = selectedCategories.length >= 3 && !isSelected;
                  return (
                    <button
                      key={cat}
                      type="button"
                      disabled={isMaxReached}
                      onClick={() => toggleCategory(cat)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '20px',
                        border: isSelected ? '1.5px solid #e07a5f' : '1px solid #d1d5db',
                        backgroundColor: isSelected ? '#fdf0ed' : isMaxReached ? '#f3f4f6' : '#ffffff',
                        color: isSelected ? '#e07a5f' : isMaxReached ? '#9ca3af' : '#374151',
                        fontWeight: isSelected ? 700 : 500,
                        fontSize: '13px',
                        cursor: isMaxReached ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        opacity: isMaxReached ? 0.6 : 1,
                      }}
                    >
                      {isSelected ? '✓ ' : '+ '}{cat}
                    </button>
                  );
                })}
              </div>
              {!isCategoriesValid ? (
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#ef4444' }}>
                  Select at least one category (maximum of 3).
                </p>
              ) : (
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                  Select up to 3 categories that best describe this place.
                </p>
              )}
            </div>
          )}

          {/* Initial Report Options */}
          {selectedPlace && (
            <>
              <div style={{ marginBottom: '16px', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '13px', color: '#374151' }}>
                  Pet Policy *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="radio"
                      name="claim"
                      value="allowed"
                      checked={claim === 'allowed'}
                      onChange={() => setClaim('allowed')}
                    />
                    Allowed (Pets welcome indoors)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="radio"
                      name="claim"
                      value="outdoor_only"
                      checked={claim === 'outdoor_only'}
                      onChange={() => setClaim('outdoor_only')}
                    />
                    Outdoor Only (Al fresco only)
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '16px', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '13px', color: '#374151' }}>
                  Price Range
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="radio"
                      name="priceRange"
                      value="budget"
                      checked={priceRange === 'budget'}
                      onChange={() => setPriceRange('budget')}
                    />
                    Budget-Friendly
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="radio"
                      name="priceRange"
                      value="mid"
                      checked={priceRange === 'mid'}
                      onChange={() => setPriceRange('mid')}
                    />
                    Mid-Range
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="radio"
                      name="priceRange"
                      value="splurge"
                      checked={priceRange === 'splurge'}
                      onChange={() => setPriceRange('splurge')}
                    />
                    Splurge-Worthy
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '16px', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '13px', color: '#374151' }}>
                  Pet Menu
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="radio"
                      name="petMenu"
                      value="yes"
                      checked={petMenu === 'yes'}
                      onChange={() => setPetMenu('yes')}
                    />
                    Yes (Dedicated pet menu available)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="radio"
                      name="petMenu"
                      value="no"
                      checked={petMenu === 'no'}
                      onChange={() => setPetMenu('no')}
                    />
                    No pet menu
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="radio"
                      name="petMenu"
                      value="unsure"
                      checked={petMenu === 'unsure'}
                      onChange={() => setPetMenu('unsure')}
                    />
                    Unsure / Not reported yet
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '20px', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '13px', color: '#374151' }}>
                  Pet Requirements
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={reqDiaper}
                      onChange={(e) => setReqDiaper(e.target.checked)}
                    />
                    Pet Diaper Required
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={reqCaged}
                      onChange={(e) => setReqCaged(e.target.checked)}
                    />
                    Carrier / Cage Required
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={reqStroller}
                      onChange={(e) => setReqStroller(e.target.checked)}
                    />
                    Stroller Required
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Form Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 18px',
                backgroundColor: '#ffffff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            {selectedPlace && (
              <button
                type="submit"
                disabled={!isFormValid || isSubmitting}
                style={{
                  padding: '10px 20px',
                  backgroundColor: !isFormValid || isSubmitting ? '#9ca3af' : '#e07a5f',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: !isFormValid || isSubmitting ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'background-color 0.15s ease',
                }}
              >
                {isSubmitting ? 'Adding Spot...' : 'Add Spot'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
