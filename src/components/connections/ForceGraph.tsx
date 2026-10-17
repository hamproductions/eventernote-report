import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Maximize } from "lucide-react";
import { Box, HStack } from "styled-system/jsx";
import { css } from "styled-system/css";
import { IconButton } from "~/components/ui/icon-button";
import type { ArtistGraph } from "~/shared/utils/artistGraph";
import { ForceSim } from "~/shared/utils/forceLayout";
import { ACCENT, groupColor, SIDE_COLORS } from "./palette";

interface ForceGraphProps {
  graph: ArtistGraph;
  comparing: boolean;
  showLabels: boolean;
  selected: string | null;
  highlightCluster: number | null;
  onSelect: (id: string | null) => void;
  /** Bump `nonce` to pan the view onto a node chosen elsewhere (search, lists) */
  centerOn: { id: string; nonce: number } | null;
}

const radiusOf = (active: number) => 4 + Math.sqrt(active) * 2.2;
const BACKBONE_LINKS_PER_NODE = 3;
const HULL_PAD = 18;

type Point = { x: number; y: number };

/** Convex hull (monotone chain); returns the points themselves when there are fewer than three. */
function convexHull(points: Point[]) {
  if (points.length < 3) return points;
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const build = (list: Point[]) => {
    const out: Point[] = [];
    for (const point of list) {
      while (out.length >= 2 && cross(out[out.length - 2], out[out.length - 1], point) <= 0) out.pop();
      out.push(point);
    }
    out.pop();
    return out;
  };
  return [...build(sorted), ...build([...sorted].reverse())];
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ForceGraph({ graph, comparing, showLabels, selected, highlightCluster, onSelect, centerOn }: ForceGraphProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simRef = useRef<ForceSim | null>(null);
  const frameRef = useRef(0);
  const running = useRef(false);
  const [measured, setMeasured] = useState(false);
  const viewRef = useRef({ x: 0, y: 0, k: 1 });
  const [size, setSize] = useState({ w: 800, h: 560 });
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);

  const index = useMemo(() => new Map(graph.nodes.map((node, i) => [node.id, i])), [graph]);
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const link of graph.links) {
      map.set(link.a, (map.get(link.a) ?? new Set()).add(link.b));
      map.set(link.b, (map.get(link.b) ?? new Set()).add(link.a));
    }
    return map;
  }, [graph]);

  const commitView = useCallback((next: { x: number; y: number; k: number }) => {
    viewRef.current = next;
    setView(next);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize({ w: Math.round(width), h: Math.round(height) });
        setMeasured(true);
      }
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  const publish = useCallback(() => {
    const sim = simRef.current;
    if (sim) setPoints(sim.nodes.map((node) => ({ x: node.x, y: node.y })));
  }, []);

  const animate = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    running.current = true;
    const step = () => {
      const sim = simRef.current;
      if (!sim) return;
      sim.tick();
      publish();
      if (sim.settled) running.current = false;
      else frameRef.current = requestAnimationFrame(step);
    };
    frameRef.current = requestAnimationFrame(step);
  }, [publish]);

  // Rebuild the layout whenever the data changes
  useEffect(() => {
    const sim = new ForceSim(
      graph.nodes.map((node) => ({ id: node.id, r: radiusOf(node.active), group: node.cluster })),
      graph.links.map((link) => ({ source: index.get(link.a)!, target: index.get(link.b)!, strength: link.closeness }))
    );
    simRef.current = sim;
    sim.run(prefersReducedMotion() ? 1500 : 500);
    publish();
    commitView({ x: 0, y: 0, k: 1 });
    if (!sim.settled) animate();
    return () => {
      cancelAnimationFrame(frameRef.current);
      running.current = false;
    };
  }, [graph, index, animate, publish, commitView]);

  // Keep the layout in view when it settles somewhere off-centre
  const fit = useCallback(() => {
    const sim = simRef.current;
    if (!sim || !sim.nodes.length) return commitView({ x: 0, y: 0, k: 1 });
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const node of sim.nodes) {
      minX = Math.min(minX, node.x - node.r);
      maxX = Math.max(maxX, node.x + node.r);
      minY = Math.min(minY, node.y - node.r);
      maxY = Math.max(maxY, node.y + node.r + 14);
    }
    const pad = 72;
    const k = Math.min(2, Math.max(0.3, Math.min((size.w - pad * 2) / Math.max(maxX - minX, 1), (size.h - pad * 2) / Math.max(maxY - minY, 1))));
    commitView({ k, x: -((minX + maxX) / 2) * k, y: -((minY + maxY) / 2) * k });
  }, [size, commitView]);

  const firstFit = useRef<ArtistGraph | null>(null);
  useEffect(() => {
    if (measured && points.length && firstFit.current !== graph) {
      firstFit.current = graph;
      fit();
    }
  }, [measured, points, graph, fit]);

  useEffect(() => {
    if (!centerOn) return;
    const i = index.get(centerOn.id);
    const node = i === undefined ? null : simRef.current?.nodes[i];
    if (!node) return;
    const k = Math.max(viewRef.current.k, 1);
    commitView({ k, x: -node.x * k, y: -node.y * k });
  }, [centerOn, index, commitView]);

  const zoomBy = useCallback((factor: number, anchor?: { x: number; y: number }) => {
    const current = viewRef.current;
    const k = Math.min(4, Math.max(0.25, current.k * factor));
    const ax = anchor?.x ?? 0;
    const ay = anchor?.y ?? 0;
    commitView({ k, x: ax - ((ax - current.x) / current.k) * k, y: ay - ((ay - current.y) / current.k) * k });
  }, [commitView]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoomBy(Math.exp(-event.deltaY * 0.0015), { x: event.clientX - rect.left - rect.width / 2, y: event.clientY - rect.top - rect.height / 2 });
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [zoomBy]);

  const toWorld = (event: { clientX: number; clientY: number }) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    return { x: (event.clientX - rect.left - rect.width / 2 - v.x) / v.k, y: (event.clientY - rect.top - rect.height / 2 - v.y) / v.k };
  };

  const drag = useRef<{ kind: "node"; i: number; moved: boolean; sx: number; sy: number } | { kind: "pan"; sx: number; sy: number; vx: number; vy: number; moved: boolean } | null>(null);

  const onNodeDown = (event: React.PointerEvent, i: number) => {
    event.stopPropagation();
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    drag.current = { kind: "node", i, moved: false, sx: event.clientX, sy: event.clientY };
  };
  const onBackgroundDown = (event: React.PointerEvent) => {
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    const v = viewRef.current;
    drag.current = { kind: "pan", sx: event.clientX, sy: event.clientY, vx: v.x, vy: v.y, moved: false };
  };
  const onMove = (event: React.PointerEvent) => {
    const state = drag.current;
    if (!state) return;
    if (Math.hypot(event.clientX - state.sx, event.clientY - state.sy) > 4) state.moved = true;
    if (!state.moved) return;
    if (state.kind === "pan") {
      commitView({ ...viewRef.current, x: state.vx + event.clientX - state.sx, y: state.vy + event.clientY - state.sy });
      return;
    }
    const node = simRef.current?.nodes[state.i];
    if (!node) return;
    const world = toWorld(event);
    node.fx = world.x;
    node.fy = world.y;
    simRef.current!.reheat(0.35);
    if (!running.current) animate();
  };
  const onUp = () => {
    const state = drag.current;
    drag.current = null;
    if (!state) return;
    if (state.kind === "node") {
      const node = simRef.current?.nodes[state.i];
      if (node) {
        node.fx = null;
        node.fy = null;
      }
      if (!state.moved) onSelect(graph.nodes[state.i].id);
    } else if (!state.moved) {
      onSelect(null);
    }
  };

  const active = hovered ?? selected;
  const neighbours = active ? adjacency.get(active) : undefined;
  const inCluster = (id: string) => highlightCluster !== null && graph.nodes[index.get(id)!].cluster === highlightCluster;
  const isLit = (id: string) => {
    if (highlightCluster !== null) return inCluster(id);
    return !active || id === active || !!neighbours?.has(id);
  };

  const placedLabels = useMemo(() => {
    const shown = new Map<string, { x: number; y: number; anchor: "start" | "middle" | "end" }>();
    if (points.length !== graph.nodes.length) return shown;
    const fontSize = 12 / Math.sqrt(view.k);
    type Box = { x0: number; y0: number; x1: number; y1: number };
    const overlaps = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
    const circles: Box[] = graph.nodes.map((node, i) => {
      const r = radiusOf(node.active);
      return { x0: points[i].x - r, y0: points[i].y - r, x1: points[i].x + r, y1: points[i].y + r };
    });
    const boxes: Box[] = [];
    const order = graph.nodes.map((_, i) => i).sort((a, b) => graph.nodes[b].count - graph.nodes[a].count);
    for (const i of order) {
      const node = graph.nodes[i];
      const r = radiusOf(node.active);
      const { x, y } = points[i];
      const width = [...node.id].reduce((sum, char) => sum + (char.charCodeAt(0) > 255 ? 1 : 0.58), 0) * fontSize;
      const height = fontSize * 1.15;
      const spots = [
        { x, y: y + r + fontSize, anchor: "middle" as const, box: { x0: x - width / 2, y0: y + r + 2, x1: x + width / 2, y1: y + r + 2 + height } },
        { x, y: y - r - 4, anchor: "middle" as const, box: { x0: x - width / 2, y0: y - r - 4 - height, x1: x + width / 2, y1: y - r - 4 } },
        { x: x + r + 4, y: y + fontSize / 3, anchor: "start" as const, box: { x0: x + r + 4, y0: y - height / 2, x1: x + r + 4 + width, y1: y + height / 2 } },
        { x: x - r - 4, y: y + fontSize / 3, anchor: "end" as const, box: { x0: x - r - 4 - width, y0: y - height / 2, x1: x - r - 4, y1: y + height / 2 } }
      ];
      const clear = spots.find((spot) => !boxes.some((other) => overlaps(spot.box, other)) && !circles.some((circle, j) => j !== i && overlaps(spot.box, circle)));
      const spot = clear ?? spots.find((candidate) => !boxes.some((other) => overlaps(candidate.box, other))) ?? spots[0];
      boxes.push(spot.box);
      shown.set(node.id, { x: spot.x - x, y: spot.y - y, anchor: spot.anchor });
    }
    return shown;
  }, [graph, points, view.k]);

  // Only each artist's strongest few links are always drawn; the rest appear when you pick an artist or group
  const backbone = useMemo(() => {
    const keep = new Set<string>();
    const perNode = new Map<string, typeof graph.links>();
    for (const link of graph.links) {
      for (const id of [link.a, link.b]) perNode.set(id, [...(perNode.get(id) ?? []), link]);
    }
    for (const links of perNode.values()) {
      links
        .sort((x, y) => y.weight * y.strength - x.weight * x.strength)
        .slice(0, BACKBONE_LINKS_PER_NODE)
        .forEach((link) => keep.add(`${link.a}|${link.b}`));
    }
    return keep;
  }, [graph]);

  const hulls = useMemo(() => {
    if (points.length !== graph.nodes.length) return [];
    return graph.clusters
      .filter((cluster) => cluster.members.length >= 2)
      .map((cluster) => {
        const members = cluster.members.map((id) => points[index.get(id)!]);
        const hull = convexHull(members);
        const top = Math.min(...members.map((point) => point.y));
        const x = members.reduce((sum, point) => sum + point.x, 0) / members.length;
        return { id: cluster.id, path: `M${hull.map((point) => `${point.x} ${point.y}`).join("L")}Z`, labelX: x, labelY: top - HULL_PAD - 6, name: cluster.members.length > 2 ? `${cluster.members[0]} +${cluster.members.length - 1}` : cluster.members.join(" · ") };
      });
  }, [graph, points, index]);

  const fillFor = (node: ArtistGraph["nodes"][number]) => {
    if (comparing) return node.mine ? SIDE_COLORS.mine : SIDE_COLORS.theirs;
    return groupColor(node.cluster);
  };
  const linkColor = (link: ArtistGraph["links"][number]) => {
    if (comparing) return link.mine && link.theirs ? SIDE_COLORS.both : link.mine ? SIDE_COLORS.mine : SIDE_COLORS.theirs;
    return active && (link.a === active || link.b === active) ? ACCENT : "var(--colors-fg-muted)";
  };

  const ready = points.length === graph.nodes.length;

  return (
    <Box ref={wrapRef} position="relative" w="full" h={{ base: "420px", md: "620px" }} borderWidth="1px" borderColor="border.default" borderRadius="lg" bg="bg.subtle" overflow="hidden" touchAction="none">
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        viewBox={`0 0 ${size.w} ${size.h}`}
        role="img"
        aria-label={`Artist connection graph with ${graph.nodes.length} artists and ${graph.links.length} links. Artists who perform together often sit close. The lists beside the graph give the same information as text.`}
        className={css({ display: "block", cursor: "grab", userSelect: "none", _active: { cursor: "grabbing" } })}
        onPointerDown={onBackgroundDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      >
        <g transform={`translate(${size.w / 2 + view.x} ${size.h / 2 + view.y}) scale(${view.k})`}>
          {hulls.map((hull) => {
            const lit = highlightCluster === hull.id || (active !== null && graph.nodes[index.get(active)!]?.cluster === hull.id);
            return (
              <g key={hull.id} pointerEvents="none">
                <path d={hull.path} fill={groupColor(hull.id)} stroke={groupColor(hull.id)} strokeWidth={HULL_PAD * 2} strokeLinejoin="round" opacity={lit ? 0.26 : 0.13} />
                {hull.id < 5 && (
                  <text x={hull.labelX} y={hull.labelY} textAnchor="middle" fontSize={10 / Math.sqrt(view.k)} fill="var(--colors-fg-muted)" opacity={highlightCluster !== null && !lit ? 0.2 : 0.9}>{hull.name}</text>
                )}
              </g>
            );
          })}
          {ready &&
            graph.links.map((link) => {
              const key = `${link.a}|${link.b}`;
              const touchesActive = !!active && (link.a === active || link.b === active);
              const inHighlight = highlightCluster !== null && inCluster(link.a) && inCluster(link.b);
              if (!backbone.has(key) && !touchesActive && !inHighlight) return null;
              const a = points[index.get(link.a)!];
              const b = points[index.get(link.b)!];
              const lit = isLit(link.a) && isLit(link.b) && (!active || highlightCluster !== null || touchesActive);
              const dimmed = (active || highlightCluster !== null) && !lit;
              return (
                <line
                  key={`${link.a}|${link.b}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={linkColor(link)}
                  strokeLinecap="round"
                  strokeDasharray={graph.nodes[index.get(link.a)!].cluster !== graph.nodes[index.get(link.b)!].cluster ? "3 4" : undefined}
                  strokeWidth={(0.8 + Math.min(link.weight, 8) * 0.45) / Math.sqrt(view.k)}
                  opacity={dimmed ? 0.05 : active && lit ? 0.85 : 0.14 + link.strength * 0.4}
                />
              );
            })}
          {ready &&
            graph.nodes.map((node, i) => {
              const p = points[i];
              const r = radiusOf(node.active);
              const lit = isLit(node.id);
              const split = comparing && node.mine > 0 && node.theirs > 0;
              return (
                <g
                  key={node.id}
                  transform={`translate(${p.x} ${p.y})`}
                  opacity={lit ? (node.active ? 1 : 0.4) : 0.14}
                  onPointerDown={(event) => onNodeDown(event, i)}
                  onPointerEnter={() => setHovered(node.id)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setHovered(node.id)}
                  onBlur={() => setHovered(null)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(node.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`${node.id}, ${node.count} events, ${node.degree} connections`}
                  aria-pressed={selected === node.id}
                  className={css({ cursor: "pointer", outline: "none", "&:focus-visible circle.ring": { stroke: "var(--colors-fg-default)", strokeWidth: "2.5px" } })}
                >
                  <circle className="ring" r={r + 2.5} fill="transparent" stroke={selected === node.id ? "var(--colors-fg-default)" : "transparent"} strokeWidth={2} />
                  {split ? (
                    <>
                      <path d={`M0 ${-r} A${r} ${r} 0 0 0 0 ${r} Z`} fill={SIDE_COLORS.mine} />
                      <path d={`M0 ${-r} A${r} ${r} 0 0 1 0 ${r} Z`} fill={SIDE_COLORS.theirs} />
                    </>
                  ) : (
                    <circle r={r} fill={fillFor(node)} />
                  )}
                  <circle r={r} fill="none" stroke="var(--colors-bg-default)" strokeWidth={1.5} />
                </g>
              );
            })}
          {ready &&
            graph.nodes.map((node, i) => {
              const label = placedLabels.get(node.id) ?? { x: 0, y: radiusOf(node.active) + 14, anchor: "middle" as const };
              const showLabel = showLabels && (placedLabels.has(node.id) || node.id === active || !!neighbours?.has(node.id) || (highlightCluster !== null && inCluster(node.id)));
              if (!showLabel) return null;
              return (
                <text
                  key={node.id}
                  x={points[i].x + label.x}
                  y={points[i].y + label.y}
                  textAnchor={label.anchor}
                  fontSize={12 / Math.sqrt(view.k)}
                  fill="var(--colors-fg-default)"
                  stroke="var(--colors-bg-subtle)"
                  strokeWidth={3}
                  paintOrder="stroke"
                  opacity={isLit(node.id) ? (node.active ? 1 : 0.5) : 0.14}
                  pointerEvents="none"
                >
                  {node.id}
                </text>
              );
            })}
        </g>
      </svg>

      <HStack position="absolute" right="3" bottom="3" gap="1" bg="bg.default" borderWidth="1px" borderColor="border.subtle" borderRadius="md" p="0.5">
        <IconButton size="sm" variant="ghost" aria-label="Zoom in" onClick={() => zoomBy(1.3)}><Plus /></IconButton>
        <IconButton size="sm" variant="ghost" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.3)}><Minus /></IconButton>
        <IconButton size="sm" variant="ghost" aria-label="Fit graph to view" onClick={fit}><Maximize /></IconButton>
      </HStack>
    </Box>
  );
}
