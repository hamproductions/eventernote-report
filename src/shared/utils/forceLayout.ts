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
  /** 0..1, how closely the pair belong together; higher means closer */
  strength: number;
}

/** Pixels per unit of graph distance */
const SCALE = 46;
/** Strongest possible pair sits this many units apart, weakest direct link about 1/0.12 */
const LINK_FLOOR = 0.12;
const MAX_STEP = 25;
const MAX_APART = 7;
const GROUP_PAD = 14;

/**
 * Stress layout: every pair of artists gets a target distance from how closely they are connected
 * (direct links by closeness, everyone else by the shortest chain of links), then the nodes spring
 * toward those distances. Pairs who perform together a lot end up near each other, friends of friends
 * next, and unrelated groups far apart. Distance on screen means something.
 */
export class ForceSim {
  nodes: SimNode[];
  links: SimLink[];
  alpha = 1;
  private target: Float64Array;
  private stiffness: Float64Array;
  private n: number;
  private gain: number;

  constructor(nodes: { id: string; r: number; group?: number }[], links: SimLink[]) {
    const n = nodes.length;
    this.n = n;
    this.gain = 0.45 * Math.min(1, 24 / Math.max(n, 1));
    this.links = links;
    this.target = new Float64Array(n * n);
    this.stiffness = new Float64Array(n * n);

    // Shortest-path graph distance; edge length shrinks as closeness grows
    const dist = new Float64Array(n * n).fill(Infinity);
    for (let i = 0; i < n; i++) dist[i * n + i] = 0;
    for (const link of links) {
      const length = 1 / (LINK_FLOOR + Math.min(1, Math.max(0, link.strength)));
      const k = link.source * n + link.target;
      if (length < dist[k]) {
        dist[k] = length;
        dist[link.target * n + link.source] = length;
      }
    }
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        const ik = dist[i * n + k];
        if (ik === Infinity) continue;
        for (let j = 0; j < n; j++) {
          const through = ik + dist[k * n + j];
          if (through < dist[i * n + j]) dist[i * n + j] = through;
        }
      }
    }
    let longest = 0;
    for (const d of dist) if (d !== Infinity && d > longest) longest = d;
    // Far pairs only need to be far, not exactly as far as the chain says: squash long distances so the picture stays compact
    const squash = (d: number) => (d <= 4 ? d : 4 + (d - 4) * 0.45);
    const apart = Math.min(squash(Math.max(longest, 4)) * 1.1, MAX_APART);
    const reach = (d: number) => Math.min(squash(d), MAX_APART);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const d = dist[i * n + j] === Infinity ? apart : reach(dist[i * n + j]);
        const t = d * SCALE;
        this.target[i * n + j] = t;
        // Close pairs matter most, far pairs only need to be roughly far
        this.stiffness[i * n + j] = (SCALE * 1.6 / t) ** 2;
      }
    }

    // Groups start on a ring so the first guess is already roughly right; no randomness, so layouts repeat
    const groupCount = Math.max(0, ...nodes.map((node) => (node.group ?? -1) + 1));
    const ring = 120 + groupCount * 24;
    const seen = new Map<number, number>();
    this.nodes = nodes.map((node, i) => {
      const group = node.group ?? -1;
      const rank = seen.get(group) ?? 0;
      seen.set(group, rank + 1);
      const spiralAngle = rank * 2.399963 + i;
      const spiralRadius = 20 * Math.sqrt(rank + 0.5);
      const centreAngle = group >= 0 ? (group / groupCount) * Math.PI * 2 : 0;
      const cx = group >= 0 ? Math.cos(centreAngle) * ring : 0;
      const cy = group >= 0 ? Math.sin(centreAngle) * ring : 0;
      return { id: node.id, r: node.r, group, x: cx + Math.cos(spiralAngle) * spiralRadius, y: cy + Math.sin(spiralAngle) * spiralRadius, vx: 0, vy: 0, fx: null, fy: null };
    });
  }

  reheat(alpha = 0.5) {
    this.alpha = Math.max(this.alpha, alpha);
  }

  get settled() {
    return this.alpha < 0.012;
  }

  tick() {
    const { nodes, n, alpha } = this;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.01) {
          dx = (i - j) * 0.1;
          dy = 0.1;
          d = Math.sqrt(dx * dx + dy * dy);
        }
        const minGap = a.r + b.r + 16;
        const t = Math.max(this.target[i * n + j], minGap);
        const pull = ((d - t) / d) * this.stiffness[i * n + j] * this.gain * (0.25 + alpha * 0.75);
        const fx = dx * pull;
        const fy = dy * pull;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;

        // Never let dots overlap
        const overlap = minGap - d;
        if (overlap > 0) {
          const shove = overlap * 0.5;
          a.vx -= (dx / d) * shove;
          a.vy -= (dy / d) * shove;
          b.vx += (dx / d) * shove;
          b.vy += (dy / d) * shove;
        }
      }
    }

    this.separate();
    this.separateGroups();

    for (const node of nodes) {
      node.vx -= node.x * 0.004 * alpha;
      node.vy -= node.y * 0.004 * alpha;
      node.vx *= 0.6;
      node.vy *= 0.6;
      const speed = Math.hypot(node.vx, node.vy);
      if (speed > MAX_STEP) {
        node.vx *= MAX_STEP / speed;
        node.vy *= MAX_STEP / speed;
      }
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

    this.alpha *= 0.992;
  }

  private separateGroups() {
    const members = new Map<number, SimNode[]>();
    for (const node of this.nodes) if (node.group >= 0) members.set(node.group, [...(members.get(node.group) ?? []), node]);
    const circles = [...members.values()]
      .filter((group) => group.length >= 2)
      .map((group) => {
        const x = group.reduce((sum, node) => sum + node.x, 0) / group.length;
        const y = group.reduce((sum, node) => sum + node.y, 0) / group.length;
        const radius = Math.max(...group.map((node) => Math.hypot(node.x - x, node.y - y) + node.r)) + GROUP_PAD;
        return { group, x, y, radius };
      });
    const shift = (group: SimNode[], dx: number, dy: number) => {
      for (const node of group) {
        if (node.fx !== null) continue;
        node.x += dx;
        node.y += dy;
      }
    };
    for (let i = 0; i < circles.length; i++) {
      for (let j = i + 1; j < circles.length; j++) {
        const a = circles[i];
        const b = circles[j];
        const dx = b.x - a.x || 0.01;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const overlap = a.radius + b.radius - d;
        if (overlap <= 0) continue;
        const push = (overlap / d) * 0.25;
        shift(a.group, -dx * push, -dy * push);
        shift(b.group, dx * push, dy * push);
      }
    }
    for (const node of this.nodes) {
      if (node.group >= 0 || node.fx !== null) continue;
      for (const circle of circles) {
        const dx = node.x - circle.x || 0.01;
        const dy = node.y - circle.y;
        const d = Math.hypot(dx, dy);
        const overlap = circle.radius + node.r + 4 - d;
        if (overlap <= 0) continue;
        node.x += (dx / d) * overlap * 0.5;
        node.y += (dy / d) * overlap * 0.5;
      }
    }
  }

  private separate() {
    const { nodes, n } = this;
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const dx = b.x - a.x || 0.01;
          const dy = b.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const gap = a.r + b.r + 14;
          if (d >= gap) continue;
          const push = ((gap - d) / d) * 0.5;
          const aFixed = a.fx !== null;
          const bFixed = b.fx !== null;
          if (!aFixed) {
            a.x -= dx * push * (bFixed ? 2 : 1);
            a.y -= dy * push * (bFixed ? 2 : 1);
          }
          if (!bFixed) {
            b.x += dx * push * (aFixed ? 2 : 1);
            b.y += dy * push * (aFixed ? 2 : 1);
          }
        }
      }
    }
  }

  run(ticks: number) {
    for (let i = 0; i < ticks && !this.settled; i++) this.tick();
  }
}
