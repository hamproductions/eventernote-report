import type { EnhancedEvent } from '../../shared/types/event';
import type { ArtistStat, VenueStat } from '../../shared/types/stats';

export function calculateArtistStats(events: EnhancedEvent[]): ArtistStat[] {
  if (events.length === 0) return [];

  // Group events by artist
  const artistMap = new Map<string, EnhancedEvent[]>();

  events.forEach(event => {
    event.artists.forEach(artist => {
      if (!artistMap.has(artist)) {
        artistMap.set(artist, []);
      }
      artistMap.get(artist)!.push(event);
    });
  });

  // Calculate stats for each artist
  const stats: ArtistStat[] = [];

  artistMap.forEach((artistEvents, artistName) => {
    const dates = artistEvents.map(e => e.parsedDate);
    const firstSeen = new Date(Math.min(...dates.map(d => d.getTime())));
    const lastSeen = new Date(Math.max(...dates.map(d => d.getTime())));

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

  events.forEach(event => {
    if (!venueMap.has(event.place)) {
      venueMap.set(event.place, []);
    }
    venueMap.get(event.place)!.push(event);
  });

  // Calculate stats for each venue
  const stats: VenueStat[] = [];

  venueMap.forEach((venueEvents, venueName) => {
    const dates = venueEvents.map(e => e.parsedDate);
    const firstVisit = new Date(Math.min(...dates.map(d => d.getTime())));
    const lastVisit = new Date(Math.max(...dates.map(d => d.getTime())));

    // Count unique artists at this venue
    const uniqueArtists = new Set<string>();
    venueEvents.forEach(event => {
      event.artists.forEach(artist => uniqueArtists.add(artist));
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

export function getBusiestDayOfWeek(events: EnhancedEvent[]): { day: string; count: number } {
  if (events.length === 0) return { day: 'N/A', count: 0 };

  const dayCounts = new Map<string, number>();

  events.forEach(event => {
    const day = event.dayOfWeek;
    dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
  });

  let maxDay = '';
  let maxCount = 0;

  dayCounts.forEach((count, day) => {
    if (count > maxCount) {
      maxCount = count;
      maxDay = day;
    }
  });

  return { day: maxDay, count: maxCount };
}

export function getBusiestMonth(events: EnhancedEvent[]): { month: string; count: number } {
  if (events.length === 0) return { month: 'N/A', count: 0 };

  const monthCounts = new Map<string, number>();

  events.forEach(event => {
    const monthYear = `${event.month} ${event.year}`;
    monthCounts.set(monthYear, (monthCounts.get(monthYear) || 0) + 1);
  });

  let maxMonth = '';
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

  return events.filter(event => {
    const eventDate = event.parsedDate.toISOString().split('T')[0];

    if (startDate && eventDate < startDate) return false;
    if (endDate && eventDate > endDate) return false;

    return true;
  });
}
