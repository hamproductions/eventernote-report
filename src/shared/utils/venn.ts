export interface VennLayout {
  rA: number;
  rB: number;
  /** Distance between the two centres */
  d: number;
}

/** Area of the lens where two circles overlap. */
export function lensArea(r1: number, r2: number, d: number) {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const b = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  const c = 0.5 * Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
  return a + b - c;
}

/**
 * Circle areas proportional to the set sizes, pushed together until the lens is the
 * size of the intersection. `maxRadius` is the radius of the larger circle.
 */
export function layoutVenn(sizeA: number, sizeB: number, shared: number, maxRadius: number): VennLayout {
  const largest = Math.max(sizeA, sizeB, 1);
  const unit = (Math.PI * maxRadius * maxRadius) / largest;
  const radius = (size: number) => Math.sqrt((size * unit) / Math.PI);
  const rA = radius(sizeA);
  const rB = radius(sizeB);
  const target = shared * unit;
  if (shared <= 0 || !rA || !rB) return { rA, rB, d: rA + rB + maxRadius * 0.12 };

  let lo = Math.abs(rA - rB);
  let hi = rA + rB;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (lensArea(rA, rB, mid) > target) lo = mid;
    else hi = mid;
  }
  return { rA, rB, d: (lo + hi) / 2 };
}
