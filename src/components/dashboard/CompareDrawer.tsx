import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Box, Grid, HStack, VStack, styled } from "styled-system/jsx";
import { css } from "styled-system/css";
import { Button } from "~/components/ui/button";
import { Drawer } from "~/components/ui/drawer";
import { IconButton } from "~/components/ui/icon-button";
import { Text } from "~/components/ui/text";
import type { RecentUser } from "~/contexts/ReportContext";
import type { EnhancedEvent } from "~/shared/types/event";
import { formatDisplayDate } from "~/shared/utils/dateUtils";
import { fetchJson } from "~/shared/utils/fetchJson";
import { parseUserInput } from "~/shared/utils/parseUserInput";
import { LoadingStatus } from "./LoadingStatus";

interface CompareDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userLabel: string;
  events: EnhancedEvent[];
  range: { start: string | null; end: string | null };
  rangeLabel: string;
  recentUsers: RecentUser[];
  onOpenUser: (id: string) => void;
}

interface Summary {
  events: number;
  days: number;
  venues: number;
  artists: number;
  weekendShare: number;
  topArtist: [string, number] | null;
  homeVenue: [string, number] | null;
}

function countBy(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return counts;
}

function top(counts: Map<string, number>): [string, number] | null {
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] ?? null;
}

function summarize(events: EnhancedEvent[]): Summary {
  const venueCounts = countBy(events.map((event) => event.place).filter((place) => !place.startsWith("!_")));
  const artistCounts = countBy(events.flatMap((event) => [...new Set(event.artists || [])]));
  const weekend = events.filter((event) => [0, 6].includes(new Date(`${event.date.slice(0, 10)}T00:00:00`).getDay())).length;
  return {
    events: events.length,
    days: new Set(events.map((event) => event.date.slice(0, 10))).size,
    venues: venueCounts.size,
    artists: artistCounts.size,
    weekendShare: events.length ? Math.round((weekend / events.length) * 100) : 0,
    topArtist: top(artistCounts),
    homeVenue: top(venueCounts)
  };
}

export function CompareDrawer({ open, onOpenChange, userId, userLabel, events, range, rangeLabel, recentUsers, onOpenUser }: CompareDrawerProps) {
  const [otherId, setOtherId] = useState<string | null>(null);
  const [input, setInput] = useState("");

  const connections = useQuery<{ data: { following: { userId: string }[]; followers: { userId: string }[] } }>({
    queryKey: ["connections-raw", userId],
    queryFn: () => fetchJson(`/api/user-profile/${encodeURIComponent(userId)}/connections`, "Could not load people"),
    enabled: open,
    staleTime: 1000 * 60 * 60
  });
  const following = connections.data?.data.following.map((user) => user.userId) ?? [];

  const params = new URLSearchParams();
  if (range.start) params.set("startDate", range.start);
  if (range.end) params.set("endDate", range.end);

  const other = useQuery<{ data: { events: EnhancedEvent[] } }>({
    queryKey: ["events", otherId, range],
    queryFn: () => fetchJson(`/api/events/user/${encodeURIComponent(otherId!)}?${params}`, "Could not load events"),
    enabled: open && !!otherId,
    staleTime: 1000 * 60 * 30
  });

  const progress = useQuery<{ stage: string; loaded: number; total: number }>({
    queryKey: ["attendance-progress", otherId, range],
    queryFn: () => fetchJson(`/api/events/user/${encodeURIComponent(otherId!)}/progress?${params}`, "Could not load progress"),
    enabled: open && !!otherId && other.isFetching,
    refetchInterval: other.isFetching ? 1500 : false
  });

  const otherProfile = useQuery<{ data: { displayName: string; username: string } }>({
    queryKey: ["compare-name", otherId],
    queryFn: () => fetchJson(`/api/user-profile/${encodeURIComponent(otherId!)}`, "Could not load profile"),
    enabled: open && !!otherId && other.isSuccess,
    staleTime: 1000 * 60 * 60
  });
  const otherLabel = otherProfile.data?.data.displayName || otherProfile.data?.data.username || otherId || "";

  const otherEvents = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return (other.data?.data.events ?? []).filter((event) => {
      const date = event.date.slice(0, 10);
      return date <= today && (!range.start || date >= range.start) && (!range.end || date <= range.end);
    });
  }, [other.data, range]);

  const result = useMemo(() => {
    if (!other.data) return null;
    const mine = new Map(events.map((event) => [event.href, event]));
    const shared = otherEvents.filter((event) => mine.has(event.href)).sort((a, b) => b.date.localeCompare(a.date));
    const myArtists = countBy(events.flatMap((event) => [...new Set(event.artists || [])]));
    const theirArtists = countBy(otherEvents.flatMap((event) => [...new Set(event.artists || [])]));
    const sharedArtists = [...myArtists.entries()]
      .filter(([name]) => theirArtists.has(name))
      .map(([name, count]) => [name, count, theirArtists.get(name)!] as const)
      .sort((a, b) => Math.min(b[1], b[2]) - Math.min(a[1], a[2]) || b[1] + b[2] - (a[1] + a[2]))
      .slice(0, 10);
    const myVenues = countBy(events.map((event) => event.place).filter((place) => !place.startsWith("!_")));
    const theirVenues = countBy(otherEvents.map((event) => event.place).filter((place) => !place.startsWith("!_")));
    const sharedVenues = [...myVenues.entries()]
      .filter(([name]) => theirVenues.has(name))
      .map(([name, count]) => [name, count, theirVenues.get(name)!] as const)
      .sort((a, b) => Math.min(b[1], b[2]) - Math.min(a[1], a[2]))
      .slice(0, 5);
    return { me: summarize(events), them: summarize(otherEvents), shared, sharedArtists, sharedVenues, sharedArtistCount: [...myArtists.keys()].filter((name) => theirArtists.has(name)).length };
  }, [events, otherEvents, other.data]);

  const choose = (id: string) => {
    const parsed = parseUserInput(id);
    if (parsed && parsed !== userId) {
      setOtherId(parsed);
      setInput("");
    }
  };

  const candidates = recentUsers.filter((user) => user.id !== userId);

  return (
    <Drawer.Root open={open} onOpenChange={(details) => onOpenChange(details.open)} lazyMount unmountOnExit={false}>
      <Drawer.Backdrop />
      <Drawer.Positioner w={{ base: "full", md: "760px" }} maxW="100vw">
        <Drawer.Content colorPalette="blue">
          <Drawer.Header>
            <HStack justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Drawer.Title>Compare</Drawer.Title>
                <Drawer.Description>{userLabel} against someone else, for {rangeLabel}.</Drawer.Description>
              </Box>
              <Drawer.CloseTrigger asChild position="static">
                <IconButton aria-label="Close compare" variant="ghost" size="sm">
                  <X />
                </IconButton>
              </Drawer.CloseTrigger>
            </HStack>
          </Drawer.Header>
          <Drawer.Body>
            <VStack gap="6" alignItems="stretch">
              <VStack gap="3" alignItems="stretch">
                {candidates.length > 0 && (
                  <HStack gap="2" flexWrap="wrap">
                    {candidates.map((user) => (
                      <Button key={user.id} size="sm" variant={otherId === user.id ? "solid" : "outline"} onClick={() => choose(user.id)}>
                        {user.name}
                      </Button>
                    ))}
                  </HStack>
                )}
                <form onSubmit={(e) => { e.preventDefault(); choose(input); }}>
                  <HStack gap="2">
                    <input
                      list="compare-following"
                      aria-label="User to compare with"
                      placeholder={following.length ? "User ID, profile URL, or pick from who you follow" : "User ID or profile URL"}
                      value={input}
                      autoCapitalize="none"
                      spellCheck={false}
                      onChange={(e) => setInput(e.target.value)}
                      className={css({ flex: "1", minW: "0", h: { base: "11", md: "10" }, px: "3", borderWidth: "1px", borderColor: "border.control", borderRadius: "md", bg: "bg.default", color: "fg.default", fontSize: "sm" })}
                    />
                    <datalist id="compare-following">
                      {following.map((id) => <option key={id} value={id} />)}
                    </datalist>
                    <Button type="submit" disabled={!input.trim()}>Compare</Button>
                  </HStack>
                </form>
                {!otherId && <Text size="sm" color="fg.muted">Pick a recent user or type an ID. Both users are measured over the same date range as the dashboard.</Text>}
              </VStack>

              {other.isFetching && (
                <LoadingStatus
                  label={`Loading ${otherId}'s events`}
                  detail={progress.data?.stage === "details" ? `${progress.data.loaded} of ${progress.data.total} events checked` : "Finding events in this date range"}
                  loaded={progress.data?.stage === "details" ? progress.data.loaded : undefined}
                  total={progress.data?.stage === "details" ? progress.data.total : undefined}
                />
              )}
              {other.isError && !other.isFetching && (
                <HStack gap="3" flexWrap="wrap" role="alert">
                  <Text color="fg.error">
                    {other.error.message.includes("HTTP 404") ? `No Eventernote user called "${otherId}".` : `Couldn't load ${otherId}: ${other.error.message}.`}
                  </Text>
                  <Button size="sm" variant="outline" onClick={() => other.refetch()}>Try again</Button>
                </HStack>
              )}

              {result && !other.isFetching && (
                <>
                  <Box as="table" w="full" fontSize="sm" className={css({ borderCollapse: "collapse", "& th, & td": { py: "2", px: "2", borderBottomWidth: "1px", borderColor: "border.subtle", textAlign: "left", verticalAlign: "top" }, "& td:not(:first-child), & th:not(:first-child)": { w: "38%" } })}>
                    <thead>
                      <tr>
                        <th><Text as="span" size="xs" color="fg.muted">In this range</Text></th>
                        <th><Text as="span" fontWeight="semibold">{userLabel}</Text></th>
                        <th>
                          <HStack gap="2" justifyContent="space-between">
                            <Text as="span" fontWeight="semibold" truncate>{otherLabel}</Text>
                            <Button size="xs" variant="ghost" onClick={() => onOpenUser(otherId!)}>Open report</Button>
                          </HStack>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {([
                        ["Events", result.me.events, result.them.events],
                        ["Days out", result.me.days, result.them.days],
                        ["Venues", result.me.venues, result.them.venues],
                        ["Artists", result.me.artists, result.them.artists],
                        ["On weekends", `${result.me.weekendShare}%`, `${result.them.weekendShare}%`],
                        ["Most seen artist", result.me.topArtist ? `${result.me.topArtist[0]} (${result.me.topArtist[1]})` : "None", result.them.topArtist ? `${result.them.topArtist[0]} (${result.them.topArtist[1]})` : "None"],
                        ["Home venue", result.me.homeVenue ? `${result.me.homeVenue[0]} (${result.me.homeVenue[1]})` : "None", result.them.homeVenue ? `${result.them.homeVenue[0]} (${result.them.homeVenue[1]})` : "None"]
                      ] as const).map(([label, mine, theirs]) => {
                        const numeric = typeof mine === "number" && typeof theirs === "number";
                        return (
                          <tr key={label}>
                            <td><Text as="span" color="fg.muted">{label}</Text></td>
                            <td><Text as="span" fontWeight={numeric && mine > theirs ? "bold" : "normal"} fontVariantNumeric="tabular-nums">{mine}</Text></td>
                            <td><Text as="span" fontWeight={numeric && theirs > mine ? "bold" : "normal"} fontVariantNumeric="tabular-nums">{theirs}</Text></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Box>

                  <VStack gap="3" alignItems="stretch">
                    <Text as="h3" fontWeight="semibold">
                      Events you both went to <Text as="span" color="fg.muted" fontWeight="normal">({result.shared.length})</Text>
                    </Text>
                    {!result.shared.length && <Text size="sm" color="fg.muted">No shared events in this range.</Text>}
                    <VStack as="ul" gap="0" alignItems="stretch">
                      {result.shared.map((event) => (
                        <Grid as="li" key={event.href} gridTemplateColumns="96px 1fr" gap="3" py="2" borderBottomWidth="1px" borderColor="border.subtle">
                          <Text size="sm" color="fg.muted" fontVariantNumeric="tabular-nums">{formatDisplayDate(event.date)}</Text>
                          <Box minW="0">
                            <styled.a href={`https://www.eventernote.com${event.href}`} target="_blank" rel="noopener noreferrer" fontSize="sm" fontWeight="medium" _hover={{ textDecoration: "underline" }}>
                              {event.name}
                            </styled.a>
                            <Text size="xs" color="fg.muted">@ {event.place}</Text>
                          </Box>
                        </Grid>
                      ))}
                    </VStack>
                  </VStack>

                  <Grid gridTemplateColumns={{ base: "1fr", md: "1fr 1fr" }} gap="6">
                    <VStack gap="2" alignItems="stretch">
                      <Text as="h3" fontWeight="semibold">
                        Artists you both saw <Text as="span" color="fg.muted" fontWeight="normal">({result.sharedArtistCount})</Text>
                      </Text>
                      <Text size="xs" color="fg.muted">Ranked by the smaller of the two counts.</Text>
                      {result.sharedArtists.map(([name, mine, theirs]) => (
                        <HStack key={name} justifyContent="space-between" gap="3" fontSize="sm">
                          <Text truncate>{name}</Text>
                          <Text color="fg.muted" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">{mine} / {theirs}</Text>
                        </HStack>
                      ))}
                      {!result.sharedArtists.length && <Text size="sm" color="fg.muted">No artists in common.</Text>}
                    </VStack>
                    <VStack gap="2" alignItems="stretch">
                      <Text as="h3" fontWeight="semibold">Venues you both went to</Text>
                      <Text size="xs" color="fg.muted">Your visits / theirs.</Text>
                      {result.sharedVenues.map(([name, mine, theirs]) => (
                        <HStack key={name} justifyContent="space-between" gap="3" fontSize="sm">
                          <Text truncate>{name}</Text>
                          <Text color="fg.muted" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">{mine} / {theirs}</Text>
                        </HStack>
                      ))}
                      {!result.sharedVenues.length && <Text size="sm" color="fg.muted">No venues in common.</Text>}
                    </VStack>
                  </Grid>
                </>
              )}
            </VStack>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
}
