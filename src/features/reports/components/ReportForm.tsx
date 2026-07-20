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
  const [petMenu, setPetMenu] = useState<'yes' | 'no' | 'unsure'>('unsure');
  const [priceRange, setPriceRange] = useState<'budget' | 'mid' | 'splurge'>('mid');
  const [reqDiaper, setReqDiaper] = useState(true);
  const [reqCaged, setReqCaged] = useState(false);
  const [reqStroller, setReqStroller] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const reqs: string[] = [];
    if (reqDiaper) reqs.push('diaper');
    if (reqCaged) reqs.push('caged');
    if (reqStroller) reqs.push('stroller');

    const formattedRequirements = reqs.join(', ');

    // Map UI petMenu 'unsure' to database value 'not_sure'
    const dbPetMenu = petMenu === 'unsure' ? 'not_sure' : petMenu;

    // Validate inputs using Zod
    const validation = reportSchema.safeParse({ claim, pet_menu: dbPetMenu, price_range: priceRange, notes: formattedRequirements });
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
        pet_menu: dbPetMenu,
        price_range: priceRange,
        notes: formattedRequirements,
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

      const { error } = await supabase.from('pet_policy_reports').insert(payload as any);
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
            pet_menu: dbPetMenu,
            price_range: priceRange,
            notes: formattedRequirements,
          });
          alert("Network failure. Saved! We'll submit your report when you're back online. 🐾");
          triggerNicknamePromptFlow();
          onSuccess();
          onClose();
          return;
        } catch (dbErr) {
          setErrorMsg('Failed to cache report offline: ' + (dbErr as Error).message);
          return;
        }
      }
      setErrorMsg(err.message || 'An error occurred while submitting your report.');
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
