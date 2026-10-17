import { useId } from "react";
import { layoutVenn } from "~/shared/utils/venn";
import { SIDE_COLORS } from "./palette";

interface VennDiagramProps {
  nameA: string;
  nameB: string;
  sizeA: number;
  sizeB: number;
  shared: number;
  unit: string;
}

const W = 300;
const H = 170;

/** Two circles sized by how many each person has; the lens is how many they share. */
export function VennDiagram({ nameA, nameB, sizeA, sizeB, shared, unit }: VennDiagramProps) {
  const clipId = useId();
  const { rA, rB, d } = layoutVenn(sizeA, sizeB, shared, 72);
  const span = rA + d + rB;
  const left = (W - span) / 2 + rA;
  const cxA = left;
  const cxB = left + d;
  const cy = H / 2 + 6;
  const onlyA = sizeA - shared;
  const onlyB = sizeB - shared;

  // Lens centre sits between the two inner edges
  const lensLeft = Math.max(cxA - rA, cxB - rB);
  const lensRight = Math.min(cxA + rA, cxB + rB);
  const lensX = (lensLeft + lensRight) / 2;
  const roomInLens = lensRight - lensLeft;
  const labelA = shared > 0 ? (cxA - rA + lensLeft) / 2 : cxA;
  const labelB = shared > 0 ? (lensRight + cxB + rB) / 2 : cxB;

  const text = { fill: "var(--colors-fg-default)", textAnchor: "middle" as const };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${nameA} has ${sizeA} ${unit}, ${nameB} has ${sizeB}, ${shared} in common`} style={{ display: "block", maxHeight: 180 }}>
      <defs>
        <clipPath id={clipId}>
          <circle cx={cxA} cy={cy} r={rA} />
        </clipPath>
      </defs>
      <circle cx={cxA} cy={cy} r={rA} fill={SIDE_COLORS.mine} fillOpacity={0.22} stroke={SIDE_COLORS.mine} strokeWidth={2} />
      <circle cx={cxB} cy={cy} r={rB} fill={SIDE_COLORS.theirs} fillOpacity={0.22} stroke={SIDE_COLORS.theirs} strokeWidth={2} />
      {shared > 0 && <circle cx={cxB} cy={cy} r={rB} fill={SIDE_COLORS.both} fillOpacity={0.18} clipPath={`url(#${clipId})`} />}

      <text x={labelA} y={cy + 5} fontSize="17" fontWeight="700" {...text}>{onlyA}</text>
      <text x={labelB} y={cy + 5} fontSize="17" fontWeight="700" {...text}>{onlyB}</text>
      {shared > 0 && roomInLens > 22 && <text x={lensX} y={cy + 5} fontSize="17" fontWeight="700" {...text}>{shared}</text>}
      {shared > 0 && roomInLens <= 22 && (
        <g>
          <line x1={lensX} y1={cy - 4} x2={lensX} y2={cy - Math.min(rA, rB) - 14} stroke="var(--colors-fg-muted)" />
          <text x={lensX} y={cy - Math.min(rA, rB) - 20} fontSize="14" fontWeight="700" {...text}>{shared} shared</text>
        </g>
      )}
      {shared === 0 && <text x={W / 2} y={H - 10} fontSize="11" fill="var(--colors-fg-muted)" textAnchor="middle">Nothing in common</text>}

    </svg>
  );
}
