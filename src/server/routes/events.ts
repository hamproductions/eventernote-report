import { Elysia, t } from 'elysia';
import { fetchAttendedEvents, searchEvents } from '../crawlers';
import type { SearchedEvent } from '../crawlers';
import { cache } from '../services/cache';
import { attendanceCacheKey, getAttendanceProgress } from '../crawlers/attendedEvents';

export const eventRoutes = new Elysia({ prefix: '/events' })
  .get('/user/:userId/progress', ({ params, query }) =>
    getAttendanceProgress(params.userId, query.startDate, query.endDate), {
    params: t.Object({ userId: t.String() }),
    query: t.Object({ startDate: t.Optional(t.String()), endDate: t.Optional(t.String()) })
  })
  .get(
    '/user/:userId',
    async ({ params, query }) => {
      const { userId } = params;
      const { startDate, endDate } = query;

      try {
        console.log(`📡 Fetching events for user: ${userId}`);

        // Check memory cache first
        const cacheKey = attendanceCacheKey(userId, startDate, endDate);
        const cached = cache.get<any[]>(cacheKey);

        if (cached) {
          console.log(`📦 Returning ${cached.length} cached events`);
          return {
            success: true,
            data: {
              events: cached,
              totalCount: cached.length,
              cached: true
            }
          };
        }

        // Crawl Eventernote (now includes artists directly!)
        console.log('🕷️  Crawling Eventernote...');
        const events = await fetchAttendedEvents(userId, {
          limit: 10000,
          startDate,
          endDate
        });

        // Store in memory cache (5 min TTL)
        const result = {
          events,
          totalCount: events.length
        };

        console.log(`✅ Successfully fetched ${events.length} events with artists`);

        return {
          success: true,
          data: {
            ...result,
            cached: false
          }
        };
      } catch (error) {
        console.error('❌ Error fetching events:', error);
        return {
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: error instanceof Error ? error.message : 'Failed to fetch events'
          }
        };
      }
    },
    {
      params: t.Object({
        userId: t.String()
      }),
      query: t.Object({
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String())
      })
    }
  )

  .get(
    '/search',
    async ({ query }) => {
      const { q, limit = 20 } = query;

      try {
        console.log(`🔍 Searching events for keyword: ${q}`);

        const cacheKey = `search:${q}:${limit}`;
        const cachedEvents = cache.get<SearchedEvent[]>(cacheKey);

        if (cachedEvents) {
          console.log(`📦 Returning ${cachedEvents.length} cached search results`);
          return {
            success: true,
            data: {
              events: cachedEvents,
              totalCount: cachedEvents.length,
              cached: true
            }
          };
        }

        const events = await searchEvents(q, limit);

        return {
          success: true,
          data: {
            events,
            totalCount: events.length,
            cached: false
          }
        };
      } catch (error) {
        console.error('❌ Error searching events:', error);
        return {
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: error instanceof Error ? error.message : 'Failed to search events'
          }
        };
      }
    },
    {
      query: t.Object({
        q: t.String(),
        limit: t.Optional(t.Numeric())
      })
    }
  )

  .get(
    '/:eventId',
    async ({ params }) => {
      const { eventId } = params;
      const href = `/events/${eventId}`;

      try {
        // Scrape event page (will use memory cache internally)
        const { scrapeEventDetails } = await import('../crawlers/eventDetails');
        const details = await scrapeEventDetails(href);

        return {
          success: true,
          data: {
            id: eventId,
            href,
            ...details,
            eventernoteUrl: `https://eventernote.com${href}`
          }
        };
      } catch (error) {
        console.error('Error fetching event details:', error);
        return {
          success: false,
          error: {
            code: 'FETCH_ERROR',
            message: error instanceof Error ? error.message : 'Failed to fetch event details'
          }
        };
      }
    },
    {
      params: t.Object({
        eventId: t.String()
      })
    }
  );
