export interface GraphEvent {
  href: string;
  name: string;
  date: string;
  place: string;
  artists?: string[];
}

export type Membership = 'all' | 'shared' | 'mine' | 'theirs';

export interface GraphOptions {
  /** Hide artists seen fewer times than this */
  minEvents: number;
  /** Keep only the most-seen artists */
  maxNodes: number;
  /** Events with more artists than this (festivals) count for artists but not for pairs */
  maxArtistsPerEvent: number;
  /** Ignore pairs that appeared together fewer times than this */
  minTogether: number;
  hideLoners: boolean;
  /** Compare mode only: which side's artists to keep */
  membership: Membership;
}

export interface ArtistNode {
  id: string;
  /** Distinct events (across both people in compare mode) */
  count: number;
  mine: number;
  theirs: number;
  /** Events both people went to that featured this artist */
  both: number;
  /** -1 when the artist is not part of any group */
  cluster: number;
  degree: number;
}

export interface ArtistLink {
  a: string;
  b: string;
  /** Distinct events where the pair performed together */
  weight: number;
  mine: number;
  theirs: number;
  /** 0..1, how often the pair shows up together relative to either showing up at all */
  strength: number;
}

export interface ArtistCluster {
  id: number;
  members: string[];
  /** Total appearances of the members */
  weight: number;
}

export interface ArtistGraph {
  nodes: ArtistNode[];
  links: ArtistLink[];
  clusters: ArtistCluster[];
  /** Events used to build pairs */
  pairEvents: number;
  /** Events skipped for pairs because the line-up was too big */
  skippedEvents: number;
}

export const DEFAULT_GRAPH_OPTIONS: GraphOptions = {
  minEvents: 1,
  maxNodes: 80,
  maxArtistsPerEvent: 12,
  minTogether: 1,
  hideLoners: true,
  membership: 'all'
};

const pairKey = (a: string, b: string) => (a < b ? `${a}\u0000${b}` : `${b}\u0000${a}`);

function dedupe(events: GraphEvent[]) {
  const byHref = new Map<string, GraphEvent>();
  for (const event of events) if (!byHref.has(event.href)) byHref.set(event.href, event);
  return byHref;
}

/** Builds who-performs-with-whom from one person's events, or from two people's events when comparing. */
export function buildArtistGraph(mineEvents: GraphEvent[], theirEvents: GraphEvent[] | null, options: GraphOptions): ArtistGraph {
  const mine = dedupe(mineEvents);
  const theirs = theirEvents ? dedupe(theirEvents) : new Map<string, GraphEvent>();
  const union = new Map<string, { event: GraphEvent; mine: boolean; theirs: boolean }>();
  for (const [href, event] of mine) union.set(href, { event, mine: true, theirs: theirs.has(href) });
  for (const [href, event] of theirs) if (!union.has(href)) union.set(href, { event, mine: false, theirs: true });

  const stats = new Map<string, { count: number; mine: number; theirs: number; both: number }>();
  const pairs = new Map<string, { a: string; b: string; weight: number; mine: number; theirs: number }>();
  let pairEvents = 0;
  let skippedEvents = 0;

  for (const { event, mine: inMine, theirs: inTheirs } of union.values()) {
    const artists = [...new Set((event.artists ?? []).filter(Boolean))].sort();
    for (const artist of artists) {
      const stat = stats.get(artist) ?? { count: 0, mine: 0, theirs: 0, both: 0 };
      stat.count += 1;
      if (inMine) stat.mine += 1;
      if (inTheirs) stat.theirs += 1;
      if (inMine && inTheirs) stat.both += 1;
      stats.set(artist, stat);
    }
    if (artists.length < 2) continue;
    if (artists.length > options.maxArtistsPerEvent) {
      skippedEvents += 1;
      continue;
    }
    pairEvents += 1;
    for (let i = 0; i < artists.length; i++) {
      for (let j = i + 1; j < artists.length; j++) {
        const key = pairKey(artists[i], artists[j]);
        const pair = pairs.get(key) ?? { a: artists[i], b: artists[j], weight: 0, mine: 0, theirs: 0 };
        pair.weight += 1;
        if (inMine) pair.mine += 1;
        if (inTheirs) pair.theirs += 1;
        pairs.set(key, pair);
      }
    }
  }

  const keep = (stat: { mine: number; theirs: number }) => {
    if (!theirEvents || options.membership === 'all') return true;
    if (options.membership === 'shared') return stat.mine > 0 && stat.theirs > 0;
    return options.membership === 'mine' ? stat.mine > 0 && stat.theirs === 0 : stat.theirs > 0 && stat.mine === 0;
  };

  let kept = [...stats.entries()]
    .filter(([, stat]) => stat.count >= options.minEvents && keep(stat))
    .sort((x, y) => y[1].count - x[1].count || x[0].localeCompare(y[0]));

  // Loners only drop out after links are known, so rank first, cut, then prune
  kept = kept.slice(0, options.maxNodes * 3);
  const candidates = new Set(kept.map(([name]) => name));
  const degreeOf = new Map<string, number>();
  for (const pair of pairs.values()) {
    if (pair.weight < options.minTogether || !candidates.has(pair.a) || !candidates.has(pair.b)) continue;
    degreeOf.set(pair.a, (degreeOf.get(pair.a) ?? 0) + 1);
    degreeOf.set(pair.b, (degreeOf.get(pair.b) ?? 0) + 1);
  }
  const chosen = kept.filter(([name]) => !options.hideLoners || degreeOf.has(name)).slice(0, options.maxNodes);
  const ids = new Set(chosen.map(([name]) => name));

  const links: ArtistLink[] = [];
  const degree = new Map<string, number>();
  for (const pair of pairs.values()) {
    if (pair.weight < options.minTogether || !ids.has(pair.a) || !ids.has(pair.b)) continue;
    const countA = stats.get(pair.a)!.count;
    const countB = stats.get(pair.b)!.count;
    links.push({ ...pair, strength: pair.weight / (countA + countB - pair.weight) });
    degree.set(pair.a, (degree.get(pair.a) ?? 0) + 1);
    degree.set(pair.b, (degree.get(pair.b) ?? 0) + 1);
  }
  links.sort((x, y) => y.strength - x.strength || y.weight - x.weight || x.a.localeCompare(y.a) || x.b.localeCompare(y.b));

  const nodes: ArtistNode[] = chosen.map(([name, stat]) => ({
    id: name,
    ...stat,
    cluster: -1,
    degree: degree.get(name) ?? 0
  }));
  const clusters = assignClusters(nodes, links);
  return { nodes, links, clusters, pairEvents, skippedEvents };
}

/** Weighted label propagation, deterministic so the same data always gives the same groups. */
function assignClusters(nodes: ArtistNode[], links: ArtistLink[]): ArtistCluster[] {
  const index = new Map(nodes.map((node, i) => [node.id, i]));
  const adjacency: [number, number][][] = nodes.map(() => []);
  for (const link of links) {
    const a = index.get(link.a)!;
    const b = index.get(link.b)!;
    adjacency[a].push([b, link.strength * link.weight]);
    adjacency[b].push([a, link.strength * link.weight]);
  }
  const label = nodes.map((_, i) => i);
  for (let round = 0; round < 30; round++) {
    let changed = false;
    for (let i = 0; i < nodes.length; i++) {
      if (!adjacency[i].length) continue;
      const scores = new Map<number, number>();
      for (const [j, w] of adjacency[i]) scores.set(label[j], (scores.get(label[j]) ?? 0) + w);
      let best = label[i];
      let bestScore = scores.get(best) ?? -1;
      for (const [candidate, score] of scores) {
        if (score > bestScore + 1e-9 || (Math.abs(score - bestScore) <= 1e-9 && candidate < best)) {
          best = candidate;
          bestScore = score;
        }
      }
      if (best !== label[i]) {
        label[i] = best;
        changed = true;
      }
    }
    if (!changed) break;
  }

  const groups = new Map<number, number[]>();
  label.forEach((value, i) => groups.set(value, [...(groups.get(value) ?? []), i]));
  const ordered = [...groups.values()]
    .filter((members) => members.length > 1)
    .map((members) => ({ members, weight: members.reduce((sum, i) => sum + nodes[i].count, 0) }))
    .sort((x, y) => y.members.length - x.members.length || y.weight - x.weight);
  const clusters: ArtistCluster[] = ordered.map(({ members, weight }, id) => {
    for (const i of members) nodes[i].cluster = id;
    return {
      id,
      weight,
      members: members.map((i) => nodes[i]).sort((x, y) => y.count - x.count || x.id.localeCompare(y.id)).map((node) => node.id)
    };
  });
  return clusters;
}
