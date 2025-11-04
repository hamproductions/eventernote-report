import { Grid, VStack, HStack, Box } from "styled-system/jsx";
import * as Card from "~/components/ui/styled/card";
import * as Accordion from "~/components/ui/styled/accordion";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import type { EnhancedEvent } from "~/shared/types/event";

interface TopArtistsVenuesProps {
  artistMap: Map<string, number>;
  venueMap: Map<string, EnhancedEvent[]>;
  artistsViewLimit: number;
  venuesViewLimit: number;
  uniqueArtists: number;
  uniqueVenues: number;
  events: EnhancedEvent[];
  onCycleArtistsView: (total: number) => void;
  onCycleVenuesView: (total: number) => void;
  getArtistsViewLabel: (total: number) => string;
  getVenuesViewLabel: (total: number) => string;
}

export function TopArtistsVenues({
  artistMap,
  venueMap,
  artistsViewLimit,
  venuesViewLimit,
  uniqueArtists,
  uniqueVenues,
  events,
  onCycleArtistsView,
  onCycleVenuesView,
  getArtistsViewLabel,
  getVenuesViewLabel
}: TopArtistsVenuesProps) {
  return (
    <Grid gap="6" columns={{ base: 1, lg: 2 }}>
      {/* Top Artists - Accordion */}
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
                .map(([artist, count], idx) => (
                  <Accordion.Item key={artist} value={artist}>
                    <Accordion.ItemTrigger>
                      <HStack justifyContent="space-between" flex="1" gap="4">
                        <Text size="sm" fontWeight="medium" color="fg.default">
                          {idx + 1}. {artist}
                        </Text>
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
                      <Accordion.ItemIndicator />
                    </Accordion.ItemTrigger>
                    <Accordion.ItemContent>
                      <VStack gap="2" alignItems="stretch" pt="3">
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
                ))}
            </Accordion.Root>
          </Card.Body>
        </Card.Root>
      )}

      {/* Top Venues - Accordion */}
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
