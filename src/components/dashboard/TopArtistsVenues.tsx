import { Grid, VStack, HStack, Box } from "styled-system/jsx";
import { css } from "styled-system/css";
import * as Card from "~/components/ui/styled/card";
import * as Accordion from "~/components/ui/styled/accordion";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import type { EnhancedEvent } from "~/shared/types/event";

interface ArtistAttendance {
  name: string;
  href: string;
  userCount: number;
  totalEvents: number;
  percentage: number;
}

interface TopArtistsVenuesProps {
  artistMap: Map<string, number>;
  venueMap: Map<string, EnhancedEvent[]>;
  artistsViewLimit: number;
  venuesViewLimit: number;
  uniqueArtists: number;
  uniqueVenues: number;
  events: EnhancedEvent[];
  artistAttendance?: ArtistAttendance[];
  filteredArtistCounts?: Map<string, number>;
  filteredArtistTotals?: Map<string, number>;
  onCycleArtistsView: (total: number) => void;
  onCycleVenuesView: (total: number) => void;
  getArtistsViewLabel: (total: number) => string;
  getVenuesViewLabel: (total: number) => string;
}

function AttendanceSummary({
  attended,
  total,
}: {
  attended: number;
  total: number;
}) {
  const missed = total - attended;
  const pct = Math.round((attended / total) * 1000) / 10;

  return (
    <Box
      p="3"
      borderRadius="md"
      bg="bg.subtle"
      mb="3"
    >
      <HStack justifyContent="space-between" mb="2">
        <Text size="xs" fontWeight="semibold" color="fg.default">
          Attendance
        </Text>
        <Text size="xs" fontWeight="bold" color="colorPalette.default">
          {pct}%
        </Text>
      </HStack>

      {/* Progress bar */}
      <Box
        h="6px"
        borderRadius="full"
        bg="border.default"
        overflow="hidden"
        mb="2.5"
      >
        <Box
          h="full"
          borderRadius="full"
          bg="colorPalette.default"
          style={{ width: `${pct}%` }}
          className={css({ transition: 'width 0.3s ease' })}
        />
      </Box>

      <HStack gap="4">
        <HStack gap="1.5" alignItems="center">
          <Box w="8px" h="8px" borderRadius="full" bg="colorPalette.default" />
          <Text size="xs" color="fg.muted">
            Attended <Text as="span" fontWeight="bold" color="fg.default">{attended}</Text>
          </Text>
        </HStack>
        <HStack gap="1.5" alignItems="center">
          <Box w="8px" h="8px" borderRadius="full" bg="border.default" />
          <Text size="xs" color="fg.muted">
            Missed <Text as="span" fontWeight="bold" color="fg.default">{missed}</Text>
          </Text>
        </HStack>
        <Text size="xs" color="fg.subtle">
          / {total} total
        </Text>
      </HStack>
    </Box>
  );
}

export function TopArtistsVenues({
  artistMap,
  venueMap,
  artistsViewLimit,
  venuesViewLimit,
  uniqueArtists,
  uniqueVenues,
  events,
  artistAttendance,
  filteredArtistCounts,
  filteredArtistTotals,
  onCycleArtistsView,
  onCycleVenuesView,
  getArtistsViewLabel,
  getVenuesViewLabel
}: TopArtistsVenuesProps) {
  const attendanceMap = new Map(
    (artistAttendance || []).map(a => [a.name, a])
  );
  return (
    <Grid gap="6" columns={{ base: 1, lg: 2 }}>
      {Array.from(artistMap.entries()).length > 0 && (
        <Card.Root>
          <Card.Header>
            <HStack justifyContent="space-between">
              <Box>
                <Card.Title>Top Artists</Card.Title>
                <Card.Description>Most frequently attended</Card.Description>
              </Box>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCycleArtistsView(uniqueArtists)}
              >
                {getArtistsViewLabel(uniqueArtists)}
              </Button>
            </HStack>
          </Card.Header>
          <Card.Body>
            <Accordion.Root multiple>
              {Array.from(artistMap.entries())
                .sort(([, a], [, b]) => b - a)
                .slice(0, artistsViewLimit)
                .map(([artist, count], idx) => {
                  const attendance = attendanceMap.get(artist);
                  const filteredCount = filteredArtistCounts?.get(artist);
                  const filteredTotal = filteredArtistTotals?.get(artist);
                  const hasAttendance = attendance && filteredCount !== undefined && filteredTotal !== undefined && filteredTotal > 0;
                  const pct = hasAttendance ? Math.round((filteredCount / filteredTotal) * 1000) / 10 : null;

                  return (
                  <Accordion.Item key={artist} value={artist}>
                    <Accordion.ItemTrigger>
                      <VStack gap="1" flex="1" alignItems="stretch">
                        <HStack justifyContent="space-between" gap="4">
                          <Text size="sm" fontWeight="medium" color="fg.default">
                            {idx + 1}. {artist}
                          </Text>
                          <HStack gap="2" alignItems="baseline">
                            {hasAttendance && (
                              <Text size="xs" color="fg.muted">
                                {pct}%
                              </Text>
                            )}
                            <Text
                              size="lg"
                              fontWeight="bold"
                              color="colorPalette.default"
                              minW="10"
                              textAlign="right"
                            >
                              {count}
                            </Text>
                          </HStack>
                        </HStack>
                        {hasAttendance && (
                          <Box
                            h="3px"
                            borderRadius="full"
                            bg="border.default"
                            overflow="hidden"
                            mr="10"
                          >
                            <Box
                              h="full"
                              borderRadius="full"
                              bg="colorPalette.default"
                              style={{ width: `${pct}%` }}
                            />
                          </Box>
                        )}
                      </VStack>
                      <Accordion.ItemIndicator />
                    </Accordion.ItemTrigger>
                    <Accordion.ItemContent>
                      <VStack gap="2" alignItems="stretch" pt="3">
                        {hasAttendance && (
                          <AttendanceSummary
                            attended={filteredCount}
                            total={filteredTotal}
                          />
                        )}
                        {events
                          .filter((e) => e.artists?.includes(artist))
                          .map((event) => (
                            <Box
                              key={event.href}
                              as="a"
                              href={`https://eventernote.com${event.href}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              display="block"
                              pl="4"
                              py="1"
                              borderRadius="sm"
                              _hover={{ bg: "bg.subtle" }}
                            >
                              <Text size="sm" color="fg.muted">
                                • {event.date.split(" ")[0]} - {event.name}
                              </Text>
                            </Box>
                          ))}
                      </VStack>
                    </Accordion.ItemContent>
                  </Accordion.Item>
                  );
                })}
            </Accordion.Root>
          </Card.Body>
        </Card.Root>
      )}

      <Card.Root>
        <Card.Header>
          <HStack justifyContent="space-between">
            <Box>
              <Card.Title>Top Venues</Card.Title>
              <Card.Description>Most visited venues</Card.Description>
            </Box>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCycleVenuesView(uniqueVenues)}
            >
              {getVenuesViewLabel(uniqueVenues)}
            </Button>
          </HStack>
        </Card.Header>
        <Card.Body>
          <Accordion.Root multiple>
            {Array.from(venueMap.entries())
              .sort(([, a], [, b]) => b.length - a.length)
              .slice(0, venuesViewLimit)
              .map(([venue, venueEvents], idx) => (
                <Accordion.Item key={venue} value={venue}>
                  <Accordion.ItemTrigger>
                    <HStack justifyContent="space-between" flex="1" gap="4">
                      <Text size="sm" fontWeight="medium" color="fg.default">
                        {idx + 1}. {venue}
                      </Text>
                      <Text
                        size="lg"
                        fontWeight="bold"
                        color="fg.default"
                        minW="10"
                        textAlign="right"
                      >
                        {venueEvents.length}
                      </Text>
                    </HStack>
                    <Accordion.ItemIndicator />
                  </Accordion.ItemTrigger>
                  <Accordion.ItemContent>
                    <VStack gap="2" alignItems="stretch" pt="3">
                      {venueEvents.map((event) => (
                        <Box
                          key={event.href}
                          as="a"
                          href={`https://eventernote.com${event.href}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          display="block"
                          pl="4"
                          py="1"
                          borderRadius="sm"
                          _hover={{ bg: "bg.subtle" }}
                        >
                          <Text size="sm" color="fg.muted">
                            • {event.date.split(" ")[0]} - {event.name}
                          </Text>
                        </Box>
                      ))}
                    </VStack>
                  </Accordion.ItemContent>
                </Accordion.Item>
              ))}
          </Accordion.Root>
        </Card.Body>
      </Card.Root>
    </Grid>
  );
}
