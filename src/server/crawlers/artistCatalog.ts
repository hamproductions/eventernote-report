import { parseHTML } from 'linkedom';
import { cache } from '../services/cache';
import { readEventernote } from './readEventernote';

interface ArtistCatalog {
  name: string;
  events: { href: string; date: string }[];
}

const pending = new Map<string, Promise<ArtistCatalog>>();

async function readPage(href: string, page: number, limit: number) {
  const { document } = parseHTML(await readEventernote(`https://www.eventernote.com${href}/events?limit=${limit}&page=${page}&order=DESC`));
  const name = document.querySelector('div.span8.page h2')?.textContent?.trim()
    .replace(/のイベント・ライブ情報一覧$/, '');
  const expected = Number(document.querySelector('div.span8.page')?.textContent?.match(/(\d+)件のイベント/)?.[1]);
  if (!name || !Number.isFinite(expected)) throw new Error('Artist catalog not found');
  const events = Array.from(document.querySelectorAll('div.gb_event_list > ul > li')).map(row => {
    const href = row.querySelector('div.event > h4 > a')?.getAttribute('href');
    const date = row.querySelector('div.date > p')?.textContent?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    if (!href || !date) throw new Error('Incomplete artist event');
    return { href, date };
  });
  return { name, expected, events };
}

async function crawlCatalog(href: string, startDate?: string, endDate?: string): Promise<ArtistCatalog> {
  const first = await readPage(href, 1, 100);
  const events = [...first.events];
  const pages = Math.ceil(first.expected / 100);
  for (let page = 2; page <= pages; page++) {
    if (startDate && events.at(-1)!.date < startDate) break;
    const result = await readPage(href, page, 100);
    if (result.expected !== first.expected) throw new Error('Artist catalog changed while loading');
    events.push(...result.events);
  }
  let unique = new Map(events.map(event => [event.href, event]));
  const complete = events.length === first.expected;
  const coversRange = startDate && events.at(-1)?.date && events.at(-1)!.date < startDate;
  const ordered = events.every((event, index) => !index || events[index - 1].date >= event.date);
  if ((!complete && !coversRange) || unique.size !== events.length || !ordered) {
    const bulk = await readPage(href, 1, 10000);
    unique = new Map(bulk.events.map(event => [event.href, event]));
    if (bulk.expected !== first.expected || unique.size !== first.expected) throw new Error('Artist catalog is incomplete');
  }
  return {
    name: first.name,
    events: Array.from(unique.values()).filter(event =>
      (!startDate || event.date >= startDate) && (!endDate || event.date <= endDate)
    )
  };
}

export async function fetchArtistCatalog(href: string, startDate?: string, endDate?: string): Promise<ArtistCatalog> {
  const id = href.match(/\/(\d+)$/)?.[1];
  if (!id) throw new Error('Invalid artist URL');
  const key = `artist-catalog-v3:${id}:${startDate || 'all'}:${endDate || 'all'}`;
  const cached = cache.get<ArtistCatalog>(key);
  if (cached) return cached;
  let request = pending.get(key);
  if (!request) {
    request = crawlCatalog(href, startDate, endDate).then(result => {
      cache.set(key, result, 5 * 60);
      return result;
    });
    pending.set(key, request);
  }
  try {
    return await request;
  } finally {
    if (pending.get(key) === request) pending.delete(key);
  }
}
