import { parseHTML } from 'linkedom';
import type { Event, EnhancedEvent } from '../../shared/types/event';

export async function fetchAttendedEvents(
  userId: string,
  options: { limit?: number } = {}
): Promise<EnhancedEvent[]> {
  const url = `https://www.eventernote.com/users/${userId}/events?limit=${options.limit || 10000}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const { document } = parseHTML(html);

    // Use exact selectors from reference implementation
    const eventElements = document.querySelectorAll(
      'body > div.container > div.row > div.span8.page > div.gb_event_list.clearfix > ul > li'
    );

    const events: EnhancedEvent[] = [];

    for (const element of eventElements) {
      const eventElement = element.querySelector('div.event > h4 > a');
      const dateElement = element.querySelector('div.date > p');
      const placeElement = element.querySelector('div.place > a');

      // Extract artists using EXACT selector from reference project
      const artistElements = element.querySelectorAll('div.event > div.actor > ul > li > a');
      const artists = Array.from(artistElements)
        .map(el => el.textContent?.trim())
        .filter((name): name is string => !!name && name.length > 0);

      if (eventElement && dateElement && placeElement) {
        const href = eventElement.getAttribute('href');
        const name = eventElement.textContent?.trim();
        const date = dateElement.textContent?.trim();
        const place = placeElement.textContent?.trim();

        if (href && name && date && place) {
          const parsedDate = new Date(date);

          events.push({
            name,
            href,
            date,
            place,
            artists,
            parsedDate,
            dayOfWeek: parsedDate.toLocaleDateString('en-US', { weekday: 'long' }),
            month: parsedDate.toLocaleDateString('en-US', { month: 'long' }),
            year: parsedDate.getFullYear()
          });
        }
      }
    }

    console.log(`✅ Fetched ${events.length} events for user ${userId}`);
    return events;

  } catch (error) {
    console.error('❌ Error fetching attended events:', error);
    throw new Error(
      error instanceof Error
        ? `Failed to fetch events: ${error.message}`
        : 'Failed to fetch events from Eventernote'
    );
  }
}
