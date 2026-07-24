import React, { useState, useEffect } from 'react';
import { FaMapMarkerAlt, FaCheck, FaTimes, FaSearch, FaExclamationTriangle } from 'react-icons/fa';
import { theme } from '../../../shared/styles/theme';
import { ProvinceCombobox } from './ProvinceCombobox';
import type { WeeklyOperatingHours } from '../types/hours';
import type { ReverseGeocodeResult } from '../api/search-photon-places';

interface PinDropFormPanelProps {
  lat: number;
  lng: number;
  reverseResult: ReverseGeocodeResult | null;
  isReverseLoading: boolean;
  sourceHint?: 'search' | 'pin_drop';
  initialPlaceName?: string;
  autoHours?: WeeklyOperatingHours | null;
  onConfirm: (data: {
    name: string;
    address: string;
    city: string;
    province: string;
    categories: string[];
    claim: 'allowed' | 'outdoor_only';
    priceRange: 'budget' | 'mid' | 'splurge';
    lat: number;
    lng: number;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const PinDropFormPanel: React.FC<PinDropFormPanelProps> = ({
  lat,
  lng,
  reverseResult,
  isReverseLoading,
  sourceHint = 'pin_drop',
  initialPlaceName = '',
  onConfirm,
  onCancel,
  isSubmitting = false,
}) => {
  const [placeName, setPlaceName] = useState(initialPlaceName);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Café']);
  const [claim, setClaim] = useState<'allowed' | 'outdoor_only'>('allowed');
  const [priceRange, setPriceRange] = useState<'budget' | 'mid' | 'splurge'>('mid');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const inputStyle = (field: string): React.CSSProperties => ({
    width: '100%',
    padding: '9px 12px',
    borderRadius: '10px',
    border: `1.5px solid ${focusedField === field ? theme.colors.terracotta : theme.colors.borderLight}`,
    backgroundColor: theme.colors.background,
    color: theme.colors.textDark,
    fontSize: '14px',
    fontFamily: theme.fonts.body,
    outline: 'none',
    boxSizing: 'border-box' as const,
    boxShadow: focusedField === field ? '0 0 0 3px rgba(224, 122, 95, 0.12)' : 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  });

  const FIELD_LABEL: React.CSSProperties = {
    display: 'block',
    fontWeight: 700,
    fontSize: '11px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: theme.colors.textMuted,
    marginBottom: '5px',
  };

  // Sync state in real-time when reverse-geocoded result or map pin updates
  useEffect(() => {
    if (reverseResult) {
      if (reverseResult.address) setAddress(reverseResult.address);
      if (reverseResult.city) setCity(reverseResult.city);
      if (reverseResult.province) setProvince(reverseResult.province);
      if (reverseResult.name) setPlaceName(reverseResult.name);
    }
  }, [reverseResult]);

  useEffect(() => {
    if (initialPlaceName) {
      setPlaceName(initialPlaceName);
    }
  }, [initialPlaceName]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!placeName.trim()) {
      setErrorMsg('Please enter a place name.');
      return;
    }
    if (!city.trim()) {
      setErrorMsg('Please enter a city or municipality.');
      return;
    }

    setErrorMsg(null);
    onConfirm({
      name: placeName.trim(),
      address: address.trim() || `${placeName}, ${city}`,
      city: city.trim(),
      province: province.trim() || 'Metro Manila',
      categories: selectedCategories,
      claim,
      priceRange,
      lat,
      lng,
    });
  };

  return (
    <>
      <style>{`
        .pin-panel-wrapper {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: #ffffff;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          box-shadow: 0 -10px 40px rgba(0,0,0,0.14);
          z-index: 1100;
          max-height: 88vh;
          display: flex;
          flex-direction: column;
          font-family: ${theme.fonts.body};
          overflow: hidden;
        }
        @media (min-width: 768px) {
          .pin-panel-wrapper {
            top: 50%;
            right: 32px;
            bottom: auto;
            left: auto;
            transform: translateY(-50%);
            width: 400px;
            max-height: min(88vh, 800px);
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.16), 0 4px 16px rgba(0,0,0,0.08);
          }
        }
        .pin-panel-body { padding: 18px 22px 28px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; flex: 1; }
        .pin-panel-body::-webkit-scrollbar { width: 4px; }
        .pin-panel-body::-webkit-scrollbar-thumb { background: ${theme.colors.borderLight}; border-radius: 4px; }
        .pin-drag-handle { width: 40px; height: 4px; background: ${theme.colors.borderLight}; border-radius: 4px; margin: 10px auto 0; }
        @media (min-width: 768px) { .pin-drag-handle { display: none; } }
        @keyframes pinspin { to { transform: rotate(360deg); } }
      `}</style>
    <div className="pin-panel-wrapper">

      <div className="pin-drag-handle" />

      {/* Header — Row 1: icon + title + close button; Row 2: badge + coords */}
      <div
        style={{
          padding: '14px 20px 12px 20px',
          borderBottom: `1px solid ${theme.colors.borderLight}`,
          flexShrink: 0,
        }}
      >
        {/* Row 1 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            {/* Icon badge — same height as h3 line height */}
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                backgroundColor: theme.colors.softPink,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <FaMapMarkerAlt color={theme.colors.terracotta} size={17} />
            </div>
            <h3
              style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: 800,
                color: theme.colors.textDark,
                fontFamily: theme.fonts.heading,
                lineHeight: 1,
                whiteSpace: 'nowrap',
              }}
            >
              Add a Spot
            </h3>
          </div>

          <button
            type="button"
            onClick={onCancel}
            style={{
              background: theme.colors.borderLight,
              border: 'none',
              color: theme.colors.textMuted,
              cursor: 'pointer',
              padding: '7px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FaTimes size={13} />
          </button>
        </div>

        {/* Row 2: badge + coords */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '44px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: sourceHint === 'search' ? '#2563eb' : theme.colors.terracotta,
              backgroundColor: sourceHint === 'search' ? '#eff6ff' : theme.colors.softPink,
              padding: '3px 9px',
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            {sourceHint === 'search' ? <FaSearch size={9} /> : <FaMapMarkerAlt size={9} />}
            {sourceHint === 'search' ? 'Matched from search' : 'Pin drop'}
          </span>
          {isReverseLoading && (
            <span style={{ fontSize: '11px', color: theme.colors.terracotta, fontWeight: 600 }}>Updating...</span>
          )}
          <span style={{ fontSize: '10px', color: theme.colors.textMuted, letterSpacing: '0.02em' }}>
            {lat.toFixed(4)}°N, {lng.toFixed(4)}°E
          </span>
        </div>
      </div>

      {/* Scrollable Form Body */}
      <form onSubmit={handleSubmit} className="pin-panel-body">
        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: '#fef2f2',
              color: theme.colors.notAllowed,
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FaExclamationTriangle size={14} /> {errorMsg}
          </div>
        )}

        {/* Place Name */}
        <div>
          <label style={FIELD_LABEL}>Place Name *</label>
          <input
            type="text"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
            placeholder="e.g. Pawfe Cafe, BGC High Street..."
            style={inputStyle('name')}
          />
        </div>

        {/* Address */}
        <div>
          <label style={FIELD_LABEL}>Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onFocus={() => setFocusedField('address')}
            onBlur={() => setFocusedField(null)}
            placeholder="Street, building, or landmark..."
            style={inputStyle('address')}
          />
        </div>

        {/* City & Province */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={FIELD_LABEL}>City / Municipality *</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onFocus={() => setFocusedField('city')}
              onBlur={() => setFocusedField(null)}
              placeholder="e.g. Quezon City"
              style={{ ...inputStyle('city'), height: '40px' }}
            />
          </div>
          <div>
            <label style={FIELD_LABEL}>Province</label>
            <ProvinceCombobox value={province} onChange={setProvince} />
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: theme.colors.borderLight, margin: '0 -2px' }} />

        {/* Categories */}
        <div>
          <label style={FIELD_LABEL}>Categories *</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '20px',
                    border: isSelected ? `1.5px solid ${theme.colors.terracotta}` : `1px solid ${theme.colors.borderLight}`,
                    backgroundColor: isSelected ? theme.colors.softPink : theme.colors.background,
                    color: isSelected ? theme.colors.terracotta : theme.colors.textMuted,
                    fontSize: '12px',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pet Policy */}
        <div>
          <label style={FIELD_LABEL}>Pet Access Policy *</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setClaim('allowed')}
              style={{
                padding: '11px 10px',
                borderRadius: '12px',
                border: claim === 'allowed' ? `2px solid ${theme.colors.allowed}` : `1.5px solid ${theme.colors.borderLight}`,
                backgroundColor: claim === 'allowed' ? '#f0fdf4' : theme.colors.background,
                color: claim === 'allowed' ? theme.colors.allowed : theme.colors.textMuted,
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              <FaCheck size={11} /> Indoors Allowed
            </button>
            <button
              type="button"
              onClick={() => setClaim('outdoor_only')}
              style={{
                padding: '11px 10px',
                borderRadius: '12px',
                border: claim === 'outdoor_only' ? `2px solid ${theme.colors.outdoorOnly}` : `1.5px solid ${theme.colors.borderLight}`,
                backgroundColor: claim === 'outdoor_only' ? '#fffbeb' : theme.colors.background,
                color: claim === 'outdoor_only' ? theme.colors.outdoorOnly : theme.colors.textMuted,
                fontWeight: 700,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
            >
              🌤️ Outdoor Only
            </button>
          </div>
        </div>

        {/* Price Range */}
        <div>
          <label style={FIELD_LABEL}>Price Range</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
            {[
              { id: 'budget', symbol: '₱', label: 'Budget' },
              { id: 'mid', symbol: '₱₱', label: 'Mid-range' },
              { id: 'splurge', symbol: '₱₱₱', label: 'Splurge' },
            ].map((p) => {
              const isSel = priceRange === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPriceRange(p.id as any)}
                  style={{
                    padding: '9px 6px',
                    borderRadius: '10px',
                    border: isSel ? `1.5px solid ${theme.colors.terracotta}` : `1px solid ${theme.colors.borderLight}`,
                    backgroundColor: isSel ? theme.colors.softPink : theme.colors.background,
                    color: isSel ? theme.colors.terracotta : theme.colors.textMuted,
                    fontWeight: 700,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '14px' }}>{p.symbol}</span>
                  <span style={{ fontSize: '10px', fontWeight: 500 }}>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: `1.5px solid ${theme.colors.borderLight}`,
              backgroundColor: theme.colors.background,
              color: theme.colors.textMuted,
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              fontFamily: theme.fonts.body,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              flex: 2,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: isSubmitting ? '#c4977e' : theme.colors.terracotta,
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '14px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: isSubmitting ? 'none' : '0 4px 16px rgba(224, 122, 95, 0.35)',
              fontFamily: theme.fonts.heading,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              transition: 'all 0.15s ease',
            }}
          >
            {isSubmitting ? (
              <>
                <span
                  style={{
                    width: '13px',
                    height: '13px',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'pinspin 0.7s linear infinite',
                    display: 'inline-block',
                  }}
                />
                Saving...
              </>
            ) : (
              'Confirm & Save 🐾'
            )}
          </button>
        </div>
      </form>
    </div>
    </>
  );
};
