import { parseHTML } from 'linkedom';
import { scrapeEventDetails } from './eventDetails';
import { cache } from '../services/cache';
import type { EnhancedEvent } from '../../shared/types/event';
import { readEventernote } from './readEventernote';

const pending = new Map<string, Promise<EnhancedEvent[]>>();
const pendingLists = new Map<string, Promise<EnhancedEvent[]>>();
const progress = new Map<string, { stage: string; loaded: number; total: number }>();

export function getAttendanceProgress(userId: string, startDate?: string, endDate?: string) {
  const key = attendanceCacheKey(userId, startDate, endDate);
  const cached = cache.get<EnhancedEvent[]>(key);
  return cached ? { stage: 'complete', loaded: cached.length, total: cached.length } :
    progress.get(key) || { stage: 'listing', loaded: 0, total: 0 };
}

export function attendanceCacheKey(userId: string, startDate?: string, endDate?: string): string {
  return `events-v2:${userId}:${startDate || 'all'}:${endDate || 'all'}`;
}

export async function fetchRegisteredEvents(userId: string, startDate?: string, endDate?: string): Promise<EnhancedEvent[]> {
  const key = `registered-${attendanceCacheKey(userId, startDate, endDate)}`;
  const cached = cache.get<EnhancedEvent[]>(key);
  if (cached) return cached;
  let request = pendingLists.get(key);
  if (!request) {
    request = crawlRegisteredEvents(userId, startDate, endDate);
    pendingLists.set(key, request);
  }
  try {
    return await request;
  } finally {
    if (pendingLists.get(key) === request) pendingLists.delete(key);
  }
}

export async function fetchAttendedEvents(
  userId: string,
  options: { limit?: number; startDate?: string; endDate?: string } = {}
): Promise<EnhancedEvent[]> {
  const cacheKey = attendanceCacheKey(userId, options.startDate, options.endDate);
  const cached = cache.get<EnhancedEvent[]>(cacheKey);
  if (cached) return cached.slice(0, options.limit || 10000);

  let request = pending.get(cacheKey);
  if (!request) {
    request = crawlAttendedEvents(userId, options.startDate, options.endDate);
    pending.set(cacheKey, request);
  }
  try {
    return (await request).slice(0, options.limit || 10000);
  } catch (error) {
    progress.set(cacheKey, { stage: 'error', loaded: 0, total: 0 });
    throw error;
  } finally {
    if (pending.get(cacheKey) === request) pending.delete(cacheKey);
  }
}

async function crawlRegisteredEvents(userId: string, startDate?: string, endDate?: string): Promise<EnhancedEvent[]> {
  const origin = 'https://www.eventernote.com';
  const path = `/users/${encodeURIComponent(userId)}/events`;
  const { document } = parseHTML(await readEventernote(origin + path, 2));
  const expectedCount = Number(document.title.match(/参加イベント一覧 \((\d+)\)/)?.[1]);
  if (!Number.isFinite(expectedCount)) throw new Error('Attendance list not found');

  const months = Array.from(document.querySelectorAll('a'))
    .filter(link => {
      const href = link.getAttribute('href');
      return href?.startsWith(`${path}/?year=`) && href.includes('&month=');
    })
    .map(link => ({ href: link.getAttribute('href')!, count: Number(link.textContent) }));
  if (months.reduce((sum, month) => sum + month.count, 0) !== expectedCount) {
    throw new Error('Attendance calendar does not reconcile with registrations');
  }

  const events = new Map<string, EnhancedEvent>();
  const selectedMonths = months.filter(month => {
    const query = new URL(month.href, origin).searchParams;
    const date = `${query.get('year')}-${query.get('month')!.padStart(2, '0')}`;
    return (!startDate || date >= startDate.slice(0, 7)) && (!endDate || date <= endDate.slice(0, 7));
  });
  const readMonth = async (month: typeof months[number]) => {
    let url: string | null = origin + month.href + '&limit=10000';
    const seenPages = new Set<string>();
    let rowCount = 0;
    while (url) {
      if (seenPages.has(url)) throw new Error('Repeated attendance page');
      seenPages.add(url);
      const { document: page } = parseHTML(await readEventernote(url, 2));
      const rows = page.querySelectorAll('div.gb_event_list.clearfix > ul > li');
      rowCount += rows.length;
      for (const row of rows) {
        const link = row.querySelector('div.event > h4 > a');
        const href = link?.getAttribute('href');
        const name = link?.textContent?.trim();
        const date = row.querySelector('div.date > p')?.textContent?.trim();
        const place = row.querySelector('div.place > a')?.textContent?.trim() || '';
        const attendees = Number(row.querySelector('div.note_count p')?.textContent?.trim());
        if (!href || !name || !date) throw new Error('Incomplete attendance entry');
        if (events.has(href)) continue;
        const parsedDate = new Date(`${date.slice(0, 10)}T00:00:00`);
        if (Number.isNaN(parsedDate.getTime())) throw new Error(`Invalid date for ${href}`);
        events.set(href, {
          name,
          href,
          date,
          place,
          artists: [],
          attendees: Number.isFinite(attendees) ? attendees : undefined,
          parsedDate,
          dayOfWeek: parsedDate.toLocaleDateString('en-US', { weekday: 'long' }),
          month: parsedDate.toLocaleDateString('en-US', { month: 'long' }),
          year: parsedDate.getFullYear()
        });
      }
      const next = Array.from(page.querySelectorAll('.pagination a'))
        .find(link => link.textContent?.trim() === '>')?.getAttribute('href');
      url = next ? new URL(next, url).href : null;
    }
    if (rowCount !== month.count) throw new Error(`Incomplete attendance month: ${month.href}`);
  };
  let nextMonth = 0;
  await Promise.all(Array.from({ length: Math.min(12, selectedMonths.length) }, async () => {
    while (nextMonth < selectedMonths.length) await readMonth(selectedMonths[nextMonth++]);
  }));

  const result = Array.from(events.values())
    .filter(event => (!startDate || event.date.slice(0, 10) >= startDate) && (!endDate || event.date.slice(0, 10) <= endDate))
    .sort((a, b) => b.date.localeCompare(a.date));
  cache.set(`registered-${attendanceCacheKey(userId, startDate, endDate)}`, result, 60 * 60);
  return result;
}

async function crawlAttendedEvents(userId: string, startDate?: string, endDate?: string): Promise<EnhancedEvent[]> {
  const key = attendanceCacheKey(userId, startDate, endDate);
  progress.set(key, { stage: 'listing', loaded: 0, total: 0 });
  const registrations = await fetchRegisteredEvents(userId, startDate, endDate);
  const result = registrations.filter(event =>
    (!startDate || event.date.slice(0, 10) >= startDate) &&
    (!endDate || event.date.slice(0, 10) <= endDate)
  );
  const verified: EnhancedEvent[] = new Array(result.length);
  progress.set(key, { stage: 'details', loaded: 0, total: result.length });
  let next = 0;
  let loaded = 0;
  await Promise.all(Array.from({ length: Math.min(16, result.length) }, async () => {
    while (next < result.length) {
      const index = next++;
      const event = result[index];
      const details = await scrapeEventDetails(event.href);
      if (details.date !== event.date.slice(0, 10)) throw new Error(`Event date mismatch: ${event.href}`);
      verified[index] = { ...event, name: details.name, place: details.place, artists: details.artists, attendees: event.attendees ?? details.attendees };
      progress.set(key, { stage: 'details', loaded: ++loaded, total: result.length });
    }
  }));
  cache.set(attendanceCacheKey(userId, startDate, endDate), verified, 60 * 60);
  progress.delete(key);
  return verified;
}
