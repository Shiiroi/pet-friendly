import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { FaGlassCheers, FaBone, FaClock, FaCamera, FaTimesCircle, FaMagic } from 'react-icons/fa';
import { theme } from '../../../shared/styles/theme';
import { supabase } from '../../../shared/api/supabase-client';
import type { WeeklyOperatingHours } from '../types/hours';
import { StoreHoursFormInput } from './StoreHoursFormInput';
import { UploadMenuPhotoModal } from './UploadMenuPhotoModal';
import { getDefaultOperatingHours } from '../../../shared/utils/operating-hours';
import type { MenuPhoto } from '../../../shared/types/pet-menu';

interface PlaceAddedModalProps {
  placeId: string;
  placeName: string;
  /** Hours auto-captured from Google during place search — pre-populate if available */
  autoHours?: WeeklyOperatingHours | null;
  onDone: () => void;
}

type Step = 'prompt' | 'details';

/**
 * Post-submission progressive disclosure modal.
 * After a user adds a new place, this gives them an easy way to
 * optionally complete the profile — or skip for later.
 * Identical pattern to Google Maps "Add more details" flow.
 */
export const PlaceAddedModal: React.FC<PlaceAddedModalProps> = ({
  placeId,
  placeName,
  autoHours,
  onDone,
}) => {
  const [step, setStep] = useState<Step>('prompt');

  // Hours state
  const [petMenu, setPetMenu] = useState<'yes' | 'no' | 'not_sure'>('not_sure');
  const [includeHours, setIncludeHours] = useState(!!autoHours);
  const [hours, setHours] = useState<WeeklyOperatingHours | null>(autoHours || null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<MenuPhoto[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveDetails = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      // Update pet menu vote if user picked something
      if (petMenu !== 'not_sure') {
        await (supabase.rpc as any)('create_pet_policy_report', {
          p_place_id: placeId,
          p_device_id: (await import('../../../shared/utils/device-id')).getDeviceId(),
          p_claim: null,
          p_pet_menu: petMenu,
          p_price_range: null,
          p_notes: null,
        });
      }

      // Update operating hours if provided
      if (includeHours && hours) {
        await (supabase.rpc as any)('update_place_operating_hours', {
          p_place_id: placeId,
          p_operating_hours: hours as any,
        });
      }

      onDone();
    } catch (err: any) {
      setSaveError(err?.message || 'Something went wrong. You can update this later from the place page.');
    } finally {
      setIsSaving(false);
    }
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        zIndex: 9999,
        padding: '0 0 env(safe-area-inset-bottom, 0px) 0',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '28px 28px 0 0',
          padding: '24px 20px 32px',
          width: '100%',
          maxWidth: '480px',
          fontFamily: theme.fonts.body,
          boxSizing: 'border-box',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {step === 'prompt' ? (
          <>
            {/* Success Prompt Step */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '12px', display: 'flex', justifyContent: 'center' }}>
                <FaGlassCheers color={theme.colors.terracotta} size={48} />
              </div>
              <h2
                style={{
                  fontSize: '22px',
                  fontWeight: 800,
                  margin: '0 0 8px 0',
                  color: theme.colors.textDark,
                  fontFamily: theme.fonts.heading,
                }}
              >
                {placeName} Added!
              </h2>
              <p style={{ fontSize: '14px', color: theme.colors.textMuted, margin: 0, lineHeight: 1.5 }}>
                Thanks for helping the community! 🐾<br />
                Want to help complete this place's profile now? It only takes a minute.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setStep('details')}
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '14px',
                  border: 'none',
                  backgroundColor: theme.colors.terracotta,
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(224,122,95,0.35)',
                  fontFamily: theme.fonts.heading,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                Add Details Now <FaMagic size={14} />
              </button>
              <button
                type="button"
                onClick={onDone}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  border: `1px solid ${theme.colors.borderLight}`,
                  backgroundColor: '#ffffff',
                  color: theme.colors.textMuted,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Skip for Now
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Details Quick-Fill Step */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => setStep('prompt')}
                style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: theme.colors.textMuted, padding: 0, lineHeight: 1 }}
              >
                ‹
              </button>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: theme.colors.textDark, fontFamily: theme.fonts.heading }}>
                  Complete the Profile
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: theme.colors.textMuted }}>{placeName}</p>
              </div>
            </div>

            {saveError && (
              <div style={{ padding: '10px 14px', backgroundColor: '#FFEBEE', color: theme.colors.notAllowed, borderRadius: '10px', fontSize: '12px', marginBottom: '14px', fontWeight: 500 }}>
                {saveError}
              </div>
            )}

            {/* Pet Menu Question */}
            <div style={{ marginBottom: '18px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: theme.colors.textDark, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaBone color={theme.colors.terracotta} size={14} /> Does this place have a pet menu?
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                {[
                  { id: 'yes', label: 'Yes 🐾', icon: null },
                  { id: 'no', label: 'No', icon: <FaTimesCircle size={12} /> },
                  { id: 'not_sure', label: 'Not Sure', icon: null },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPetMenu(opt.id as any)}
                    style={{
                      padding: '10px 6px',
                      borderRadius: '12px',
                      border: petMenu === opt.id ? `2px solid ${theme.colors.terracotta}` : `1px solid ${theme.colors.borderLight}`,
                      backgroundColor: petMenu === opt.id ? theme.colors.softPink : '#ffffff',
                      color: petMenu === opt.id ? theme.colors.terracotta : theme.colors.textDark,
                      fontWeight: petMenu === opt.id ? 700 : 500,
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    {opt.label} {opt.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Operating Hours */}
            <div
              style={{
                marginBottom: '18px',
                backgroundColor: includeHours ? theme.colors.softPink : '#FAFAFA',
                borderRadius: '14px',
                border: `1.5px solid ${includeHours ? theme.colors.terracotta : theme.colors.borderLight}`,
                padding: '12px 14px',
                transition: 'all 0.2s ease',
              }}
            >
              <label
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={includeHours}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setIncludeHours(checked);
                      if (checked && !hours) setHours(getDefaultOperatingHours());
                    }}
                    style={{ width: '18px', height: '18px', accentColor: theme.colors.terracotta, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: theme.colors.textDark, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <FaClock size={13} color={theme.colors.terracotta} /> Add Operating Hours
                  </span>
                </div>
                {autoHours && (
                  <span style={{ fontSize: '10px', color: theme.colors.terracotta, fontWeight: 700 }}>Auto-filled from Google</span>
                )}
              </label>
              {includeHours && (
                <div style={{ marginTop: '12px' }}>
                  <StoreHoursFormInput value={hours} onChange={setHours} />
                </div>
              )}
            </div>

            {/* Menu / Photo Upload */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: theme.colors.textDark, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaCamera color={theme.colors.terracotta} size={14} /> Menu Photos
              </p>
              {uploadedPhotos.length > 0 && (
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    paddingBottom: '4px',
                    marginBottom: '8px',
                  }}
                >
                  {uploadedPhotos.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        border: p.category === 'pet_menu' ? `2px solid ${theme.colors.terracotta}` : `1px solid ${theme.colors.borderLight}`,
                        position: 'relative',
                      }}
                    >
                      <img src={p.url} alt="Menu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {p.category === 'pet_menu' && (
                        <span style={{ position: 'absolute', bottom: '2px', right: '2px', fontSize: '10px' }}>🐾</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '12px',
                  border: `1.5px dashed ${theme.colors.terracotta}`,
                  backgroundColor: '#fffcfb',
                  color: theme.colors.terracotta,
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <FaCamera size={14} /> Upload Menu / Photo
                <span style={{ fontSize: '11px', color: theme.colors.textMuted, fontWeight: 400 }}>
                  (Menu board, pet menu, etc.)
                </span>
              </button>
            </div>

            {/* Save / Done */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                onClick={handleSaveDetails}
                disabled={isSaving}
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '14px',
                  border: 'none',
                  backgroundColor: theme.colors.terracotta,
                  color: '#ffffff',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: isSaving ? 'wait' : 'pointer',
                  opacity: isSaving ? 0.7 : 1,
                  boxShadow: '0 4px 14px rgba(224,122,95,0.3)',
                  fontFamily: theme.fonts.heading,
                }}
              >
                {isSaving ? 'Saving...' : 'Done & Save 🐾'}
              </button>
              <button
                type="button"
                onClick={onDone}
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: '14px',
                  border: `1px solid ${theme.colors.borderLight}`,
                  backgroundColor: '#ffffff',
                  color: theme.colors.textMuted,
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Skip for Now — I'll do this later
              </button>
            </div>
          </>
        )}
      </div>

      {/* Photo Upload Sub-Modal */}
      {isUploadOpen && placeId !== 'offline' && (
        <UploadMenuPhotoModal
          placeId={placeId}
          placeName={placeName}
          onClose={() => setIsUploadOpen(false)}
          onSuccess={(photo) => {
            setUploadedPhotos((prev) => [...prev, photo]);
            setIsUploadOpen(false);
          }}
        />
      )}
    </div>
  );

  if (typeof document === 'undefined') return null;
  return ReactDOM.createPortal(modalContent, document.body);
};
