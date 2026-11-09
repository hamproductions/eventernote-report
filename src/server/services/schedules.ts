import { attendanceCacheKey, fetchRegisteredEvents } from '../crawlers/attendedEvents';
import { cache } from './cache';
import type { ScheduleSnapshot } from '../../shared/types/schedule';

const pending = new Map<string, Promise<ScheduleSnapshot>>();

export function scheduleMonthRange(month: string, now = new Date()) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Choose a valid calendar month');
  const [year, number] = month.split('-').map(Number);
  const offset = (year - now.getFullYear()) * 12 + number - 1 - now.getMonth();
  if (offset < 0 || offset > 12) throw new Error('Choose this month or one of the next 12 months');
  return {
    startDate: `${month}-01`,
    endDate: `${month}-${new Date(year, number, 0).getDate()}`
  };
}

export async function fetchSchedule(userId: string, month: string): Promise<ScheduleSnapshot> {
  const range = scheduleMonthRange(month);
  const key = `schedule-v2:${userId.toLowerCase()}:${month}`;
  const cached = cache.get<ScheduleSnapshot>(key);
  if (cached) return cached;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = (async () => {
    const registrationKey = attendanceCacheKey(userId, range.startDate, range.endDate);
    const loadedAtKey = `registered-loaded-at:${registrationKey}`;
    if (!cache.get<string>(loadedAtKey)) cache.delete(`registered-${registrationKey}`);
    const registrations = await fetchRegisteredEvents(userId, range.startDate, range.endDate);
    const loadedAt = new Date(cache.get<string>(loadedAtKey)!);
    const expiresAt = loadedAt.getTime() + 60 * 60 * 1000;
    const snapshot: ScheduleSnapshot = {
      userId,
      month,
      events: registrations.map(({ name, href, date, place }) => ({ name, href, date, place })),
      loadedAt: loadedAt.toISOString(),
      expiresAt: new Date(expiresAt).toISOString()
    };
    cache.set(key, snapshot, Math.max(0, (expiresAt - Date.now()) / 1000));
    return snapshot;
  })();
  pending.set(key, request);
  try {
    return await request;
  } finally {
    if (pending.get(key) === request) pending.delete(key);
  }
}
