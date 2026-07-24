import {
  DAYS_OF_WEEK,
  DAY_LABELS,
} from '../types/hours';
import type {
  DayOfWeek,
  DaySchedule,
  OperatingStatus,
  TimeSlot,
  WeeklyOperatingHours,
} from '../types/hours';

/**
 * Returns default weekly operating hours (Standard 9 AM - 6 PM daily).
 */
export function getDefaultOperatingHours(): WeeklyOperatingHours {
  const defaultSchedule: DaySchedule = {
    isClosed: false,
    is24Hours: false,
    slots: [{ open: '09:00', close: '18:00' }],
  };

  return DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = { ...defaultSchedule, slots: [...defaultSchedule.slots] };
    return acc;
  }, {} as WeeklyOperatingHours);
}

/**
 * Converts 24h time string (e.g. "09:00", "18:30", "00:00") into 12h formatted time string (e.g. "9:00 AM", "6:30 PM").
 */
export function formatTime24To12(timeStr: string): string {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  if (isNaN(h)) return timeStr;

  const period = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;

  const minFormatted = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${minFormatted} ${period}`;
}

/**
 * Formats a single time slot (e.g. "9:00 AM – 6:00 PM").
 */
export function formatTimeSlot(slot: TimeSlot): string {
  if (slot.open === '00:00' && slot.close === '23:59') {
    return 'Open 24 hours';
  }
  return `${formatTime24To12(slot.open)} – ${formatTime24To12(slot.close)}`;
}

/**
 * Formats a full day schedule into a human readable string.
 */
export function formatDaySchedule(schedule?: DaySchedule): string {
  if (!schedule) return 'Hours unavailable';
  if (schedule.isClosed) return 'Closed';
  if (schedule.is24Hours) return 'Open 24 hours';
  if (!schedule.slots || schedule.slots.length === 0) return 'Closed';

  return schedule.slots.map(formatTimeSlot).join(', ');
}

/**
 * Gets the current day of the week key for a given Date object.
 */
export function getCurrentDayOfWeek(date: Date = new Date()): DayOfWeek {
  const dayIndex = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayMap: DayOfWeek[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ];
  return dayMap[dayIndex];
}

/**
 * Converts a "HH:MM" string to minutes from midnight.
 */
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}

/**
 * Calculates current operating status (Open, Closed, Closing Soon, etc.) for a place.
 */
export function getOperatingStatus(
  hours?: WeeklyOperatingHours | null,
  now: Date = new Date()
): OperatingStatus {
  if (!hours) return { state: 'unknown' };

  const currentDay = getCurrentDayOfWeek(now);
  const currentSchedule = hours[currentDay];
  if (!currentSchedule) return { state: 'unknown' };

  if (currentSchedule.isClosed) {
    // Find next day it opens
    const nextOpenInfo = findNextOpenDay(hours, currentDay);
    return { state: 'closed', opensAt: nextOpenInfo?.time, opensDay: nextOpenInfo?.dayLabel };
  }

  if (currentSchedule.is24Hours) {
    return { state: 'open', is24Hours: true };
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Check if inside any time slot
  for (const slot of currentSchedule.slots || []) {
    const openMins = timeToMinutes(slot.open);
    let closeMins = timeToMinutes(slot.close);
    
    // Handle overnight shifts (e.g. 18:00 to 02:00)
    if (closeMins < openMins) {
      closeMins += 24 * 60;
    }

    let checkMinutes = currentMinutes;
    if (currentMinutes < openMins && closeMins >= 24 * 60) {
      checkMinutes += 24 * 60;
    }

    if (checkMinutes >= openMins && checkMinutes < closeMins) {
      const minutesRemaining = closeMins - checkMinutes;
      const formattedCloseTime = formatTime24To12(slot.close);

      if (minutesRemaining <= 60 && minutesRemaining > 0) {
        return {
          state: 'closing_soon',
          closesAt: formattedCloseTime,
          minutesRemaining,
        };
      }

      return {
        state: 'open',
        closesAt: formattedCloseTime,
      };
    }
  }

  // Not in any open slot today
  const nextOpenInfo = findNextOpenDay(hours, currentDay, currentMinutes);
  return {
    state: 'closed',
    opensAt: nextOpenInfo?.time,
    opensDay: nextOpenInfo?.dayLabel,
  };
}

/**
 * Helper to find when the place next opens.
 */
function findNextOpenDay(
  hours: WeeklyOperatingHours,
  currentDay: DayOfWeek,
  currentMinutes?: number
): { dayLabel: string; time: string } | null {
  const daysOrder = DAYS_OF_WEEK;
  const currentIndex = daysOrder.indexOf(currentDay);

  // Check remaining slots today first
  if (currentMinutes !== undefined) {
    const todaySched = hours[currentDay];
    if (todaySched && !todaySched.isClosed && !todaySched.is24Hours) {
      for (const slot of todaySched.slots || []) {
        const openMins = timeToMinutes(slot.open);
        if (openMins > currentMinutes) {
          return {
            dayLabel: 'today',
            time: formatTime24To12(slot.open),
          };
        }
      }
    }
  }

  // Check next 6 days
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (currentIndex + i) % 7;
    const nextDay = daysOrder[nextDayIndex];
    const sched = hours[nextDay];
    if (sched && !sched.isClosed) {
      const dayName = i === 1 ? 'tomorrow' : DAY_LABELS[nextDay];
      const openTime = sched.is24Hours
        ? '12:00 AM'
        : sched.slots[0]
        ? formatTime24To12(sched.slots[0].open)
        : '9:00 AM';
      return { dayLabel: dayName, time: openTime };
    }
  }

  return null;
}

/**
 * Safely extracts HH:MM string from a Google Places API period point object.
 */
function extractGooglePointTime(point: any): string | null {
  if (!point) return null;

  let hour: number | undefined;
  let minute: number | undefined;

  if (typeof point.hour === 'number') {
    hour = point.hour;
  } else if (typeof point.getHours === 'function') {
    hour = point.getHours();
  }

  if (typeof point.minute === 'number') {
    minute = point.minute;
  } else if (typeof point.getMinutes === 'function') {
    minute = point.getMinutes();
  }

  if (hour !== undefined && minute !== undefined) {
    const hStr = hour < 10 ? `0${hour}` : `${hour}`;
    const mStr = minute < 10 ? `0${minute}` : `${minute}`;
    return `${hStr}:${mStr}`;
  }

  if (typeof point.time === 'string' && point.time.length >= 4) {
    return `${point.time.slice(0, 2)}:${point.time.slice(2, 4)}`;
  }

  return null;
}

/**
 * Safely extracts 0-6 day number from a Google Places API period point object.
 */
function extractGooglePointDay(point: any): number | undefined {
  if (!point) return undefined;
  if (typeof point.day === 'number') return point.day;
  if (typeof point.getDay === 'function') return point.getDay();
  if (typeof point.dayOfWeek === 'number') return point.dayOfWeek;
  return undefined;
}

/**
 * Parses Google Places API opening hours response into standard WeeklyOperatingHours.
 */
export function parseGoogleOpeningHours(googleOpeningHours: any): WeeklyOperatingHours | null {
  if (!googleOpeningHours) return null;

  const defaultHours = getDefaultOperatingHours();

  // If periods exist (Google Places v1/v2 details format)
  if (Array.isArray(googleOpeningHours.periods)) {
    const googleDayMap: Record<number, DayOfWeek> = {
      0: 'sunday',
      1: 'monday',
      2: 'tuesday',
      3: 'wednesday',
      4: 'thursday',
      5: 'friday',
      6: 'saturday',
    };

    // Reset all days to closed initially before filling from Google periods
    DAYS_OF_WEEK.forEach((day) => {
      defaultHours[day] = { isClosed: true, is24Hours: false, slots: [] };
    });

    googleOpeningHours.periods.forEach((period: any) => {
      if (!period || !period.open) return;

      const dayNum = extractGooglePointDay(period.open);
      if (dayNum === undefined) return;

      const dayKey = googleDayMap[dayNum];
      if (!dayKey) return;

      const openTime = extractGooglePointTime(period.open);

      if (!period.close) {
        // 24 hours open
        defaultHours[dayKey] = { isClosed: false, is24Hours: true, slots: [] };
      } else {
        const closeTime = extractGooglePointTime(period.close);

        if (openTime && closeTime) {
          const daySched = defaultHours[dayKey];
          daySched.isClosed = false;
          daySched.slots.push({ open: openTime, close: closeTime });
        }
      }
    });

    return defaultHours;
  }

  return null;
}
