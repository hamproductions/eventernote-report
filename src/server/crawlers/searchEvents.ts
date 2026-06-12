import { parseHTML } from 'linkedom';
import type { Event } from '../../shared/types/event';
import { cache } from '../services/cache';

export type SearchedEvent = Event & { artists: string[] };

export function parseSearchResults(html: string): SearchedEvent[] {
  const { document } = parseHTML(html);

  const eventElements = document.querySelectorAll('div.gb_event_list > ul > li');

  const events: SearchedEvent[] = [];

  for (const element of eventElements) {
    const eventElement = element.querySelector('div.event > h4 > a');
    const dateElement = element.querySelector('div.date > p');
    const placeElement = element.querySelector('div.place > a');

    const artistElements = element.querySelectorAll('div.event > div.actor > ul > li > a');
    const artists = Array.from(artistElements)
      .map(el => el.textContent?.trim())
      .filter((name): name is string => !!name && name.length > 0);

    if (eventElement && dateElement && placeElement) {
      const href = eventElement.getAttribute('href');
      const name = eventElement.textContent?.trim();
      const date = dateElement.textContent?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
      const place = placeElement.textContent?.trim();

      if (href && name && date && place) {
        events.push({ name, href, date, place, artists });
      }
    }
  }

  return events;
}

export async function searchEvents(keyword: string, limit = 20): Promise<SearchedEvent[]> {
  const cacheKey = `search:${keyword}:${limit}`;
  const cached = cache.get<SearchedEvent[]>(cacheKey);

  if (cached) {
    console.log(`📦 Returning ${cached.length} cached search results for "${keyword}"`);
    return cached;
  }

  const url = `https://www.eventernote.com/events/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const events = parseSearchResults(html);

    cache.set(cacheKey, events, 60 * 60);

    console.log(`✅ Found ${events.length} events for keyword "${keyword}"`);
    return events;

  } catch (error) {
    console.error('❌ Error searching events:', error);
    throw new Error(
      error instanceof Error
        ? `Failed to search events: ${error.message}`
        : 'Failed to search events on Eventernote'
    );
  }
}
