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
