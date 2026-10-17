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
  /** Mini group inside the cluster, -1 when none */
  sub: number;
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
  /** strength discounted for pairs seen together only once or twice; drives layout distance */
  closeness: number;
}

export type ClusterTrend = 'recent' | 'steady' | 'earlier';

export interface ArtistCluster {
  id: number;
  /** Most-seen first */
  members: string[];
  /** Total appearances of the members */
  weight: number;
  /** Distinct events featuring any member */
  events: number;
  first: string;
  last: string;
  /** recent = mostly in the later part of the range, earlier = nothing lately */
  trend: ClusterTrend;
  /** Tighter groups inside this one, each with at least two members */
  subgroups: string[][];
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
  const appearances = new Map<string, { href: string; date: string }[]>();
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
      // Festival-size line-ups would make every group look active all year
      if (artists.length <= options.maxArtistsPerEvent) {
        const seen = appearances.get(artist) ?? [];
        seen.push({ href: event.href, date: event.date.slice(0, 10) });
        appearances.set(artist, seen);
      }
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
    const strength = pair.weight / (countA + countB - pair.weight);
    links.push({ ...pair, strength, closeness: strength * (pair.weight / (pair.weight + 1)) });
    degree.set(pair.a, (degree.get(pair.a) ?? 0) + 1);
    degree.set(pair.b, (degree.get(pair.b) ?? 0) + 1);
  }
  links.sort((x, y) => y.strength - x.strength || y.weight - x.weight || x.a.localeCompare(y.a) || x.b.localeCompare(y.b));

  const nodes: ArtistNode[] = chosen.map(([name, stat]) => ({
    id: name,
    ...stat,
    cluster: -1,
    sub: -1,
    degree: degree.get(name) ?? 0
  }));
  const clusters = assignClusters(nodes, links, appearances);
  return { nodes, links, clusters, pairEvents, skippedEvents };
}

const dayMs = 86400000;
const daysBetween = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / dayMs;
const median = (sorted: string[]) => sorted[Math.floor(sorted.length / 2)];

/**
 * Louvain modularity optimisation: repeatedly moves nodes to the neighbouring community
 * that improves modularity most, then merges communities and repeats. Deterministic.
 * Higher `resolution` gives smaller communities.
 */
export function louvain(n: number, edges: [number, number, number][], resolution = 1): number[] {
  let mapping = Array.from({ length: n }, (_, i) => i);
  let size = n;
  let current = edges;
  for (let level = 0; level < 10; level++) {
    const adjacency: [number, number][][] = Array.from({ length: size }, () => []);
    const self = new Array<number>(size).fill(0);
    for (const [a, b, w] of current) {
      if (a === b) self[a] += w;
      else {
        adjacency[a].push([b, w]);
        adjacency[b].push([a, w]);
      }
    }
    const k = adjacency.map((list, i) => list.reduce((sum, [, w]) => sum + w, 0) + 2 * self[i]);
    const twoM = k.reduce((sum, value) => sum + value, 0);
    if (!twoM) break;

    const community = Array.from({ length: size }, (_, i) => i);
    const total = [...k];
    let improved = false;
    for (let pass = 0; pass < 25; pass++) {
      let moved = false;
      for (let i = 0; i < size; i++) {
        const weights = new Map<number, number>();
        for (const [j, w] of adjacency[i]) weights.set(community[j], (weights.get(community[j]) ?? 0) + w);
        const own = community[i];
        total[own] -= k[i];
        let best = own;
        let bestGain = (weights.get(own) ?? 0) - (resolution * total[own] * k[i]) / twoM;
        for (const [candidate, w] of weights) {
          const gain = w - (resolution * total[candidate] * k[i]) / twoM;
          if (gain > bestGain + 1e-12) {
            best = candidate;
            bestGain = gain;
          }
        }
        total[best] += k[i];
        if (best !== own) {
          community[i] = best;
          moved = true;
          improved = true;
        }
      }
      if (!moved) break;
    }
    if (!improved) break;

    const ids = new Map<number, number>();
    for (const c of community) if (!ids.has(c)) ids.set(c, ids.size);
    mapping = mapping.map((m) => ids.get(community[m])!);
    const merged = new Map<string, [number, number, number]>();
    for (const [a, b, w] of current) {
      const ca = ids.get(community[a])!;
      const cb = ids.get(community[b])!;
      const key = ca < cb ? `${ca}:${cb}` : `${cb}:${ca}`;
      const entry = merged.get(key) ?? [Math.min(ca, cb), Math.max(ca, cb), 0];
      entry[2] += w;
      merged.set(key, entry);
    }
    size = ids.size;
    current = [...merged.values()];
  }
  return mapping;
}

function groupsOf(labels: number[], minSize: number) {
  const groups = new Map<number, number[]>();
  labels.forEach((label, i) => groups.set(label, [...(groups.get(label) ?? []), i]));
  return [...groups.values()].filter((members) => members.length >= minSize);
}

function assignClusters(nodes: ArtistNode[], links: ArtistLink[], appearances: Map<string, { href: string; date: string }[]>): ArtistCluster[] {
  const index = new Map(nodes.map((node, i) => [node.id, i]));
  const edges: [number, number, number][] = links.map((link) => [index.get(link.a)!, index.get(link.b)!, link.weight]);
  const labels = louvain(nodes.length, edges);
  const ordered = groupsOf(labels, 2)
    .map((members) => ({ members, weight: members.reduce((sum, i) => sum + nodes[i].count, 0) }))
    .sort((x, y) => y.members.length - x.members.length || y.weight - x.weight);

  // Overall timeline, to tell which groups are active now and which were an earlier phase
  const allDates = new Map<string, string>();
  for (const node of nodes) for (const { href, date } of appearances.get(node.id) ?? []) allDates.set(href, date);
  const overall = [...allDates.values()].sort();
  const overallLast = overall[overall.length - 1] ?? '';
  const overallMedian = overall.length ? median(overall) : '';

  return ordered.map(({ members, weight }, id) => {
    const memberSet = new Set(members);
    const ids = members.map((i) => nodes[i].id);
    const eventDates = new Map<string, string>();
    for (const i of members) for (const { href, date } of appearances.get(nodes[i].id) ?? []) eventDates.set(href, date);
    const dates = [...eventDates.values()].sort();
    const last = dates[dates.length - 1] ?? '';
    let trend: ClusterTrend = 'steady';
    if (last && overallLast && daysBetween(last, overallLast) > 180) trend = 'earlier';
    else if (dates.length >= 3 && overallMedian && daysBetween(overallMedian, median(dates)) > 45) trend = 'recent';

    // Tighter pockets inside bigger groups
    const subgroups: string[][] = [];
    if (members.length >= 6) {
      const local = new Map(members.map((node, i) => [node, i]));
      const localEdges: [number, number, number][] = [];
      for (const [a, b, w] of edges) if (memberSet.has(a) && memberSet.has(b)) localEdges.push([local.get(a)!, local.get(b)!, w]);
      const found = groupsOf(louvain(members.length, localEdges, 1.6), 2);
      if (found.length >= 2) {
        found
          .sort((x, y) => y.length - x.length)
          .forEach((group, subId) => {
            const names = group.map((i) => nodes[members[i]]).sort((x, y) => y.count - x.count || x.id.localeCompare(y.id));
            names.forEach((node) => (node.sub = subId));
            subgroups.push(names.map((node) => node.id));
          });
      }
    }

    for (const i of members) nodes[i].cluster = id;
    return {
      id,
      weight,
      members: ids.sort((x, y) => nodes[index.get(y)!].count - nodes[index.get(x)!].count || x.localeCompare(y)),
      events: eventDates.size,
      first: dates[0] ?? '',
      last,
      trend,
      subgroups
    };
  });
}
