import { Elysia, t } from 'elysia';
import { cache } from '../services/cache';
import { calculateArtistStats, calculateVenueStats, filterEventsByDateRange } from '../utils/calculations';
import type { EnhancedEvent } from '../../shared/types/event';

export const statsRoutes = new Elysia({ prefix: '/stats' })
  .get(
    '/artists/:userId',
    async ({ params, query }) => {
      const { userId } = params;
      const { startDate, endDate, limit } = query;

      try {
        console.log(`📊 Calculating artist stats for user: ${userId}`);

        // Fetch events from memory cache
        const cacheKey = `events:${userId}:${startDate || 'all'}:${endDate || 'all'}`;
        const cached = cache.get<{ events: any[] }>(cacheKey);

        if (!cached || !cached.events) {
          return {
            success: false,
            error: {
              code: 'NO_DATA',
              message: 'No events data found. Please fetch events first.'
            }
          };
        }

        // Convert to EnhancedEvent format
        const events: EnhancedEvent[] = cached.events.map((e: any) => {
          const parsedDate = new Date(e.date);
          return {
            ...e,
            parsedDate,
            dayOfWeek: parsedDate.toLocaleDateString('en-US', { weekday: 'long' }),
            month: parsedDate.toLocaleDateString('en-US', { month: 'long' }),
            year: parsedDate.getFullYear()
          };
        });

        // Calculate stats
        const stats = calculateArtistStats(events);
        const limited = stats.slice(0, parseInt(limit || '1000'));

        console.log(`✅ Calculated stats for ${stats.length} artists`);

        return {
          success: true,
          data: {
            artists: limited.map(stat => ({
              artistName: stat.artistName,
              eventCount: stat.eventCount,
              percentage: Math.round(stat.percentage * 100) / 100,
              firstSeen: stat.firstSeen.toISOString(),
              lastSeen: stat.lastSeen.toISOString(),
              rank: stat.rank
            })),
            totalCount: stats.length
          }
        };
      } catch (error) {
        console.error('Error calculating artist stats:', error);
        return {
          success: false,
          error: {
            code: 'STATS_ERROR',
            message: error instanceof Error ? error.message : 'Failed to calculate stats'
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
        endDate: t.Optional(t.String()),
        limit: t.Optional(t.String())
      })
    }
  )

  .get(
    '/venues/:userId',
    async ({ params, query }) => {
      const { userId } = params;
      const { startDate, endDate, limit } = query;

      try {
        console.log(`📊 Calculating venue stats for user: ${userId}`);

        // Fetch events from memory cache
        const cacheKey = `events:${userId}:${startDate || 'all'}:${endDate || 'all'}`;
        const cached = cache.get<{ events: any[] }>(cacheKey);

        if (!cached || !cached.events) {
          return {
            success: false,
            error: {
              code: 'NO_DATA',
              message: 'No events data found. Please fetch events first.'
            }
          };
        }

        // Convert to EnhancedEvent format
        const events: EnhancedEvent[] = cached.events.map((e: any) => {
          const parsedDate = new Date(e.date);
          return {
            ...e,
            parsedDate,
            dayOfWeek: parsedDate.toLocaleDateString('en-US', { weekday: 'long' }),
            month: parsedDate.toLocaleDateString('en-US', { month: 'long' }),
            year: parsedDate.getFullYear()
          };
        });

        // Calculate stats
        const stats = calculateVenueStats(events);
        const limited = stats.slice(0, parseInt(limit || '1000'));

        console.log(`✅ Calculated stats for ${stats.length} venues`);

        return {
          success: true,
          data: {
            venues: limited.map(stat => ({
              venueName: stat.venueName,
              eventCount: stat.eventCount,
              percentage: Math.round(stat.percentage * 100) / 100,
              firstVisit: stat.firstVisit.toISOString(),
              lastVisit: stat.lastVisit.toISOString(),
              uniqueArtistsCount: stat.uniqueArtistsCount,
              rank: stat.rank
            })),
            totalCount: stats.length
          }
        };
      } catch (error) {
        console.error('Error calculating venue stats:', error);
        return {
          success: false,
          error: {
            code: 'STATS_ERROR',
            message: error instanceof Error ? error.message : 'Failed to calculate stats'
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
        endDate: t.Optional(t.String()),
        limit: t.Optional(t.String())
      })
    }
  );
