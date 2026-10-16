import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Moon, Sun, X } from "lucide-react";
import { Box, Grid, HStack, VStack, styled } from "styled-system/jsx";
import { css } from "styled-system/css";
import { Button } from "~/components/ui/button";
import { IconButton } from "~/components/ui/icon-button";
import { Text } from "~/components/ui/text";
import { ArtistPanel } from "~/components/connections/ArtistPanel";
import { ForceGraph, type ColorBy } from "~/components/connections/ForceGraph";
import { OverlapPanel } from "~/components/connections/OverlapPanel";
import { clusterColor, SIDE_COLORS } from "~/components/connections/palette";
import { LoadingStatus } from "~/components/dashboard/LoadingStatus";
import { PillGroup } from "~/components/dashboard/PillGroup";
import { UserInputForm } from "~/components/dashboard/UserInputForm";
import { useColorMode } from "~/contexts/ColorModeContext";
import { useReport } from "~/contexts/ReportContext";
import { useAttendedEvents, type EventRange } from "~/hooks/useAttendedEvents";
import { buildArtistGraph, DEFAULT_GRAPH_OPTIONS, type GraphOptions, type Membership } from "~/shared/utils/artistGraph";
import { formatDate, presetToDateRange } from "~/shared/utils/dateUtils";
import { fetchJson } from "~/shared/utils/fetchJson";
import { computeOverlap } from "~/shared/utils/overlap";
import { parseUserInput } from "~/shared/utils/parseUserInput";

const RANGES = [
  ["this_year", "This year"],
  ["last_year", "Last year"],
  ["last_12_months", "12 months"],
  ["all_time", "All time"]
] as const;
type RangeKey = (typeof RANGES)[number][0];

const MEMBERSHIPS = [
  ["all", "Everyone"],
  ["shared", "Both saw"],
  ["mine", "Only me"],
  ["theirs", "Only them"]
] as const;

function rangeFor(key: RangeKey) {
  const { startDate, endDate } = presetToDateRange(key);
  return { startDate, endDate };
}

function Slider({ label, value, min, max, step = 1, onChange, hint }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void; hint?: string }) {
  return (
    <VStack gap="1" alignItems="stretch" minW="0">
      <HStack justifyContent="space-between" gap="2">
        <Text as="label" size="xs" color="fg.muted" title={hint}>{label}</Text>
        <Text size="xs" fontWeight="medium" fontVariantNumeric="tabular-nums">{value}</Text>
      </HStack>
      <input
        type="range"
        aria-label={label}
        title={hint}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={css({ w: "full", h: { base: "8", md: "5" }, accentColor: "var(--colors-blue-9)", cursor: "pointer" })}
      />
    </VStack>
  );
}

function Legend({ comparing, colorBy, nameA, nameB }: { comparing: boolean; colorBy: ColorBy; nameA: string; nameB: string }) {
  const dot = (color: string, label: string) => (
    <HStack key={label} gap="1.5">
      <Box w="3" h="3" borderRadius="full" flexShrink="0" style={{ background: color }} />
      <Text size="xs" color="fg.muted">{label}</Text>
    </HStack>
  );
  return (
    <HStack gap="4" flexWrap="wrap">
      {comparing && colorBy === "person" ? (
        <>
          {dot(SIDE_COLORS.mine, `${nameA} only`)}
          {dot(SIDE_COLORS.theirs, `${nameB} only`)}
          <HStack gap="1.5">
            <svg width="12" height="12" viewBox="-6 -6 12 12" aria-hidden>
              <path d="M0 -6 A6 6 0 0 0 0 6 Z" fill={SIDE_COLORS.mine} />
              <path d="M0 -6 A6 6 0 0 1 0 6 Z" fill={SIDE_COLORS.theirs} />
            </svg>
            <Text size="xs" color="fg.muted">both saw</Text>
          </HStack>
          <HStack gap="1.5">
            <Box w="4" h="0.5" style={{ background: SIDE_COLORS.both }} />
            <Text size="xs" color="fg.muted">line: you both saw them together</Text>
          </HStack>
        </>
      ) : (
        <Text size="xs" color="fg.muted">Colour = group that tends to perform together</Text>
      )}
      <Text size="xs" color="fg.muted">Bigger dot = seen more · thicker, tighter line = together more</Text>
    </HStack>
  );
}

export default function Page() {
  const { userId, setUserId, dateRange, setDateRange, recentUsers } = useReport();
  const { colorMode, setColorMode } = useColorMode();

  const [otherId, setOtherId] = useState<string | null>(null);
  const [otherInput, setOtherInput] = useState("");
  const [options, setOptions] = useState<GraphOptions>(DEFAULT_GRAPH_OPTIONS);
  const [colorBy, setColorBy] = useState<ColorBy>("person");
  const [showLabels, setShowLabels] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [highlightCluster, setHighlightCluster] = useState<number | null>(null);
  const [centerOn, setCenterOn] = useState<{ id: string; nonce: number } | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const vs = new URLSearchParams(window.location.search).get("vs");
    if (vs) setOtherId(vs);
  }, []);

  const chooseOther = (id: string | null) => {
    setOtherId(id);
    setSelected(null);
    const params = new URLSearchParams(window.location.search);
    if (id) params.set("vs", id);
    else params.delete("vs");
    window.history.replaceState(null, "", `${window.location.pathname}?${params}`);
  };

  const range: EventRange = useMemo(() => ({
    start: dateRange.startDate ? formatDate(dateRange.startDate) : null,
    end: dateRange.endDate ? formatDate(dateRange.endDate) : null
  }), [dateRange]);
  const activeRange = RANGES.find(([key]) => {
    const preset = rangeFor(key);
    return (preset.startDate ? formatDate(preset.startDate) : null) === range.start && (preset.endDate ? formatDate(preset.endDate) : null) === range.end;
  })?.[0] ?? null;

  const me = useAttendedEvents(userId, range);
  const them = useAttendedEvents(otherId && otherId !== userId ? otherId : null, range);
  const comparing = !!otherId && otherId !== userId;
  const waitingForThem = comparing && !them.loaded;
  const nameA = me.label || userId || "You";
  const nameB = them.label || otherId || "Them";

  const connections = useQuery<{ data: { following: { userId: string }[] } }>({
    queryKey: ["connections-raw", userId],
    queryFn: () => fetchJson(`/api/user-profile/${encodeURIComponent(userId!)}/connections`, "Could not load people"),
    enabled: !!userId,
    staleTime: 1000 * 60 * 60
  });
  const following = connections.data?.data.following.map((user) => user.userId) ?? [];

  const graph = useMemo(
    () => buildArtistGraph(me.events, comparing && them.loaded ? them.events : null, options),
    [me.events, them.events, them.loaded, comparing, options]
  );
  const overlap = useMemo(() => (comparing && them.loaded ? computeOverlap(me.events, them.events) : null), [me.events, them.events, them.loaded, comparing]);

  const merged = useMemo(() => {
    const byHref = new Map<string, { event: (typeof me.events)[number]; mine: boolean; theirs: boolean }>();
    for (const event of me.events) byHref.set(event.href, { event, mine: true, theirs: false });
    if (comparing && them.loaded) {
      for (const event of them.events) {
        const existing = byHref.get(event.href);
        if (existing) existing.theirs = true;
        else byHref.set(event.href, { event, mine: false, theirs: true });
      }
    }
    return [...byHref.values()];
  }, [me.events, them.events, them.loaded, comparing]);

  useEffect(() => {
    if (selected && !graph.nodes.some((node) => node.id === selected)) setSelected(null);
  }, [graph, selected]);

  const setOption = <K extends keyof GraphOptions>(key: K, value: GraphOptions[K]) => setOptions((current) => ({ ...current, [key]: value }));
  const pick = (id: string, recenter = true) => {
    setSelected(id);
    if (recenter) setCenterOn((current) => ({ id, nonce: (current?.nonce ?? 0) + 1 }));
  };

  const closestPairs = useMemo(() => [...graph.links].sort((x, y) => y.weight - x.weight || y.strength - x.strength).slice(0, 8), [graph]);
  const maxClusterRows = 6;

  if (!userId) {
    return <UserInputForm onSubmit={(id) => setUserId(parseUserInput(id))} />;
  }

  const loading = me.isFetching || them.isFetching;
  const failure = me.error ?? them.error;
  const toggleMode = () => setColorMode?.(colorMode === "dark" ? "light" : "dark");
  const candidates = recentUsers.filter((user) => user.id !== userId);
  const searchMatch = graph.nodes.find((node) => node.id.toLowerCase() === search.trim().toLowerCase());
  const hasGraph = !loading && !failure && !waitingForThem && graph.nodes.length > 0;

  return (
    <Box bg="bg.default" colorPalette="blue" minH="100vh" px={{ base: "4", md: "8" }} pb="16">
      <VStack gap="6" alignItems="stretch" maxW="1400px" mx="auto">
        <Box as="header" pt={{ base: "3", md: "4" }}>
          <HStack justifyContent="space-between" gap="3" alignItems="center">
            <HStack gap="3" minW="0">
              <Button size="sm" variant="outline" asChild>
                <a href={`/?user=${encodeURIComponent(userId)}`}><ArrowLeft /> Report</a>
              </Button>
              <Box minW="0">
                <Text as="h1" fontSize={{ base: "lg", md: "xl" }} fontWeight="bold" lineClamp="1">Artist connections</Text>
                <Text size="xs" color="fg.muted" lineClamp="1">Who performs together, and how much your genba overlap</Text>
              </Box>
            </HStack>
            <IconButton size="sm" variant="ghost" aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={toggleMode}>
              {colorMode === "dark" ? <Sun /> : <Moon />}
            </IconButton>
          </HStack>
        </Box>

        <VStack gap="4" alignItems="stretch">
          <HStack gap="3" flexWrap="wrap">
            <Text size="sm" fontWeight="medium">{nameA}</Text>
            <PillGroup
              label="Date range"
              value={activeRange}
              options={RANGES}
              onChange={(key) => setDateRange(rangeFor(key))}
            />
          </HStack>

          <VStack gap="2" alignItems="stretch">
            <HStack gap="2" flexWrap="wrap" alignItems="center">
              <Text size="sm" color="fg.muted">Compare with</Text>
              {candidates.map((user) => (
                <Button key={user.id} size="sm" variant={otherId === user.id ? "solid" : "outline"} onClick={() => chooseOther(otherId === user.id ? null : user.id)}>
                  {user.name}
                </Button>
              ))}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const parsed = parseUserInput(otherInput);
                  if (parsed && parsed !== userId) {
                    chooseOther(parsed);
                    setOtherInput("");
                  }
                }}
              >
                <HStack gap="2">
                  <input
                    list="connections-following"
                    aria-label="User to compare with"
                    placeholder="User ID or profile URL"
                    value={otherInput}
                    autoCapitalize="none"
                    spellCheck={false}
                    onChange={(event) => setOtherInput(event.target.value)}
                    className={css({ w: { base: "44", md: "56" }, h: { base: "11", md: "8" }, px: "3", borderWidth: "1px", borderColor: "border.control", borderRadius: "md", bg: "bg.default", color: "fg.default", fontSize: "sm" })}
                  />
                  <datalist id="connections-following">
                    {following.map((id) => <option key={id} value={id} />)}
                  </datalist>
                  <Button type="submit" size="sm" disabled={!otherInput.trim()}>Compare</Button>
                </HStack>
              </form>
              {comparing && (
                <Button size="sm" variant="ghost" onClick={() => chooseOther(null)}><X /> Stop comparing</Button>
              )}
            </HStack>
          </VStack>
        </VStack>

        {me.isFetching && (
          <LoadingStatus
            label={`Loading ${nameA}'s events`}
            detail={me.progress?.stage === "details" ? `${me.progress.loaded} of ${me.progress.total} events checked` : "Finding events in this date range"}
            loaded={me.progress?.stage === "details" ? me.progress.loaded : undefined}
            total={me.progress?.stage === "details" ? me.progress.total : undefined}
          />
        )}
        {them.isFetching && (
          <LoadingStatus
            label={`Loading ${otherId}'s events`}
            detail={them.progress?.stage === "details" ? `${them.progress.loaded} of ${them.progress.total} events checked` : "Finding events in this date range"}
            loaded={them.progress?.stage === "details" ? them.progress.loaded : undefined}
            total={them.progress?.stage === "details" ? them.progress.total : undefined}
          />
        )}
        {failure && (
          <HStack gap="3" flexWrap="wrap" role="alert">
            <Text color="fg.error">
              {failure.message.includes("HTTP 404") ? "That Eventernote user doesn't exist." : `Couldn't load events: ${failure.message}.`}
            </Text>
            <Button size="sm" variant="outline" onClick={() => { if (me.error) me.retry(); if (them.error) them.retry(); }}>Try again</Button>
          </HStack>
        )}

        {!loading && !failure && !waitingForThem && (
          <VStack gap="4" alignItems="stretch">
            <Grid gridTemplateColumns={{ base: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" }} gap={{ base: "3", md: "5" }} alignItems="end">
              <Slider label="Min times seen" value={options.minEvents} min={1} max={10} onChange={(value) => setOption("minEvents", value)} hint="Hide artists you saw fewer times than this" />
              <Slider label="Min together" value={options.minTogether} min={1} max={6} onChange={(value) => setOption("minTogether", value)} hint="Only link artists who shared a stage at least this many times" />
              <Slider label="Max artists" value={options.maxNodes} min={10} max={150} step={5} onChange={(value) => setOption("maxNodes", value)} hint="Show only the most-seen artists" />
              <Slider label="Ignore line-ups over" value={options.maxArtistsPerEvent} min={3} max={40} onChange={(value) => setOption("maxArtistsPerEvent", value)} hint="Festival-size line-ups would link everyone to everyone, so they are left out of the links" />
            </Grid>
            <HStack gap="3" flexWrap="wrap" alignItems="center">
              {comparing && <PillGroup<Membership> label="Whose artists" value={options.membership} options={MEMBERSHIPS} onChange={(value) => setOption("membership", value)} />}
              {comparing && <PillGroup<ColorBy> label="Colour by" value={colorBy} options={[["person", "Who saw them"], ["group", "Group"]]} onChange={setColorBy} />}
              <label className={css({ display: "inline-flex", alignItems: "center", gap: "2", fontSize: "sm", minH: { base: "11", md: "auto" }, cursor: "pointer" })}>
                <input type="checkbox" checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} /> Names
              </label>
              <label className={css({ display: "inline-flex", alignItems: "center", gap: "2", fontSize: "sm", minH: { base: "11", md: "auto" }, cursor: "pointer" })}>
                <input type="checkbox" checked={!options.hideLoners} onChange={(event) => setOption("hideLoners", !event.target.checked)} /> Show artists with no links
              </label>
              <HStack gap="2" ml={{ md: "auto" }}>
                <input
                  list="connections-artists"
                  aria-label="Find an artist"
                  placeholder="Find an artist"
                  value={search}
                  spellCheck={false}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    const match = graph.nodes.find((node) => node.id.toLowerCase() === event.target.value.trim().toLowerCase());
                    if (match) pick(match.id);
                  }}
                  className={css({ w: { base: "44", md: "56" }, h: { base: "11", md: "8" }, px: "3", borderWidth: "1px", borderColor: "border.control", borderRadius: "md", bg: "bg.default", color: "fg.default", fontSize: "sm" })}
                />
                <datalist id="connections-artists">
                  {graph.nodes.map((node) => <option key={node.id} value={node.id} />)}
                </datalist>
                {search && !searchMatch && <Text size="xs" color="fg.muted">Not in graph</Text>}
              </HStack>
            </HStack>
          </VStack>
        )}

        {!loading && !failure && !waitingForThem && !graph.nodes.length && (
          <VStack gap="2" alignItems="flex-start" py="10" px="4" borderWidth="1px" borderStyle="dashed" borderColor="border.default" borderRadius="lg">
            <Text fontWeight="semibold">No connections to draw</Text>
            <Text size="sm" color="fg.muted">
              {me.events.length
                ? "Nothing matches these filters. Lower Min times seen or Min together, raise Ignore line-ups over, or widen the date range."
                : "No attended events in this date range."}
            </Text>
          </VStack>
        )}

        {hasGraph && (
          <Grid gridTemplateColumns={{ base: "1fr", lg: "minmax(0, 1fr) 340px" }} gap="5" alignItems="start">
            <VStack gap="3" alignItems="stretch" minW="0">
              <ForceGraph
                graph={graph}
                comparing={comparing}
                colorBy={colorBy}
                showLabels={showLabels}
                selected={selected}
                highlightCluster={highlightCluster}
                onSelect={(id) => pick(id as string, false)}
                centerOn={centerOn}
              />
              <Legend comparing={comparing} colorBy={colorBy} nameA={nameA} nameB={nameB} />
              <Text size="xs" color="fg.muted">
                {graph.nodes.length} artists · {graph.links.length} links from {graph.pairEvents} events
                {graph.skippedEvents > 0 && ` · ${graph.skippedEvents} big line-ups left out of the links`}. Drag to move, scroll or use the buttons to zoom, click an artist for details.
              </Text>
            </VStack>

            <VStack gap="6" alignItems="stretch" minW="0" p="4" borderWidth="1px" borderColor="border.default" borderRadius="lg">
              {selected ? (
                <ArtistPanel
                  graph={graph}
                  artist={selected}
                  events={merged}
                  comparing={comparing}
                  nameA={nameA}
                  nameB={nameB}
                  onSelect={(id) => pick(id)}
                  onClose={() => setSelected(null)}
                />
              ) : (
                <>
                  <VStack gap="1" alignItems="stretch">
                    <Text as="h3" fontWeight="semibold">Closest pairs</Text>
                    <Text size="xs" color="fg.muted">Most shared stages. Percent = how often they appear together when either appears.</Text>
                    {closestPairs.map((link) => (
                      <styled.button key={`${link.a}|${link.b}`} type="button" display="flex" alignItems="center" w="full" onClick={() => pick(link.a)} justifyContent="space-between" gap="3" py="1.5" cursor="pointer" textAlign="left" borderBottomWidth="1px" borderColor="border.subtle" _hover={{ bg: "bg.subtle" }}>
                        <Text size="sm" truncate>{link.a} + {link.b}</Text>
                        <Text size="xs" color="fg.muted" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">{link.weight}× · {Math.round(link.strength * 100)}%</Text>
                      </styled.button>
                    ))}
                  </VStack>

                  {graph.clusters.length > 0 && (
                    <VStack gap="2" alignItems="stretch">
                      <Text as="h3" fontWeight="semibold">Groups</Text>
                      <Text size="xs" color="fg.muted">Artists who keep turning up together. Hover a group to light it up.</Text>
                      {graph.clusters.slice(0, maxClusterRows).map((cluster) => (
                        <Box
                          key={cluster.id}
                          onPointerEnter={() => setHighlightCluster(cluster.id)}
                          onPointerLeave={() => setHighlightCluster(null)}
                          onFocus={() => setHighlightCluster(cluster.id)}
                          onBlur={() => setHighlightCluster(null)}
                          p="2"
                          borderRadius="md"
                          _hover={{ bg: "bg.subtle" }}
                        >
                          <HStack gap="2" mb="1">
                            <Box w="3" h="3" borderRadius="full" flexShrink="0" style={{ background: clusterColor(cluster.id) }} />
                            <Text size="xs" color="fg.muted">{cluster.members.length} artists</Text>
                          </HStack>
                          <HStack gap="1" flexWrap="wrap">
                            {cluster.members.slice(0, 6).map((member) => (
                              <styled.button key={member} type="button" onClick={() => pick(member)} fontSize="xs" px="2" py="0.5" minH={{ base: "8", md: "auto" }} borderWidth="1px" borderColor="border.subtle" borderRadius="full" cursor="pointer" _hover={{ bg: "bg.muted" }}>
                                {member}
                              </styled.button>
                            ))}
                            {cluster.members.length > 6 && <Text size="xs" color="fg.muted" alignSelf="center">+{cluster.members.length - 6}</Text>}
                          </HStack>
                        </Box>
                      ))}
                      {graph.clusters.length > maxClusterRows && <Text size="xs" color="fg.muted">and {graph.clusters.length - maxClusterRows} smaller groups</Text>}
                    </VStack>
                  )}
                </>
              )}
            </VStack>
          </Grid>
        )}

        {overlap && !loading && (
          <Box pt="4" borderTopWidth="1px" borderColor="border.subtle">
            <OverlapPanel overlap={overlap} nameA={nameA} nameB={nameB} />
          </Box>
        )}
      </VStack>
    </Box>
  );
}
