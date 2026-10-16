import { useMemo, useState } from "react";
import { Check, Copy, Download, Search, SlidersHorizontal, X } from "lucide-react";
import { Box, VStack, HStack, Grid, styled } from "styled-system/jsx";
import { css } from "styled-system/css";
import * as Card from "~/components/ui/styled/card";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import type { EnhancedEvent } from "~/shared/types/event";
import { formatDisplayMonth } from "~/shared/utils/dateUtils";

interface RecentEventsListProps {
  events: EnhancedEvent[];
  onExportPNG: () => void;
  eventsListRef: React.RefObject<HTMLDivElement | null>;
}

type Filter = { kind: "venue" | "artist" | "month"; value: string };
type SortOrder = "newest" | "oldest" | "popular" | "quiet";

const PAGE_SIZE = 30;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const controlStyles = {
  h: { base: "11", md: "10" },
  px: "3",
  borderWidth: "1px",
  borderColor: "border.control",
  borderRadius: "md",
  bg: "bg.default",
  color: "fg.default",
  fontSize: "sm"
} as const;
const controlClass = css(controlStyles, { w: "full", minW: "0" });
const searchClass = css(controlStyles, { w: "full", pl: "9" });

function matches(event: EnhancedEvent, filter: Filter) {
  if (filter.kind === "venue") return event.place === filter.value;
  if (filter.kind === "artist") return event.artists?.includes(filter.value);
  return event.date.slice(0, 7) === filter.value;
}

function shortMonth(month: string) {
  return `${new Date(`${month}-01T00:00:00`).toLocaleDateString("en-US", { month: "short" })} ${month.slice(0, 4)}`;
}

function filterLabel(filter: Filter) {
  if (filter.kind === "month") return formatDisplayMonth(filter.value);
  return filter.value;
}

export function RecentEventsList({ events, onExportPNG, eventsListRef }: RecentEventsListProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filter[]>([]);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [topCut, setTopCut] = useState(0);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [copied, setCopied] = useState<"done" | "failed" | null>(null);

  const byPopularity = sortOrder === "popular" || sortOrder === "quiet";
  const sorted = useMemo(
    () =>
      [...events].sort((a, b) => {
        if (sortOrder === "popular") return (b.attendees ?? -1) - (a.attendees ?? -1) || b.date.localeCompare(a.date);
        if (sortOrder === "quiet") return (a.attendees ?? Infinity) - (b.attendees ?? Infinity) || b.date.localeCompare(a.date);
        return sortOrder === "newest" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
      }),
    [events, sortOrder]
  );


  const venues = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) counts.set(event.place, (counts.get(event.place) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [events]);

  const needle = query.trim().toLowerCase();
  const beforeMonth = useMemo(
    () =>
      sorted.filter(
        (event) =>
          filters.every((filter) => filter.kind === "month" || matches(event, filter)) &&
          (!needle ||
            event.name.toLowerCase().includes(needle) ||
            event.place.toLowerCase().includes(needle) ||
            event.artists?.some((artist) => artist.toLowerCase().includes(needle)))
      ),
    [sorted, filters, needle]
  );

  const months = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of beforeMonth) counts.set(event.date.slice(0, 7), (counts.get(event.date.slice(0, 7)) || 0) + 1);
    return [...counts.entries()];
  }, [beforeMonth]);

  const activeMonth = filters.find((filter) => filter.kind === "month")?.value;
  const filtered = useMemo(() => {
    const inMonth = activeMonth ? beforeMonth.filter((event) => event.date.slice(0, 7) === activeMonth) : beforeMonth;
    if (!topCut) return inMonth;
    return [...inMonth].sort((a, b) => (b.attendees ?? -1) - (a.attendees ?? -1)).slice(0, topCut).sort((a, b) => sorted.indexOf(a) - sorted.indexOf(b));
  }, [beforeMonth, activeMonth, topCut, sorted]);
  const hasAttendees = events.some((event) => event.attendees !== undefined);

  const filteredMonthCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of filtered) counts.set(event.date.slice(0, 7), (counts.get(event.date.slice(0, 7)) || 0) + 1);
    return counts;
  }, [filtered]);

  const shown = filtered.slice(0, limit);
  const groups = useMemo(() => {
    const result: [string, EnhancedEvent[]][] = [];
    for (const event of shown) {
      const month = event.date.slice(0, 7);
      const last = result[result.length - 1];
      if (last && last[0] === month) last[1].push(event);
      else result.push([month, [event]]);
    }
    return result;
  }, [shown]);

  const addFilter = (filter: Filter) => {
    setFilters((current) => [...current.filter((item) => item.kind !== filter.kind), filter]);
    setLimit(PAGE_SIZE);
  };
  const removeFilter = (kind: Filter["kind"]) => setFilters((current) => current.filter((item) => item.kind !== kind));
  const activeFilterCount = (filters.some((filter) => filter.kind === "venue") ? 1 : 0) + (sortOrder !== "newest" ? 1 : 0) + (topCut ? 1 : 0);
  const activeVenue = filters.find((filter) => filter.kind === "venue")?.value ?? "";

  const copyList = async () => {
    try {
      await navigator.clipboard.writeText(
        filtered.map((event) => `${event.date.slice(0, 10)} ${event.name} @ ${event.place}`).join("\n")
      );
      setCopied("done");
    } catch {
      setCopied("failed");
    }
    setTimeout(() => setCopied(null), 2500);
  };

  return (
    <Card.Root>
      <Card.Body pt="6">
        <VStack gap="4" alignItems="stretch">
          <Grid gridTemplateColumns={{ base: "minmax(0, 1fr) auto", sm: "minmax(0, 1fr)", xl: hasAttendees ? "minmax(0, 1fr) 220px 170px 210px" : "minmax(0, 1fr) 220px 170px" }} gap="2">
            <Box position="relative" minW="0">
              <Box position="absolute" left="3" top="50%" transform="translateY(-50%)" color="fg.muted" pointerEvents="none" display="flex">
                <Search size={16} />
              </Box>
              <input
                type="search"
                aria-label="Search events, venues and artists"
                placeholder="Search events, venues, artists"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setLimit(PAGE_SIZE);
                }}
                className={searchClass}
              />
            </Box>
            <Button
              variant="outline"
              hideFrom="sm"
              aria-expanded={filtersOpen}
              aria-controls="event-filters"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <SlidersHorizontal /> {activeFilterCount ? `Filters (${activeFilterCount})` : "Filters"}
            </Button>
            <Grid
              id="event-filters"
              gridColumn={{ base: "1 / -1", xl: "auto / span 3" }}
              gridTemplateColumns={{ base: "minmax(0, 1fr)", sm: hasAttendees ? "repeat(3, minmax(0, 1fr))" : "repeat(2, minmax(0, 1fr))", xl: "subgrid" }}
              gap="2"
              display={{ base: filtersOpen ? "grid" : "none", sm: "grid" }}
            >
            <select
              aria-label="Filter by venue"
              value={activeVenue}
              onChange={(e) => (e.target.value ? addFilter({ kind: "venue", value: e.target.value }) : removeFilter("venue"))}
              className={controlClass}
            >
              <option value="">All venues</option>
              {venues.map(([venue, count]) => (
                <option key={venue} value={venue}>{venue} ({count})</option>
              ))}
            </select>
            <select
              aria-label="Sort order"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className={controlClass}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              {hasAttendees && <option value="popular">Most registered</option>}
              {hasAttendees && <option value="quiet">Fewest registered</option>}
            </select>
            {hasAttendees && (
              <select
                aria-label="Limit to the most registered events"
                value={topCut}
                onChange={(e) => {
                  setTopCut(Number(e.target.value));
                  setLimit(PAGE_SIZE);
                }}
                className={controlClass}
              >
                <option value={0}>All events</option>
                {[10, 25, 50, 100].map((value) => (
                  <option key={value} value={value}>Top {value} by registrations</option>
                ))}
              </select>
            )}
            </Grid>
          </Grid>

          {(months.length > 1 || activeMonth) && (
            <Box overflowX="auto" mx="-1" px="1" pr="8" scrollbarWidth="none" maskImage="linear-gradient(to right, black calc(100% - 32px), transparent)">
              <HStack role="group" aria-label="Jump to a month" gap="1.5" w="max-content" pb="1">
                {months.map(([month, count]) => {
                  const active = activeMonth === month;
                  return (
                    <styled.button
                      key={month}
                      type="button"
                      aria-pressed={active}
                      onClick={() => (active ? removeFilter("month") : addFilter({ kind: "month", value: month }))}
                      display="flex"
                      flexDirection="column"
                      alignItems="flex-start"
                      minW="16"
                      minH="11"
                      px="3"
                      py="1.5"
                      borderWidth="1px"
                      borderColor={active ? "colorPalette.default" : "border.subtle"}
                      bg={active ? "colorPalette.default" : "bg.subtle"}
                      color={active ? "colorPalette.fg" : "fg.default"}
                      borderRadius="md"
                      cursor="pointer"
                      _hover={{ borderColor: active ? "colorPalette.default" : "fg.subtle" }}
                    >
                      <Text as="span" size="xs" fontWeight="semibold" whiteSpace="nowrap">{shortMonth(month)}</Text>
                      <Text as="span" size="xs" color={active ? "colorPalette.fg" : "fg.muted"}>{count}</Text>
                    </styled.button>
                  );
                })}
              </HStack>
            </Box>
          )}

          <HStack justifyContent="space-between" flexWrap="wrap" gap="2">
            <HStack gap="2" flexWrap="wrap">
              <Text size="sm" color="fg.muted" aria-live="polite">
                {filtered.length === events.length ? `${events.length} events` : `${filtered.length} of ${events.length} events`}
              </Text>
              {filters.map((filter) => (
                <styled.button
                  key={filter.kind}
                  type="button"
                  onClick={() => removeFilter(filter.kind)}
                  aria-label={`Remove ${filter.kind} filter ${filterLabel(filter)}`}
                  display="inline-flex"
                  alignItems="center"
                  gap="1"
                  minH={{ base: "11", md: "8" }}
                  px="2.5"
                  maxW="64"
                  borderRadius="md"
                  bg="bg.subtle"
                  borderWidth="1px"
                  borderColor="border.subtle"
                  fontSize="xs"
                  cursor="pointer"
                  _hover={{ borderColor: "fg.subtle" }}
                >
                  <Text as="span" color="fg.muted" textTransform="capitalize">{filter.kind}:</Text>
                  <Text as="span" truncate>{filterLabel(filter)}</Text>
                  <X size={12} />
                </styled.button>
              ))}
              {topCut > 0 && (
                <styled.button
                  type="button"
                  onClick={() => setTopCut(0)}
                  aria-label={`Remove top ${topCut} limit`}
                  display="inline-flex"
                  alignItems="center"
                  gap="1"
                  minH={{ base: "11", md: "8" }}
                  px="2.5"
                  borderRadius="md"
                  bg="bg.subtle"
                  borderWidth="1px"
                  borderColor="border.subtle"
                  fontSize="xs"
                  cursor="pointer"
                  _hover={{ borderColor: "fg.subtle" }}
                >
                  <Text as="span" color="fg.muted">Top:</Text>
                  <Text as="span">{topCut} by registrations</Text>
                  <X size={12} />
                </styled.button>
              )}
              {(filters.length > 0 || needle || topCut > 0) && (
                <Button size="xs" variant="ghost" onClick={() => { setFilters([]); setQuery(""); setTopCut(0); }}>Clear all</Button>
              )}
            </HStack>
            <HStack gap="2">
              <Button size="sm" variant="outline" onClick={copyList} disabled={!filtered.length}>
                {copied === "done" ? <Check /> : <Copy />} {copied === "done" ? `Copied ${filtered.length}` : copied === "failed" ? "Copy blocked by browser" : "Copy list"}
              </Button>
              <Button size="sm" variant="outline" onClick={onExportPNG} disabled={!filtered.length}>
                <Download /> Save image
              </Button>
            </HStack>
          </HStack>

          {!filtered.length && (
            <VStack gap="2" py="10" alignItems="center" textAlign="center">
              <Text fontWeight="medium">No events match</Text>
              <Text size="sm" color="fg.muted">Try another search, or remove a filter.</Text>
              <Button size="sm" variant="outline" onClick={() => { setFilters([]); setQuery(""); }}>Clear search and filters</Button>
            </VStack>
          )}

          <VStack gap="6" alignItems="stretch" ref={eventsListRef}>
            {byPopularity && (
              <VStack as="ol" gap="1" alignItems="stretch">
                {shown.map((event, index) => (
                  <HStack as="li" key={event.href} gap="2" alignItems="flex-start">
                    <Text size="sm" color="fg.muted" w="8" pt="3" textAlign="right" fontVariantNumeric="tabular-nums" flexShrink="0">{index + 1}</Text>
                    <Box flex="1" minW="0"><EventRow event={event} needle={needle} onFilter={addFilter} showYear /></Box>
                  </HStack>
                ))}
              </VStack>
            )}
            {!byPopularity && groups.map(([month, monthEvents]) => (
              <VStack key={month} as="section" gap="1" alignItems="stretch" aria-label={formatDisplayMonth(month)}>
                <HStack justifyContent="space-between" borderBottomWidth="1px" borderColor="border.subtle" pb="2" mb="1">
                  <Text as="h3" size="sm" fontWeight="semibold">{formatDisplayMonth(month)}</Text>
                  <Text size="xs" color="fg.muted">{filteredMonthCounts.get(month)} events</Text>
                </HStack>
                {monthEvents.map((event) => (
                  <EventRow key={event.href} event={event} needle={needle} onFilter={addFilter} />
                ))}
              </VStack>
            ))}
          </VStack>

          {filtered.length > shown.length && (
            <Button variant="outline" alignSelf="center" onClick={() => setLimit(limit + PAGE_SIZE)}>
              Show {Math.min(PAGE_SIZE, filtered.length - shown.length)} more ({filtered.length - shown.length} left)
            </Button>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}

function EventRow({ event, needle, onFilter, showYear = false }: { event: EnhancedEvent; needle: string; onFilter: (filter: Filter) => void; showYear?: boolean }) {
  const date = new Date(`${event.date.slice(0, 10)}T00:00:00`);

  return (
    <Grid as="article" gridTemplateColumns="44px 1fr" gap="3" py="2.5" px="2" mx="-2" borderRadius="md" _hover={{ bg: "bg.subtle" }}>
      <VStack gap="0" alignItems="center" pt="0.5">
        <Text size="lg" fontWeight="bold" lineHeight="1" fontVariantNumeric="tabular-nums">{date.getDate()}</Text>
        <Text size="xs" color="fg.muted">{showYear ? date.toLocaleDateString("en-US", { month: "short" }) : WEEKDAYS[date.getDay()]}</Text>
        {showYear && <Text size="xs" color="fg.muted">{date.getFullYear()}</Text>}
      </VStack>
      <VStack gap="1.5" alignItems="flex-start" minW="0">
        <styled.a
          href={`https://www.eventernote.com${event.href}`}
          target="_blank"
          rel="noopener noreferrer"
          display="block"
          minH={{ base: "11", md: "auto" }}
          py={{ base: "2.5", md: "0" }}
          my={{ base: "-2.5", md: "0" }}
          fontSize="sm"
          fontWeight="semibold"
          color="fg.default"
          _hover={{ color: "colorPalette.text", textDecoration: "underline" }}
        >
          {event.name}
        </styled.a>
        <styled.button
          type="button"
          onClick={() => onFilter({ kind: "venue", value: event.place })}
          title="Show only events at this venue"
          minH={{ base: "11", md: "auto" }}
          minW={{ base: "11", md: "auto" }}
          my={{ base: "-2", md: "0" }}
          textAlign="left"
          fontSize="xs"
          color="fg.muted"
          cursor="pointer"
          _hover={{ color: "fg.default", textDecoration: "underline" }}
        >
          @ {event.place}
        </styled.button>
        {event.attendees !== undefined && (
          <Text size="xs" color="fg.muted" fontVariantNumeric="tabular-nums">
            {event.attendees} {event.attendees === 1 ? "person" : "people"} registered on Eventernote
          </Text>
        )}
        {event.artists && event.artists.length > 0 && (
          <ArtistChips artists={event.artists} needle={needle} onFilter={onFilter} />
        )}
      </VStack>
    </Grid>
  );
}

const VISIBLE_ARTISTS = 8;

function ArtistChips({ artists, needle, onFilter }: { artists: string[]; needle: string; onFilter: (filter: Filter) => void }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? artists : artists.slice(0, VISIBLE_ARTISTS);
  const hidden = artists.length - shown.length;

  return (
    <HStack gap="1.5" flexWrap="wrap">
      {shown.map((artist) => {
        const hit = !!needle && artist.toLowerCase().includes(needle);
        return (
          <styled.button
            key={artist}
            type="button"
            onClick={() => onFilter({ kind: "artist", value: artist })}
            title="Show only events with this artist"
            display="inline-flex"
            alignItems="center"
            minH={{ base: "11", md: "auto" }}
            minW={{ base: "11", md: "auto" }}
            my={{ base: "-2", md: "0" }}
            fontSize="xs"
            cursor="pointer"
            className="group"
          >
            <Box
              as="span"
              px="2"
              py="0.5"
              bg={hit ? "colorPalette.default" : "bg.subtle"}
              color={hit ? "colorPalette.fg" : "fg.default"}
              borderWidth="1px"
              borderColor={hit ? "colorPalette.default" : "border.subtle"}
              borderRadius="sm"
              _groupHover={{ borderColor: "fg.subtle" }}
            >
              {artist}
            </Box>
          </styled.button>
        );
      })}
      {artists.length > VISIBLE_ARTISTS && (
        <styled.button
          type="button"
          px="2"
          py="0.5"
          minH={{ base: "11", md: "auto" }}
          my={{ base: "-2", md: "0" }}
          fontSize="xs"
          fontWeight="medium"
          color="colorPalette.text"
          borderRadius="sm"
          cursor="pointer"
          _hover={{ bg: "bg.subtle" }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : `+${hidden} more`}
        </styled.button>
      )}
    </HStack>
  );
}
