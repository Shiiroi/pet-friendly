import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { FaBone, FaClock, FaCamera, FaTimesCircle, FaQuestionCircle, FaExclamationTriangle, FaUsers, FaCalendarAlt, FaFlag } from 'react-icons/fa';
import { theme } from '../../../shared/styles/theme';
import { type PlaceInBounds, type ReportItem } from '../../../shared/types/geo';
import { getDeviceId } from '../../../shared/utils/device-id';
import { supabase } from '../../../shared/api/supabase-client';
import { getConfidenceStyle } from '../../../shared/utils/confidence-color';
import { StatusCard } from '../../../shared/components/StatusCard';
import { StoreHoursView } from './StoreHoursView';
import { EditStoreHoursModal } from './EditStoreHoursModal';
import { UploadMenuPhotoModal } from './UploadMenuPhotoModal';
import type { WeeklyOperatingHours } from '../types/hours';

interface PlaceDetailProps {
  /** The selected place record data. Can be a DB place or a temporary geocoded ghost place. */
  place: PlaceInBounds | { name: string; address: string; latitude: number; longitude: number };
  /** Indicator showing if the place is a geocoded address not yet tracked in the database. */
  isGhost?: boolean;
  /** Callback triggered when closing the detail card. */
  onClose: () => void;
  /** The policy reports submitted for this place. */
  reports: ReportItem[];
  /** Fetch state indicator. */
  isLoading: boolean;
  /** Fetch error state. */
  error: any;
  /** Callback triggered to suggest a policy report. */
  onReportClick?: () => void;
  /** Callback triggered to flag a spot. */
  onFlagClick?: () => void;
  /** Callback triggered to add a place to the directory. */
  onAddPlaceClick?: () => void;
}

/**
 * Renders the detail panel for a selected pet-friendly place,
 * listing its policy confirmation metrics and historical user reports.
 * Also supports displaying placeholders for untracked geocoded locations ("ghost" pins).
 */
export const PlaceDetail: React.FC<PlaceDetailProps> = ({
  place,
  isGhost = false,
  onClose,
  reports,
  onReportClick,
  onFlagClick,
  onAddPlaceClick,
}) => {
  const claimLabels: Record<string, string> = {
    allowed: 'Allowed',
    not_allowed: 'Not Allowed',
    outdoor_only: 'Outdoor Only',
  };

  const petMenuLabels: Record<string, string> = {
    yes: 'Has Pet Menu',
    no: 'No Pet Menu',
    not_sure: 'Unsure',
  };

  const priceRangeLabels: Record<string, string> = {
    budget: 'Budget-Friendly',
    mid: 'Mid-Range',
    splurge: 'Splurge-Worthy',
  };

  const reqLabels: Record<string, string> = {
    diaper: 'Diapers',
    caged: 'Caged',
    stroller: 'Stroller/Carrier',
  };

  const dbPlace = !isGhost ? (place as PlaceInBounds) : null;
  const [isEditHoursOpen, setIsEditHoursOpen] = useState(false);
  const [localHours, setLocalHours] = useState<WeeklyOperatingHours | null | undefined>(dbPlace?.operating_hours);
  const [isUploadPhotoOpen, setIsUploadPhotoOpen] = useState(false);
  const [petMenuVote, setPetMenuVote] = useState<'yes' | 'no' | 'not_sure' | null>(null);
  const [isPetMenuModalOpen, setIsPetMenuModalOpen] = useState(false);
  const [isPetMenuSubmitting, setIsPetMenuSubmitting] = useState(false);

  useEffect(() => {
    setLocalHours(dbPlace?.operating_hours);
  }, [dbPlace?.operating_hours]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        right: '20px',
        maxWidth: '380px',
        maxHeight: 'calc(100% - 40px)',
        overflowY: 'auto',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
        padding: '20px',
        zIndex: 1000,
        fontFamily: theme.fonts.body,
        color: theme.colors.textDark,
        animation: 'slideUp 0.3s ease-out',
        border: `2px solid ${theme.colors.softPink}`,
        boxSizing: 'border-box',
      }}
    >
      {/* Category Tags & Close button row */}
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '12px', minHeight: '32px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', paddingRight: '36px', paddingLeft: '36px' }}>
          {isGhost ? (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                backgroundColor: theme.colors.softPink,
                padding: '4px 10px',
                borderRadius: '8px',
                color: theme.colors.terracotta,
                fontFamily: theme.fonts.heading,
                display: 'inline-block',
              }}
            >
              Untracked Spot
            </span>
          ) : dbPlace?.categories && dbPlace.categories.length > 0 ? (
            dbPlace.categories.map((cat) => (
              <span
                key={cat}
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  backgroundColor: theme.colors.softPink,
                  padding: '4px 10px',
                  borderRadius: '8px',
                  color: theme.colors.terracotta,
                  fontFamily: theme.fonts.heading,
                  display: 'inline-block',
                }}
              >
                {cat}
              </span>
            ))
          ) : (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                backgroundColor: theme.colors.softPink,
                padding: '4px 10px',
                borderRadius: '8px',
                color: theme.colors.terracotta,
                fontFamily: theme.fonts.heading,
                display: 'inline-block',
              }}
            >
              General
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
            position: 'absolute',
            right: 0,
            background: '#f3f4f6',
            border: 'none',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            cursor: 'pointer',
            color: theme.colors.textDark,
            boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
            padding: 0,
            lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>

      {/* Main Place Header Details */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <h2
          style={{
            fontSize: '22px',
            fontWeight: 700,
            margin: '0 0 6px 0',
            color: theme.colors.textDark,
            fontFamily: theme.fonts.heading,
          }}
        >
          {place.name}
        </h2>
        <p style={{ fontSize: '13px', color: theme.colors.textMuted, margin: '0' }}>
          {place.address}
        </p>

        {!isGhost && (
          <StoreHoursView
            hours={localHours}
            onEditClick={dbPlace ? () => setIsEditHoursOpen(true) : undefined}
          />
        )}
      </div>

      {isGhost ? (
        /* Ghost place submission prompt placeholder */
        <div style={{ borderTop: `1px solid ${theme.colors.borderLight}`, paddingTop: '16px', marginTop: '16px' }}>
          <p style={{ fontSize: '13px', color: theme.colors.textMuted, marginBottom: '16px', lineHeight: '1.5' }}>
            Help fellow pet parents find a place for their furbaby! This place hasn't been listed yet. Be the first to add it! 🐾
          </p>
          <button
            onClick={onAddPlaceClick}
            style={{
              width: '100%',
              backgroundColor: theme.colors.terracotta,
              color: '#ffffff',
              border: 'none',
              borderRadius: '20px',
              padding: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(224, 122, 95, 0.2)',
            }}
          >
            Add to Directory 🐾
          </button>
        </div>
      ) : (
        /* Database Place Details & Reviews timeline */
        <>
          <div
            style={{
              borderTop: `1px solid ${theme.colors.borderLight}`,
              borderBottom: `1px solid ${theme.colors.borderLight}`,
              padding: '16px 0',
              margin: '16px 0',
            }}
          >
            <h3
              style={{
                fontSize: '11px',
                fontWeight: 700,
                margin: '0 0 12px 0',
                color: theme.colors.textMuted,
                fontFamily: theme.fonts.heading,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Current Status
            </h3>

            {dbPlace && (() => {
              // 1. Primary Policy Badge (Highest visual priority)
              const policyDisputed = dbPlace.runner_up_agreeing_devices >= 2 &&
                (dbPlace.agreeing_devices - dbPlace.runner_up_agreeing_devices) <= 1;
              const policyConfirmed = dbPlace.agreeing_devices >= 2 && dbPlace.claim !== null && !policyDisputed;
              const policyStyle = getConfidenceStyle('policy', dbPlace.claim, dbPlace.agreeing_devices, dbPlace.runner_up_agreeing_devices);

              // Format conflict label when vote counts are close
              const policyLabel = policyDisputed && dbPlace.claim && dbPlace.runner_up_claim
                ? `${claimLabels[dbPlace.claim]} vs ${claimLabels[dbPlace.runner_up_claim]}`
                : (dbPlace.claim ? claimLabels[dbPlace.claim] : 'No policy reports');

              const policyMicrocopy = policyDisputed && dbPlace.claim
                ? `Contradictory (${dbPlace.agreeing_devices} vs ${dbPlace.runner_up_agreeing_devices})`
                : dbPlace.claim
                  ? policyConfirmed
                    ? `Verified by ${dbPlace.agreeing_devices}`
                    : `Reported by ${dbPlace.agreeing_devices}`
                  : 'No reports yet';

              const latestReportDate = reports && reports.length > 0
                ? new Date(Math.max(...reports.map((r) => new Date(r.created_at).getTime())))
                : null;
              const formattedLatestDate = latestReportDate
                ? latestReportDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : null;

              const getPriceValueColor = (val: string | null) => {
                if (val === 'budget') return '#2E7D32';
                if (val === 'mid') return '#EF6C00';
                if (val === 'splurge') return '#C62828';
                return theme.colors.textMuted;
              };

              const getPriceValueIcon = (val: string | null) => {
                if (val === 'budget') return '🐾';
                if (val === 'mid') return '🐾🐾';
                if (val === 'splurge') return '🐾🐾🐾';
                return null;
              };

              const getMenuValueColor = (val: string | null) => {
                if (val === 'yes') return '#2E7D32';
                if (val === 'no') return '#C62828';
                if (val === 'not_sure') return '#718096';
                return theme.colors.textMuted;
              };

              const getMenuValueIcon = (val: string | null) => {
                if (val === 'yes') return <FaBone />;
                if (val === 'no') return <FaTimesCircle />;
                if (val === 'not_sure') return <FaQuestionCircle />;
                return null;
              };

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Primary Policy Banner */}
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: '10px',
                      backgroundColor: policyStyle.backgroundColor,
                      border: `2px ${policyStyle.borderStyle} ${policyStyle.borderColor}`,
                      boxShadow: policyStyle.isSolid ? '0 4px 12px rgba(0,0,0,0.08)' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: policyStyle.isSolid ? 'rgba(255,255,255,0.9)' : theme.colors.textMuted,
                        }}
                      >
                        PET POLICY
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '18px',
                        fontWeight: 800,
                        color: policyStyle.textColor,
                      }}
                    >
                      {policyLabel}
                    </span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: policyDisputed
                            ? '#d97706'
                            : (policyStyle.isSolid ? 'rgba(255,255,255,0.95)' : theme.colors.textMuted),
                        }}
                      >
                        {policyDisputed ? <FaExclamationTriangle size={11} /> : <FaUsers size={11} />}
                        {policyMicrocopy}
                      </span>
                      {formattedLatestDate && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 500,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: policyDisputed
                              ? '#92400e'
                              : (policyStyle.isSolid ? 'rgba(255,255,255,0.9)' : theme.colors.textMuted),
                          }}
                        >
                          <FaCalendarAlt size={10} /> {formattedLatestDate}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Warm dispute helper — only shown when policy is actively contested */}
                  {policyDisputed && (
                    <p
                      style={{
                        fontSize: '11px',
                        color: '#92400e',
                        margin: '0',
                        fontStyle: 'italic',
                        lineHeight: '1.5',
                      }}
                    >
                      Contributors disagree -- help clarify by reporting what you know. 🐾
                    </p>
                  )}

                  {/* Details section */}
                  <div style={{ marginTop: '4px', borderTop: `1px solid ${theme.colors.borderLight}`, paddingTop: '16px' }}>
                    <h4
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        margin: '0 0 12px 0',
                        color: theme.colors.textMuted,
                        fontFamily: theme.fonts.heading,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      Details
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {(() => {
                        // Gather list of reported requirements with count of contributor tags
                        const getRequirementsList = () => {
                          if (!reports || reports.length === 0) return { predefined: [], custom: [] };
                          const seenDevices = new Set<string>();
                          const uniqueReports = reports.filter((r) => {
                            if (seenDevices.has(r.device_id)) return false;
                            seenDevices.add(r.device_id);
                            return true;
                          });

                          const predefinedCounts: Record<string, number> = {};

                          uniqueReports.forEach((r) => {
                            if (!r.notes) return;
                            const parts = r.notes.split(',').map((p) => p.trim());
                            parts.forEach((part) => {
                              if (part === 'diaper' || part === 'caged' || part === 'stroller') {
                                predefinedCounts[part] = (predefinedCounts[part] || 0) + 1;
                              } else if (part && part !== 'none') {
                                // ignore unknown/legacy values silently
                              }
                            });
                          });

                          return {
                            predefined: Object.entries(predefinedCounts).map(([key, count]) => ({ key, count })),
                          };
                        };

                        const reqData = getRequirementsList();
                        const hasReqs = reqData.predefined.length > 0;

                        return (
                          <>
                            {/* Price Range Card */}
                            <StatusCard
                              label="Price Range"
                              value={dbPlace.price_range ? priceRangeLabels[dbPlace.price_range] : null}
                              emptyText="No price reports"
                              valueColor={getPriceValueColor(dbPlace.price_range)}
                              valueIcon={getPriceValueIcon(dbPlace.price_range)}
                              agreeingDevices={dbPlace.price_range_agreeing_devices}
                              runnerUpAgreeingDevices={dbPlace.price_range_runner_up_agreeing_devices}
                            />

                            {/* Pet Menu Card */}
                            <StatusCard
                              label="Pet Menu"
                              value={dbPlace.pet_menu ? petMenuLabels[dbPlace.pet_menu] : null}
                              emptyText="No pet menu reports"
                              valueColor={getMenuValueColor(dbPlace.pet_menu)}
                              valueIcon={getMenuValueIcon(dbPlace.pet_menu)}
                              agreeingDevices={dbPlace.pet_menu_agreeing_devices}
                              runnerUpAgreeingDevices={dbPlace.pet_menu_runner_up_agreeing_devices}
                            />

                            {/* Pet Requirements Card — no overall confidence pill, wraps badges directly underneath the label */}
                            <StatusCard
                              label="Pet Requirements"
                              value={null}
                              emptyText="No requirements reported yet"
                              agreeingDevices={0}
                              hideConfidencePill
                            >
                              {hasReqs ? (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px', width: '100%' }}>
                                  {reqData.predefined.map(({ key, count }) => (
                                    <span
                                      key={key}
                                      style={{
                                        fontSize: '10px',
                                        color: theme.colors.textDark,
                                        backgroundColor: '#f1f5f9',
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        fontWeight: 500,
                                        border: '1px solid #e2e8f0',
                                        textAlign: 'left',
                                      }}
                                    >
                                      {reqLabels[key] ?? key} ({count})
                                    </span>
                                  ))}
                                </div>
                              ) : null}
                            </StatusCard>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {(() => {
            const userReported = reports.some((r) => r.device_id === getDeviceId());
            const ownReportsToday = reports.filter((r) => {
              if (r.device_id !== getDeviceId()) return false;
              const reportDate = new Date(r.created_at).toDateString();
              const todayDate = new Date().toDateString();
              return reportDate === todayDate;
            });
            const isRateLimited = ownReportsToday.length >= 2;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                <button
                  onClick={onReportClick}
                  disabled={isRateLimited}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: isRateLimited ? '#d1d5db' : theme.colors.terracotta,
                    color: isRateLimited ? '#9ca3af' : '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: isRateLimited ? 'not-allowed' : 'pointer',
                  }}
                >
                  {userReported ? 'Update Your Report 🐾' : 'Confirm or Suggest Correction 🐾'}
                </button>
                {isRateLimited && (
                  <p style={{ color: '#ef4444', fontSize: '11px', margin: '4px 0 0 0', textAlign: 'center', lineHeight: '1.4' }}>
                    You have already updated or suggested a report for this spot twice today. Please try again tomorrow! 🐾
                  </p>
                )}
              </div>
            );
          })()}

          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <button
              onClick={onFlagClick}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '11px',
                textDecoration: 'underline',
                padding: 0,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              Report Place <FaFlag size={10} />
            </button>
          </div>

          {/* ─── Help improve this listing CTA ─── */}
          <div
            style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: `1px solid ${theme.colors.borderLight}`,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <p style={{ fontSize: '11px', fontWeight: 700, color: theme.colors.textMuted, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Help improve this listing
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setIsEditHoursOpen(true)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '20px',
                  border: `1px solid ${localHours ? theme.colors.terracotta : theme.colors.borderLight}`,
                  backgroundColor: localHours ? theme.colors.softPink : '#f9fafb',
                  color: localHours ? theme.colors.terracotta : theme.colors.textDark,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <FaClock size={11} /> {localHours ? 'Edit Hours' : '+ Add Hours'}
              </button>

              <button
                type="button"
                onClick={() => { setPetMenuVote(null); setIsPetMenuModalOpen(true); }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '20px',
                  border: `1px solid ${theme.colors.borderLight}`,
                  backgroundColor: '#f9fafb',
                  color: theme.colors.textDark,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <FaBone size={11} /> Pet Menu?
              </button>

              <button
                type="button"
                onClick={() => setIsUploadPhotoOpen(true)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '20px',
                  border: `1px solid ${theme.colors.borderLight}`,
                  backgroundColor: '#f9fafb',
                  color: theme.colors.textDark,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <FaCamera size={11} /> Upload Menu Photo
              </button>
            </div>
          </div>
        </>
      )}

      {isEditHoursOpen && dbPlace && (
        <EditStoreHoursModal
          placeId={dbPlace.id}
          placeName={dbPlace.name}
          initialHours={localHours}
          onClose={() => setIsEditHoursOpen(false)}
          onSuccess={(updated) => setLocalHours(updated)}
        />
      )}

      {isUploadPhotoOpen && dbPlace && (
        <UploadMenuPhotoModal
          placeId={dbPlace.id}
          placeName={dbPlace.name}
          onClose={() => setIsUploadPhotoOpen(false)}
          onSuccess={() => {
            setIsUploadPhotoOpen(false);
          }}
        />
      )}

      {/* Pet Menu popup modal */}
      {isPetMenuModalOpen && dbPlace && ReactDOM.createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setIsPetMenuModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '24px 24px 0 0',
              padding: '24px 20px 36px',
              width: '100%',
              maxWidth: '480px',
              boxSizing: 'border-box',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div style={{ width: '36px', height: '4px', borderRadius: '2px', backgroundColor: '#e5e7eb', margin: '0 auto 20px' }} />

            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0', color: theme.colors.textDark, fontFamily: theme.fonts.heading, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <FaBone color={theme.colors.terracotta} size={16} /> Pet Menu?
            </h3>
            <p style={{ fontSize: '13px', color: theme.colors.textMuted, margin: '0 0 18px 0' }}>
              Does <strong>{dbPlace.name}</strong> have a dedicated pet menu (treats, puppuccinos, etc.)?
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginBottom: '18px' }}>
              {[
                { id: 'yes', label: 'Yes 🐾', sub: 'Has pet menu', icon: null },
                { id: 'no', label: 'No', sub: 'None offered', icon: <FaTimesCircle size={12} /> },
                { id: 'not_sure', label: 'Not Sure', sub: 'Unsure', icon: <FaQuestionCircle size={12} /> },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPetMenuVote(opt.id as any)}
                  style={{
                    padding: '14px 8px',
                    borderRadius: '14px',
                    border: petMenuVote === opt.id ? `2px solid ${theme.colors.terracotta}` : `1px solid ${theme.colors.borderLight}`,
                    backgroundColor: petMenuVote === opt.id ? theme.colors.softPink : '#ffffff',
                    color: petMenuVote === opt.id ? theme.colors.terracotta : theme.colors.textDark,
                    fontWeight: petMenuVote === opt.id ? 700 : 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {opt.label} {opt.icon}
                  </span>
                  <span style={{ fontSize: '10px', opacity: 0.7 }}>{opt.sub}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              disabled={!petMenuVote || isPetMenuSubmitting}
              onClick={async () => {
                if (!petMenuVote) return;
                setIsPetMenuSubmitting(true);
                try {
                  await (supabase.rpc as any)('create_pet_policy_report', {
                    p_place_id: dbPlace.id,
                    p_device_id: getDeviceId(),
                    p_claim: null,
                    p_pet_menu: petMenuVote,
                    p_price_range: null,
                    p_notes: null,
                  });
                  setIsPetMenuModalOpen(false);
                  setPetMenuVote(null);
                } catch {
                  // fail silently
                } finally {
                  setIsPetMenuSubmitting(false);
                }
              }}
              style={{
                width: '100%',
                padding: '15px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: petMenuVote ? theme.colors.terracotta : '#e5e7eb',
                color: petMenuVote ? '#ffffff' : '#9ca3af',
                fontSize: '15px',
                fontWeight: 700,
                cursor: petMenuVote ? 'pointer' : 'not-allowed',
                boxShadow: petMenuVote ? '0 4px 14px rgba(224,122,95,0.3)' : 'none',
                transition: 'all 0.2s ease',
                fontFamily: theme.fonts.heading,
              }}
            >
              {isPetMenuSubmitting ? 'Submitting...' : 'Submit Answer'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
