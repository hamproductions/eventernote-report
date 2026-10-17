import { describe, expect, it } from 'vitest';
import { buildArtistGraph, DEFAULT_GRAPH_OPTIONS, louvain, type GraphEvent } from '../artistGraph';
import { ForceSim } from '../forceLayout';
import { computeOverlap } from '../overlap';
import { lensArea, layoutVenn } from '../venn';

let id = 0;
const ev = (artists: string[], date = '2026-01-01', place = 'Hall'): GraphEvent => ({ href: `/events/${++id}`, name: `e${id}`, date, place, artists });

describe('buildArtistGraph', () => {
  it('links artists by distinct shared events and scores closeness', () => {
    const events = [ev(['A', 'B']), ev(['A', 'B']), ev(['A', 'C']), ev(['D'])];
    const graph = buildArtistGraph(events, null, DEFAULT_GRAPH_OPTIONS);
    const ab = graph.links.find((l) => l.a === 'A' && l.b === 'B')!;
    const ac = graph.links.find((l) => l.a === 'A' && l.b === 'C')!;
    expect(ab.weight).toBe(2);
    expect(ab.strength).toBeCloseTo(2 / 3);
    expect(ac.strength).toBeCloseTo(1 / 3);
    expect(graph.nodes.map((n) => n.id)).not.toContain('D');
  });

  it('counts duplicate registrations of one event once', () => {
    const e = ev(['A', 'B']);
    const graph = buildArtistGraph([e, e], null, DEFAULT_GRAPH_OPTIONS);
    expect(graph.links[0].weight).toBe(1);
  });

  it('skips festival line-ups for pairs but still counts appearances', () => {
    const big = ev(Array.from({ length: 20 }, (_, i) => `X${i}`));
    const graph = buildArtistGraph([big, ev(['X0', 'X1'])], null, { ...DEFAULT_GRAPH_OPTIONS, hideLoners: false });
    expect(graph.skippedEvents).toBe(1);
    expect(graph.nodes.find((n) => n.id === 'X0')!.count).toBe(2);
    expect(graph.links).toHaveLength(1);
  });

  it('merges two people by event id and tracks who saw what', () => {
    const shared = ev(['A', 'B']);
    const mine = [shared, ev(['A', 'C'])];
    const theirs = [shared, ev(['B', 'D'])];
    const graph = buildArtistGraph(mine, theirs, DEFAULT_GRAPH_OPTIONS);
    const a = graph.nodes.find((n) => n.id === 'A')!;
    expect(a).toMatchObject({ count: 2, mine: 2, theirs: 1, both: 1 });
    const ab = graph.links.find((l) => l.a === 'A' && l.b === 'B')!;
    expect(ab).toMatchObject({ weight: 1, mine: 1, theirs: 1 });
    const sharedOnly = buildArtistGraph(mine, theirs, { ...DEFAULT_GRAPH_OPTIONS, membership: 'shared' });
    expect(sharedOnly.nodes.map((n) => n.id).sort()).toEqual(['A', 'B']);
  });

  it('groups tightly connected artists', () => {
    const events = [ev(['A', 'B', 'C']), ev(['A', 'B', 'C']), ev(['X', 'Y', 'Z']), ev(['X', 'Y', 'Z']), ev(['C', 'X'])];
    const graph = buildArtistGraph(events, null, DEFAULT_GRAPH_OPTIONS);
    const cluster = (name: string) => graph.nodes.find((n) => n.id === name)!.cluster;
    expect(cluster('A')).toBe(cluster('B'));
    expect(cluster('X')).toBe(cluster('Y'));
    expect(cluster('A')).not.toBe(cluster('X'));
  });
});

describe('ForceSim', () => {
  it('puts frequent co-performers closer than strangers', () => {
    const events = [ev(['A', 'B']), ev(['A', 'B']), ev(['A', 'B']), ev(['C', 'D']), ev(['C', 'D']), ev(['C', 'D']), ev(['B', 'C'])];
    const graph = buildArtistGraph(events, null, DEFAULT_GRAPH_OPTIONS);
    const index = new Map(graph.nodes.map((n, i) => [n.id, i]));
    const sim = new ForceSim(graph.nodes.map((n) => ({ id: n.id, r: 8 })), graph.links.map((l) => ({ source: index.get(l.a)!, target: index.get(l.b)!, strength: l.strength })));
    sim.run(600);
    const dist = (a: string, b: string) => {
      const p = sim.nodes[index.get(a)!];
      const q = sim.nodes[index.get(b)!];
      return Math.hypot(p.x - q.x, p.y - q.y);
    };
    expect(dist('A', 'B')).toBeLessThan(dist('A', 'D'));
    expect(dist('C', 'D')).toBeLessThan(dist('A', 'C'));
    expect(sim.nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
  });
});

describe('computeOverlap', () => {
  it('matches events by id and compares artists, venues and days', () => {
    const shared = ev(['A'], '2026-02-01', 'Zepp');
    const mine = [shared, ev(['A', 'B'], '2026-03-01', 'Zepp'), ev(['C'], '2026-04-01', '!_hidden')];
    const theirs = [shared, ev(['A'], '2026-03-01', 'Zepp'), ev(['D'], '2026-05-01', 'AX')];
    const o = computeOverlap(mine, theirs);
    expect(o.events).toMatchObject({ sizeA: 3, sizeB: 3, shared: 1 });
    expect(o.artists.shared).toBe(1);
    expect(o.artists.both[0]).toMatchObject({ key: 'A', a: 2, b: 2 });
    expect(o.venues.sizeA).toBe(1);
    expect(o.days.shared).toBe(2);
    expect(o.artists.jaccard).toBeCloseTo(1 / 4);
  });
});

describe('layoutVenn', () => {
  it('sizes the lens to the intersection', () => {
    const { rA, rB, d } = layoutVenn(100, 60, 25, 100);
    const unit = (Math.PI * 100 * 100) / 100;
    expect(lensArea(rA, rB, d)).toBeCloseTo(25 * unit, 0);
  });
  it('separates disjoint sets and nests subsets', () => {
    const apart = layoutVenn(10, 10, 0, 100);
    expect(apart.d).toBeGreaterThan(apart.rA + apart.rB);
    const nested = layoutVenn(100, 10, 10, 100);
    expect(nested.d).toBeCloseTo(nested.rA - nested.rB, 3);
  });
});

describe('louvain', () => {
  it('splits two cliques joined by one weak edge', () => {
    const edges: [number, number, number][] = [
      [0, 1, 5], [0, 2, 5], [1, 2, 5],
      [3, 4, 5], [3, 5, 5], [4, 5, 5],
      [2, 3, 1]
    ];
    const labels = louvain(6, edges);
    expect(labels[0]).toBe(labels[1]);
    expect(labels[1]).toBe(labels[2]);
    expect(labels[3]).toBe(labels[4]);
    expect(labels[0]).not.toBe(labels[3]);
  });

  it('returns each node alone when there are no edges', () => {
    expect(louvain(3, [])).toEqual([0, 1, 2]);
  });
});

describe('cluster trends and mini groups', () => {
  it('flags a group that stopped as earlier and one that started late as recent', () => {
    const events = [
      ...[1, 2, 3, 4].map((m) => ev(['Old A', 'Old B'], `2025-0${m}-10`)),
      ...[1, 2, 3, 4, 5, 6].map((m) => ev(['Mid A', 'Mid B'], `2025-0${m}-20`)),
      ...[6, 7, 8, 9].map((m) => ev(['New A', 'New B'], `2025-0${m}-15`)),
      ev(['New A', 'New B'], '2026-03-15'),
      ev(['New A', 'New B'], '2026-04-15'),
      ev(['New A', 'New B'], '2026-05-15')
    ];
    const graph = buildArtistGraph(events, null, DEFAULT_GRAPH_OPTIONS);
    const trendOf = (name: string) => graph.clusters.find((c) => c.members.includes(name))!.trend;
    expect(trendOf('Old A')).toBe('earlier');
    expect(trendOf('New A')).toBe('recent');
    const old = graph.clusters.find((c) => c.members.includes('Old A'))!;
    expect(old).toMatchObject({ events: 4, first: '2025-01-10', last: '2025-04-10' });
  });

  it('finds tighter pockets inside a big group', () => {
    const unitA = ['A1', 'A2', 'A3'];
    const unitB = ['B1', 'B2', 'B3'];
    const events = [
      ...Array.from({ length: 6 }, () => ev(unitA)),
      ...Array.from({ length: 6 }, () => ev(unitB)),
      ...Array.from({ length: 2 }, () => ev(['A1', 'B1']))
    ];
    const graph = buildArtistGraph(events, null, DEFAULT_GRAPH_OPTIONS);
    expect(graph.clusters.length).toBeGreaterThanOrEqual(1);
    const total = graph.clusters.flatMap((c) => c.subgroups.length ? c.subgroups : [c.members]);
    const sets = total.map((group) => [...group].sort().join(','));
    expect(sets).toContain('A1,A2,A3');
    expect(sets).toContain('B1,B2,B3');
  });
});

describe('ForceSim groups', () => {
  it('keeps groups apart from each other', () => {
    const events = [
      ...Array.from({ length: 4 }, () => ev(['A', 'B', 'C'])),
      ...Array.from({ length: 4 }, () => ev(['X', 'Y', 'Z'])),
      ev(['C', 'X'])
    ];
    const graph = buildArtistGraph(events, null, DEFAULT_GRAPH_OPTIONS);
    const index = new Map(graph.nodes.map((n, i) => [n.id, i]));
    const sim = new ForceSim(
      graph.nodes.map((n) => ({ id: n.id, r: 8, group: n.cluster })),
      graph.links.map((l) => ({ source: index.get(l.a)!, target: index.get(l.b)!, strength: l.strength }))
    );
    sim.run(600);
    const centre = (names: string[]) => {
      const pts = names.map((name) => sim.nodes[index.get(name)!]);
      return { x: pts.reduce((a, p) => a + p.x, 0) / pts.length, y: pts.reduce((a, p) => a + p.y, 0) / pts.length };
    };
    const spread = (names: string[]) => {
      const c = centre(names);
      return Math.max(...names.map((name) => Math.hypot(sim.nodes[index.get(name)!].x - c.x, sim.nodes[index.get(name)!].y - c.y)));
    };
    const a = centre(['A', 'B', 'C']);
    const b = centre(['X', 'Y', 'Z']);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(spread(['A', 'B', 'C']) + spread(['X', 'Y', 'Z']));
  });
});
