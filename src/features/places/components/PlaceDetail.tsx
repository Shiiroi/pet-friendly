import React from 'react';
import { theme } from '../../../shared/styles/theme';
import { type PlaceInBounds, type ReportItem } from '../../../shared/types/geo';
import { getDeviceId } from '../../../shared/utils/device-id';

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
  isLoading,
  error,
  onReportClick,
  onFlagClick,
  onAddPlaceClick,
}) => {
  const claimLabels: Record<string, string> = {
    allowed: 'Allowed',
    not_allowed: 'Not Allowed',
    outdoor_only: 'Outdoor Only',
  };

  const claimColors: Record<string, string> = {
    allowed: theme.colors.allowed,
    not_allowed: theme.colors.notAllowed,
    outdoor_only: theme.colors.outdoorOnly,
  };

  const dbPlace = !isGhost ? (place as PlaceInBounds) : null;
  const isConfirmed = dbPlace ? dbPlace.agreeing_devices >= 2 && dbPlace.claim !== null : false;
  const statusLabel = dbPlace
    ? isConfirmed
      ? `Confirmed by ${dbPlace.agreeing_devices} contributors`
      : `Reported by ${dbPlace.agreeing_devices} contributor${
          dbPlace.agreeing_devices === 1 ? '' : 's'
        } -- not yet confirmed`
    : 'Not yet tracked in our directory';

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
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
            }}
          >
            {isGhost ? 'Untracked Spot' : (dbPlace?.category || 'General')}
          </span>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: 700,
              margin: '12px 0 6px 0',
              color: theme.colors.textDark,
              fontFamily: theme.fonts.heading,
            }}
          >
            {place.name}
          </h2>
          <p style={{ fontSize: '13px', color: theme.colors.textMuted, margin: '0 0 12px 0' }}>
            {place.address}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          style={{
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
            flexShrink: 0,
          }}
        >
          &times;
        </button>
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
              padding: '14px 0',
              margin: '14px 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: dbPlace?.claim ? claimColors[dbPlace.claim] : theme.colors.unconfirmed,
                }}
              />
              <span style={{ fontWeight: 600, fontSize: '15px' }}>
                Policy: {dbPlace?.claim ? claimLabels[dbPlace.claim] : 'No policy reports'}
              </span>
            </div>
            <span
              style={{
                fontSize: '12px',
                color: isConfirmed ? '#059669' : '#b45309',
                backgroundColor: isConfirmed ? '#ecfdf5' : '#fffbeb',
                padding: '4px 8px',
                borderRadius: '6px',
                fontWeight: 500,
                display: 'inline-block',
              }}
            >
              {statusLabel}
            </span>
          </div>

          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: '0 0 10px 0', color: theme.colors.textDark, fontFamily: theme.fonts.heading }}>
            Recent Policy Reports
          </h3>

          <div style={{ maxHeight: '140px', overflowY: 'auto', paddingRight: '4px' }}>
            {isLoading ? (
              <p style={{ fontSize: '12px', color: theme.colors.textMuted }}>Loading reports...</p>
            ) : error ? (
              <p style={{ fontSize: '12px', color: theme.colors.notAllowed }}>Failed to load reports.</p>
            ) : !reports || reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '12px 0', color: theme.colors.textMuted }}>
                <span style={{ fontSize: '18px', display: 'block', marginBottom: '2px' }}>🐾</span>
                <span style={{ fontSize: '11px', fontStyle: 'italic' }}>
                  No reports yet -- be the first to verify!
                </span>
              </div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {(() => {
                  const seenDevices = new Set<string>();
                  const uniqueReports = reports.filter((r) => {
                    if (seenDevices.has(r.device_id)) return false;
                    seenDevices.add(r.device_id);
                    return true;
                  });

                  return uniqueReports.map((report, idx) => {
                    const isOwnReport = report.device_id === getDeviceId();
                    return (
                      <li
                        key={idx}
                        style={{
                          padding: '10px',
                          borderRadius: '10px',
                          backgroundColor: theme.colors.background,
                          marginBottom: '8px',
                          fontSize: '12px',
                          borderLeft: `4px solid ${claimColors[report.claim]}`,
                          border: `1px solid ${theme.colors.borderLight}`,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontWeight: 700, color: claimColors[report.claim] }}>
                            {claimLabels[report.claim]}
                          </span>
                          <span style={{ color: theme.colors.textMuted, fontSize: '10px' }}>
                            {new Date(report.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div style={{ fontSize: '10px', color: theme.colors.textMuted, marginBottom: '6px' }}>
                          by {isOwnReport ? 'You' : (report.nickname || 'Guest Contributor')}
                        </div>
                        {report.notes && (
                          <p style={{ color: theme.colors.textDark, margin: 0, fontStyle: 'italic' }}>
                            "{report.notes}"
                          </p>
                        )}
                      </li>
                    );
                  });
                })()}
              </ul>
            )}
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
              }}
            >
              Flag this place ⚠️
            </button>
          </div>
        </>
      )}
    </div>
  );
};
