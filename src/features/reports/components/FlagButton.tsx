import React, { useState } from 'react';
import { FaFlag } from 'react-icons/fa';
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

      alert('Report submitted. Spot is under review. 🐾');
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
          alert("Network failure. Report saved! We'll submit your report when you're back online. 🐾");
          setIsOpen(false);
          triggerNicknamePromptFlow();
          onSuccess();
          return;
        } catch (dbErr) {
          setErrorMsg('Failed to cache report offline: ' + (dbErr as Error).message);
          return;
        }
      }
      setErrorMsg(err.message || 'An error occurred while submitting report.');
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
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          Report Place <FaFlag size={11} />
        </button>
      ) : (
        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: '8px',
            padding: '16px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#991b1b', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FaFlag size={14} color="#dc2626" /> Report Place for Review
          </h4>

          {errorMsg && (
            <div style={{ color: '#dc2626', fontSize: '12px', fontWeight: 500 }}>
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#7f1d1d' }}>
              Reason for report:
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as any)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #fca5a5',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                color: '#1f2937',
                fontWeight: 600,
                cursor: 'pointer',
                boxSizing: 'border-box',
              }}
            >
              <option value="wrong_info">Incorrect Information</option>
              <option value="closed">Permanently Closed</option>
              <option value="duplicate">Duplicate Entry</option>
              <option value="spam">Spam / Abuse</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                flex: 1,
                padding: '11px',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 700,
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              style={{
                padding: '11px 16px',
                backgroundColor: '#ffffff',
                color: '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
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
