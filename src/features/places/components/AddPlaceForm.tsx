import React, { useState } from 'react';
import { FaCheckCircle, FaLeaf, FaTag } from 'react-icons/fa';
import { theme } from '../../../shared/styles/theme';
import { supabase } from '../../../shared/api/supabase-client';
import { getDeviceId } from '../../../shared/utils/device-id';
import { uuidv4 } from '../../../shared/utils/uuid';
import { addPendingReport } from '../../../shared/outbox/outbox-db';
import { PlaceSearchBar } from './PlaceSearchBar';
import { getPlaceDetails } from '../api/search-google-places';
import { ProvinceCombobox } from './ProvinceCombobox';
import type { WeeklyOperatingHours } from '../types/hours';

interface AddPlaceFormProps {
  onClose: () => void;
  /** Called with the new place ID + name after successful creation */
  onSuccess: (newPlaceId: string, placeName: string, autoHours?: WeeklyOperatingHours | null) => void;
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

/**
 * Helper to parse and extract the city candidate from a Google formatted address string.
 */
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

/**
 * Streamlined form to register a new pet-friendly place.
 * Only collects essential fields on creation — detailed inputs are
 * disclosed progressively via the post-submission PlaceAddedModal.
 */
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

  const [province, setProvince] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Café']);
  const [claim, setClaim] = useState<'allowed' | 'outdoor_only'>('allowed');
  const [priceRange, setPriceRange] = useState<'budget' | 'mid' | 'splurge'>('mid');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-captured from Google — used post-submission
  const [autoHours, setAutoHours] = useState<WeeklyOperatingHours | null>(null);

  const categories = ['Café', 'Restaurant', 'Park', 'Mall', 'Hotel', 'Shop', 'Other'];

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        if (prev.length === 1) return prev;
        return prev.filter((c) => c !== cat);
      }
      return [...prev, cat];
    });
  };

  const handleSelectSearch = (
    lat: number,
    lng: number,
    name: string,
    address: string,
    hours?: WeeklyOperatingHours | null,
    autoCity?: string,
    autoProvince?: string
  ) => {
    setSelectedPlace({ id: `custom-${uuidv4()}`, name, address, lat, lng });
    const resolvedCity = autoCity || extractCityFromAddress(address);
    setCity(resolvedCity);
    if (autoProvince) setProvince(autoProvince);
    if (hours) setAutoHours(hours);
    setErrorMsg(null);
  };

  const handleSelectLocal = () => {
    setErrorMsg('This spot is already tracked in our directory! Please use the place details card to confirm or suggest updates.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlace) {
      setErrorMsg('Please select a place from search first.');
      return;
    }
    if (!city.trim()) {
      setErrorMsg('Please specify the city/locality.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    let resolvedLat = 0;
    let resolvedLng = 0;
    let resolvedHours = autoHours;

    try {
      if (selectedPlace.lat !== undefined && selectedPlace.lng !== undefined) {
        resolvedLat = selectedPlace.lat;
        resolvedLng = selectedPlace.lng;
      } else {
        const details = await getPlaceDetails(selectedPlace.id);
        if (details) {
          resolvedLat = details.lat;
          resolvedLng = details.lng;
          if (details.openingHours) resolvedHours = details.openingHours;
          if (details.city && !city) setCity(details.city);
          if (details.province && !province) setProvince(details.province);
        } else {
          throw new Error('Coordinates could not be resolved from search results.');
        }
      }

      const { data: newPlaceId, error } = await supabase.rpc('create_place_with_report', {
        p_name: selectedPlace.name,
        p_address: selectedPlace.address,
        p_city: city.trim(),
        p_province: province.trim(),
        p_categories: selectedCategories,
        p_latitude: resolvedLat,
        p_longitude: resolvedLng,
        p_device_id: getDeviceId(),
        p_claim: claim,
        p_pet_menu: 'not_sure',
        p_price_range: priceRange,
        p_notes: '',
        p_operating_hours: null,
      });

      if (error) throw error;
      if (!newPlaceId) throw new Error('Transaction returned empty response.');

      triggerNicknamePromptFlow();
      onSuccess(newPlaceId, selectedPlace.name, resolvedHours);
      onClose();
    } catch (err: any) {
      if (err instanceof Error && (err.message.includes('fetch') || err.message.includes('NetworkError'))) {
        try {
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
            p_pet_menu: 'not_sure',
            p_price_range: priceRange,
            p_notes: '',
            p_operating_hours: null,
          });
          alert("Network failure. Saved! We'll register this place once you're back online. 🐾");
          triggerNicknamePromptFlow();
          onSuccess('offline', selectedPlace.name, null);
          onClose();
          return;
        } catch (dbErr) {
          setErrorMsg('Failed to cache spot offline: ' + (dbErr as Error).message);
          return;
        }
      }
      setErrorMsg(err.message || 'An error occurred while creating this place.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerNicknamePromptFlow = () => {
    const hasNickname = !!localStorage.getItem('compaws_nickname');
    const prompted = localStorage.getItem('nickname_prompted') === 'true';
    if (!hasNickname && !prompted) {
      onTriggerNicknamePrompt();
    }
  };

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #ddd',
        marginTop: '16px',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px' }}>
          Add a New Spot 🐾
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close form"
          style={{
            background: 'none',
            border: 'none',
            fontSize: '22px',
            cursor: 'pointer',
            color: '#6b7280',
            padding: '4px',
            lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>

      {errorMsg && (
        <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          {errorMsg}
        </div>
      )}

      {!selectedPlace ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '160px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '16px', fontSize: '14px', color: '#374151' }}>
              Find the place using Google Search:
            </label>
            <PlaceSearchBar
              loadedPlaces={[]}
              onSelectLocalPlace={handleSelectLocal}
              onSelectGeocodePlace={handleSelectSearch}
              containerStyle={{
                position: 'relative',
                top: 0,
                left: 0,
                transform: 'none',
                width: '100%',
                maxWidth: '100%',
                zIndex: 100,
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Place Name */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Place Name
            </label>
            <input
              type="text"
              value={selectedPlace.name}
              disabled
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                backgroundColor: '#f3f4f6',
                color: theme.colors.textDark,
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Address */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Address
            </label>
            <input
              type="text"
              value={selectedPlace.address}
              disabled
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                backgroundColor: '#f3f4f6',
                color: theme.colors.textDark,
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* City + Province */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                City / Municipality
              </label>
              <input
                type="text"
                value={city || 'General'}
                disabled
                readOnly
                style={{
                  width: '100%',
                  height: '40px',
                  padding: '0 10px',
                  borderRadius: '8px',
                  border: '1px solid #ddd',
                  backgroundColor: '#f3f4f6',
                  color: theme.colors.textDark,
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                Province / Region
              </label>
              <ProvinceCombobox value={province} onChange={setProvince} />
            </div>
          </div>

          {/* Categories */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#4b5563', marginBottom: '6px' }}>
              Categories * (Select all that apply)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {categories.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: isSelected ? '1.5px solid #e07a5f' : '1px solid #d1d5db',
                      backgroundColor: isSelected ? '#fdf0ed' : '#ffffff',
                      color: isSelected ? '#e07a5f' : '#4b5563',
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSelected ? '✓ ' : '+ '}{cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pet Access — 2-option pill select */}
          <div style={{ marginBottom: '16px', borderTop: '1px solid #eee', paddingTop: '14px' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', color: '#374151', marginBottom: '8px' }}>
              🐾 Pet Access Policy
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { id: 'allowed', label: 'Pets Allowed', sub: 'Welcome indoors', icon: <FaCheckCircle size={13} color={theme.colors.allowed} /> },
                { id: 'outdoor_only', label: 'Outdoor Only', sub: 'Al fresco only', icon: <FaLeaf size={13} color={theme.colors.outdoorOnly} /> },
              ].map((opt) => {
                const isSelected = claim === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setClaim(opt.id as typeof claim)}
                    style={{
                      padding: '12px 10px',
                      borderRadius: '12px',
                      border: isSelected ? `2px solid ${theme.colors.terracotta}` : `1px solid ${theme.colors.borderLight}`,
                      backgroundColor: isSelected ? theme.colors.softPink : '#ffffff',
                      color: isSelected ? theme.colors.terracotta : theme.colors.textDark,
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      {opt.icon} {opt.label}
                    </div>
                    <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>{opt.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Price Range — 3-pill compact */}
          <div style={{ marginBottom: '20px', borderTop: '1px solid #eee', paddingTop: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', color: '#374151', marginBottom: '8px' }}>
              <FaTag size={12} color="#374151" /> Price Range
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'budget', label: '🐾 Budget', sub: 'Under ₱200' },
                { id: 'mid', label: '🐾🐾 Mid', sub: '₱200–₱600' },
                { id: 'splurge', label: '🐾🐾🐾 Splurge', sub: '₱600+' },
              ].map((opt) => {
                const isSelected = priceRange === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPriceRange(opt.id as typeof priceRange)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: '12px',
                      border: isSelected ? `2px solid ${theme.colors.terracotta}` : `1px solid ${theme.colors.borderLight}`,
                      backgroundColor: isSelected ? theme.colors.softPink : '#ffffff',
                      color: isSelected ? theme.colors.terracotta : theme.colors.textDark,
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{opt.label}</div>
                    <div style={{ fontSize: '10px', opacity: 0.7, marginTop: '2px' }}>{opt.sub}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlace(null)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Reset Search
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '8px 20px',
                backgroundColor: '#e07a5f',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '14px',
                boxShadow: '0 4px 12px rgba(224,122,95,0.3)',
              }}
            >
              {isSubmitting ? 'Adding...' : 'Add to Directory 🐾'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
