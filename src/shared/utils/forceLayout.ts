export interface SimNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
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

  constructor(nodes: { id: string; r: number }[], links: SimLink[]) {
    // Biggest nodes start near the middle on a golden-angle spiral, so layouts are repeatable
    this.nodes = nodes.map((node, i) => {
      const angle = i * 2.399963;
      const radius = 24 * Math.sqrt(i + 0.5);
      return { id: node.id, r: node.r, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, vx: 0, vy: 0, fx: null, fy: null };
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
        const push = (2600 * alpha) / Math.max(d2, 400);
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
