import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { VStack, HStack } from "styled-system/jsx";
import { css } from "styled-system/css";
import * as Card from "~/components/ui/styled/card";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { formatDate } from "~/shared/utils/dateUtils";
import { LoadingStatus } from "./LoadingStatus";

interface Artist {
  name: string;
  href: string;
}

async function readResult<T>(url: string): Promise<T> {
  const response = await fetch(url);
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || "Artist lookup failed");
  return result.data;
}

export function ManualArtistAttendance({ userId, dateRange }: {
  userId: string;
  dateRange: { startDate: Date | null; endDate: Date | null };
}) {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [artist, setArtist] = useState<Artist | null>(null);
  const start = dateRange.startDate ? formatDate(dateRange.startDate) : null;
  const today = formatDate(new Date());
  const end = dateRange.endDate ? [formatDate(dateRange.endDate), today].sort()[0] : today;
  const params = new URLSearchParams({ endDate: end });
  if (start) params.set("startDate", start);
  const registrations = useQuery({
    queryKey: ["artist-registrations", userId, start, end],
    queryFn: () => readResult<{ href: string; date: string }[]>(`/api/artists/registrations/${encodeURIComponent(userId)}?${params}`),
    staleTime: 5 * 60 * 1000,
    retry: false
  });
  const results = useQuery({
    queryKey: ["artist-search", search],
    queryFn: () => readResult<Artist[]>(`/api/artists/search?q=${encodeURIComponent(search)}`),
    enabled: !!search,
    retry: false
  });
  const catalog = useQuery({
    queryKey: ["artist-catalog", artist?.href, start, end],
    queryFn: () => readResult<{ events: { href: string; date: string }[] }>(`/api/artists/catalog?href=${encodeURIComponent(artist!.href)}&${params}`),
    enabled: !!artist,
    staleTime: 5 * 60 * 1000,
    retry: false
  });
  const eligible = catalog.data?.events.filter(event => (!start || event.date >= start) && event.date <= end) || [];
  const attendedIds = new Set(registrations.data?.map(event => event.href));
  const attended = eligible.filter(event => attendedIds.has(event.href)).length;
  const rate = eligible.length ? Math.round(attended / eligible.length * 1000) / 10 : null;

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Check Artist Attendance</Card.Title>
        <Card.Description>Check any artist for the selected date range</Card.Description>
      </Card.Header>
      <Card.Body>
        <VStack gap="4" alignItems="stretch">
          <form onSubmit={event => { event.preventDefault(); setSearch(input.trim()); setArtist(null); }}>
            <HStack gap="3" flexWrap="wrap">
              <input
                aria-label="Artist name or Eventernote URL"
                placeholder="Artist name or Eventernote artist URL"
                value={input}
                onChange={event => setInput(event.target.value)}
                className={css({ flex: "1", minW: "180px", p: "3", borderWidth: "1px", borderColor: "border.default", borderRadius: "md", bg: "bg.default", color: "fg.default" })}
              />
              <Button type="submit" loading={results.isFetching} disabled={!input.trim()}>Search Artist</Button>
            </HStack>
          </form>
          {results.isFetching && <LoadingStatus compact label="Searching artists" />}
          {results.error && <Text color="fg.error" role="alert">{results.error.message}</Text>}
          {!artist && results.data && (
            <VStack gap="2" alignItems="stretch">
              {!results.data.length && <Text color="fg.muted">No artists found</Text>}
              {results.data.map(result => (
                <Button key={result.href} variant="outline" onClick={() => setArtist(result)}>{result.name}</Button>
              ))}
            </VStack>
          )}
          {artist && (
            <VStack gap="3" alignItems="stretch">
              <HStack justifyContent="space-between">
                <Text fontWeight="semibold">{artist.name}</Text>
                <Button size="sm" variant="ghost" onClick={() => setArtist(null)}>Remove</Button>
              </HStack>
              {(catalog.isFetching || registrations.isFetching) && <LoadingStatus compact
                label={catalog.isFetching ? "Checking artist events" : "Checking your attendance"} />}
              {registrations.error && <Text color="fg.error" role="alert">{registrations.error.message}</Text>}
              {catalog.error && <Text color="fg.error" role="alert">{catalog.error.message}</Text>}
              {catalog.data && registrations.data && !catalog.isFetching && !registrations.isFetching && !catalog.error && !registrations.error && (
                <HStack gap="6" flexWrap="wrap">
                  <Text>{attended} went</Text>
                  <Text>{eligible.length - attended} missed</Text>
                  <Text>{eligible.length} total</Text>
                  <Text fontWeight="bold" color="colorPalette.default">{rate === null ? "No events in this period" : `${rate}% attendance`}</Text>
                </HStack>
              )}
            </VStack>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
