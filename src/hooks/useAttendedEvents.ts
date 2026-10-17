import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { EnhancedEvent } from '~/shared/types/event';
import { fetchJson } from '~/shared/utils/fetchJson';

export interface EventRange {
  start: string | null;
  end: string | null;
}

/** Attended events for one person: same endpoint, cache key and date filtering as the dashboard. */
export function useAttendedEvents(userId: string | null, range: EventRange) {
  const params = new URLSearchParams();
  if (range.start) params.set('startDate', range.start);
  if (range.end) params.set('endDate', range.end);

  const events = useQuery<{ data: { events: EnhancedEvent[] } }>({
    queryKey: ['events', userId, range],
    queryFn: () => fetchJson(`/api/events/user/${encodeURIComponent(userId!)}?${params}`, 'Could not load events'),
    enabled: !!userId,
    staleTime: 1000 * 60 * 30
  });

  const progress = useQuery<{ stage: string; loaded: number; total: number }>({
    queryKey: ['attendance-progress', userId, range],
    queryFn: () => fetchJson(`/api/events/user/${encodeURIComponent(userId!)}/progress?${params}`, 'Could not load progress'),
    enabled: !!userId && events.isFetching,
    refetchInterval: events.isFetching ? 1500 : false
  });

  const profile = useQuery<{ data: { displayName: string; username: string } }>({
    queryKey: ['compare-name', userId],
    queryFn: () => fetchJson(`/api/user-profile/${encodeURIComponent(userId!)}`, 'Could not load profile'),
    enabled: !!userId && events.isSuccess,
    staleTime: 1000 * 60 * 60
  });

  const attended = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (events.data?.data.events ?? []).filter((event) => {
      const date = event.date.slice(0, 10);
      return date <= today && (!range.start || date >= range.start) && (!range.end || date <= range.end);
    });
  }, [events.data, range.start, range.end]);

  return {
    events: attended,
    loaded: events.isSuccess,
    isFetching: events.isFetching,
    error: events.isError && !events.isFetching ? events.error : null,
    retry: () => events.refetch(),
    progress: progress.data,
    label: profile.data?.data.displayName || profile.data?.data.username || userId || ''
  };
}
