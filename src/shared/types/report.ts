import type { DateRange } from './event';
import type { ArtistStat, VenueStat } from './stats';

// Report Summary (dashboard overview)
export interface ReportSummary {
  totalEvents: number;
  uniqueArtists: number;
  uniqueVenues: number;
  averageEventsPerMonth: number;
  dateRange: DateRange;
  topArtist: ArtistStat | null;
  topVenue: VenueStat | null;
  busiestMonth: { month: string; count: number };
  busiestDayOfWeek: { day: string; count: number };
}

// Filter State
export interface FilterState {
  searchQuery: string;
  selectedArtists: string[];
  selectedVenues: string[];
  hasMultipleArtists: boolean;
}

// View Types
export type ViewType =
  | 'dashboard'
  | 'timeline'
  | 'calendar'
  | 'artists'
  | 'venues'
  | 'insights'
  | 'events_list';

// Sort Options
export type SortField =
  | 'date'
  | 'name'
  | 'venue'
  | 'artist_count'
  | 'event_count';

export type SortDirection = 'asc' | 'desc';

// Report State (for Zustand store)
export interface ReportState {
  userId: string | null;
  dateRange: DateRange;
  selectedPreset: string | null;
  filters: FilterState;
  currentView: ViewType;
  sortBy: SortField;
  sortDirection: SortDirection;
}
