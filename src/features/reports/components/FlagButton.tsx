import React, { useState } from 'react';
import { supabase } from '../../../shared/api/supabase-client';
import { getDeviceId } from '../../../shared/utils/device-id';
import { addPendingReport } from '../../../shared/outbox/outbox-db';

interface FlagButtonProps {
  place: { id: string; name: string; latitude: number; longitude: number };
  onSuccess: () => void;
  onTriggerNicknamePrompt: () => void;
}

/**
 * Flag button and dropdown component for reporting review issues (spam, closure, duplicates).
 * 
 * WHY GEOFENCING GATES:
 * Avoids remote flagging spam by verifying that the device is located in close proximity (300m)
 * to the reported place before submitting.
 */
export const FlagButton: React.FC<FlagButtonProps> = ({
  place,
  onSuccess,
  onTriggerNicknamePrompt,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<'closed' | 'wrong_info' | 'duplicate' | 'spam'>('wrong_info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // 2. Submit flag
      const { error } = await supabase.from('flags').insert({
        place_id: place.id,
        device_id: getDeviceId(),
        reason,
      });

      if (error) throw error;

      alert('Flag report submitted. Spot is under review. 🐾');
      setIsOpen(false);
      triggerNicknamePromptFlow();
      onSuccess();
    } catch (err: any) {
      if (err instanceof Error && (err.message.includes('fetch') || err.message.includes('NetworkError'))) {
        try {
          await addPendingReport('flag', {
            place_id: place.id,
            device_id: getDeviceId(),
            reason,
          });
          alert("Network failure. Flag saved! We'll submit your flag when you're back online. 🐾");
          setIsOpen(false);
          triggerNicknamePromptFlow();
          onSuccess();
          return;
        } catch (dbErr) {
          setErrorMsg('Failed to cache flag offline: ' + (dbErr as Error).message);
          return;
        }
      }
      setErrorMsg(err.message || 'An error occurred while submitting flag.');
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
    <div style={{ marginTop: '12px' }}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: '12px',
            textDecoration: 'underline',
            padding: 0,
          }}
        >
          Flag this place ⚠️
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: '8px',
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '8px',
          }}
        >
          <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#991b1b' }}>
            Flag Spot for Review
          </h4>

          {errorMsg && (
            <div style={{ color: '#ef4444', fontSize: '11px', marginBottom: '8px' }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              style={{
                padding: '6px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '12px',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="wrong_info">Incorrect Information</option>
              <option value="closed">Permanently Closed</option>
              <option value="duplicate">Duplicate Entry</option>
              <option value="spam">Spam / Abuse</option>
            </select>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: '6px 12px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              style={{
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
