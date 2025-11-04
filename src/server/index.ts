import { join } from 'path';
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { staticPlugin } from '@elysiajs/static';
import { logger } from '@bogeychan/elysia-logger';
import { connect } from 'elysia-connect-middleware';
import { renderPage } from 'vike/server';
import { eventRoutes, statsRoutes, healthRoute, favoriteArtistsRoutes } from './routes';

const PORT = process.env.PORT || 3002;
const isProduction = process.env.NODE_ENV === 'production';
const root = process.cwd();

const app = new Elysia();

// Setup Vike dev middleware in development
if (!isProduction) {
  const { createDevMiddleware } = await import('vike/server');
  const { devMiddleware } = await createDevMiddleware({ root });
  app.use(connect(devMiddleware));
} else {
  // In production, serve static assets
  app.use(
    staticPlugin({
      assets: join(root, 'dist', 'client'),
      prefix: '/'
    })
  );
}

app
  // Middleware
  .use(logger())
  .use(cors({ credentials: true }))

  // Health check
  .use(healthRoute)

  // API routes
  .group('/api', (api) =>
    api
      .use(eventRoutes)
      .use(statsRoutes)
      .use(favoriteArtistsRoutes)
  )

  // Vike SSR handler - must be last
  .get('/*', async ({ request }) => {
    const pageContextInit = { urlOriginal: request.url };
    const pageContext = await renderPage(pageContextInit);
    const { httpResponse } = pageContext;

    if (!httpResponse) {
      return new Response('Not found', { status: 404 });
    }

    const { body, statusCode, headers } = httpResponse;
    return new Response(body, {
      status: statusCode,
      headers: headers as HeadersInit
    });
  })

  .listen(PORT);

console.log(`🦊 Elysia server running at http://localhost:${PORT}`);

export type App = typeof app;
