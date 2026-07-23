import React, { useState } from 'react';
import { supabase } from '../../../shared/api/supabase-client';
import { getDeviceId } from '../../../shared/utils/device-id';
import { uuidv4 } from '../../../shared/utils/uuid';
import { addPendingReport } from '../../../shared/outbox/outbox-db';
import { PlaceSearchBar } from './PlaceSearchBar';
import { getPlaceDetails } from '../api/search-google-places';

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

/**
 * Form to register a new pet-friendly place and submit its initial policy report.
 */
/**
 * Helper to parse and extract the city candidate from a Google formatted address string.
 */
function extractCityFromAddress(address: string): string {
  if (!address) return '';
  const parts = address.split(',').map((p) => p.trim());
  // Standard format in PH address strings: [..., City, Province/Metro Manila, Country]
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

  const categories = ['Café', 'Restaurant', 'Park', 'Mall', 'Hotel', 'Shop', 'Other'];

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(cat)) {
        if (prev.length === 1) return prev; // keep at least 1 tag selected
        return prev.filter((c) => c !== cat);
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
    // Local place is already in the database, prevent duplicates
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

      // 4. Submit transactional RPC inserting place and initial report together
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

      // 5. Trigger nickname prompt overlay if needed
      triggerNicknamePromptFlow();
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
          triggerNicknamePromptFlow();
          onSuccess();
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

      {/* Place search lookup */}
      {!selectedPlace ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '180px' }}>
          <div style={{ position: 'relative', height: '100px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
              Find the place using Google Search:
            </label>
            <PlaceSearchBar
              loadedPlaces={[]}
              onSelectLocalPlace={handleSelectLocal}
              onSelectGeocodePlace={handleSelectSearch}
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
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
        /* Form content prefilled once place is selected */
        <form onSubmit={handleSubmit}>
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
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

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
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#4b5563', marginBottom: '4px' }}>
                City *
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Quezon City"
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #ccc',
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ width: '100%', marginTop: '12px' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '12px', color: '#4b5563', marginBottom: '6px' }}>
                Categories / Tags * (Select all that apply)
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
          </div>

          <div style={{ marginBottom: '16px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
              What is the initial pet policy report?
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

          <div style={{ marginBottom: '16px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
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

          <div style={{ marginBottom: '16px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
              Does this place have a pet menu?
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
                Yes (Includes pet treats, puppuccinos, or a dedicated menu)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="radio"
                  name="petMenu"
                  value="no"
                  checked={petMenu === 'no'}
                  onChange={() => setPetMenu('no')}
                />
                No (No special food options for pets)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="radio"
                  name="petMenu"
                  value="unsure"
                  checked={petMenu === 'unsure'}
                  onChange={() => setPetMenu('unsure')}
                />
                Unsure
              </label>
            </div>
          </div>

          <div style={{ marginBottom: '20px', borderTop: '1px solid #eee', paddingTop: '12px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
              Pet Requirements (Select all that apply)
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={reqDiaper}
                  onChange={(e) => setReqDiaper(e.target.checked)}
                />
                Diapers
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={reqCaged}
                  onChange={(e) => setReqCaged(e.target.checked)}
                />
                Caged
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={reqStroller}
                  onChange={(e) => setReqStroller(e.target.checked)}
                />
                Stroller / Carrier
              </label>
            </div>


          </div>

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
                padding: '8px 16px',
                backgroundColor: '#e07a5f',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
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
