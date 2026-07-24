import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { theme } from '../../../shared/styles/theme';
import type { MenuPhoto, MenuPhotoCategory } from '../../../shared/types/pet-menu';
import { supabase } from '../../../shared/api/supabase-client';
import { getDeviceId } from '../../../shared/utils/device-id';
import { uuidv4 } from '../../../shared/utils/uuid';

interface UploadMenuPhotoModalProps {
  placeId: string;
  placeName: string;
  onClose: () => void;
  onSuccess: (newPhoto: MenuPhoto) => void;
}

export const UploadMenuPhotoModal: React.FC<UploadMenuPhotoModalProps> = ({
  placeId,
  placeName,
  onClose,
  onSuccess,
}) => {
  const [category, setCategory] = useState<MenuPhotoCategory>('pet_menu');
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setErrorMsg('Image size must be less than 10MB.');
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!previewUrl) {
      setErrorMsg('Please select a menu photo to upload.');
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      let finalPhotoUrl = previewUrl;

      // Try uploading to Supabase storage bucket 'menu-photos' if available
      try {
        const fileExt = selectedFile?.name.split('.').pop() || 'jpg';
        const fileName = `${placeId}/${uuidv4()}.${fileExt}`;
        
        if (selectedFile) {
          const { error: uploadError } = await supabase.storage
            .from('menu-photos')
            .upload(fileName, selectedFile, { upsert: true });

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('menu-photos')
              .getPublicUrl(fileName);
            if (publicUrlData?.publicUrl) {
              finalPhotoUrl = publicUrlData.publicUrl;
            }
          }
        }
      } catch (storageErr) {
        console.warn('[Storage Bucket Warning] Falling back to Data URL storage:', storageErr);
      }

      const photoRecord: MenuPhoto = {
        id: `photo-${uuidv4()}`,
        url: finalPhotoUrl,
        category,
        caption: caption.trim() || undefined,
        uploaded_at: new Date().toISOString(),
        device_id: getDeviceId(),
      };

      const { error: rpcError } = await (supabase.rpc as any)('add_place_menu_photo', {
        p_place_id: placeId,
        p_photo: photoRecord as any,
      });

      if (rpcError) {
        console.error('[Supabase RPC Error] Failed to add menu photo:', rpcError);
        throw new Error(rpcError.message || 'Failed to save menu photo.');
      }

      onSuccess(photoRecord);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred during upload.');
    } finally {
      setIsUploading(false);
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
        backgroundColor: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        boxSizing: 'border-box',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '20px',
          maxWidth: '440px',
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          fontFamily: theme.fonts.body,
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: theme.colors.textDark, fontFamily: theme.fonts.heading }}>
              Upload Menu Photo 📷
            </h3>
            <p style={{ fontSize: '12px', color: theme.colors.textMuted, margin: '2px 0 0 0' }}>
              {placeName}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#f3f4f6',
              border: 'none',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: theme.colors.textDark,
            }}
          >
            &times;
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#FFEBEE',
              color: theme.colors.notAllowed,
              borderRadius: '10px',
              fontSize: '12px',
              marginBottom: '14px',
              fontWeight: 500,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Category Selector Tab */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme.colors.textDark, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Menu Category Tag
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setCategory('pet_menu')}
              style={{
                padding: '12px',
                borderRadius: '14px',
                border: category === 'pet_menu' ? `2px solid ${theme.colors.terracotta}` : `1px solid ${theme.colors.borderLight}`,
                backgroundColor: category === 'pet_menu' ? theme.colors.softPink : '#ffffff',
                color: category === 'pet_menu' ? theme.colors.terracotta : theme.colors.textDark,
                fontWeight: category === 'pet_menu' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              🐾 Pet Menu Photo
            </button>

            <button
              type="button"
              onClick={() => setCategory('regular_menu')}
              style={{
                padding: '12px',
                borderRadius: '14px',
                border: category === 'regular_menu' ? `2px solid ${theme.colors.terracotta}` : `1px solid ${theme.colors.borderLight}`,
                backgroundColor: category === 'regular_menu' ? theme.colors.softPink : '#ffffff',
                color: category === 'regular_menu' ? theme.colors.terracotta : theme.colors.textDark,
                fontWeight: category === 'regular_menu' ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              🍽️ Regular Menu Photo
            </button>
          </div>
        </div>

        {/* Image Picker Dropzone */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme.colors.textDark, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Photo File
          </label>
          <input
            type="file"
            accept="image/*"
            id="menu-photo-file-input"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {previewUrl ? (
            <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${theme.colors.borderLight}`, maxHeight: '200px' }}>
              <img src={previewUrl} alt="Menu preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                &times;
              </button>
            </div>
          ) : (
            <label
              htmlFor="menu-photo-file-input"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                borderRadius: '16px',
                border: `2px dashed ${theme.colors.terracotta}`,
                backgroundColor: '#fffcfb',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📷</div>
              <span style={{ fontSize: '13px', fontWeight: 700, color: theme.colors.terracotta }}>
                Tap to Select or Take Photo
              </span>
              <span style={{ fontSize: '11px', color: theme.colors.textMuted, marginTop: '2px' }}>
                PNG, JPG, WEBP up to 10MB
              </span>
            </label>
          )}
        </div>

        {/* Optional Caption Input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: theme.colors.textDark, marginBottom: '6px' }}>
            Photo Caption / Description (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Doggy Treats & Puppuccino Menu Board"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '12px',
              border: `1px solid ${theme.colors.borderLight}`,
              fontSize: '13px',
              boxSizing: 'border-box',
              backgroundColor: '#ffffff',
              color: theme.colors.textDark,
            }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: `1px solid ${theme.colors.borderLight}`,
              backgroundColor: '#ffffff',
              color: theme.colors.textDark,
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || !previewUrl}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: theme.colors.terracotta,
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: isUploading || !previewUrl ? 'not-allowed' : 'pointer',
              opacity: isUploading || !previewUrl ? 0.6 : 1,
              boxShadow: '0 4px 12px rgba(224, 122, 95, 0.3)',
              fontFamily: theme.fonts.heading,
            }}
          >
            {isUploading ? 'Uploading...' : 'Save Menu Photo'}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return ReactDOM.createPortal(modalContent, document.body);
};
