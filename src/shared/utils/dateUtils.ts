import type { DateRange, PresetPeriod } from '../types/event';

export function presetToDateRange(preset: PresetPeriod): DateRange {
  const now = new Date();
  const startDate = new Date();

  switch (preset) {
    case 'last_30_days':
      startDate.setDate(now.getDate() - 30);
      return { startDate, endDate: now };

    case 'last_3_months':
      startDate.setMonth(now.getMonth() - 3);
      return { startDate, endDate: now };

    case 'last_6_months':
      startDate.setMonth(now.getMonth() - 6);
      return { startDate, endDate: now };

    case 'last_12_months':
      startDate.setFullYear(now.getFullYear() - 1);
      return { startDate, endDate: now };

    case 'this_year':
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: now
      };

    case 'last_year':
      return {
        startDate: new Date(now.getFullYear() - 1, 0, 1),
        endDate: new Date(now.getFullYear() - 1, 11, 31)
      };

    case 'all_time':
    default:
      return { startDate: null, endDate: null };
  }
}

export function formatDate(date: Date | null): string {
  if (!date) return 'N/A';
  return date.toISOString().split('T')[0];
}
