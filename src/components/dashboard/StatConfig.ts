// Configuration for stat display
// This makes it easy to add new stats and reuse the same structure for display and export

import { css } from 'styled-system/css';
import { formatDisplayDate } from '~/shared/utils/dateUtils';

export type StatValue = string | number | null | undefined;

export interface StatItem {
  id: string;
  label: string;
  help?: string;
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
      gridTemplateColumns: { base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))', lg: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
    }),
    stats: [
      {
        id: 'totalEvents',
        label: 'Total Events',
        help: 'Attended events in the selected range. Upcoming registrations are excluded.',
        accessor: (a) => a.totalEvents,
        format: 'number'
      },
      {
        id: 'uniqueVenues',
        label: 'Unique Venues',
        help: 'Different venues you went to. Each venue counts once however often you went.',
        accessor: (a) => a.uniqueVenues,
        format: 'number'
      },
      {
        id: 'uniqueArtists',
        label: 'Unique Artists',
        help: 'Different performers listed on your events. Appearances counts every performer on every event, so one artist seen 5 times adds 5.',
        accessor: (a) => a.uniqueArtists,
        secondaryAccessor: (a) => `${a.totalArtistAppearances} appearances`,
        format: 'number'
      },
      {
        id: 'eventsWithoutFavorites',
        label: 'Events Without Favorites',
        help: 'Share of events where none of the favorite artists on your Eventernote profile performed.',
        accessor: (a) => a.eventsWithoutFavoritesPercentage !== undefined ? `${a.eventsWithoutFavoritesPercentage.toFixed(1)}%` : 'N/A',
        secondaryAccessor: (a) => a.eventsWithoutFavorites !== undefined ? `${a.eventsWithoutFavorites} / ${a.allEventsCount ?? a.totalEvents}` : null,
        format: 'text'
      }
    ]
  },
  {
    title: 'Activity',
    columns: css({
      gridTemplateColumns: { base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))', lg: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
    }),
    stats: [
      {
        id: 'avgEventsPerMonth',
        label: 'Average Events / Month',
        help: 'Events divided by the months in which you attended at least one event. Months with no events are not counted.',
        accessor: (a) => a.avgEventsPerMonth,
        format: 'number'
      },
      {
        id: 'daysActive',
        label: 'Days Active',
        help: 'Days with at least one event, out of all days from your first to your last event in this range.',
        accessor: (a) => `${a.daysSpentPercentage}%`,
        secondaryAccessor: (a) => `${a.uniqueDays} / ${a.totalDaysInRange}`,
        format: 'text'
      },
      {
        id: 'mostActiveDay',
        label: 'Most Active Day',
        help: 'Weekday with the most events.',
        accessor: (a) => a.topDayOfWeek?.[0],
        secondaryAccessor: (a) => `${a.topDayOfWeek?.[1] || 0} events`,
        format: 'text'
      },
      {
        id: 'busiestMonth',
        label: 'Busiest Month',
        help: 'Calendar month with the most events.',
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
        help: 'Weekends (Sat + Sun) with at least one event, out of all weekends from your first to your last event.',
        accessor: (a) => `${a.weekendStats.weekendPercentage.toFixed(1)}%`,
        secondaryAccessor: (a) => `${a.weekendStats.weekendsWithEvents} / ${a.weekendStats.totalWeekends}`,
        format: 'text'
      },
      {
        id: 'weekendEvents',
        label: 'Weekend Events',
        help: 'Share of your events held on a Saturday or Sunday.',
        accessor: (a) => `${a.weekendStats.weekendEventPercentage.toFixed(1)}%`,
        secondaryAccessor: (a) => `${a.weekendStats.weekendEventCount} / ${a.totalEvents}`,
        format: 'text'
      },
      {
        id: 'weekdayEvents',
        label: 'Weekday Events',
        help: 'Share of your events held Monday to Friday.',
        accessor: (a) => `${a.weekendStats.weekdayEventPercentage.toFixed(1)}%`,
        secondaryAccessor: (a) => `${a.weekendStats.weekdayEventCount} / ${a.totalEvents}`,
        format: 'text'
      }
    ]
  },
  {
    title: 'Multi-Event Days',
    columns: css({
      gridTemplateColumns: { base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))', lg: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
    }),
    stats: [
      {
        id: 'multiEventDays',
        label: 'Multi-Event Days',
        help: 'Days with two or more events, out of days with any event.',
        accessor: (a) => `${a.multiEventDayStats.daysWithMultipleEventsPercentage.toFixed(1)}%`,
        secondaryAccessor: (a) => `${a.multiEventDayStats.daysWithMultipleEvents} / ${a.multiEventDayStats.totalDaysWithEvents}`,
        format: 'text'
      },
      {
        id: 'multiVenueDays',
        label: 'Multi-Venue Days',
        help: 'Days you went to two or more different venues, out of days with any event.',
        accessor: (a) => `${a.multiEventDayStats.daysWithMultipleVenuesPercentage.toFixed(1)}%`,
        secondaryAccessor: (a) => `${a.multiEventDayStats.daysWithMultipleVenues} / ${a.multiEventDayStats.totalDaysWithEvents}`,
        format: 'text'
      },
      {
        id: 'maxEventsInDay',
        label: 'Max Events / Day',
        help: 'Most events on a single day, and when.',
        accessor: (a) => a.multiEventDayStats.maxEventsInDay,
        secondaryAccessor: (a) => a.multiEventDayStats.maxEventsInDayDate
          ? formatDisplayDate(a.multiEventDayStats.maxEventsInDayDate)
          : null,
        format: 'number'
      },
      {
        id: 'maxVenuesInDay',
        label: 'Max Venues / Day',
        help: 'Most different venues on a single day, and when.',
        accessor: (a) => a.multiEventDayStats.maxVenuesInDay,
        secondaryAccessor: (a) => a.multiEventDayStats.maxVenuesInDayDate
          ? formatDisplayDate(a.multiEventDayStats.maxVenuesInDayDate)
          : null,
        format: 'number'
      }
    ]
  },
  {
    title: 'Streaks',
    columns: css({
      gridTemplateColumns: { base: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))', lg: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }
    }),
    stats: [
      {
        id: 'currentDailyStreak',
        label: 'Current Daily',
        help: 'Consecutive days with an event, ending today or yesterday. 0 if the run has ended.',
        accessor: (a) => a.streaks.daily.currentStreak,
        secondaryAccessor: (a) => a.streaks.daily.isActive && a.streaks.daily.currentStreakStartDate
          ? `Since ${new Date(a.streaks.daily.currentStreakStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          : null,
        format: 'number'
      },
      {
        id: 'currentWeeklyStreak',
        label: 'Current Weekly',
        help: 'Consecutive weeks (Monday to Sunday) with an event, ending this week or last week.',
        accessor: (a) => a.streaks.weekly.currentStreak,
        secondaryAccessor: (a) => a.streaks.weekly.isActive && a.streaks.weekly.currentStreakStartDate
          ? `Since ${new Date(a.streaks.weekly.currentStreakStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          : null,
        format: 'number'
      },
      {
        id: 'longestDailyStreak',
        label: 'Longest Daily',
        help: 'Longest run of consecutive days with an event in this range.',
        accessor: (a) => a.streaks.daily.longestStreak,
        secondaryAccessor: (a) => a.streaks.daily.longestStreakStartDate && a.streaks.daily.longestStreakEndDate
          ? `${new Date(a.streaks.daily.longestStreakStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${new Date(a.streaks.daily.longestStreakEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          : null,
        format: 'number'
      },
      {
        id: 'longestWeeklyStreak',
        label: 'Longest Weekly',
        help: 'Longest run of consecutive weeks with at least one event in this range.',
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
