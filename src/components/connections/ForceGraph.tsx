import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, Maximize } from "lucide-react";
import { Box, HStack } from "styled-system/jsx";
import { css } from "styled-system/css";
import { IconButton } from "~/components/ui/icon-button";
import type { ArtistGraph } from "~/shared/utils/artistGraph";
import { ForceSim } from "~/shared/utils/forceLayout";
import { ACCENT, NODE_COLOR, SIDE_COLORS } from "./palette";

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

const radiusOf = (count: number) => 5 + Math.sqrt(count) * 3.2;
const MAX_LABELS = 22;

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
      graph.nodes.map((node) => ({ id: node.id, r: radiusOf(node.count) })),
      graph.links.map((link) => ({ source: index.get(link.a)!, target: index.get(link.b)!, strength: link.strength }))
    );
    simRef.current = sim;
    sim.run(prefersReducedMotion() ? 1000 : 220);
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
    const pad = 48;
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

  const topLabels = useMemo(() => new Set(graph.nodes.slice(0, MAX_LABELS).map((node) => node.id)), [graph]);

  const fillFor = (node: ArtistGraph["nodes"][number]) => {
    if (comparing) return node.mine ? SIDE_COLORS.mine : SIDE_COLORS.theirs;
    return node.id === active || (highlightCluster !== null && node.cluster === highlightCluster) ? ACCENT : NODE_COLOR;
  };
  const linkColor = (link: ArtistGraph["links"][number]) => {
    if (comparing) return link.mine && link.theirs ? SIDE_COLORS.both : link.mine ? SIDE_COLORS.mine : SIDE_COLORS.theirs;
    return active && (link.a === active || link.b === active) ? ACCENT : "var(--colors-fg-muted)";
  };

  const ready = points.length === graph.nodes.length;

  return (
    <Box ref={wrapRef} position="relative" w="full" h={{ base: "420px", md: "600px" }} borderWidth="1px" borderColor="border.default" borderRadius="lg" bg="bg.subtle" overflow="hidden" touchAction="none">
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
          {ready &&
            graph.links.map((link) => {
              const a = points[index.get(link.a)!];
              const b = points[index.get(link.b)!];
              const lit = isLit(link.a) && isLit(link.b) && (!active || highlightCluster !== null || link.a === active || link.b === active);
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
                  strokeWidth={(0.8 + Math.min(link.weight, 8) * 0.55) / Math.sqrt(view.k)}
                  opacity={dimmed ? 0.05 : active && lit ? 0.85 : 0.18 + link.strength * 0.5}
                />
              );
            })}
          {ready &&
            graph.nodes.map((node, i) => {
              const p = points[i];
              const r = radiusOf(node.count);
              const lit = isLit(node.id);
              const split = comparing && node.mine > 0 && node.theirs > 0;
              const showLabel = showLabels && (topLabels.has(node.id) || node.id === active || !!neighbours?.has(node.id) || view.k >= 1.8 || (highlightCluster !== null && inCluster(node.id)));
              return (
                <g
                  key={node.id}
                  transform={`translate(${p.x} ${p.y})`}
                  opacity={lit ? 1 : 0.14}
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
                  {showLabel && (
                    <text
                      y={r + 12}
                      textAnchor="middle"
                      fontSize={11 / Math.sqrt(view.k)}
                      fill="var(--colors-fg-default)"
                      stroke="var(--colors-bg-subtle)"
                      strokeWidth={3}
                      paintOrder="stroke"
                      pointerEvents="none"
                    >
                      {node.id}
                    </text>
                  )}
                </g>
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
