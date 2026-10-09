import { Elysia, t } from 'elysia';
import { parseHTML } from 'linkedom';
import { fetchRegisteredEvents } from '../crawlers/attendedEvents';
import { fetchArtistCatalog } from '../crawlers/artistCatalog';

function artistPath(value: string): string {
  const url = new URL(value, 'https://www.eventernote.com');
  if (!['www.eventernote.com', 'eventernote.com'].includes(url.hostname) ||
      !/^\/actors\/[^/]+\/\d+\/?$/.test(url.pathname)) {
    throw new Error('Enter an Eventernote artist URL');
  }
  return url.pathname.replace(/\/$/, '');
}

async function readPage(path: string) {
  const response = await fetch(`https://www.eventernote.com${path}`);
  if (!response.ok) throw new Error(`Eventernote returned HTTP ${response.status}`);
  return parseHTML(await response.text()).document;
}

export const artistRoutes = new Elysia({ prefix: '/artists' })
  .get('/registrations/:userId', async ({ params, query }) => {
    try {
      const events = await fetchRegisteredEvents(params.userId, query.startDate, query.endDate);
      return { success: true, data: events.map(event => ({ href: event.href, date: event.date.slice(0, 10) })) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Attendance list failed' };
    }
  }, {
    params: t.Object({ userId: t.String() }),
    query: t.Object({ startDate: t.Optional(t.String()), endDate: t.Optional(t.String()) })
  })
  .get('/search', async ({ query }) => {
    try {
      const q = query.q.trim();
      if (!q) return { success: true, data: [] };
      if (/^https?:\/\//.test(q) || q.startsWith('/actors/')) {
        const href = artistPath(q);
        const document = await readPage(`${href}/events?limit=1`);
        const name = document.querySelector('div.span8.page h2')?.textContent?.trim()
          .replace(/のイベント・ライブ情報一覧$/, '');
        if (!name) throw new Error('Artist not found');
        return { success: true, data: [{ name, href }] };
      }
      const document = await readPage(`/actors/search?keyword=${encodeURIComponent(q)}`);
      const artists = Array.from(document.querySelectorAll('ul.gb_actors_list > li > a'))
        .map(link => ({ name: link.textContent?.trim() || '', href: link.getAttribute('href') || '' }))
        .filter(artist => artist.name && /^\/actors\/[^/]+\/\d+$/.test(artist.href));
      return { success: true, data: artists };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Artist search failed' };
    }
  }, { query: t.Object({ q: t.String() }) })
  .get('/catalog', async ({ query }) => {
    try {
      const href = artistPath(query.href);
      const data = { href, ...await fetchArtistCatalog(href, query.startDate, query.endDate) };
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Artist lookup failed' };
    }
  }, { query: t.Object({ href: t.String(), startDate: t.Optional(t.String()), endDate: t.Optional(t.String()) }) });
