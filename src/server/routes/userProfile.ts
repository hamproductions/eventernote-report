import { Elysia, t } from 'elysia';
import { fetchUserProfile } from '../crawlers/userProfile';
import { fetchArtistsTotalEvents } from '../crawlers/artistTotalEvents';
import { cache } from '../services/cache';
import type { UserProfile } from '../crawlers/userProfile';
import { fetchRegisteredEvents } from '../crawlers/attendedEvents';
import { fetchUserConnections, type ConnectedUser } from '../crawlers/userConnections';

interface UserProfileWithAttendance extends UserProfile {
  artistAttendance: {
    name: string;
    href: string;
    userCount: number;
    totalEvents: number;
    percentage: number;
    eventDates: string[];
  }[];
}

export const userProfileRoutes = new Elysia({ prefix: '/user-profile' })
  .get(
    '/:userId/connections',
    async ({ params }) => {
      const cacheKey = `user-connections:${params.userId}`;
      const cached = cache.get<{ following: ConnectedUser[]; followers: ConnectedUser[] }>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }

      try {
        const [following, followers] = await Promise.all([
          fetchUserConnections(params.userId, 'following'),
          fetchUserConnections(params.userId, 'follower')
        ]);
        const data = { following, followers };
        cache.set(cacheKey, data, 6 * 60 * 60);
        return { success: true, data };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch followers'
        };
      }
    },
    {
      params: t.Object({
        userId: t.String()
      })
    }
  )
  .get(
    '/:userId',
    async ({ params, query }) => {
      const { userId } = params;
      const { startDate, endDate } = query;

      console.log(`📡 Fetching user profile for: ${userId}`);

      const cacheKey = `user-profile-v3:${userId}:${startDate || 'all'}:${endDate || 'all'}`;
      const cached = cache.get<UserProfileWithAttendance>(cacheKey);
      if (cached) {
        console.log(`📦 Returning cached profile for ${userId}`);
        return { success: true, data: cached };
      }

      try {
        const profile = await fetchUserProfile(userId);
        const rankedArtists = [...profile.favoriteArtists]
          .sort((a, b) => b.attendanceCount - a.attendanceCount)
          .slice(0, 10);

        const artistTotals = await fetchArtistsTotalEvents(
          rankedArtists.map(a => ({ name: a.name, href: a.href })),
          startDate,
          endDate
        );

        const artistDataMap = new Map(artistTotals.map(a => [a.name, a]));
        const registeredIds = new Set((await fetchRegisteredEvents(userId, startDate, endDate)).map(event => event.href));

        const artistAttendance = rankedArtists.map(artist => {
          const data = artistDataMap.get(artist.name);
          const totalEvents = data?.totalEvents || 0;
          const eventDates = data?.eventDates || [];
          const userCount = data?.eventIds.filter(id => registeredIds.has(id)).length || 0;
          const percentage = totalEvents > 0
            ? Math.round((userCount / totalEvents) * 1000) / 10
            : 0;

          return {
            name: artist.name,
            href: artist.href,
            userCount,
            totalEvents,
            percentage,
            eventDates
          };
        });

        const result: UserProfileWithAttendance = {
          ...profile,
          artistAttendance
        };

        cache.set(cacheKey, result, 60 * 60);

        return { success: true, data: result };
      } catch (error) {
        console.error('❌ Error fetching user profile:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch user profile'
        };
      }
    },
    {
      params: t.Object({
        userId: t.String()
      }),
      query: t.Object({ startDate: t.Optional(t.String()), endDate: t.Optional(t.String()) })
    }
  );
