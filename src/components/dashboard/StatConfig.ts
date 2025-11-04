// Configuration for stat display
// This makes it easy to add new stats and reuse the same structure for display and export

import { css } from 'styled-system/css';

export type StatValue = string | number | null | undefined;

export interface StatItem {
  id: string;
  label: string;
  accessor: (analytics: any) => StatValue;
  secondaryAccessor?: (analytics: any) => StatValue;
  secondaryLabel?: string;
  format?: 'number' | 'percentage' | 'date' | 'text';
}

export interface StatSection {
  title: string;
  columns: string;
  stats: StatItem[];
}

// Define all stat configurations
export const STAT_SECTIONS: StatSection[] = [
  {
    title: 'Summary',
    columns: css({
      gridTemplateColumns: { base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }
    }),
    stats: [
      {
        id: 'totalEvents',
        label: 'Total Events',
        accessor: (a) => a.totalEvents,
        format: 'number'
      },
      {
        id: 'uniqueVenues',
        label: 'Unique Venues',
        accessor: (a) => a.uniqueVenues,
        format: 'number'
      },
      {
        id: 'uniqueArtists',
        label: 'Unique Artists',
        accessor: (a) => a.uniqueArtists,
        secondaryAccessor: (a) => `${a.totalArtistAppearances} appearances`,
        format: 'number'
      },
      {
        id: 'eventsWithoutFavorites',
        label: 'Events Without Favorites',
        accessor: (a) => a.eventsWithoutFavoritesPercentage !== undefined ? `${a.eventsWithoutFavoritesPercentage.toFixed(1)}%` : 'N/A',
        secondaryAccessor: (a) => a.eventsWithoutFavorites !== undefined ? `${a.eventsWithoutFavorites} / ${a.totalEvents}` : null,
        format: 'text'
      }
    ]
  },
  {
    title: 'Activity',
    columns: css({
      gridTemplateColumns: { base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }
    }),
    stats: [
      {
        id: 'avgEventsPerMonth',
        label: 'Average Events / Month',
        accessor: (a) => a.avgEventsPerMonth,
        format: 'number'
      },
      {
        id: 'daysActive',
        label: 'Days Active',
        accessor: (a) => `${a.daysSpentPercentage}%`,
        secondaryAccessor: (a) => `${a.uniqueDays} / ${a.totalDaysInRange}`,
        format: 'text'
      },
      {
        id: 'mostActiveDay',
        label: 'Most Active Day',
        accessor: (a) => a.topDayOfWeek?.[0],
        secondaryAccessor: (a) => `${a.topDayOfWeek?.[1] || 0} events`,
        format: 'text'
      },
      {
        id: 'busiestMonth',
        label: 'Busiest Month',
        accessor: (a) => {
          if (!a.busiestMonth?.[0]) return null;
          const [year, month] = a.busiestMonth[0].split('-');
          return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        },
        secondaryAccessor: (a) => `${a.busiestMonth?.[1] || 0} events`,
        format: 'text'
      },
      {
        id: 'weekendActive',
        label: 'Weekend Active',
        accessor: (a) => `${a.weekendStats.weekendPercentage.toFixed(1)}%`,
        secondaryAccessor: (a) => `${a.weekendStats.weekendsWithEvents} / ${a.weekendStats.totalWeekends}`,
        format: 'text'
      },
      {
        id: 'weekendEvents',
        label: 'Weekend Events',
        accessor: (a) => `${a.weekendStats.weekendEventPercentage.toFixed(1)}%`,
        secondaryAccessor: (a) => `${a.weekendStats.weekendEventCount} / ${a.totalEvents}`,
        format: 'text'
      },
      {
        id: 'weekdayEvents',
        label: 'Weekday Events',
        accessor: (a) => `${a.weekendStats.weekdayEventPercentage.toFixed(1)}%`,
        secondaryAccessor: (a) => `${a.weekendStats.weekdayEventCount} / ${a.totalEvents}`,
        format: 'text'
      }
    ]
  },
  {
    title: 'Multi-Event Days',
    columns: css({
      gridTemplateColumns: { base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }
    }),
    stats: [
      {
        id: 'multiEventDays',
        label: 'Multi-Event Days',
        accessor: (a) => `${a.multiEventDayStats.daysWithMultipleEventsPercentage.toFixed(1)}%`,
        secondaryAccessor: (a) => `${a.multiEventDayStats.daysWithMultipleEvents} / ${a.multiEventDayStats.totalDaysWithEvents}`,
        format: 'text'
      },
      {
        id: 'multiVenueDays',
        label: 'Multi-Venue Days',
        accessor: (a) => `${a.multiEventDayStats.daysWithMultipleVenuesPercentage.toFixed(1)}%`,
        secondaryAccessor: (a) => `${a.multiEventDayStats.daysWithMultipleVenues} / ${a.multiEventDayStats.totalDaysWithEvents}`,
        format: 'text'
      },
      {
        id: 'maxEventsInDay',
        label: 'Max Events / Day',
        accessor: (a) => a.multiEventDayStats.maxEventsInDay,
        secondaryAccessor: (a) => a.multiEventDayStats.maxEventsInDayDate
          ? new Date(a.multiEventDayStats.maxEventsInDayDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : null,
        format: 'number'
      },
      {
        id: 'maxVenuesInDay',
        label: 'Max Venues / Day',
        accessor: (a) => a.multiEventDayStats.maxVenuesInDay,
        secondaryAccessor: (a) => a.multiEventDayStats.maxVenuesInDayDate
          ? new Date(a.multiEventDayStats.maxVenuesInDayDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
          : null,
        format: 'number'
      }
    ]
  },
  {
    title: 'Streaks',
    columns: css({
      gridTemplateColumns: { base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }
    }),
    stats: [
      {
        id: 'currentDailyStreak',
        label: 'Current Daily',
        accessor: (a) => a.streaks.daily.currentStreak,
        secondaryAccessor: (a) => a.streaks.daily.isActive && a.streaks.daily.currentStreakStartDate
          ? `Since ${new Date(a.streaks.daily.currentStreakStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          : null,
        format: 'number'
      },
      {
        id: 'currentWeeklyStreak',
        label: 'Current Weekly',
        accessor: (a) => a.streaks.weekly.currentStreak,
        secondaryAccessor: (a) => a.streaks.weekly.isActive && a.streaks.weekly.currentStreakStartDate
          ? `Since ${new Date(a.streaks.weekly.currentStreakStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          : null,
        format: 'number'
      },
      {
        id: 'longestDailyStreak',
        label: 'Longest Daily',
        accessor: (a) => a.streaks.daily.longestStreak,
        secondaryAccessor: (a) => a.streaks.daily.longestStreakStartDate && a.streaks.daily.longestStreakEndDate
          ? `${new Date(a.streaks.daily.longestStreakStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(a.streaks.daily.longestStreakEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          : null,
        format: 'number'
      },
      {
        id: 'longestWeeklyStreak',
        label: 'Longest Weekly',
        accessor: (a) => a.streaks.weekly.longestStreak,
        secondaryAccessor: (a) => a.streaks.weekly.longestStreakStartDate && a.streaks.weekly.longestStreakEndDate
          ? `${new Date(a.streaks.weekly.longestStreakStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(a.streaks.weekly.longestStreakEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          : null,
        format: 'number'
      }
    ]
  }
];

// Helper to get unit label for streaks
export function getStreakUnit(value: number, unit: 'day' | 'week'): string {
  return value === 1 ? unit : `${unit}s`;
}
