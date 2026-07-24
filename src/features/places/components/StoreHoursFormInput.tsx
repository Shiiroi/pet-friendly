import React, { useState } from 'react';
import { theme } from '../../../shared/styles/theme';
import { DAYS_OF_WEEK, DAY_LABELS } from '../types/hours';
import type {
  DayOfWeek,
  DaySchedule,
  WeeklyOperatingHours,
} from '../types/hours';
import { getDefaultOperatingHours } from '../../../shared/utils/operating-hours';
import { FaClock, FaCalendarAlt, FaCheckCircle, FaPlus, FaTrash } from 'react-icons/fa';

interface StoreHoursFormInputProps {
  value: WeeklyOperatingHours | null;
  onChange: (hours: WeeklyOperatingHours) => void;
}

export const StoreHoursFormInput: React.FC<StoreHoursFormInputProps> = ({
  value,
  onChange,
}) => {
  const hours = value || getDefaultOperatingHours();
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(['monday']);
  const [activeTab, setActiveTab] = useState<'presets' | 'edit'>('presets');

  const toggleDay = (day: DayOfWeek) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev; // keep at least 1 day selected
        return prev.filter((d) => d !== day);
      }
      return [...prev, day];
    });
  };

  const selectWeekdays = () => {
    setSelectedDays(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
    setActiveTab('edit');
  };

  const selectWeekends = () => {
    setSelectedDays(['saturday', 'sunday']);
    setActiveTab('edit');
  };

  const selectAllDays = () => {
    setSelectedDays([...DAYS_OF_WEEK]);
    setActiveTab('edit');
  };

  const updateSelectedDaysSchedule = (update: Partial<DaySchedule>) => {
    const newHours = { ...hours };
    selectedDays.forEach((day) => {
      newHours[day] = {
        ...newHours[day],
        ...update,
        slots: update.slots ? update.slots.map((s) => ({ ...s })) : newHours[day].slots,
      };
    });
    onChange(newHours);
  };

  const applyPreset247 = () => {
    const newHours = { ...hours };
    DAYS_OF_WEEK.forEach((day) => {
      newHours[day] = { isClosed: false, is24Hours: true, slots: [] };
    });
    onChange(newHours);
  };

  const applyPresetStandard = () => {
    const newHours = { ...hours };
    DAYS_OF_WEEK.forEach((day) => {
      newHours[day] = {
        isClosed: false,
        is24Hours: false,
        slots: [{ open: '09:00', close: '18:00' }],
      };
    });
    onChange(newHours);
  };

  const applyPresetWeekdaysAndWeekends = () => {
    const newHours = { ...hours };
    DAYS_OF_WEEK.forEach((day) => {
      if (day === 'saturday' || day === 'sunday') {
        newHours[day] = {
          isClosed: false,
          is24Hours: false,
          slots: [{ open: '10:00', close: '20:00' }],
        };
      } else {
        newHours[day] = {
          isClosed: false,
          is24Hours: false,
          slots: [{ open: '09:00', close: '18:00' }],
        };
      }
    });
    onChange(newHours);
  };

  // Primary day used to populate input field values
  const primaryDay = selectedDays[0] || 'monday';
  const currentSched = hours[primaryDay] || {
    isClosed: false,
    is24Hours: false,
    slots: [{ open: '09:00', close: '18:00' }],
  };

  const addSlot = () => {
    const slots = currentSched.slots ? currentSched.slots.map((s) => ({ ...s })) : [];
    slots.push({ open: '17:00', close: '21:00' });
    updateSelectedDaysSchedule({ slots, isClosed: false, is24Hours: false });
  };

  const removeSlot = (index: number) => {
    const slots = (currentSched.slots || []).filter((_, i) => i !== index);
    updateSelectedDaysSchedule({ slots });
  };

  const updateSlot = (index: number, field: 'open' | 'close', val: string) => {
    const slots = (currentSched.slots || []).map((slot, i) => {
      if (i === index) {
        return { ...slot, [field]: val };
      }
      return { ...slot };
    });
    updateSelectedDaysSchedule({ slots });
  };

  const formatSelectionHeader = () => {
    if (selectedDays.length === 7) return 'All 7 Days (Mon–Sun)';
    if (selectedDays.length === 5 && ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].every((d) => selectedDays.includes(d as DayOfWeek))) {
      return 'All Weekdays (Mon–Fri)';
    }
    if (selectedDays.length === 2 && selectedDays.includes('saturday') && selectedDays.includes('sunday')) {
      return 'Weekends (Sat & Sun)';
    }
    if (selectedDays.length === 1) return `${DAY_LABELS[selectedDays[0]]}`;
    return `${selectedDays.map((d) => DAY_LABELS[d].slice(0, 3)).join(', ')} (${selectedDays.length} days selected)`;
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        border: `1.5px solid ${theme.colors.softPink}`,
        padding: '16px',
        marginTop: '12px',
        marginBottom: '16px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '12px',
          color: theme.colors.terracotta,
          fontWeight: 700,
          fontSize: '15px',
          fontFamily: theme.fonts.heading,
        }}
      >
        <FaClock size={16} />
        <span>Store Operating Hours</span>
      </div>

      {/* Mode selection tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '14px',
          backgroundColor: '#F7FAFC',
          padding: '4px',
          borderRadius: '10px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'presets' ? '#ffffff' : 'transparent',
            color: activeTab === 'presets' ? theme.colors.terracotta : theme.colors.textMuted,
            boxShadow: activeTab === 'presets' ? '0 2px 5px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Quick Presets
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('edit')}
          style={{
            flex: 1,
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '8px',
            border: 'none',
            backgroundColor: activeTab === 'edit' ? '#ffffff' : 'transparent',
            color: activeTab === 'edit' ? theme.colors.terracotta : theme.colors.textMuted,
            boxShadow: activeTab === 'edit' ? '0 2px 5px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          Custom Day-by-Day
        </button>
      </div>

      {activeTab === 'presets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            onClick={applyPresetStandard}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: `1px solid ${theme.colors.borderLight}`,
              backgroundColor: '#FAFAFA',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: theme.colors.textDark }}>
                Standard Hours (9 AM – 6 PM)
              </div>
              <div style={{ fontSize: '11px', color: theme.colors.textMuted }}>
                Open 9:00 AM to 6:00 PM every day
              </div>
            </div>
            <FaCheckCircle style={{ color: theme.colors.allowed }} />
          </button>

          <button
            type="button"
            onClick={applyPresetWeekdaysAndWeekends}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: `1px solid ${theme.colors.borderLight}`,
              backgroundColor: '#FAFAFA',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: theme.colors.textDark }}>
                Weekdays 9–6 & Weekends 10–8
              </div>
              <div style={{ fontSize: '11px', color: theme.colors.textMuted }}>
                Standard weekdays, extended weekend hours
              </div>
            </div>
            <FaCalendarAlt style={{ color: theme.colors.terracotta }} />
          </button>

          <button
            type="button"
            onClick={applyPreset247}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: `1px solid ${theme.colors.borderLight}`,
              backgroundColor: '#FAFAFA',
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: theme.colors.textDark }}>
                Open 24/7
              </div>
              <div style={{ fontSize: '11px', color: theme.colors.textMuted }}>
                Open 24 hours every day of the week
              </div>
            </div>
            <FaClock style={{ color: theme.colors.tan }} />
          </button>
        </div>
      )}

      {/* Multi-day pill selector & quick group buttons */}
      <div style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.textMuted }}>
            Select day(s) to customize (multi-select enabled):
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={selectWeekdays}
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: theme.colors.terracotta,
                backgroundColor: theme.colors.softPink,
                border: 'none',
                borderRadius: '6px',
                padding: '2px 6px',
                cursor: 'pointer',
              }}
            >
              Weekdays
            </button>
            <button
              type="button"
              onClick={selectWeekends}
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: theme.colors.terracotta,
                backgroundColor: theme.colors.softPink,
                border: 'none',
                borderRadius: '6px',
                padding: '2px 6px',
                cursor: 'pointer',
              }}
            >
              Weekends
            </button>
            <button
              type="button"
              onClick={selectAllDays}
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: theme.colors.terracotta,
                backgroundColor: theme.colors.softPink,
                border: 'none',
                borderRadius: '6px',
                padding: '2px 6px',
                cursor: 'pointer',
              }}
            >
              All
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px' }}>
          {DAYS_OF_WEEK.map((day) => {
            const isSelected = selectedDays.includes(day);

            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  toggleDay(day);
                  setActiveTab('edit');
                }}
                style={{
                  padding: '7px 13px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: isSelected ? 700 : 500,
                  border: isSelected
                    ? `1.5px solid ${theme.colors.terracotta}`
                    : `1px solid ${theme.colors.borderLight}`,
                  backgroundColor: isSelected ? theme.colors.softPink : '#ffffff',
                  color: isSelected ? theme.colors.terracotta : theme.colors.textDark,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                {DAY_LABELS[day].slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Detailed Multi-Day Schedule Editor */}
      {activeTab === 'edit' && (
        <div
          style={{
            marginTop: '12px',
            backgroundColor: '#FBFBFB',
            borderRadius: '12px',
            padding: '12px',
            border: `1px solid ${theme.colors.borderLight}`,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontWeight: 700, fontSize: '13px', color: theme.colors.textDark, fontFamily: theme.fonts.heading }}>
              Schedule for {formatSelectionHeader()}
            </span>
          </div>

          {/* Day Status Mode */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              type="button"
              onClick={() => updateSelectedDaysSchedule({ isClosed: false, is24Hours: false })}
              style={{
                flex: 1,
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '8px',
                border: !currentSched.isClosed && !currentSched.is24Hours ? `2px solid ${theme.colors.allowed}` : `1px solid ${theme.colors.borderLight}`,
                backgroundColor: !currentSched.isClosed && !currentSched.is24Hours ? '#E8F5E9' : '#ffffff',
                color: theme.colors.textDark,
                cursor: 'pointer',
              }}
            >
              Set Open Hours
            </button>
            <button
              type="button"
              onClick={() => updateSelectedDaysSchedule({ isClosed: false, is24Hours: true, slots: [] })}
              style={{
                flex: 1,
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '8px',
                border: currentSched.is24Hours ? `2px solid ${theme.colors.tan}` : `1px solid ${theme.colors.borderLight}`,
                backgroundColor: currentSched.is24Hours ? '#FFF3E0' : '#ffffff',
                color: theme.colors.textDark,
                cursor: 'pointer',
              }}
            >
              Open 24 Hours
            </button>
            <button
              type="button"
              onClick={() => updateSelectedDaysSchedule({ isClosed: true, is24Hours: false, slots: [] })}
              style={{
                flex: 1,
                padding: '6px 10px',
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '8px',
                border: currentSched.isClosed ? `2px solid ${theme.colors.notAllowed}` : `1px solid ${theme.colors.borderLight}`,
                backgroundColor: currentSched.isClosed ? '#FFEBEE' : '#ffffff',
                color: theme.colors.textDark,
                cursor: 'pointer',
              }}
            >
              Closed All Day
            </button>
          </div>

          {/* Time slots inputs if open */}
          {!currentSched.isClosed && !currentSched.is24Hours && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(currentSched.slots && currentSched.slots.length > 0
                ? currentSched.slots
                : [{ open: '09:00', close: '18:00' }]
              ).map((slot, index) => (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#ffffff',
                    padding: '8px',
                    borderRadius: '8px',
                    border: `1px solid ${theme.colors.borderLight}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                    <span style={{ fontSize: '11px', color: theme.colors.textMuted }}>Opens:</span>
                    <input
                      type="time"
                      value={slot.open}
                      onChange={(e) => updateSlot(index, 'open', e.target.value)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.colors.borderLight}`,
                        backgroundColor: '#ffffff',
                        color: theme.colors.textDark,
                        colorScheme: 'light',
                        fontSize: '12px',
                        width: '100%',
                      }}
                    />
                  </div>
                  <span style={{ color: theme.colors.textMuted }}>–</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                    <span style={{ fontSize: '11px', color: theme.colors.textMuted }}>Closes:</span>
                    <input
                      type="time"
                      value={slot.close}
                      onChange={(e) => updateSlot(index, 'close', e.target.value)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.colors.borderLight}`,
                        backgroundColor: '#ffffff',
                        color: theme.colors.textDark,
                        colorScheme: 'light',
                        fontSize: '12px',
                        width: '100%',
                      }}
                    />
                  </div>
                  {(currentSched.slots || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSlot(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: theme.colors.notAllowed,
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      <FaTrash size={12} />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addSlot}
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: theme.colors.terracotta,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 0',
                }}
              >
                <FaPlus size={10} /> Add split shift / break time
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
