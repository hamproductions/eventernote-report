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
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function formatDisplayDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(`${value.slice(0, 10)}T00:00:00`) : value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDisplayMonth(value: string): string {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
