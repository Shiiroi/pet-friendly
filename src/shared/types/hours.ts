export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

export const SHORT_DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
};

export interface TimeSlot {
  open: string; // e.g. "09:00" in 24h format
  close: string; // e.g. "18:00" in 24h format
}

export interface DaySchedule {
  isClosed: boolean;
  is24Hours: boolean;
  slots: TimeSlot[];
}

export type WeeklyOperatingHours = Record<DayOfWeek, DaySchedule>;

export type OperatingStatus =
  | { state: 'open'; closesAt?: string; is24Hours?: boolean }
  | { state: 'closing_soon'; closesAt: string; minutesRemaining: number }
  | { state: 'closed'; opensAt?: string; opensDay?: string }
  | { state: 'opening_soon'; opensAt: string; minutesRemaining: number }
  | { state: 'unknown' };
