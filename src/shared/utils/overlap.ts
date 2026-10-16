import type { GraphEvent } from './artistGraph';

export type OverlapKind = 'artists' | 'events' | 'venues' | 'days';

export interface OverlapItem {
  key: string;
  label: string;
  sub?: string;
  /** Mine / theirs counts */
  a: number;
  b: number;
}

export interface OverlapSet {
  kind: OverlapKind;
  sizeA: number;
  sizeB: number;
  shared: number;
  /** shared / union, 0..1 */
  jaccard: number;
  onlyA: OverlapItem[];
  both: OverlapItem[];
  onlyB: OverlapItem[];
  /** Counts-weighted overlap: sum of min counts over sum of max counts */
  weighted: number;
}

export interface Overlap {
  artists: OverlapSet;
  events: OverlapSet;
  venues: OverlapSet;
  days: OverlapSet;
}

const isRealVenue = (place: string) => place !== '' && !place.startsWith('!_');

function tally(events: GraphEvent[], keyOf: (event: GraphEvent) => string[]) {
  const grouped = new Map<string, GraphEvent[]>();
  for (const event of events) {
    for (const key of new Set(keyOf(event))) grouped.set(key, [...(grouped.get(key) ?? []), event]);
  }
  return grouped;
}

function compareSets(
  kind: OverlapKind,
  mine: Map<string, GraphEvent[]>,
  theirs: Map<string, GraphEvent[]>,
  describe: (key: string, events: GraphEvent[]) => { label: string; sub?: string },
  order: (x: OverlapItem, y: OverlapItem) => number
): OverlapSet {
  const item = (key: string): OverlapItem => ({
    key,
    ...describe(key, mine.get(key) ?? theirs.get(key) ?? []),
    a: mine.get(key)?.length ?? 0,
    b: theirs.get(key)?.length ?? 0
  });
  const onlyA = [...mine.keys()].filter((key) => !theirs.has(key)).map(item).sort(order);
  const onlyB = [...theirs.keys()].filter((key) => !mine.has(key)).map(item).sort(order);
  const both = [...mine.keys()].filter((key) => theirs.has(key)).map(item).sort((x, y) => Math.min(y.a, y.b) - Math.min(x.a, x.b) || y.a + y.b - (x.a + x.b) || order(x, y));
  const union = onlyA.length + onlyB.length + both.length;
  let sumMin = 0;
  let sumMax = 0;
  for (const entry of [...onlyA, ...onlyB, ...both]) {
    sumMin += Math.min(entry.a, entry.b);
    sumMax += Math.max(entry.a, entry.b);
  }
  return {
    kind,
    sizeA: mine.size,
    sizeB: theirs.size,
    shared: both.length,
    jaccard: union ? both.length / union : 0,
    onlyA,
    both,
    onlyB,
    weighted: sumMax ? sumMin / sumMax : 0
  };
}

const byCount = (x: OverlapItem, y: OverlapItem) => y.a + y.b - (x.a + x.b) || x.label.localeCompare(y.label);

/** Compares two people's attendance. Events are matched by event id, never by name. */
export function computeOverlap(mineEvents: GraphEvent[], theirEvents: GraphEvent[]): Overlap {
  const dedupe = (events: GraphEvent[]) => [...new Map(events.map((event) => [event.href, event])).values()];
  const mine = dedupe(mineEvents);
  const theirs = dedupe(theirEvents);

  const eventLabel = (_: string, events: GraphEvent[]) => ({
    label: events[0]?.name ?? '',
    sub: events[0] ? `${events[0].date.slice(0, 10)} @ ${events[0].place}` : undefined
  });
  const plain = (key: string) => ({ label: key });
  const dayLabel = (key: string, events: GraphEvent[]) => ({ label: key, sub: events.map((event) => event.name).slice(0, 2).join(' / ') });

  const eventsKey = (event: GraphEvent) => [event.href];
  const artistsKey = (event: GraphEvent) => event.artists ?? [];
  const venuesKey = (event: GraphEvent) => (isRealVenue(event.place) ? [event.place] : []);
  const daysKey = (event: GraphEvent) => [event.date.slice(0, 10)];

  const newestFirst = (x: OverlapItem, y: OverlapItem) => y.key.localeCompare(x.key);
  const dateOf = (item: OverlapItem) => item.sub?.slice(0, 10) ?? '';
  const eventOrder = (x: OverlapItem, y: OverlapItem) => dateOf(y).localeCompare(dateOf(x)) || x.key.localeCompare(y.key);

  return {
    artists: compareSets('artists', tally(mine, artistsKey), tally(theirs, artistsKey), plain, byCount),
    events: compareSets('events', tally(mine, eventsKey), tally(theirs, eventsKey), eventLabel, eventOrder),
    venues: compareSets('venues', tally(mine, venuesKey), tally(theirs, venuesKey), plain, byCount),
    days: compareSets('days', tally(mine, daysKey), tally(theirs, daysKey), dayLabel, newestFirst)
  };
}
