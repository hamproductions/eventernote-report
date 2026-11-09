import type { Event } from './event';

export interface ScheduleSnapshot {
  userId: string;
  month: string;
  events: Event[];
  loadedAt: string;
  expiresAt: string;
}

export interface ScheduleResponse {
  success: boolean;
  data: ScheduleSnapshot;
}
