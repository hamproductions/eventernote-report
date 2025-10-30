// Base Event Type (from Eventernote crawling)
export interface Event {
  readonly name: string;
  readonly href: string;
  readonly date: string; // ISO format "YYYY-MM-DD"
  readonly place: string;
}

// Enhanced Event (with parsed artists and date info)
export interface EnhancedEvent extends Event {
  artists: string[];
  description?: string;
  imageUrl?: string;
  parsedDate: Date;
  dayOfWeek: string; // 'Monday', 'Tuesday', etc.
  month: string; // 'January', 'February', etc.
  year: number;
}

// Date Range for filtering
export interface DateRange {
  startDate: Date | null; // null = no start limit
  endDate: Date | null; // null = no end limit
}

// Preset Period Types
export type PresetPeriod =
  | 'last_30_days'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_12_months'
  | 'this_year'
  | 'last_year'
  | 'all_time';
