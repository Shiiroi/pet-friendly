import React from 'react';
import { theme } from '../styles/theme';
import { getConfidenceStyle } from '../utils/confidence-color';

interface StatusCardProps {
  /** Small muted header text above the value. */
  label: string;
  /** Human-readable value label. If null, renders children or emptyText. */
  value: string | null;
  /** Color specifically for the value text and icon/emoji. */
  valueColor?: string;
  /** Optional icon/emoji to show inline/next to the value text. */
  valueIcon?: React.ReactNode;
  /** Text to show if value is null and no custom children exist. */
  emptyText: string;
  /** Number of contributing devices who agreed on this consensus. */
  agreeingDevices: number;
  /** Number of devices for the runner-up option in case of dispute. */
  runnerUpAgreeingDevices?: number;
  /** Custom children row (e.g. requirement badge pills). */
  children?: React.ReactNode;
  /** Hide the confidence pill entirely (e.g., for Requirements). */
  hideConfidencePill?: boolean;
}

/**
 * Shared status card layout for Price Range, Pet Menu, and Pet Requirements.
 *
 * DESIGN REVISIONS:
 * 1. Removed the left-hand background-colored icon chip to clean up layout.
 * 2. Icons/emojis are now displayed inline, directly next to their value text,
 *    sharing the exact same custom color as the value text.
 * 3. Enforces strict left-alignment and vertical consistency across details.
 */
export const StatusCard: React.FC<StatusCardProps> = ({
  label,
  value,
  valueColor = theme.colors.textDark,
  valueIcon,
  emptyText,
  agreeingDevices,
  runnerUpAgreeingDevices = 0,
  children,
  hideConfidencePill = false,
}) => {
  const isDisputed = runnerUpAgreeingDevices >= 2 && 
                     (agreeingDevices - runnerUpAgreeingDevices) <= 1;
  const isConfirmed = agreeingDevices >= 2 && !isDisputed;
  const hasValue = value !== null;

  const valueType = label.toLowerCase().includes('price') ? 'price' : 'menu';
  const confStyle = getConfidenceStyle(valueType, hasValue ? value : null, agreeingDevices, runnerUpAgreeingDevices);

  const resolvedValueColor = isDisputed ? confStyle.valueTextColor : valueColor;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '10px 12px',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        border: isDisputed 
          ? `1px dashed ${confStyle.borderColor}` 
          : `1px solid ${theme.colors.borderLight}`,
        gap: '4px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Row: Label and Confidence Pill */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', width: '100%' }}>
        <span
          style={{
            fontSize: '11px',
            color: theme.colors.textMuted,
            fontWeight: 500,
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>

        {/* Confidence text — right-aligned, no background, just a small colored label */}
        {!hideConfidencePill && agreeingDevices > 0 && (
          <span
            style={{
              fontSize: '10px',
              fontWeight: 600,
              color: isDisputed ? confStyle.borderColor : (isConfirmed ? confStyle.borderColor : theme.colors.textMuted),
              flexShrink: 0,
              whiteSpace: 'nowrap',
            }}
          >
            {isDisputed 
              ? `⚠️ Disputed (${agreeingDevices} vs ${runnerUpAgreeingDevices})` 
              : (isConfirmed ? `✓ Confirmed (${agreeingDevices})` : `Reported (${agreeingDevices})`)}
          </span>
        )}
      </div>

      {/* Bottom Row: Value (with icon) or Children */}
      {value !== null ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              color: resolvedValueColor,
              textAlign: 'left',
            }}
          >
            {value}
          </span>
          {valueIcon && (
            <span style={{ display: 'inline-flex', alignItems: 'center', color: resolvedValueColor, fontSize: '14px', flexShrink: 0 }}>
              {valueIcon}
            </span>
          )}
        </div>
      ) : children ? (
        // Custom badge row container for requirements
        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'flex-start' }}>
          {children}
        </div>
      ) : (
        <span
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: theme.colors.textMuted,
            textAlign: 'left',
          }}
        >
          {emptyText}
        </span>
      )}
    </div>
  );
};
