import React from 'react';
import { theme } from '../../../shared/styles/theme';
import { type PlaceInBounds, type ReportItem } from '../../../shared/types/geo';

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
        bottom: '24px',
        left: '24px',
        right: '24px',
        maxWidth: '400px',
        backgroundColor: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
        padding: '24px',
        zIndex: 1000,
        fontFamily: theme.fonts.body,
        color: theme.colors.textDark,
        animation: 'slideUp 0.3s ease-out',
        border: `2px solid ${theme.colors.softPink}`,
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
            background: 'none',
            border: 'none',
            fontSize: '22px',
            cursor: 'pointer',
            color: theme.colors.textMuted,
            padding: '4px',
            lineHeight: 1,
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
            onClick={() => alert('Add place form coming in the next step! 🐾')}
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
              <p style={{ fontSize: '12px', color: theme.colors.textMuted, fontStyle: 'italic' }}>
                No reports submitted yet.
              </p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {reports.map((report, idx) => (
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
                    {report.notes && (
                      <p style={{ color: theme.colors.textDark, margin: 0, fontStyle: 'italic' }}>
                        "{report.notes}"
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
};
