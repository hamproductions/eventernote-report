import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, X } from "lucide-react";
import { Box, Grid, HStack, VStack, styled } from "styled-system/jsx";
import { css } from "styled-system/css";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { InfoTip } from "~/components/dashboard/InfoTip";
import { LoadingStatus } from "~/components/dashboard/LoadingStatus";
import { PillGroup } from "~/components/dashboard/PillGroup";
import type { RecentUser } from "~/contexts/ReportContext";
import { useAttendedEvents, type EventRange } from "~/hooks/useAttendedEvents";
import { buildArtistGraph, DEFAULT_GRAPH_OPTIONS, type GraphEvent, type GraphOptions, type Membership } from "~/shared/utils/artistGraph";
import { fetchJson } from "~/shared/utils/fetchJson";
import { computeOverlap } from "~/shared/utils/overlap";
import { parseUserInput } from "~/shared/utils/parseUserInput";
import { ArtistPanel } from "./ArtistPanel";
import { ForceGraph } from "./ForceGraph";
import { OverlapPanel } from "./OverlapPanel";
import { SIDE_COLORS } from "./palette";

interface ConnectionsSectionProps {
  userId: string;
  userLabel: string;
  events: GraphEvent[];
  range: EventRange;
  recentUsers: RecentUser[];
}

const MEMBERSHIPS = [
  ["all", "Everyone"],
  ["shared", "Both saw"],
  ["mine", "Only me"],
  ["theirs", "Only them"]
] as const;

const TREND_LABEL = { recent: "Recent", steady: "Steady", earlier: "Earlier" } as const;

function period(first: string, last: string) {
  const a = first.slice(0, 7);
  const b = last.slice(0, 7);
  return a === b ? a : `${a} to ${b}`;
}

function MemberChip({ name, onPick }: { name: string; onPick: (id: string) => void }) {
  return (
    <styled.button type="button" onClick={() => onPick(name)} fontSize="xs" px="2" py="0.5" minH={{ base: "8", md: "auto" }} borderWidth="1px" borderColor="border.subtle" borderRadius="full" cursor="pointer" _hover={{ bg: "bg.muted" }}>{name}</styled.button>
  );
}

const field = css({ h: { base: "11", md: "8" }, px: "3", borderWidth: "1px", borderColor: "border.control", borderRadius: "md", bg: "bg.default", color: "fg.default", fontSize: "sm" });

function Slider({ label, value, min, max, step = 1, onChange, hint }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void; hint: string }) {
  return (
    <VStack gap="0.5" alignItems="stretch" minW="0" title={hint}>
      <HStack justifyContent="space-between" gap="2">
        <Text size="xs" color="fg.muted">{label}</Text>
        <Text size="xs" fontWeight="medium" fontVariantNumeric="tabular-nums">{value}</Text>
      </HStack>
      <input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))}
        className={css({ w: "full", h: { base: "8", md: "5" }, accentColor: "var(--colors-blue-9)", cursor: "pointer" })} />
    </VStack>
  );
}

export function ConnectionsSection({ userId, userLabel, events, range, recentUsers }: ConnectionsSectionProps) {
  const [otherId, setOtherId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<GraphOptions>(DEFAULT_GRAPH_OPTIONS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"pairs" | "groups">("pairs");
  const [highlightCluster, setHighlightCluster] = useState<number | null>(null);
  const [centerOn, setCenterOn] = useState<{ id: string; nonce: number } | null>(null);
  const [search, setSearch] = useState("");

  // Switching user resets the comparison
  useEffect(() => {
    setOtherId(null);
    setSelected(null);
  }, [userId]);

  const them = useAttendedEvents(otherId, range);
  const comparing = !!otherId && them.loaded;
  const nameA = userLabel;
  const nameB = them.label || otherId || "Them";

  const connections = useQuery<{ data: { following: { userId: string }[] } }>({
    queryKey: ["connections-raw", userId],
    queryFn: () => fetchJson(`/api/user-profile/${encodeURIComponent(userId)}/connections`, "Could not load people"),
    staleTime: 1000 * 60 * 60
  });
  const following = connections.data?.data.following.map((user) => user.userId) ?? [];

  const history = useAttendedEvents(userId, { start: null, end: null });
  const graph = useMemo(() => {
    if (comparing) return buildArtistGraph(events, them.events, options);
    if (!history.loaded) return buildArtistGraph(events, null, options);
    return buildArtistGraph(history.events, null, options, new Set(events.map((event) => event.href)));
  }, [events, them.events, comparing, options, history.loaded, history.events]);
  const overlap = useMemo(() => (comparing ? computeOverlap(events, them.events) : null), [events, them.events, comparing]);
  const merged = useMemo(() => {
    const byHref = new Map<string, { event: GraphEvent; mine: boolean; theirs: boolean }>();
    for (const event of events) byHref.set(event.href, { event, mine: true, theirs: false });
    if (comparing) {
      for (const event of them.events) {
        const existing = byHref.get(event.href);
        if (existing) existing.theirs = true;
        else byHref.set(event.href, { event, mine: false, theirs: true });
      }
    }
    return [...byHref.values()];
  }, [events, them.events, comparing]);

  useEffect(() => {
    if (selected && !graph.nodes.some((node) => node.id === selected)) setSelected(null);
  }, [graph, selected]);

  const setOption = <K extends keyof GraphOptions>(key: K, value: GraphOptions[K]) => setOptions((current) => ({ ...current, [key]: value }));
  const pick = (id: string, recenter = true) => {
    setSelected(id);
    if (recenter) setCenterOn((current) => ({ id, nonce: (current?.nonce ?? 0) + 1 }));
  };
  const choose = (value: string) => {
    const parsed = parseUserInput(value);
    if (parsed && parsed !== userId) {
      setOtherId(parsed);
      setSelected(null);
      setInput("");
    }
  };

  const closestPairs = useMemo(() => [...graph.links].sort((x, y) => y.weight - x.weight || y.strength - x.strength).slice(0, 12), [graph]);
  const candidates = recentUsers.filter((user) => user.id !== userId);
  const failure = them.error;

  return (
    <VStack gap="3" alignItems="stretch">
      <HStack gap="2" flexWrap="wrap" alignItems="center">
        <Text size="sm" color="fg.muted">Compare with</Text>
        {candidates.slice(0, 4).map((user) => (
          <Button key={user.id} size="sm" variant={otherId === user.id ? "solid" : "outline"} onClick={() => (otherId === user.id ? setOtherId(null) : choose(user.id))}>{user.name}</Button>
        ))}
        <form onSubmit={(e) => { e.preventDefault(); choose(input); }}>
          <HStack gap="2">
            <input list="connections-following" aria-label="User to compare with" placeholder="User ID or URL" value={input} autoCapitalize="none" spellCheck={false}
              onChange={(e) => setInput(e.target.value)} className={css({ w: { base: "36", md: "44" } }) + " " + field} />
            <datalist id="connections-following">{following.map((id) => <option key={id} value={id} />)}</datalist>
            <Button type="submit" size="sm" disabled={!input.trim()}>Compare</Button>
          </HStack>
        </form>
        {otherId && <Button size="sm" variant="ghost" onClick={() => setOtherId(null)}><X /> Stop</Button>}
      </HStack>

      <HStack gap="2" flexWrap="wrap" alignItems="center">
        {comparing && <PillGroup<Membership> label="Whose artists" value={options.membership} options={MEMBERSHIPS} onChange={(value) => setOption("membership", value)} />}
        <Button size="sm" variant="outline" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal /> Filters</Button>
        <input list="connections-artists" aria-label="Find an artist" placeholder="Find an artist" value={search} spellCheck={false}
          onChange={(e) => {
            setSearch(e.target.value);
            const match = graph.nodes.find((node) => node.id.toLowerCase() === e.target.value.trim().toLowerCase());
            if (match) pick(match.id);
          }}
          className={css({ w: { base: "36", md: "44" } }) + " " + field} />
        <datalist id="connections-artists">{graph.nodes.map((node) => <option key={node.id} value={node.id} />)}</datalist>
      </HStack>

      {filtersOpen && (
        <VStack gap="3" alignItems="stretch" p="3" borderWidth="1px" borderColor="border.subtle" borderRadius="lg" bg="bg.subtle">
          <Grid gridTemplateColumns={{ base: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }} gap="4">
            <Slider label="Min times seen" value={options.minEvents} min={1} max={10} onChange={(v) => setOption("minEvents", v)} hint="Hide artists seen fewer times than this" />
            <Slider label="Min together" value={options.minTogether} min={1} max={6} onChange={(v) => setOption("minTogether", v)} hint="Only link artists who shared a stage at least this many times" />
            <Slider label="Max artists" value={options.maxNodes} min={10} max={150} step={5} onChange={(v) => setOption("maxNodes", v)} hint="Show only the most-seen artists" />
            <Slider label="Ignore line-ups over" value={options.maxArtistsPerEvent} min={3} max={40} onChange={(v) => setOption("maxArtistsPerEvent", v)} hint="Festival-size line-ups would link everyone to everyone" />
          </Grid>
          <label className={css({ display: "inline-flex", alignItems: "center", gap: "2", fontSize: "sm", cursor: "pointer", alignSelf: "flex-start" })}>
            <input type="checkbox" checked={!options.hideLoners} onChange={(e) => setOption("hideLoners", !e.target.checked)} /> Show artists with no links
          </label>
        </VStack>
      )}

      {them.isFetching && (
        <LoadingStatus
          compact
          label={`Loading ${otherId}'s events`}
          detail={them.progress?.stage === "details" ? `${them.progress.loaded} of ${them.progress.total} events checked` : "Finding events in this date range"}
          loaded={them.progress?.stage === "details" ? them.progress.loaded : undefined}
          total={them.progress?.stage === "details" ? them.progress.total : undefined}
        />
      )}
      {failure && (
        <HStack gap="3" flexWrap="wrap" role="alert">
          <Text size="sm" color="fg.error">{failure.message.includes("HTTP 404") ? `No Eventernote user called "${otherId}".` : `Couldn't load ${otherId}: ${failure.message}.`}</Text>
          <Button size="sm" variant="outline" onClick={() => them.retry()}>Try again</Button>
        </HStack>
      )}

      {!graph.nodes.length ? (
        <Text size="sm" color="fg.muted" py="8" textAlign="center" borderWidth="1px" borderStyle="dashed" borderColor="border.default" borderRadius="lg">
          {events.length ? "No connections with these filters. Lower the minimums, raise the line-up limit, or widen the date range." : "No attended events in this range."}
        </Text>
      ) : (
        <Grid gridTemplateColumns={{ base: "1fr", lg: "minmax(0, 1fr) 300px" }} gap="4" alignItems="start">
          <VStack gap="1.5" alignItems="stretch" minW="0">
            <ForceGraph graph={graph} comparing={comparing} showLabels selected={selected} highlightCluster={highlightCluster} onSelect={(id) => pick(id as string, false)} centerOn={centerOn} />
            <Text size="xs" color="fg.muted">
              {graph.nodes.length} artists · {graph.links.length} links
              {comparing && <>{" · "}<Box as="span" display="inline-block" w="2" h="2" borderRadius="full" style={{ background: SIDE_COLORS.mine }} /> {nameA} <Box as="span" display="inline-block" w="2" h="2" borderRadius="full" style={{ background: SIDE_COLORS.theirs }} /> {nameB}, half and half = both</>}
              <InfoTip label="the graph">Artists who perform together more often sit closer. Bigger dot means seen more, thicker line means together more. Drag nodes, scroll to zoom, click an artist for details.{graph.skippedEvents > 0 ? ` ${graph.skippedEvents} big line-ups are left out of the links.` : ""}</InfoTip>
            </Text>
          </VStack>

          <VStack gap="3" alignItems="stretch" minW="0" p="3" borderWidth="1px" borderColor="border.default" borderRadius="lg" maxH={{ lg: "440px" }} overflowY="auto">
            {selected ? (
              <ArtistPanel graph={graph} artist={selected} events={merged} comparing={comparing} nameA={nameA} nameB={nameB} onSelect={(id) => pick(id)} onClose={() => setSelected(null)} />
            ) : (
              <>
                <HStack gap="1">
                  <PillGroup label="List" value={tab} options={[["pairs", "Closest pairs"], ["groups", "Groups"]]} onChange={setTab} />
                  <InfoTip label="these lists">{tab === "pairs" ? "Times they shared a stage, and how often they appear together when either appears." : "Found from who keeps performing together. Indented rows are tighter mini groups inside a bigger group. Recent means its events lean toward the end of the range, Earlier means nothing lately. Hover a group to light it up."}</InfoTip>
                </HStack>
                {tab === "pairs" ? (
                  <VStack gap="0" alignItems="stretch">
                    {closestPairs.map((link) => (
                      <styled.button key={`${link.a}|${link.b}`} type="button" display="flex" alignItems="center" w="full" onClick={() => pick(link.a)} justifyContent="space-between" gap="3" py="1.5" cursor="pointer" textAlign="left" borderBottomWidth="1px" borderColor="border.subtle" _hover={{ bg: "bg.subtle" }}>
                        <Text size="sm" truncate>{link.a} + {link.b}</Text>
                        <Text size="xs" color="fg.muted" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">{link.weight}× · {Math.round(link.strength * 100)}%</Text>
                      </styled.button>
                    ))}
                  </VStack>
                ) : (
                  <VStack gap="1" alignItems="stretch">
                    {!graph.clusters.length && <Text size="sm" color="fg.muted">No groups yet.</Text>}
                    {graph.clusters.map((cluster) => (
                      <VStack key={cluster.id} gap="1.5" alignItems="stretch" p="2" borderRadius="md" _hover={{ bg: "bg.subtle" }}
                        onPointerEnter={() => setHighlightCluster(cluster.id)} onPointerLeave={() => setHighlightCluster(null)}
                        onFocus={() => setHighlightCluster(cluster.id)} onBlur={() => setHighlightCluster(null)}>
                        <HStack justifyContent="space-between" gap="2" alignItems="baseline">
                          <Text size="sm" fontWeight="medium" truncate>{cluster.members.length > 2 ? `${cluster.members[0]} +${cluster.members.length - 1}` : cluster.members.join(" · ")}</Text>
                          <Text size="xs" whiteSpace="nowrap" color={cluster.trend === "recent" ? "colorPalette.text" : "fg.muted"} fontWeight={cluster.trend === "recent" ? "medium" : "normal"}>
                            {TREND_LABEL[cluster.trend]}
                          </Text>
                        </HStack>
                        <Text size="xs" color="fg.muted">{cluster.events} events · {period(cluster.first, cluster.last)}</Text>
                        {cluster.subgroups.length > 0 ? (
                          <VStack gap="1" alignItems="stretch">
                            {cluster.subgroups.map((group, i) => (
                              <HStack key={i} gap="1" flexWrap="wrap" pl="2" borderLeftWidth="2px" borderColor="border.default">
                                {group.map((member) => <MemberChip key={member} name={member} onPick={pick} />)}
                              </HStack>
                            ))}
                          </VStack>
                        ) : (
                          <HStack gap="1" flexWrap="wrap">
                            {cluster.members.map((member) => <MemberChip key={member} name={member} onPick={pick} />)}
                          </HStack>
                        )}
                      </VStack>
                    ))}
                  </VStack>
                )}
              </>
            )}
          </VStack>
        </Grid>
      )}

      {overlap && (
        <Box pt="3" mt="1" borderTopWidth="1px" borderColor="border.subtle">
          <OverlapPanel overlap={overlap} nameA={nameA} nameB={nameB} />
        </Box>
      )}
    </VStack>
  );
}
