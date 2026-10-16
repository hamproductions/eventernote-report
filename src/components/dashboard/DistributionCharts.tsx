import { Box, Grid, HStack, VStack } from "styled-system/jsx";
import * as Card from "~/components/ui/styled/card";
import { Text } from "~/components/ui/text";
import type { EnhancedEvent } from "~/shared/types/event";

interface DistributionChartsProps {
  topVenues: [string, EnhancedEvent[]][];
  topArtists: [string, number][];
  totalEvents: number;
}

function ShareList({ rows, totalEvents }: { rows: [string, number][]; totalEvents: number }) {
  return (
    <VStack as="ol" gap="3" alignItems="stretch">
      {rows.map(([name, count]) => {
        const share = totalEvents ? (count / totalEvents) * 100 : 0;
        return (
          <Box as="li" key={name}>
            <HStack justifyContent="space-between" gap="3" mb="1">
              <Text size="sm" truncate>{name}</Text>
              <Text size="sm" color="fg.muted" fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
                {count} · {share.toFixed(share < 10 ? 1 : 0)}%
              </Text>
            </HStack>
            <Box h="2" bg="bg.muted" borderRadius="full" overflow="hidden">
              <Box h="full" bg="colorPalette.default" borderRadius="full" style={{ width: `${share}%` }} />
            </Box>
          </Box>
        );
      })}
    </VStack>
  );
}

export function DistributionCharts({
  topVenues,
  topArtists,
  totalEvents
}: DistributionChartsProps) {
  return (
    <Grid gap="6" columns={{ base: 1, lg: 2 }}>
      <Card.Root>
        <Card.Header>
          <Card.Title>Share of events by venue</Card.Title>
          <Card.Description>
            Your top 5 venues, as a share of all {totalEvents} events in this range
          </Card.Description>
        </Card.Header>
        <Card.Body>
          <ShareList rows={topVenues.slice(0, 5).map(([name, events]) => [name, events.length])} totalEvents={totalEvents} />
        </Card.Body>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title>Share of events by artist</Card.Title>
          <Card.Description>
            How many of your {totalEvents} events each top artist performed at. Events often have several artists, so these overlap.
          </Card.Description>
        </Card.Header>
        <Card.Body>
          <ShareList rows={topArtists.slice(0, 5)} totalEvents={totalEvents} />
        </Card.Body>
      </Card.Root>
    </Grid>
  );
}
