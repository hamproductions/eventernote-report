import { Elysia, t } from 'elysia';
import { fetchFavoriteArtists } from '../crawlers/favoriteArtists';
import { cache } from '../services/cache';

export const favoriteArtistsRoutes = new Elysia({ prefix: '/favorite-artists' })
  .get(
    '/user/:userId',
    async ({ params }) => {
      const { userId } = params;

      console.log(`📡 Fetching favorite artists for user: ${userId}`);

      // Check cache
      const cacheKey = `favorite-artists:${userId}`;
      const cached = cache.get<any>(cacheKey);
      if (cached) {
        console.log(`📦 Returning ${cached.length} cached favorite artists`);
        return { success: true, data: cached };
      }

      try {
        // Fetch favorite artists
        const artists = await fetchFavoriteArtists(userId);

        // Cache for 1 hour
        cache.set(cacheKey, artists, 60 * 60);

        return {
          success: true,
          data: artists
        };
      } catch (error) {
        console.error('❌ Error in favorite artists route:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch favorite artists'
        };
      }
    },
    {
      params: t.Object({
        userId: t.String()
      })
    }
  );
