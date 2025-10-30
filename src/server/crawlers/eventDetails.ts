import { parseHTML } from 'linkedom';
import type { EnhancedEvent, Event } from '../../shared/types/event';
import { cache } from '../services/cache';

interface EventDetails {
  artists: string[];
  description?: string;
  imageUrl?: string;
}

export async function scrapeEventDetails(
  eventHref: string
): Promise<EventDetails> {
  const url = `https://www.eventernote.com${eventHref}`;

  try {
    // Check memory cache first
    const cacheKey = `event:${eventHref}`;
    const cached = cache.get<EventDetails>(cacheKey);

    if (cached) {
      console.log(`📦 Cache hit for event: ${eventHref}`);
      return cached;
    }

    // Scrape event page
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const { document } = parseHTML(html);

    // Extract artist names using EXACT selector from reference project
    const artistElements = document.querySelectorAll(
      'div.event > div.actor > ul > li > a'
    );

    const artists = Array.from(artistElements)
      .map(el => el.textContent?.trim())
      .filter((name): name is string => !!name && name.length > 0);

    // Remove duplicates
    const uniqueArtists = [...new Set(artists)];

    // Extract description
    const descriptionEl = document.querySelector(
      '.event-description, .description, [class*="description"]'
    );
    const description = descriptionEl?.textContent?.trim();

    // Extract image URL
    const imageEl = document.querySelector<HTMLImageElement>(
      '.event-image, .event-photo, img[class*="event"]'
    );
    const imageUrl = imageEl?.getAttribute('src') || imageEl?.getAttribute('data-src');

    const result: EventDetails = {
      artists: uniqueArtists,
      description,
      imageUrl: imageUrl || undefined
    };

    // Cache for 24 hours
    cache.set(cacheKey, result, 24 * 60 * 60);

    console.log(`✅ Scraped event details: ${eventHref} (${uniqueArtists.length} artists)`);

    return result;

  } catch (error) {
    console.error(`❌ Error scraping event ${eventHref}:`, error);
    // Return empty artists array instead of throwing
    return {
      artists: [],
      description: undefined,
      imageUrl: undefined
    };
  }
}

export async function enrichEventsWithArtists(
  events: Event[]
): Promise<EnhancedEvent[]> {
  const batchSize = 10;
  const enriched: EnhancedEvent[] = [];

  console.log(`🔄 Enriching ${events.length} events with artist data...`);

  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);

    const results = await Promise.all(
      batch.map(async (event) => {
        try {
          const details = await scrapeEventDetails(event.href);
          const parsedDate = new Date(event.date);

          return {
            ...event,
            artists: details.artists,
            description: details.description,
            imageUrl: details.imageUrl,
            parsedDate,
            dayOfWeek: parsedDate.toLocaleDateString('en-US', { weekday: 'long' }),
            month: parsedDate.toLocaleDateString('en-US', { month: 'long' }),
            year: parsedDate.getFullYear()
          } as EnhancedEvent;
        } catch (error) {
          console.error(`Failed to enrich event ${event.href}:`, error);
          const parsedDate = new Date(event.date);

          // Return event with empty artists array
          return {
            ...event,
            artists: [],
            parsedDate,
            dayOfWeek: parsedDate.toLocaleDateString('en-US', { weekday: 'long' }),
            month: parsedDate.toLocaleDateString('en-US', { month: 'long' }),
            year: parsedDate.getFullYear()
          } as EnhancedEvent;
        }
      })
    );

    enriched.push(...results);

    // Rate limiting: wait 100ms between batches
    if (i + batchSize < events.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Progress log
    console.log(`📊 Progress: ${enriched.length}/${events.length} events enriched`);
  }

  console.log(`✅ Enrichment complete: ${enriched.length} events processed`);
  return enriched;
}
