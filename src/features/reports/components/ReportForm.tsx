import React, { useState } from 'react';
import { supabase } from '../../../shared/api/supabase-client';
import { getDeviceId } from '../../../shared/utils/device-id';
import { addPendingReport } from '../../../shared/outbox/outbox-db';
import { reportSchema } from '../schemas/report-schema';

interface ReportFormProps {
  place: { id: string; name: string; latitude: number; longitude: number };
  onClose: () => void;
  onSuccess: () => void;
  onTriggerNicknamePrompt: () => void;
}

/**
 * Report form component for suggesting correction or confirming a pet policy.
 * 
 * WHY GEOFENCING & OUTBOX CAVEAT:
 * Proximity checks require active GPS. If the user is offline, we save the payload
 * to IndexedDB, to be synced when internet connectivity returns.
 */
export const ReportForm: React.FC<ReportFormProps> = ({
  place,
  onClose,
  onSuccess,
  onTriggerNicknamePrompt,
}) => {
  const [claim, setClaim] = useState<'allowed' | 'not_allowed' | 'outdoor_only'>('allowed');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    // Validate inputs using Zod
    const validation = reportSchema.safeParse({ claim, notes });
    if (!validation.success) {
      setErrorMsg(validation.error.issues[0].message);
      setIsSubmitting(false);
      return;
    }

    try {
      const deviceId = getDeviceId();
      const payload = {
        place_id: place.id,
        device_id: deviceId,
        claim,
        notes: notes.trim() || null,
      };

      // 2. Handle offline caching or online insert
      if (!navigator.onLine) {
        await addPendingReport('report', payload);
        alert("Offline status detected. Saved! We'll submit your report when you're back online. 🐾");
        triggerNicknamePromptFlow();
        onSuccess();
        onClose();
        return;
      }

      const { error } = await supabase.from('pet_policy_reports').insert(payload);
      if (error) throw error;

      triggerNicknamePromptFlow();
      onSuccess();
      onClose();
    } catch (err: any) {
      // Handle network offline errors gracefully via local IndexedDB fallback
      if (err instanceof Error && (err.message.includes('fetch') || err.message.includes('NetworkError'))) {
        try {
          await addPendingReport('report', {
            place_id: place.id,
            device_id: getDeviceId(),
            claim,
            notes: notes.trim() || null,
          });
          alert("Network failure. Saved! We'll submit your report when you're back online. 🐾");
          triggerNicknamePromptFlow();
          onSuccess();
          onClose();
        } catch (dbErr) {
          setErrorMsg('Failed to cache report offline: ' + (dbErr as Error).message);
        }
      } else {
        setErrorMsg(err.message || 'An error occurred during submission.');
      }
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
      <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>
        Report Policy for: {place.name}
      </h3>

      {errorMsg && (
        <div style={{ color: '#ef4444', backgroundColor: '#fee2e2', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '14px' }}>
            What is the pet policy?
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
              Allowed (Pets are welcome indoors)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
              <input
                type="radio"
                name="claim"
                value="outdoor_only"
                checked={claim === 'outdoor_only'}
                onChange={() => setClaim('outdoor_only')}
              />
              Outdoor Only (Pets allowed in al fresco areas only)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
              <input
                type="radio"
                name="claim"
                value="not_allowed"
                checked={claim === 'not_allowed'}
                onChange={() => setClaim('not_allowed')}
              />
              Not Allowed (No pets permitted at all)
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '14px' }}>
            Optional Notes / Context
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Needs diaper inside, or only small dogs allowed..."
            maxLength={100}
            rows={3}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid #ccc',
              backgroundColor: '#ffffff',
              color: '#1f2937',
              fontSize: '14px',
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Cancel
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
            {isSubmitting ? 'Submitting...' : 'Submit Report 🐾'}
          </button>
        </div>
      </form>
    </div>
  );
};
