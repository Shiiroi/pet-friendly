import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { FaGlassCheers, FaBone, FaClock, FaCamera, FaTimesCircle, FaMagic } from 'react-icons/fa';
import { theme } from '../../../shared/styles/theme';
import { supabase } from '../../../shared/api/supabase-client';
import type { WeeklyOperatingHours } from '../types/hours';
import { StoreHoursFormInput } from './StoreHoursFormInput';
import type { MenuPhoto } from '../../../shared/types/pet-menu';
import { getDeviceId } from '../../../shared/utils/device-id';

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

  // Hours & Pet menu state
  const [petMenu, setPetMenu] = useState<'yes' | 'no' | null>(null);
  const [hours, setHours] = useState<WeeklyOperatingHours | null>(autoHours || null);
  const [uploadedPhotos, setUploadedPhotos] = useState<MenuPhoto[]>([]);

  // Inline photo upload state
  const [photoCategory, setPhotoCategory] = useState<'pet_menu' | 'regular_menu'>('pet_menu');
  const [photoCaption, setPhotoCaption] = useState('');
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setPhotoError('Please select a valid image file.');
      return;
    }
    setPhotoError(null);
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFilePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadPhoto = async () => {
    if (!filePreview || !selectedFile) return;
    setIsPhotoUploading(true);
    setPhotoError(null);

    try {
      const photoRecord: MenuPhoto = {
        id: `photo-${crypto.randomUUID()}`,
        url: filePreview,
        category: photoCategory,
        caption: photoCaption.trim() || undefined,
        uploaded_at: new Date().toISOString(),
        device_id: getDeviceId(),
      };

      const { error: rpcError } = await (supabase.rpc as any)('add_place_menu_photo', {
        p_place_id: placeId,
        p_photo: photoRecord as any,
      });

      if (rpcError) throw rpcError;

      setUploadedPhotos((prev) => [...prev, photoRecord]);
      setSelectedFile(null);
      setFilePreview(null);
      setPhotoCaption('');
    } catch (err: any) {
      setPhotoError(err.message || 'Failed to upload photo.');
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const handleSaveDetails = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      // Update pet menu vote if user picked something
      if (petMenu) {
        await (supabase.rpc as any)('create_pet_policy_report', {
          p_place_id: placeId,
          p_device_id: getDeviceId(),
          p_claim: null,
          p_pet_menu: petMenu,
          p_price_range: null,
          p_notes: null,
        });
      }

      // Update operating hours if provided
      if (hours) {
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

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

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
        justifyContent: isMobile ? 'flex-end' : 'center',
        alignItems: 'center',
        zIndex: 9999,
        padding: isMobile ? '0 0 env(safe-area-inset-bottom, 0px) 0' : '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: isMobile ? '28px 28px 0 0' : '24px',
          padding: isMobile ? '24px 20px 32px' : '28px 24px',
          width: '100%',
          maxWidth: '480px',
          fontFamily: theme.fonts.body,
          boxSizing: 'border-box',
          boxShadow: isMobile ? '0 -10px 40px rgba(0,0,0,0.15)' : '0 10px 40px rgba(0,0,0,0.2)',
          maxHeight: isMobile ? '90vh' : '85vh',
          overflowY: 'auto',
          position: 'relative',
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: theme.colors.textDark, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FaBone color={theme.colors.terracotta} size={14} /> Does this place have a pet menu?
                </p>
                {petMenu && (
                  <button
                    type="button"
                    onClick={() => setPetMenu(null)}
                    style={{ background: 'none', border: 'none', color: theme.colors.notAllowed, fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    Clear
                  </button>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'yes', label: 'Yes 🐾', icon: null },
                  { id: 'no', label: 'No', icon: <FaTimesCircle size={12} /> },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPetMenu(petMenu === opt.id ? null : (opt.id as any))}
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

            {/* Operating Hours — direct input without redundant title */}
            <div style={{ marginBottom: '18px' }}>
              {(autoHours || hours) && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', padding: '0 4px' }}>
                  {autoHours ? (
                    <span style={{ fontSize: '11px', color: theme.colors.terracotta, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FaClock size={11} /> Auto-filled from location search
                    </span>
                  ) : <span />}
                  {hours && (
                    <button
                      type="button"
                      onClick={() => setHours(null)}
                      style={{ background: 'none', border: 'none', color: theme.colors.notAllowed, fontSize: '11px', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                    >
                      Clear Hours
                    </button>
                  )}
                </div>
              )}
              <StoreHoursFormInput value={hours} onChange={setHours} />
            </div>

            {/* Menu Photos Inline Upload */}
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: theme.colors.textDark, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FaCamera color={theme.colors.terracotta} size={14} /> Menu Photos
              </p>

              {uploadedPhotos.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', marginBottom: '10px' }}>
                  {uploadedPhotos.map((p) => (
                    <div key={p.id} style={{ width: '64px', height: '64px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: p.category === 'pet_menu' ? `2px solid ${theme.colors.terracotta}` : `1px solid ${theme.colors.borderLight}`, position: 'relative' }}>
                      <img src={p.url} alt="Menu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      {p.category === 'pet_menu' && (
                        <span style={{ position: 'absolute', bottom: '2px', right: '2px', fontSize: '10px' }}>🐾</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {!filePreview ? (
                <label
                  style={{
                    width: '100%',
                    padding: '14px',
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
                    boxSizing: 'border-box',
                  }}
                >
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  <FaCamera size={14} /> Tap to add photo (Menu board, pet menu)
                </label>
              ) : (
                <div style={{ padding: '12px', borderRadius: '14px', border: `1px solid ${theme.colors.softPink}`, backgroundColor: '#fffcfb', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0 }}>
                      <img src={filePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setPhotoCategory('pet_menu')}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: photoCategory === 'pet_menu' ? `1.5px solid ${theme.colors.terracotta}` : `1px solid ${theme.colors.borderLight}`,
                            backgroundColor: photoCategory === 'pet_menu' ? theme.colors.softPink : '#ffffff',
                            color: photoCategory === 'pet_menu' ? theme.colors.terracotta : theme.colors.textDark,
                            cursor: 'pointer',
                          }}
                        >
                          🐾 Pet Menu
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoCategory('regular_menu')}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: photoCategory === 'regular_menu' ? `1.5px solid ${theme.colors.terracotta}` : `1px solid ${theme.colors.borderLight}`,
                            backgroundColor: photoCategory === 'regular_menu' ? theme.colors.softPink : '#ffffff',
                            color: photoCategory === 'regular_menu' ? theme.colors.terracotta : theme.colors.textDark,
                            cursor: 'pointer',
                          }}
                        >
                          🍽️ Regular Menu
                        </button>
                      </div>
                      <input
                        type="text"
                        value={photoCaption}
                        onChange={(e) => setPhotoCaption(e.target.value)}
                        placeholder="Caption (e.g. Pet drinks & treats)..."
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: `1px solid ${theme.colors.borderLight}`,
                          fontSize: '12px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  {photoError && (
                    <div style={{ color: theme.colors.notAllowed, fontSize: '11px', fontWeight: 500 }}>
                      {photoError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleUploadPhoto}
                      disabled={isPhotoUploading}
                      style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '8px',
                        backgroundColor: theme.colors.terracotta,
                        color: '#ffffff',
                        border: 'none',
                        fontWeight: 700,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      {isPhotoUploading ? 'Uploading...' : 'Save Photo 🐾'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        setFilePreview(null);
                      }}
                      disabled={isPhotoUploading}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        backgroundColor: '#ffffff',
                        color: theme.colors.textMuted,
                        border: `1px solid ${theme.colors.borderLight}`,
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
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
    </div>
  );

  if (typeof document === 'undefined') return null;
  return ReactDOM.createPortal(modalContent, document.body);
};
