import type { GraphEvent } from '../artistGraph';

/** Seeded RNG so simulated seasons are repeatable. */
export function rng(seed: number) {
  let state = seed;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

export interface Truth {
  unit: Map<string, string>;
  franchise: Map<string, string>;
}

/**
 * Fake fan season: franchises made of units, each active in some months.
 * Mix of unit lives, franchise-wide lives, guest collabs, solo shows and festivals,
 * the way a real attendance history looks.
 */
export function simulateAttendance(options: { events?: number; seed?: number; franchises?: number } = {}) {
  const random = rng(options.seed ?? 7);
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];
  const shuffle = <T,>(list: T[]) => [...list].sort(() => random() - 0.5);

  const franchiseCount = options.franchises ?? 6;
  const truth: Truth = { unit: new Map(), franchise: new Map() };
  const franchises = Array.from({ length: franchiseCount }, (_, f) => {
    const unitCount = 1 + Math.floor(random() * 3);
    const from = 1 + Math.floor(random() * 6);
    const units = Array.from({ length: unitCount }, (_, u) => {
      const size = 3 + Math.floor(random() * 3);
      const names = Array.from({ length: size }, (_, i) => `F${f}U${u}-${String.fromCharCode(65 + i)}`);
      for (const name of names) {
        truth.unit.set(name, `F${f}U${u}`);
        truth.franchise.set(name, `F${f}`);
      }
      return names;
    });
    return { id: `F${f}`, units, from, to: Math.min(12, from + 3 + Math.floor(random() * 5)), weight: 1 + random() * 3 };
  });
  const everyone = franchises.flatMap((f) => f.units.flat());
  const totalWeight = franchises.reduce((sum, f) => sum + f.weight, 0);
  const pickFranchise = () => {
    let r = random() * totalWeight;
    for (const f of franchises) if ((r -= f.weight) <= 0) return f;
    return franchises[0];
  };

  const events: GraphEvent[] = [];
  const count = options.events ?? 160;
  for (let i = 0; i < count; i++) {
    const f = pickFranchise();
    const kind = random();
    let artists: string[];
    if (kind < 0.5) artists = shuffle(pick(f.units)).slice(0, Math.max(2, Math.ceil(random() * 4)));
    else if (kind < 0.68) artists = shuffle(f.units.flat()).slice(0, 4 + Math.floor(random() * 4));
    else if (kind < 0.8) artists = [...shuffle(pick(f.units)).slice(0, 3), pick(pickFranchise().units.flat())];
    else if (kind < 0.9) artists = [pick(f.units.flat())];
    else if (kind < 0.95) artists = shuffle(everyone).slice(0, 14 + Math.floor(random() * 10));
    else artists = shuffle(f.units.flat()).slice(0, 2);
    const month = f.from + Math.floor(random() * (f.to - f.from + 1));
    events.push({
      name: `Live ${i}`,
      href: `/events/${1000 + i}`,
      date: `2026-${String(month).padStart(2, '0')}-${String(1 + (i % 27)).padStart(2, '0')}`,
      place: ['Zepp', 'AX', 'Budokan', 'Hall'][i % 4],
      artists: [...new Set(artists)]
    });
  }
  return { events, truth, franchises };
}
