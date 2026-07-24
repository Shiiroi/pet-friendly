import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { theme } from '../../../shared/styles/theme';
import type { WeeklyOperatingHours } from '../types/hours';
import { StoreHoursFormInput } from './StoreHoursFormInput';
import { supabase } from '../../../shared/api/supabase-client';
import { getDefaultOperatingHours } from '../../../shared/utils/operating-hours';

interface EditStoreHoursModalProps {
  placeId: string;
  placeName: string;
  initialHours?: WeeklyOperatingHours | null;
  onClose: () => void;
  onSuccess: (updatedHours: WeeklyOperatingHours) => void;
}

export const EditStoreHoursModal: React.FC<EditStoreHoursModalProps> = ({
  placeId,
  placeName,
  initialHours,
  onClose,
  onSuccess,
}) => {
  const [hours, setHours] = useState<WeeklyOperatingHours>(() => initialHours || getDefaultOperatingHours());
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.rpc('update_place_operating_hours', {
        p_place_id: placeId,
        p_operating_hours: hours as any,
      });

      if (error) {
        console.error('[Supabase RPC Error] Failed to update operating hours:', error);
        throw new Error(error.message || 'Failed to update store hours.');
      }

      onSuccess(hours);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred while saving.');
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
        backgroundColor: 'rgba(0,0,0,0.6)',
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
          position: 'relative',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: theme.colors.textDark, fontFamily: theme.fonts.heading }}>
              Update Store Hours
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
              marginBottom: '12px',
              fontWeight: 500,
            }}
          >
            {errorMsg}
          </div>
        )}

        <StoreHoursFormInput value={hours} onChange={setHours} />

        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
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
            onClick={handleSave}
            disabled={isSaving}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: theme.colors.terracotta,
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 700,
              cursor: isSaving ? 'wait' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(224, 122, 95, 0.3)',
              fontFamily: theme.fonts.heading,
            }}
          >
            {isSaving ? 'Saving...' : 'Save Hours'}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return ReactDOM.createPortal(modalContent, document.body);
};
