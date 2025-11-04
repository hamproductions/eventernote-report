import type { EnhancedEvent } from './event';

// Artist Statistics
export interface ArtistStat {
  artistName: string;
  eventCount: number;
  percentage: number; // % of total events
  firstSeen: Date;
  lastSeen: Date;
  events: EnhancedEvent[];
  rank: number;
}

// Venue Statistics
export interface VenueStat {
  venueName: string;
  eventCount: number;
  percentage: number;
  firstVisit: Date;
  lastVisit: Date;
  uniqueArtistsCount: number;
  events: EnhancedEvent[];
  rank: number;
}

// Timeline Data Point
export interface TimelineDataPoint {
  date: string; // ISO format
  eventCount: number;
  events: EnhancedEvent[];
  label: string; // Human-readable label
}

// Granularity for timeline charts
export type TimelineGranularity = 'daily' | 'weekly' | 'monthly';

// Streak Statistics
export interface StreakStats {
  daily: {
    currentStreak: number;
    longestStreak: number;
    currentStreakStartDate: Date | null;
    currentStreakEndDate: Date | null;
    longestStreakStartDate: Date | null;
    longestStreakEndDate: Date | null;
    isActive: boolean;
  };
  weekly: {
    currentStreak: number;
    longestStreak: number;
    currentStreakStartDate: Date | null;
    currentStreakEndDate: Date | null;
    longestStreakStartDate: Date | null;
    longestStreakEndDate: Date | null;
    isActive: boolean;
  };
}

// Weekend Statistics
export interface WeekendStats {
  totalWeekends: number;
  weekendsWithEvents: number;
  weekendPercentage: number;
  weekendEventCount: number;
  weekendEventPercentage: number;
  weekdayEventCount: number;
  weekdayEventPercentage: number;
}

// Multi-Event Day Statistics
export interface MultiEventDayStats {
  daysWithMultipleEvents: number;
  daysWithMultipleEventsPercentage: number;
  daysWithMultipleVenues: number;
  daysWithMultipleVenuesPercentage: number;
  totalDaysWithEvents: number;
  maxEventsInDay: number;
  maxEventsInDayDate: string | null;
  maxVenuesInDay: number;
  maxVenuesInDayDate: string | null;
}

// Basic Statistics
export interface BasicStats {
  totalEvents: number;
  uniqueVenues: number;
  uniqueArtists: number;
  totalArtistAppearances: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
  eventsWithoutFavorites?: number;
  eventsWithoutFavoritesPercentage?: number;
}

// Temporal Statistics
export interface TemporalStats {
  monthlyBreakdown: [string, number][];
  busiestMonth: [string, number] | undefined;
  topDayOfWeek: [string, number] | undefined;
  avgEventsPerMonth: string;
}

// Activity Statistics
export interface ActivityStats {
  uniqueDays: number;
  totalDaysInRange: number;
  daysSpentPercentage: string;
  yearsSinceFirst: string;
  daysSinceFirst: number;
  weekendStats: WeekendStats;
  multiEventDayStats: MultiEventDayStats;
}

// Top Lists
export interface TopLists {
  topArtists: [string, number][];
  topVenues: [string, EnhancedEvent[]][];
  recentEvents: EnhancedEvent[];
}

// Comprehensive Analytics Result
export interface ComprehensiveAnalytics {
  basic: BasicStats;
  temporal: TemporalStats;
  activity: ActivityStats;
  streaks: StreakStats;
  topLists: TopLists;
  // Raw maps for flexible querying
  artistMap: Map<string, number>;
  venueMap: Map<string, EnhancedEvent[]>;
}

// Radar Chart Statistics
export interface RadarStats {
  multiVenueHustle: number;
  activeArtistsCore: number;
  activityRate: number;
  consistency: number;
  weekendWarrior: number;
  intensity: number;
  rawValues: {
    multiVenueDaysPercent: number;
    coreArtistsCount: number;
    attendanceRatePercent: number;
    consistencyScore: number;
    weekendActivityPercent: number;
    eventsPerDay: number;
  };
}

// Chart-specific Analytics
export interface ChartAnalytics extends ComprehensiveAnalytics {
  cumulativeArtistData: Record<string, any>[];
  displayedArtists: string[];
  dateEventMap: Map<string, number>;
  radarStats: RadarStats;
}
