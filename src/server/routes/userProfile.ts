import { Elysia, t } from 'elysia';
import { fetchUserProfile } from '../crawlers/userProfile';
import { fetchArtistsTotalEvents } from '../crawlers/artistTotalEvents';
import { cache } from '../services/cache';
import type { UserProfile } from '../crawlers/userProfile';

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
    '/:userId',
    async ({ params }) => {
      const { userId } = params;

      console.log(`📡 Fetching user profile for: ${userId}`);

      const cacheKey = `user-profile:${userId}`;
      const cached = cache.get<UserProfileWithAttendance>(cacheKey);
      if (cached) {
        console.log(`📦 Returning cached profile for ${userId}`);
        return { success: true, data: cached };
      }

      try {
        const profile = await fetchUserProfile(userId);

        const artistTotals = await fetchArtistsTotalEvents(
          profile.favoriteArtists.map(a => ({ name: a.name, href: a.href }))
        );

        const artistDataMap = new Map(artistTotals.map(a => [a.name, a]));

        const artistAttendance = profile.favoriteArtists.map(artist => {
          const data = artistDataMap.get(artist.name);
          const totalEvents = data?.totalEvents || 0;
          const eventDates = data?.eventDates || [];
          const percentage = totalEvents > 0
            ? Math.round((artist.attendanceCount / totalEvents) * 1000) / 10
            : 0;

          return {
            name: artist.name,
            href: artist.href,
            userCount: artist.attendanceCount,
            totalEvents,
            percentage,
            eventDates
          };
        });

        const result: UserProfileWithAttendance = {
          ...profile,
          artistAttendance
        };

        cache.set(cacheKey, result, 10 * 60);

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
      })
    }
  );
