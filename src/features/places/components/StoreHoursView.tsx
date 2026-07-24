import React, { useState } from 'react';
import { theme } from '../../../shared/styles/theme';
import { DAYS_OF_WEEK, DAY_LABELS } from '../types/hours';
import type { WeeklyOperatingHours } from '../types/hours';
import {
  formatDaySchedule,
  getCurrentDayOfWeek,
  getOperatingStatus,
} from '../../../shared/utils/operating-hours';
import { FaChevronDown, FaChevronUp, FaEdit } from 'react-icons/fa';

interface StoreHoursViewProps {
  hours?: WeeklyOperatingHours | null;
  onEditClick?: () => void;
}

export const StoreHoursView: React.FC<StoreHoursViewProps> = ({ hours, onEditClick }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!hours) {
    return null;
  }

  const status = getOperatingStatus(hours);
  const currentDay = getCurrentDayOfWeek();

  let statusBadgeColor = theme.colors.allowed;
  let statusText = 'Open now';

  if (status.state === 'open') {
    if (status.is24Hours) {
      statusText = 'Open 24 hours';
    } else if (status.closesAt) {
      statusText = `Open • Closes at ${status.closesAt}`;
    }
  } else if (status.state === 'closing_soon') {
    statusBadgeColor = theme.colors.tan;
    statusText = `Closing soon • Closes at ${status.closesAt} (${status.minutesRemaining}m left)`;
  } else if (status.state === 'closed') {
    statusBadgeColor = theme.colors.notAllowed;
    if (status.opensAt) {
      statusText = `Closed • Opens ${status.opensAt} (${status.opensDay || 'soon'})`;
    } else {
      statusText = 'Closed';
    }
  } else if (status.state === 'opening_soon') {
    statusBadgeColor = theme.colors.tan;
    statusText = `Opening soon • Opens at ${status.opensAt}`;
  }

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: `1.5px solid ${theme.colors.borderLight}`,
        marginTop: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      }}
    >
      {/* Status Bar Header */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 14px',
          cursor: 'pointer',
          userSelect: 'none',
          backgroundColor: isExpanded ? '#FAF9F6' : '#ffffff',
          transition: 'background-color 0.2s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '10px',
              height: '10px',
            }}
          >
            <span
              style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                backgroundColor: statusBadgeColor,
                opacity: 0.75,
                animation: status.state === 'open' ? 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite' : 'none',
              }}
            />
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: statusBadgeColor,
              }}
            />
          </span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: theme.colors.textDark,
                fontFamily: theme.fonts.body,
              }}
            >
              {statusText}
            </span>
            <span style={{ fontSize: '11px', color: theme.colors.textMuted }}>
              Today: {formatDaySchedule(hours[currentDay])}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onEditClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: theme.colors.terracotta,
                padding: '4px 6px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
              title="Edit Store Hours"
            >
              <FaEdit />
            </button>
          )}
          <span style={{ color: theme.colors.textMuted, fontSize: '12px' }}>
            {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
          </span>
        </div>
      </div>

      {/* Expanded Weekly Schedule Table */}
      {isExpanded && (
        <div
          style={{
            padding: '12px 14px 14px 14px',
            borderTop: `1px solid ${theme.colors.borderLight}`,
            backgroundColor: '#FAFAFA',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: theme.colors.textMuted,
              }}
            >
              Weekly Schedule
            </span>
            {onEditClick && (
              <button
                type="button"
                onClick={onEditClick}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: theme.colors.terracotta,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Suggest edit
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {DAYS_OF_WEEK.map((day) => {
              const isToday = day === currentDay;
              const sched = hours[day];
              const schedText = formatDaySchedule(sched);

              return (
                <div
                  key={day}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '5px 8px',
                    borderRadius: '8px',
                    backgroundColor: isToday ? theme.colors.softPink : 'transparent',
                    borderLeft: isToday ? `3px solid ${theme.colors.terracotta}` : '3px solid transparent',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: isToday ? 700 : 500,
                      color: isToday ? theme.colors.terracotta : theme.colors.textDark,
                      width: '90px',
                    }}
                  >
                    {DAY_LABELS[day]}
                  </span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: isToday ? 600 : 400,
                      color: sched?.isClosed
                        ? theme.colors.notAllowed
                        : isToday
                        ? theme.colors.textDark
                        : theme.colors.textMuted,
                    }}
                  >
                    {schedText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
