import { Grid, VStack, HStack, Box } from "styled-system/jsx";
import { css } from "styled-system/css";
import * as Card from "~/components/ui/styled/card";
import { Text } from "~/components/ui/text";
import { Heading } from "~/components/ui/heading";

interface HighlightData {
  emoji: string;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

interface HighlightsProps {
  totalEvents: number;
  uniqueVenues: number;
  uniqueArtists: number;
  totalArtistAppearances: number;
  avgEventsPerMonth: number;
  topDayOfWeek: { day: string; count: number };
  busiestMonth: { month: string; count: number };
  longestDailyStreak: number;
  longestWeeklyStreak: number;
  maxEventsPerDay: number;
  maxEventsPerDayDate?: string;
  weekendPercentage: number;
  topArtist?: { name: string; count: number };
  topVenue?: { name: string; count: number };
  favoriteAttendance?: { name: string; pct: number };
  daysActivePercentage: number;
}

function getPersonality(weekendPct: number, avgPerMonth: number, maxPerDay: number): { title: string; emoji: string; desc: string } {
  if (maxPerDay >= 10) return { title: "Event Machine", emoji: "⚡", desc: "Double digits in a single day? Legendary." };
  if (avgPerMonth >= 20) return { title: "Full-Time Fan", emoji: "🔥", desc: "This isn't a hobby, it's a lifestyle." };
  if (weekendPct >= 80) return { title: "Weekend Warrior", emoji: "🗡️", desc: "Weekends were made for live events." };
  if (weekendPct <= 30) return { title: "Weekday Regular", emoji: "📅", desc: "Who needs weekends when there's events every day?" };
  if (avgPerMonth >= 10) return { title: "Dedicated Fan", emoji: "💪", desc: "Averaging 10+ events a month takes commitment." };
  return { title: "Balanced Explorer", emoji: "🌟", desc: "A healthy mix of weekday and weekend events." };
}

export function Highlights({
  totalEvents,
  uniqueVenues,
  uniqueArtists,
  totalArtistAppearances,
  avgEventsPerMonth,
  topDayOfWeek,
  busiestMonth,
  longestDailyStreak,
  longestWeeklyStreak,
  maxEventsPerDay,
  maxEventsPerDayDate,
  weekendPercentage,
  topArtist,
  topVenue,
  favoriteAttendance,
  daysActivePercentage,
}: HighlightsProps) {
  const personality = getPersonality(weekendPercentage, avgEventsPerMonth, maxEventsPerDay);

  const highlights: HighlightData[] = [
    {
      emoji: personality.emoji,
      label: "Your Eventing Style",
      value: personality.title,
      sub: personality.desc,
    },
    topArtist ? {
      emoji: "👑",
      label: "Most Seen Artist",
      value: topArtist.name,
      sub: `${topArtist.count} events together`,
    } : null,
    favoriteAttendance ? {
      emoji: "💯",
      label: "Most Loyal To",
      value: favoriteAttendance.name,
      sub: `${favoriteAttendance.pct}% attendance rate`,
    } : null,
    topVenue ? {
      emoji: "🏠",
      label: "Home Venue",
      value: topVenue.name.length > 20 ? topVenue.name.substring(0, 20) + "…" : topVenue.name,
      sub: `${topVenue.count} visits`,
    } : null,
    {
      emoji: "🔥",
      label: "Longest Streak",
      value: `${longestDailyStreak} days`,
      sub: longestWeeklyStreak > 1 ? `${longestWeeklyStreak} consecutive weeks` : undefined,
    },
    maxEventsPerDay >= 2 ? {
      emoji: "⚡",
      label: "Personal Record",
      value: `${maxEventsPerDay} events in 1 day`,
      sub: maxEventsPerDayDate || undefined,
    } : null,
    {
      emoji: "📊",
      label: "Busiest Month",
      value: busiestMonth.month,
      sub: `${busiestMonth.count} events`,
    },
    {
      emoji: "📅",
      label: "Favorite Day",
      value: `${topDayOfWeek.day}s`,
      sub: `${topDayOfWeek.count} events on this day`,
    },
  ].filter((h): h is HighlightData => h !== null);

  return (
    <Card.Root>
      <Card.Header>
        <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="3">
          <Box>
            <Card.Title>Highlights</Card.Title>
            <Card.Description>Your standout stats this period</Card.Description>
          </Box>
          <HStack gap={{ base: "4", md: "6" }} alignItems="baseline">
            <VStack gap="0" alignItems="center">
              <Text size={{ base: "2xl", md: "3xl" }} fontWeight="black" color="colorPalette.default">
                {totalEvents}
              </Text>
              <Text size="xs" color="fg.muted">events</Text>
            </VStack>
            <VStack gap="0" alignItems="center">
              <Text size={{ base: "2xl", md: "3xl" }} fontWeight="black" color="fg.default">
                {uniqueVenues}
              </Text>
              <Text size="xs" color="fg.muted">venues</Text>
            </VStack>
            <VStack gap="0" alignItems="center">
              <Text size={{ base: "2xl", md: "3xl" }} fontWeight="black" color="fg.default">
                {uniqueArtists}
              </Text>
              <Text size="xs" color="fg.muted">artists</Text>
            </VStack>
          </HStack>
        </HStack>
      </Card.Header>
      <Card.Body>
        <Grid columns={{ base: 1, sm: 2, lg: 4 }} gap="4">
          {highlights.map((h) => (
            <Box
              key={h.label}
              p="4"
              borderRadius="lg"
              borderWidth="1px"
              borderColor="border.default"
              bg="bg.default"
              _hover={{ borderColor: "colorPalette.default", bg: "bg.subtle" }}
              className={css({ transition: 'all 0.2s ease' })}
            >
              <Text size="2xl" mb="1">{h.emoji}</Text>
              <Text size="xs" color="fg.muted" textTransform="uppercase" letterSpacing="wider" mb="1">
                {h.label}
              </Text>
              <Text size="sm" fontWeight="bold" color="fg.default" lineClamp={2}>
                {h.value}
              </Text>
              {h.sub && (
                <Text size="xs" color="fg.muted" mt="0.5">
                  {h.sub}
                </Text>
              )}
            </Box>
          ))}
        </Grid>
      </Card.Body>
    </Card.Root>
  );
}
