export interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  /** Cluster id, -1 when ungrouped */
  group: number;
  /** Set while dragging */
  fx: number | null;
  fy: number | null;
}

export interface SimLink {
  source: number;
  target: number;
  /** 0..1, higher pulls the pair closer */
  strength: number;
}

const MIN_GAP = 10;
const MAX_LENGTH = 230;

/**
 * Small force simulation. Linked artists settle at a distance that shrinks as they
 * perform together more often; everything else repels, so unrelated artists end up far apart.
 */
export class ForceSim {
  nodes: SimNode[];
  links: SimLink[];
  alpha = 1;

  constructor(nodes: { id: string; r: number; group?: number }[], links: SimLink[]) {
    // Groups start on a ring and spread out from there, ungrouped artists in the middle; no randomness so layouts repeat
    const groupCount = Math.max(0, ...nodes.map((node) => (node.group ?? -1) + 1));
    const ring = 70 + groupCount * 28;
    const seen = new Map<number, number>();
    this.nodes = nodes.map((node, i) => {
      const group = node.group ?? -1;
      const rank = seen.get(group) ?? 0;
      seen.set(group, rank + 1);
      const spiralAngle = rank * 2.399963;
      const spiralRadius = 18 * Math.sqrt(rank + 0.5);
      const centreAngle = group >= 0 ? (group / groupCount) * Math.PI * 2 : 0;
      const cx = group >= 0 ? Math.cos(centreAngle) * ring : 0;
      const cy = group >= 0 ? Math.sin(centreAngle) * ring : 0;
      return {
        id: node.id,
        r: node.r,
        group,
        x: cx + Math.cos(spiralAngle + i) * spiralRadius,
        y: cy + Math.sin(spiralAngle + i) * spiralRadius,
        vx: 0,
        vy: 0,
        fx: null,
        fy: null
      };
    });
    this.links = links;
  }

  reheat(alpha = 0.5) {
    this.alpha = Math.max(this.alpha, alpha);
  }

  get settled() {
    return this.alpha < 0.015;
  }

  tick() {
    const { nodes, links, alpha } = this;
    const n = nodes.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) {
          dx = (i - j) * 0.1;
          dy = 0.1;
          d2 = dx * dx + dy * dy;
        }
        const d = Math.sqrt(d2);
        const apart = a.group !== b.group || a.group < 0 ? 2.4 : 1;
        const push = (2600 * apart * alpha) / Math.max(d2, 400);
        const fx = (dx / d) * push;
        const fy = (dy / d) * push;
        a.vx -= fx;
        a.vy -= fy;
        b.vx += fx;
        b.vy += fy;

        const overlap = a.r + b.r + 3 - d;
        if (overlap > 0) {
          const shove = overlap * 0.5;
          a.vx -= (dx / d) * shove;
          a.vy -= (dy / d) * shove;
          b.vx += (dx / d) * shove;
          b.vy += (dy / d) * shove;
        }
      }
    }

    for (const link of links) {
      const a = nodes[link.source];
      const b = nodes[link.target];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const minLength = a.r + b.r + MIN_GAP;
      const length = minLength + (1 - link.strength) * (MAX_LENGTH - minLength);
      const pull = ((d - length) / d) * (0.008 + 0.28 * link.strength * link.strength) * (0.4 + alpha * 0.6);
      a.vx += dx * pull;
      a.vy += dy * pull;
      b.vx -= dx * pull;
      b.vy -= dy * pull;
    }

    // Pull each group toward its own centre so groups read as separate clumps
    const centres = new Map<number, { x: number; y: number; n: number }>();
    for (const node of nodes) {
      if (node.group < 0) continue;
      const c = centres.get(node.group) ?? { x: 0, y: 0, n: 0 };
      c.x += node.x;
      c.y += node.y;
      c.n += 1;
      centres.set(node.group, c);
    }
    for (const node of nodes) {
      const c = node.group >= 0 ? centres.get(node.group) : undefined;
      if (c && c.n > 1) {
        node.vx += (c.x / c.n - node.x) * 0.12 * alpha;
        node.vy += (c.y / c.n - node.y) * 0.12 * alpha;
      }
    }

    for (const node of nodes) {
      node.vx -= node.x * 0.012 * alpha;
      node.vy -= node.y * 0.012 * alpha;
      node.vx *= 0.62;
      node.vy *= 0.62;
      if (node.fx !== null && node.fy !== null) {
        node.x = node.fx;
        node.y = node.fy;
        node.vx = 0;
        node.vy = 0;
      } else {
        node.x += node.vx;
        node.y += node.vy;
      }
    }

    this.alpha *= 0.985;
  }

  run(ticks: number) {
    for (let i = 0; i < ticks && !this.settled; i++) this.tick();
  }
}
