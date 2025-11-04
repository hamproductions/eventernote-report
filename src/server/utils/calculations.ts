import type { EnhancedEvent } from "../../shared/types/event";
import type {
  ArtistStat,
  VenueStat,
  BasicStats,
  TemporalStats,
  ActivityStats,
  StreakStats,
  TopLists,
  ComprehensiveAnalytics,
  ChartAnalytics,
  WeekendStats,
  MultiEventDayStats,
  RadarStats
} from "../../shared/types/stats";

// ============================================================================
// BASIC STATISTICS
// ============================================================================

export function calculateBasicStats(events: EnhancedEvent[]): BasicStats {
  if (events.length === 0) {
    return {
      totalEvents: 0,
      uniqueVenues: 0,
      uniqueArtists: 0,
      totalArtistAppearances: 0,
      dateRange: {
        earliest: "",
        latest: ""
      }
    };
  }

  // Calculate unique venues (exclude venues starting with "!_")
  const venueSet = new Set<string>();
  events.forEach((event) => {
    if (!event.place.startsWith("!_")) {
      venueSet.add(event.place);
    }
  });

  // Calculate unique artists and total appearances
  const artistMap = new Map<string, number>();
  events.forEach((event) => {
    event.artists?.forEach((artist) => {
      artistMap.set(artist, (artistMap.get(artist) || 0) + 1);
    });
  });

  const totalArtistAppearances = Array.from(artistMap.values()).reduce(
    (sum, count) => sum + count,
    0
  );

  return {
    totalEvents: events.length,
    uniqueVenues: venueSet.size,
    uniqueArtists: artistMap.size,
    totalArtistAppearances,
    dateRange: {
      earliest: events[events.length - 1]?.date.split(" ")[0] || "",
      latest: events[0]?.date.split(" ")[0] || ""
    }
  };
}

// ============================================================================
// TEMPORAL STATISTICS
// ============================================================================

export function calculateTemporalStats(events: EnhancedEvent[]): TemporalStats {
  if (events.length === 0) {
    return {
      monthlyBreakdown: [],
      busiestMonth: undefined,
      topDayOfWeek: undefined,
      avgEventsPerMonth: "0"
    };
  }

  // Monthly breakdown
  const monthlyMap = new Map<string, number>();
  events.forEach((event) => {
    const eventDate = new Date(event.date);
    const key = `${event.year}-${String(eventDate.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
  });

  const monthlyBreakdown = Array.from(monthlyMap.entries()).sort(([a], [b]) =>
    b.localeCompare(a)
  );
  const busiestMonth = Array.from(monthlyMap.entries()).sort(
    ([, a], [, b]) => b - a
  )[0];

  // Day of week analysis
  const dayOfWeekMap = new Map<string, number>();
  events.forEach((event) => {
    dayOfWeekMap.set(
      event.dayOfWeek,
      (dayOfWeekMap.get(event.dayOfWeek) || 0) + 1
    );
  });
  const topDayOfWeek = Array.from(dayOfWeekMap.entries()).sort(
    ([, a], [, b]) => b - a
  )[0];

  // Average events per month
  const monthCount = monthlyMap.size || 1;
  const avgEventsPerMonth = (events.length / monthCount).toFixed(1);

  return {
    monthlyBreakdown,
    busiestMonth,
    topDayOfWeek,
    avgEventsPerMonth
  };
}

// ============================================================================
// ACTIVITY STATISTICS
// ============================================================================

export function calculateActivityStats(events: EnhancedEvent[]): ActivityStats {
  if (events.length === 0) {
    return {
      uniqueDays: 0,
      totalDaysInRange: 0,
      daysSpentPercentage: "0",
      yearsSinceFirst: "0",
      daysSinceFirst: 0,
      weekendStats: {
        totalWeekends: 0,
        weekendsWithEvents: 0,
        weekendPercentage: 0,
        weekendEventCount: 0,
        weekendEventPercentage: 0
      },
      multiEventDayStats: {
        daysWithMultipleEvents: 0,
        daysWithMultipleEventsPercentage: 0,
        daysWithMultipleVenues: 0,
        daysWithMultipleVenuesPercentage: 0,
        totalDaysWithEvents: 0,
        maxEventsInDay: 0,
        maxEventsInDayDate: null,
        maxVenuesInDay: 0,
        maxVenuesInDayDate: null
      }
    };
  }

  // Calculate unique days
  const uniqueDaysSet = new Set<string>();
  events.forEach((event) => {
    uniqueDaysSet.add(event.date.split(" ")[0]);
  });
  const uniqueDays = uniqueDaysSet.size;

  // Calculate time span
  const earliestDate = new Date(events[events.length - 1]?.date.split(" ")[0]);
  const latestDate = new Date(events[0]?.date.split(" ")[0]);
  const daysSinceFirst = Math.floor(
    (latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const yearsSinceFirst = (daysSinceFirst / 365).toFixed(1);
  const totalDaysInRange = daysSinceFirst + 1;
  const daysSpentPercentage = ((uniqueDays / totalDaysInRange) * 100).toFixed(
    1
  );

  // Calculate weekend and multi-event day stats
  const weekendStats = calculateWeekendStats(events);
  const multiEventDayStats = calculateMultiEventDayStats(events);

  return {
    uniqueDays,
    totalDaysInRange,
    daysSpentPercentage,
    yearsSinceFirst,
    daysSinceFirst,
    weekendStats,
    multiEventDayStats
  };
}

// ============================================================================
// WEEKEND STATISTICS
// ============================================================================

export function calculateWeekendStats(events: EnhancedEvent[]): WeekendStats {
  if (events.length === 0) {
    return {
      totalWeekends: 0,
      weekendsWithEvents: 0,
      weekendPercentage: 0,
      weekendEventCount: 0,
      weekendEventPercentage: 0,
      weekdayEventCount: 0,
      weekdayEventPercentage: 0
    };
  }

  // Sort events by date to get date range
  const sortedEvents = [...events].sort(
    (a, b) => a.parsedDate.getTime() - b.parsedDate.getTime()
  );

  const firstDate = sortedEvents[0].parsedDate;
  const lastDate = sortedEvents[sortedEvents.length - 1].parsedDate;

  // Count total weekends in the date range
  const weekendsSet = new Set<string>();
  const currentDate = new Date(firstDate);
  currentDate.setHours(0, 0, 0, 0);

  while (currentDate <= lastDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // Saturday (6) or Sunday (0)
      // Get the weekend key (use Saturday's date for the weekend)
      const weekendKey = new Date(currentDate);
      if (dayOfWeek === 0) {
        // If Sunday, go back to Saturday
        weekendKey.setDate(weekendKey.getDate() - 1);
      }
      weekendsSet.add(weekendKey.toISOString().split("T")[0]);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const totalWeekends = weekendsSet.size;

  // Count weekends with events and weekend events
  const weekendsWithEventsSet = new Set<string>();
  let weekendEventCount = 0;

  events.forEach((event) => {
    const eventDate = event.parsedDate;
    const dayOfWeek = eventDate.getDay();

    if (dayOfWeek === 0 || dayOfWeek === 6) {
      // This is a weekend event
      weekendEventCount++;

      // Get the weekend key
      const weekendKey = new Date(eventDate);
      if (dayOfWeek === 0) {
        // If Sunday, go back to Saturday
        weekendKey.setDate(weekendKey.getDate() - 1);
      }
      weekendsWithEventsSet.add(weekendKey.toISOString().split("T")[0]);
    }
  });

  const weekendsWithEvents = weekendsWithEventsSet.size;
  const weekendPercentage =
    totalWeekends > 0 ? (weekendsWithEvents / totalWeekends) * 100 : 0;

  const weekendEventPercentage =
    events.length > 0 ? (weekendEventCount / events.length) * 100 : 0;

  // Calculate weekday events (Monday-Friday)
  const weekdayEventCount = events.length - weekendEventCount;
  const weekdayEventPercentage =
    events.length > 0 ? (weekdayEventCount / events.length) * 100 : 0;

  return {
    totalWeekends,
    weekendsWithEvents,
    weekendPercentage,
    weekendEventCount,
    weekendEventPercentage,
    weekdayEventCount,
    weekdayEventPercentage
  };
}

// ============================================================================
// MULTI-EVENT DAY STATISTICS
// ============================================================================

export function calculateMultiEventDayStats(
  events: EnhancedEvent[]
): MultiEventDayStats {
  if (events.length === 0) {
    return {
      daysWithMultipleEvents: 0,
      daysWithMultipleEventsPercentage: 0,
      daysWithMultipleVenues: 0,
      daysWithMultipleVenuesPercentage: 0,
      totalDaysWithEvents: 0,
      maxEventsInDay: 0,
      maxEventsInDayDate: null,
      maxVenuesInDay: 0,
      maxVenuesInDayDate: null
    };
  }

  // Group events by date
  const dateMap = new Map<string, EnhancedEvent[]>();

  events.forEach((event) => {
    const dateStr = event.date.split(" ")[0]; // YYYY-MM-DD format
    if (!dateMap.has(dateStr)) {
      dateMap.set(dateStr, []);
    }
    dateMap.get(dateStr)!.push(event);
  });

  const totalDaysWithEvents = dateMap.size;
  let daysWithMultipleEvents = 0;
  let daysWithMultipleVenues = 0;
  let maxEventsInDay = 0;
  let maxEventsInDayDate: string | null = null;
  let maxVenuesInDay = 0;
  let maxVenuesInDayDate: string | null = null;

  // Check each day
  dateMap.forEach((dayEvents, dateStr) => {
    const eventCount = dayEvents.length;

    // Track max events in a single day
    if (eventCount > maxEventsInDay) {
      maxEventsInDay = eventCount;
      maxEventsInDayDate = dateStr;
    }

    if (eventCount > 1) {
      daysWithMultipleEvents++;

      // Check if there are multiple unique venues
      const uniqueVenues = new Set<string>();
      dayEvents.forEach((event) => uniqueVenues.add(event.place));

      const venueCount = uniqueVenues.size;

      // Track max venues in a single day
      if (venueCount > maxVenuesInDay) {
        maxVenuesInDay = venueCount;
        maxVenuesInDayDate = dateStr;
      }

      if (venueCount > 1) {
        daysWithMultipleVenues++;
      }
    }
  });

  const daysWithMultipleEventsPercentage =
    totalDaysWithEvents > 0
      ? (daysWithMultipleEvents / totalDaysWithEvents) * 100
      : 0;

  const daysWithMultipleVenuesPercentage =
    totalDaysWithEvents > 0
      ? (daysWithMultipleVenues / totalDaysWithEvents) * 100
      : 0;

  return {
    daysWithMultipleEvents,
    daysWithMultipleEventsPercentage,
    daysWithMultipleVenues,
    daysWithMultipleVenuesPercentage,
    totalDaysWithEvents,
    maxEventsInDay,
    maxEventsInDayDate,
    maxVenuesInDay,
    maxVenuesInDayDate
  };
}

// ============================================================================
// STREAK STATISTICS
// ============================================================================

export function calculateStreaks(events: EnhancedEvent[]): StreakStats {
  if (events.length === 0) {
    return {
      daily: {
        currentStreak: 0,
        longestStreak: 0,
        currentStreakStartDate: null,
        currentStreakEndDate: null,
        longestStreakStartDate: null,
        longestStreakEndDate: null,
        isActive: false
      },
      weekly: {
        currentStreak: 0,
        longestStreak: 0,
        currentStreakStartDate: null,
        currentStreakEndDate: null,
        longestStreakStartDate: null,
        longestStreakEndDate: null,
        isActive: false
      }
    };
  }

  return {
    daily: calculateDailyStreaks(events),
    weekly: calculateWeeklyStreaks(events)
  };
}

function calculateDailyStreaks(events: EnhancedEvent[]) {
  // Sort events by date (oldest first)
  const sortedEvents = [...events].sort(
    (a, b) => a.parsedDate.getTime() - b.parsedDate.getTime()
  );

  // Get unique days with events
  const daysWithEvents = Array.from(
    new Set(
      sortedEvents.map((event) => event.parsedDate.toISOString().split("T")[0])
    )
  ).sort();

  if (daysWithEvents.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      currentStreakStartDate: null,
      currentStreakEndDate: null,
      longestStreakStartDate: null,
      longestStreakEndDate: null,
      isActive: false
    };
  }

  // Calculate all streaks
  let currentStreak = 1;
  let longestStreak = 1;
  let streakStart = 0;
  let longestStreakStart = 0;
  let longestStreakEnd = 0;

  for (let i = 1; i < daysWithEvents.length; i++) {
    const prevDate = new Date(daysWithEvents[i - 1]);
    const currDate = new Date(daysWithEvents[i]);

    const daysDiff = Math.round(
      (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)
    );

    if (daysDiff === 1) {
      // Consecutive day
      currentStreak++;
    } else {
      // Streak broken
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        longestStreakStart = streakStart;
        longestStreakEnd = i - 1;
      }
      currentStreak = 1;
      streakStart = i;
    }
  }

  // Check final streak
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
    longestStreakStart = streakStart;
    longestStreakEnd = daysWithEvents.length - 1;
  }

  // Determine if current streak is active (last event was yesterday or today)
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const lastEventDate = new Date(daysWithEvents[daysWithEvents.length - 1]);
  lastEventDate.setHours(0, 0, 0, 0);

  const daysSinceLastEvent = Math.round(
    (now.getTime() - lastEventDate.getTime()) / (24 * 60 * 60 * 1000)
  );
  const isActive = daysSinceLastEvent <= 1;

  return {
    currentStreak: isActive ? currentStreak : 0,
    longestStreak,
    currentStreakStartDate: isActive
      ? new Date(daysWithEvents[daysWithEvents.length - currentStreak])
      : null,
    currentStreakEndDate: isActive
      ? new Date(daysWithEvents[daysWithEvents.length - 1])
      : null,
    longestStreakStartDate: new Date(daysWithEvents[longestStreakStart]),
    longestStreakEndDate: new Date(daysWithEvents[longestStreakEnd]),
    isActive
  };
}

function calculateWeeklyStreaks(events: EnhancedEvent[]) {
  // Sort events by date (oldest first)
  const sortedEvents = [...events].sort(
    (a, b) => a.parsedDate.getTime() - b.parsedDate.getTime()
  );

  // Group events by ISO week
  const weekMap = new Map<string, Date[]>();
  sortedEvents.forEach((event) => {
    const week = getISOWeek(event.parsedDate);
    if (!weekMap.has(week)) {
      weekMap.set(week, []);
    }
    weekMap.get(week)!.push(event.parsedDate);
  });

  // Get sorted list of weeks with events
  const weeksWithEvents = Array.from(weekMap.keys()).sort();

  if (weeksWithEvents.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      currentStreakStartDate: null,
      currentStreakEndDate: null,
      longestStreakStartDate: null,
      longestStreakEndDate: null,
      isActive: false
    };
  }

  // Calculate all streaks
  let currentStreak = 1;
  let longestStreak = 1;
  let streakStart = 0;
  let longestStreakStart = 0;
  let longestStreakEnd = 0;

  for (let i = 1; i < weeksWithEvents.length; i++) {
    const prevWeek = weeksWithEvents[i - 1];
    const currWeek = weeksWithEvents[i];

    // Check if weeks are consecutive
    const prevDate = new Date(parseInt(prevWeek.split("-W")[0]), 0, 1);
    const prevWeekNum = parseInt(prevWeek.split("-W")[1]);
    prevDate.setDate(prevDate.getDate() + (prevWeekNum - 1) * 7);

    const currDate = new Date(parseInt(currWeek.split("-W")[0]), 0, 1);
    const currWeekNum = parseInt(currWeek.split("-W")[1]);
    currDate.setDate(currDate.getDate() + (currWeekNum - 1) * 7);

    const weeksDiff = Math.round(
      (currDate.getTime() - prevDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );

    if (weeksDiff === 1) {
      // Consecutive week
      currentStreak++;
    } else {
      // Streak broken
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        longestStreakStart = streakStart;
        longestStreakEnd = i - 1;
      }
      currentStreak = 1;
      streakStart = i;
    }
  }

  // Check final streak
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
    longestStreakStart = streakStart;
    longestStreakEnd = weeksWithEvents.length - 1;
  }

  // Determine if current streak is active (last event was within the last 2 weeks)
  const now = new Date();
  const currentWeek = getISOWeek(now);
  const lastEventWeek = weeksWithEvents[weeksWithEvents.length - 1];

  // Calculate weeks difference between now and last event
  const lastDate = new Date(parseInt(lastEventWeek.split("-W")[0]), 0, 1);
  const lastWeekNum = parseInt(lastEventWeek.split("-W")[1]);
  lastDate.setDate(lastDate.getDate() + (lastWeekNum - 1) * 7);

  const nowDate = new Date(parseInt(currentWeek.split("-W")[0]), 0, 1);
  const nowWeekNum = parseInt(currentWeek.split("-W")[1]);
  nowDate.setDate(nowDate.getDate() + (nowWeekNum - 1) * 7);

  const weeksSinceLastEvent = Math.round(
    (nowDate.getTime() - lastDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  const isActive = weeksSinceLastEvent <= 1;

  // Get actual dates for streaks
  const getCurrentStreakDates = () => {
    const endIdx = weeksWithEvents.length - 1;
    const startIdx = endIdx - currentStreak + 1;
    const startWeek = weeksWithEvents[startIdx];
    const endWeek = weeksWithEvents[endIdx];

    return {
      start: new Date(
        Math.min(...(weekMap.get(startWeek) || []).map((d) => d.getTime()))
      ),
      end: new Date(
        Math.max(...(weekMap.get(endWeek) || []).map((d) => d.getTime()))
      )
    };
  };

  const getLongestStreakDates = () => {
    const startWeek = weeksWithEvents[longestStreakStart];
    const endWeek = weeksWithEvents[longestStreakEnd];

    return {
      start: new Date(
        Math.min(...(weekMap.get(startWeek) || []).map((d) => d.getTime()))
      ),
      end: new Date(
        Math.max(...(weekMap.get(endWeek) || []).map((d) => d.getTime()))
      )
    };
  };

  const currentDates = getCurrentStreakDates();
  const longestDates = getLongestStreakDates();

  return {
    currentStreak: isActive ? currentStreak : 0,
    longestStreak,
    currentStreakStartDate: isActive ? currentDates.start : null,
    currentStreakEndDate: isActive ? currentDates.end : null,
    longestStreakStartDate: longestDates.start,
    longestStreakEndDate: longestDates.end,
    isActive
  };
}

// Helper function to get ISO week number
function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7
  );
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

// ============================================================================
// TOP LISTS
// ============================================================================

export function calculateTopLists(events: EnhancedEvent[]): TopLists {
  if (events.length === 0) {
    return {
      topArtists: [],
      topVenues: [],
      recentEvents: []
    };
  }

  // Top venues (exclude venues starting with "!_")
  const venueMap = new Map<string, EnhancedEvent[]>();
  events.forEach((event) => {
    if (!event.place.startsWith("!_")) {
      const existing = venueMap.get(event.place) || [];
      venueMap.set(event.place, [...existing, event]);
    }
  });
  const topVenues = Array.from(venueMap.entries())
    .sort(([, a], [, b]) => b.length - a.length)
    .slice(0, 10);

  // Top artists
  const artistMap = new Map<string, number>();
  events.forEach((event) => {
    event.artists?.forEach((artist) => {
      artistMap.set(artist, (artistMap.get(artist) || 0) + 1);
    });
  });
  const topArtists = Array.from(artistMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  // Recent events (last 20)
  const recentEvents = [...events]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 20);

  return {
    topArtists,
    topVenues,
    recentEvents
  };
}

// ============================================================================
// COMPREHENSIVE ANALYTICS CALCULATOR
// ============================================================================

export function calculateComprehensiveAnalytics(
  events: EnhancedEvent[]
): ComprehensiveAnalytics {
  if (events.length === 0) {
    return {
      basic: calculateBasicStats([]),
      temporal: calculateTemporalStats([]),
      activity: calculateActivityStats([]),
      streaks: calculateStreaks([]),
      topLists: calculateTopLists([]),
      artistMap: new Map(),
      venueMap: new Map()
    };
  }

  // Build raw maps for flexible querying
  const artistMap = new Map<string, number>();
  events.forEach((event) => {
    event.artists?.forEach((artist) => {
      artistMap.set(artist, (artistMap.get(artist) || 0) + 1);
    });
  });

  const venueMap = new Map<string, EnhancedEvent[]>();
  events.forEach((event) => {
    if (!event.place.startsWith("!_")) {
      const existing = venueMap.get(event.place) || [];
      venueMap.set(event.place, [...existing, event]);
    }
  });

  return {
    basic: calculateBasicStats(events),
    temporal: calculateTemporalStats(events),
    activity: calculateActivityStats(events),
    streaks: calculateStreaks(events),
    topLists: calculateTopLists(events),
    artistMap,
    venueMap
  };
}

// ============================================================================
// RADAR CHART STATISTICS
// ============================================================================

export function calculateRadarStats(events: EnhancedEvent[]): RadarStats {
  if (events.length === 0) {
    return {
      multiVenueHustle: 0,
      activeArtistsCore: 0,
      activityRate: 0,
      consistency: 0,
      weekendWarrior: 0,
      intensity: 0,
      rawValues: {
        multiVenueDaysPercent: 0,
        coreArtistsCount: 0,
        attendanceRatePercent: 0,
        consistencyScore: 0,
        weekendActivityPercent: 0,
        eventsPerDay: 0
      }
    };
  }

  // Get pre-calculated stats
  const activityStats = calculateActivityStats(events);

  // 1. Multi-Venue Days
  // Formula: (daysWithMultipleVenues / uniqueDays) / 0.10 × 100 (caps at 10% of active days)
  const { daysWithMultipleVenues } = activityStats.multiEventDayStats;
  const multiVenueDaysPercent = (daysWithMultipleVenues / activityStats.uniqueDays) * 100;
  const multiVenueHustle = multiVenueDaysPercent / 0.10;

  // 2. Active Artists Core
  // Formula: Count artists with z-score > 2 (statistically significant outliers) / 20 × 100
  const artistMap = new Map<string, number>();
  events.forEach((event) => {
    event.artists?.forEach((artist) => {
      artistMap.set(artist, (artistMap.get(artist) || 0) + 1);
    });
  });

  const artistCounts = Array.from(artistMap.values());

  // Calculate mean and standard deviation
  const mean =
    artistCounts.reduce((sum, count) => sum + count, 0) / artistCounts.length;
  const variance =
    artistCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) /
    artistCounts.length;
  const stdDev = Math.sqrt(variance);

  // Count artists with z-score > 2 (significantly above average)
  const zThreshold = 2.5;
  const activeArtistsCount = artistCounts.filter((count) => {
    const zScore = (count - mean) / stdDev;
    return zScore > zThreshold;
  }).length;

  const activeArtistsCore = (activeArtistsCount / 20) * 100;

  // 3. Activity Rate
  // Formula: (uniqueDays / totalDaysInRange) / 0.30 × 100 (caps at 30%)
  const activityRate =
    (activityStats.uniqueDays / activityStats.totalDaysInRange / 0.30) * 100;

  // 4. Consistency
  // Formula: (100 / (1 + CV)) / 0.70 where CV = coefficient of variation of gaps (caps at 70)
  const sortedEvents = [...events].sort(
    (a, b) => a.parsedDate.getTime() - b.parsedDate.getTime()
  );

  const uniqueDays = Array.from(
    new Set(sortedEvents.map((e) => e.date.split(" ")[0]))
  ).sort();

  const gaps: number[] = [];
  for (let i = 1; i < uniqueDays.length; i++) {
    const prevDate = new Date(uniqueDays[i - 1]);
    const currDate = new Date(uniqueDays[i]);
    const daysDiff = Math.round(
      (currDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    gaps.push(daysDiff);
  }

  let consistency = 50; // Default middle value
  if (gaps.length > 0) {
    const meanGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const variance =
      gaps.reduce((sum, gap) => sum + Math.pow(gap - meanGap, 2), 0) /
      gaps.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = meanGap > 0 ? stdDev / meanGap : 0;
    consistency = 100 / (1 + coefficientOfVariation) / 0.7;
  }

  // 5. Weekend Activity
  // Formula: weekendPercentage / 1.0 (percentage of weekends with events, caps at 100%)
  const weekendWarrior = activityStats.weekendStats.weekendPercentage;

  // 6. Events per Day
  // Formula: ((totalEvents / uniqueDays) - 1) / 0.5 × 100 (caps at 1.5 events/day)
  const avgEventsPerDay = events.length / activityStats.uniqueDays;
  const intensity = Math.max(0, ((avgEventsPerDay - 1) / 0.5) * 100);

  console.log("🎯 RADAR STATS DEBUG:");
  console.log("  Multi-Venue Days:", multiVenueHustle, {
    multiVenueDaysPercent,
    daysWithMultipleVenues,
    uniqueDays: activityStats.uniqueDays
  });
  console.log("  Core Artists:", activeArtistsCore, {
    activeArtistsCount,
    totalArtists: artistMap.size,
    mean: mean.toFixed(2),
    stdDev: stdDev.toFixed(2),
    zThreshold
  });
  console.log("  Attendance Rate:", activityRate, {
    uniqueDays: activityStats.uniqueDays,
    totalDaysInRange: activityStats.totalDaysInRange
  });
  console.log("  Consistency:", consistency, {
    gaps: gaps.length,
    meanGap: gaps.length > 0 ? gaps.reduce((a, b) => a + b) / gaps.length : 0
  });
  console.log("  Weekend Activity:", weekendWarrior, {
    weekendPercentage: activityStats.weekendStats.weekendPercentage,
    weekendsWithEvents: activityStats.weekendStats.weekendsWithEvents,
    totalWeekends: activityStats.weekendStats.totalWeekends
  });
  console.log("  Events per Day:", intensity, { avgEventsPerDay });

  return {
    multiVenueHustle: Math.round(multiVenueHustle * 10) / 10,
    activeArtistsCore: Math.round(activeArtistsCore * 10) / 10,
    activityRate: Math.round(activityRate * 10) / 10,
    consistency: Math.round(consistency * 10) / 10,
    weekendWarrior: Math.round(weekendWarrior * 10) / 10,
    intensity: Math.round(intensity * 10) / 10,
    // Raw values for tooltips
    rawValues: {
      multiVenueDaysPercent: Math.round(multiVenueDaysPercent * 10) / 10,
      coreArtistsCount: activeArtistsCount,
      attendanceRatePercent: Math.round((activityStats.uniqueDays / activityStats.totalDaysInRange) * 1000) / 10,
      consistencyScore: Math.round(consistency * 10) / 10,
      weekendActivityPercent: Math.round(activityStats.weekendStats.weekendPercentage * 10) / 10,
      eventsPerDay: Math.round(avgEventsPerDay * 100) / 100
    }
  };
}

// ============================================================================
// CHART-SPECIFIC ANALYTICS
// ============================================================================

export function calculateChartAnalytics(
  events: EnhancedEvent[],
  artistsViewLimit: number = 10
): ChartAnalytics {
  const baseAnalytics = calculateComprehensiveAnalytics(events);

  if (events.length === 0) {
    return {
      ...baseAnalytics,
      cumulativeArtistData: [],
      displayedArtists: [],
      dateEventMap: new Map(),
      radarStats: {
        multiVenueHustle: 0,
        activeArtistsCore: 0,
        activityRate: 0,
        consistency: 0,
        weekendWarrior: 0,
        intensity: 0,
        rawValues: {
          multiVenueDaysPercent: 0,
          coreArtistsCount: 0,
          attendanceRatePercent: 0,
          consistencyScore: 0,
          weekendActivityPercent: 0,
          eventsPerDay: 0
        }
      }
    };
  }

  // Get top artists to display
  const displayedArtists = baseAnalytics.topLists.topArtists
    .slice(0, artistsViewLimit)
    .map(([name]) => name);

  // Calculate cumulative artist attendance over time
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const monthlyData = new Map<string, Record<string, number>>();
  const artistCounts: Record<string, number> = {};
  displayedArtists.forEach((artist) => (artistCounts[artist] = 0));

  sortedEvents.forEach((event) => {
    const monthYear = event.date.split(" ")[0].substring(0, 7); // YYYY-MM

    event.artists?.forEach((artist) => {
      if (displayedArtists.includes(artist)) {
        artistCounts[artist]++;
      }
    });

    // Store cumulative counts for this month
    monthlyData.set(monthYear, { ...artistCounts });
  });

  // Convert to array and fill missing months
  const cumulativeData: Record<string, any>[] = [];
  if (monthlyData.size > 0) {
    const months = Array.from(monthlyData.keys()).sort();
    const startDate = new Date(months[0] + "-01");
    const endDate = new Date(months[months.length - 1] + "-01");

    let currentDate = new Date(startDate);
    let lastCounts = { ...artistCounts };
    displayedArtists.forEach((artist) => (lastCounts[artist] = 0));

    while (currentDate <= endDate) {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;

      if (monthlyData.has(monthKey)) {
        lastCounts = monthlyData.get(monthKey)!;
      }

      cumulativeData.push({
        date: monthKey,
        ...lastCounts
      });

      currentDate.setMonth(currentDate.getMonth() + 1);
    }
  }

  // Calculate heatmap data
  const dateEventMap = new Map<string, number>();
  events.forEach((event) => {
    const dateStr = event.date.split(" ")[0]; // YYYY-MM-DD format
    dateEventMap.set(dateStr, (dateEventMap.get(dateStr) || 0) + 1);
  });

  // Calculate radar stats
  const radarStats = calculateRadarStats(events);

  return {
    ...baseAnalytics,
    cumulativeArtistData: cumulativeData,
    displayedArtists,
    dateEventMap,
    radarStats
  };
}

// ============================================================================
// LEGACY FUNCTIONS (kept for backwards compatibility)
// ============================================================================

export function calculateArtistStats(events: EnhancedEvent[]): ArtistStat[] {
  if (events.length === 0) return [];

  // Group events by artist
  const artistMap = new Map<string, EnhancedEvent[]>();

  events.forEach((event) => {
    event.artists.forEach((artist) => {
      if (!artistMap.has(artist)) {
        artistMap.set(artist, []);
      }
      artistMap.get(artist)!.push(event);
    });
  });

  // Calculate stats for each artist
  const stats: ArtistStat[] = [];

  artistMap.forEach((artistEvents, artistName) => {
    const dates = artistEvents.map((e) => e.parsedDate);
    const firstSeen = new Date(Math.min(...dates.map((d) => d.getTime())));
    const lastSeen = new Date(Math.max(...dates.map((d) => d.getTime())));

    stats.push({
      artistName,
      eventCount: artistEvents.length,
      percentage: (artistEvents.length / events.length) * 100,
      firstSeen,
      lastSeen,
      events: artistEvents,
      rank: 0 // Will be set after sorting
    });
  });

  // Sort by event count (descending) and assign ranks
  stats.sort((a, b) => b.eventCount - a.eventCount);
  stats.forEach((stat, index) => {
    stat.rank = index + 1;
  });

  return stats;
}

export function calculateVenueStats(events: EnhancedEvent[]): VenueStat[] {
  if (events.length === 0) return [];

  // Group events by venue
  const venueMap = new Map<string, EnhancedEvent[]>();

  events.forEach((event) => {
    if (!venueMap.has(event.place)) {
      venueMap.set(event.place, []);
    }
    venueMap.get(event.place)!.push(event);
  });

  // Calculate stats for each venue
  const stats: VenueStat[] = [];

  venueMap.forEach((venueEvents, venueName) => {
    const dates = venueEvents.map((e) => e.parsedDate);
    const firstVisit = new Date(Math.min(...dates.map((d) => d.getTime())));
    const lastVisit = new Date(Math.max(...dates.map((d) => d.getTime())));

    // Count unique artists at this venue
    const uniqueArtists = new Set<string>();
    venueEvents.forEach((event) => {
      event.artists.forEach((artist) => uniqueArtists.add(artist));
    });

    stats.push({
      venueName,
      eventCount: venueEvents.length,
      percentage: (venueEvents.length / events.length) * 100,
      firstVisit,
      lastVisit,
      uniqueArtistsCount: uniqueArtists.size,
      events: venueEvents,
      rank: 0 // Will be set after sorting
    });
  });

  // Sort by event count (descending) and assign ranks
  stats.sort((a, b) => b.eventCount - a.eventCount);
  stats.forEach((stat, index) => {
    stat.rank = index + 1;
  });

  return stats;
}

export function getBusiestDayOfWeek(events: EnhancedEvent[]): {
  day: string;
  count: number;
} {
  if (events.length === 0) return { day: "N/A", count: 0 };

  const dayCounts = new Map<string, number>();

  events.forEach((event) => {
    const day = event.dayOfWeek;
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
  });

  let maxDay = "";
  let maxCount = 0;

  dayCounts.forEach((count, day) => {
    if (count > maxCount) {
      maxCount = count;
      maxDay = day;
    }
  });

  return { day: maxDay, count: maxCount };
}

export function getBusiestMonth(events: EnhancedEvent[]): {
  month: string;
  count: number;
} {
  if (events.length === 0) return { month: "N/A", count: 0 };

  const monthCounts = new Map<string, number>();

  events.forEach((event) => {
    const monthYear = `${event.month} ${event.year}`;
    monthCounts.set(monthYear, (monthCounts.get(monthYear) || 0) + 1);
  });

  let maxMonth = "";
  let maxCount = 0;

  monthCounts.forEach((count, month) => {
    if (count > maxCount) {
      maxCount = count;
      maxMonth = month;
    }
  });

  return { month: maxMonth, count: maxCount };
}

export function filterEventsByDateRange(
  events: EnhancedEvent[],
  startDate?: string,
  endDate?: string
): EnhancedEvent[] {
  if (!startDate && !endDate) return events;

  return events.filter((event) => {
    const eventDate = event.parsedDate.toISOString().split("T")[0];

    if (startDate && eventDate < startDate) return false;
    if (endDate && eventDate > endDate) return false;

    return true;
  });
}
