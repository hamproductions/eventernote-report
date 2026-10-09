import { fetchArtistCatalog } from './artistCatalog';

export interface ArtistEventCount {
  name: string;
  href: string;
  totalEvents: number;
  eventDates: string[];
  eventIds: string[];
}

export async function fetchArtistEventDates(artistHref: string, startDate?: string, endDate?: string): Promise<{ totalEvents: number; eventDates: string[] }> {
  const catalog = await fetchArtistCatalog(artistHref, startDate, endDate);
  return { totalEvents: catalog.events.length, eventDates: catalog.events.map(event => event.date) };
}

export async function fetchArtistsTotalEvents(
  artists: { name: string; href: string }[],
  startDate?: string,
  endDate?: string
): Promise<ArtistEventCount[]> {
  const batchSize = 10;
  const results: ArtistEventCount[] = [];

  for (let i = 0; i < artists.length; i += batchSize) {
    const batch = artists.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(async (artist) => {
        try {
          const catalog = await fetchArtistCatalog(artist.href, startDate, endDate);
          return {
            name: artist.name,
            href: artist.href,
            totalEvents: catalog.events.length,
            eventDates: catalog.events.map(event => event.date),
            eventIds: catalog.events.map(event => event.href)
          };
        } catch (error) {
          console.error(`Failed to fetch events for ${artist.name}:`, error);
          throw error;
        }
      })
    );

    results.push(...batchResults);

    console.log(`📊 Artist events progress: ${results.length}/${artists.length}`);
  }

  return results;
}
