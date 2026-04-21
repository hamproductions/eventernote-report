import { parseHTML } from 'linkedom';
import { cache } from '../services/cache';

export interface ArtistEventCount {
  name: string;
  href: string;
  totalEvents: number;
  eventDates: string[];
}

export async function fetchArtistEventDates(artistHref: string): Promise<{ totalEvents: number; eventDates: string[] }> {
  const cacheKey = `artist-events:${artistHref}`;
  const cached = cache.get<{ totalEvents: number; eventDates: string[] }>(cacheKey);
  if (cached !== null) return cached;

  const url = `https://www.eventernote.com${artistHref}/events?limit=10000`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const html = await response.text();
  const { document } = parseHTML(html);

  const eventItems = document.querySelectorAll(
    'div.gb_event_list.clearfix > ul > li'
  );

  const eventDates: string[] = [];
  for (const item of eventItems) {
    const dateEl = item.querySelector('div.date > p');
    const dateText = dateEl?.textContent?.trim();
    if (dateText) {
      const match = dateText.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) {
        eventDates.push(match[1]);
      }
    }
  }

  const result = { totalEvents: eventDates.length, eventDates };
  cache.set(cacheKey, result, 60 * 60);

  return result;
}

export async function fetchArtistsTotalEvents(
  artists: { name: string; href: string }[]
): Promise<ArtistEventCount[]> {
  const batchSize = 3;
  const results: ArtistEventCount[] = [];

  for (let i = 0; i < artists.length; i += batchSize) {
    const batch = artists.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (artist) => {
        try {
          const { totalEvents, eventDates } = await fetchArtistEventDates(artist.href);
          return { name: artist.name, href: artist.href, totalEvents, eventDates };
        } catch (error) {
          console.error(`Failed to fetch events for ${artist.name}:`, error);
          return { name: artist.name, href: artist.href, totalEvents: 0, eventDates: [] };
        }
      })
    );

    results.push(...batchResults);

    if (i + batchSize < artists.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    console.log(`📊 Artist events progress: ${results.length}/${artists.length}`);
  }

  return results;
}
