import { VStack, HStack, Box } from "styled-system/jsx";
import { css } from "styled-system/css";
import * as Card from "~/components/ui/styled/card";
import { Text } from "~/components/ui/text";

interface ArtistAttendanceData {
  name: string;
  attended: number;
  total: number;
  missed: number;
  pct: number;
}

interface FavoriteArtistsAttendanceProps {
  artists: ArtistAttendanceData[];
}

export function FavoriteArtistsAttendance({ artists }: FavoriteArtistsAttendanceProps) {
  if (!artists.length) return null;

  const totalAttended = artists.reduce((s, a) => s + a.attended, 0);
  const totalEvents = artists.reduce((s, a) => s + a.total, 0);
  const totalMissed = totalEvents - totalAttended;
  const overallPct = totalEvents > 0 ? Math.round((totalAttended / totalEvents) * 1000) / 10 : 0;

  return (
    <Card.Root>
      <Card.Header>
        <HStack justifyContent="space-between" flexWrap="wrap" gap="2">
          <Box>
            <Card.Title>Favorite Artists Attendance</Card.Title>
            <Card.Description>
              Your attendance rate for each favorite artist in this period
            </Card.Description>
          </Box>
          <VStack gap="0" alignItems="flex-end">
            <Text size="2xl" fontWeight="bold" color="colorPalette.default">
              {overallPct}%
            </Text>
            <Text size="xs" color="fg.muted">
              {totalAttended}/{totalEvents} events
            </Text>
          </VStack>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack gap="0" alignItems="stretch">
          {/* Desktop header row — hidden on mobile */}
          <HStack
            justifyContent="space-between"
            py="2"
            px="3"
            borderBottomWidth="1px"
            borderColor="border.default"
            display={{ base: "none", md: "flex" }}
          >
            <Text size="xs" fontWeight="semibold" color="fg.muted" flex="1">
              Artist
            </Text>
            <HStack gap="6" justifyContent="flex-end">
              <Text size="xs" fontWeight="semibold" color="fg.muted" w="50px" textAlign="right">
                Went
              </Text>
              <Text size="xs" fontWeight="semibold" color="fg.muted" w="50px" textAlign="right">
                Missed
              </Text>
              <Text size="xs" fontWeight="semibold" color="fg.muted" w="50px" textAlign="right">
                Total
              </Text>
              <Text size="xs" fontWeight="semibold" color="fg.muted" w="50px" textAlign="right">
                Rate
              </Text>
            </HStack>
          </HStack>

          {artists
            .sort((a, b) => b.attended - a.attended)
            .map((artist) => (
            <Box
              key={artist.name}
              py="3"
              px="3"
              borderBottomWidth="1px"
              borderColor="border.subtle"
              _hover={{ bg: "bg.subtle" }}
              className={css({ transition: 'background 0.15s ease' })}
            >
              {/* Desktop row */}
              <HStack justifyContent="space-between" mb="1.5" display={{ base: "none", md: "flex" }}>
                <Text size="sm" fontWeight="medium" color="fg.default" flex="1">
                  {artist.name}
                </Text>
                <HStack gap="6" justifyContent="flex-end">
                  <Text size="sm" fontWeight="bold" color="colorPalette.default" w="50px" textAlign="right">
                    {artist.attended}
                  </Text>
                  <Text size="sm" fontWeight="medium" color={artist.missed > 0 ? "fg.muted" : "fg.subtle"} w="50px" textAlign="right">
                    {artist.missed}
                  </Text>
                  <Text size="sm" color="fg.muted" w="50px" textAlign="right">
                    {artist.total}
                  </Text>
                  <Text size="sm" fontWeight="bold" color="fg.default" w="50px" textAlign="right">
                    {artist.pct}%
                  </Text>
                </HStack>
              </HStack>

              {/* Mobile layout */}
              <VStack gap="1.5" alignItems="stretch" display={{ base: "flex", md: "none" }}>
                <HStack justifyContent="space-between">
                  <Text size="sm" fontWeight="medium" color="fg.default">
                    {artist.name}
                  </Text>
                  <Text size="sm" fontWeight="bold" color="colorPalette.default">
                    {artist.pct}%
                  </Text>
                </HStack>
                <HStack gap="4">
                  <Text size="xs" color="fg.muted">
                    <Text as="span" fontWeight="bold" color="colorPalette.default">{artist.attended}</Text> went
                  </Text>
                  <Text size="xs" color="fg.muted">
                    <Text as="span" fontWeight="bold">{artist.missed}</Text> missed
                  </Text>
                  <Text size="xs" color="fg.subtle">
                    / {artist.total}
                  </Text>
                </HStack>
              </VStack>

              {/* Progress bar */}
              <Box
                h="4px"
                borderRadius="full"
                bg="border.default"
                overflow="hidden"
                mt={{ base: "1.5", md: "0" }}
              >
                <Box
                  h="full"
                  borderRadius="full"
                  bg="colorPalette.default"
                  style={{ width: `${artist.pct}%` }}
                  className={css({ transition: 'width 0.3s ease' })}
                />
              </Box>
            </Box>
          ))}

          {/* Summary row — desktop */}
          <HStack
            justifyContent="space-between"
            py="3"
            px="3"
            bg="bg.subtle"
            borderRadius="md"
            mt="1"
            display={{ base: "none", md: "flex" }}
          >
            <Text size="sm" fontWeight="bold" color="fg.default" flex="1">
              Total
            </Text>
            <HStack gap="6" justifyContent="flex-end">
              <Text size="sm" fontWeight="bold" color="colorPalette.default" w="50px" textAlign="right">
                {totalAttended}
              </Text>
              <Text size="sm" fontWeight="bold" color="fg.muted" w="50px" textAlign="right">
                {totalMissed}
              </Text>
              <Text size="sm" fontWeight="bold" color="fg.default" w="50px" textAlign="right">
                {totalEvents}
              </Text>
              <Text size="sm" fontWeight="bold" color="fg.default" w="50px" textAlign="right">
                {overallPct}%
              </Text>
            </HStack>
          </HStack>

          {/* Summary row — mobile */}
          <HStack
            justifyContent="space-between"
            py="3"
            px="3"
            bg="bg.subtle"
            borderRadius="md"
            mt="1"
            display={{ base: "flex", md: "none" }}
          >
            <Text size="sm" fontWeight="bold" color="fg.default">Total</Text>
            <HStack gap="4">
              <Text size="xs" color="fg.muted">
                <Text as="span" fontWeight="bold" color="colorPalette.default">{totalAttended}</Text> went
              </Text>
              <Text size="xs" color="fg.muted">
                <Text as="span" fontWeight="bold">{totalMissed}</Text> missed
              </Text>
              <Text size="xs" color="fg.subtle">/ {totalEvents}</Text>
            </HStack>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
