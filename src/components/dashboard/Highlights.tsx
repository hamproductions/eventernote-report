import { Grid, Box } from "styled-system/jsx";
import * as Card from "~/components/ui/styled/card";
import { Text } from "~/components/ui/text";
import { InfoTip } from "./InfoTip";
import { formatDisplayDate, formatDisplayMonth } from "~/shared/utils/dateUtils";

interface HighlightData {
  label: string;
  help?: string;
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

function getPersonality(weekendEventPct: number, avgPerMonth: number, maxPerDay: number): { title: string; desc: string } {
  if (maxPerDay >= 10) return { title: "Event Machine", desc: "10 or more events on a single day." };
  if (avgPerMonth >= 20) return { title: "Full-Time Fan", desc: "20 or more events a month on average." };
  if (weekendEventPct >= 80) return { title: "Weekend Warrior", desc: "80% or more of your events were on weekends." };
  if (weekendEventPct <= 30) return { title: "Weekday Regular", desc: "Most of your events were on weekdays." };
  if (avgPerMonth >= 10) return { title: "Dedicated Fan", desc: "10 or more events a month on average." };
  return { title: "Balanced Explorer", desc: "A mix of weekday and weekend events." };
}

export function Highlights({
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

  const highlights = ([
    {
      label: "Your eventing style",
      value: personality.title,
      sub: personality.desc,
      help: "Picked by rule, checked in this order: 10 or more events in one day, 20 or more events a month, 80% or more of events on weekends, 30% or fewer of events on weekends, 10 or more events a month. Otherwise Balanced Explorer.",
    },
    topArtist ? {
      label: "Most seen artist",
      value: topArtist.name,
      sub: `${topArtist.count} events together`,
      help: "Performer listed on the most of your events in this range.",
    } : null,
    favoriteAttendance ? {
      label: "Most loyal to",
      value: favoriteAttendance.name,
      sub: `${favoriteAttendance.pct}% attendance rate`,
      help: "Favorite artist whose events you went to the highest share of: events you attended ÷ all their events in this range, up to today.",
    } : null,
    topVenue ? {
      label: "Home venue",
      value: topVenue.name,
      sub: `${topVenue.count} visits`,
      help: "Venue you went to most often in this range.",
    } : null,
    {
      label: "Longest streak",
      value: `${longestDailyStreak} days`,
      sub: longestWeeklyStreak > 1 ? `${longestWeeklyStreak} consecutive weeks` : undefined,
      help: "Most consecutive days with at least one event. The second line is the most consecutive weeks (Monday to Sunday) with an event.",
    },
    maxEventsPerDay >= 2 ? {
      label: "Personal record",
      value: `${maxEventsPerDay} events in 1 day`,
      sub: maxEventsPerDayDate ? formatDisplayDate(maxEventsPerDayDate) : undefined,
    } : null,
    {
      label: "Busiest month",
      value: /^\d{4}-\d{2}$/.test(busiestMonth.month) ? formatDisplayMonth(busiestMonth.month) : busiestMonth.month,
      sub: `${busiestMonth.count} events`,
    },
    {
      label: "Favorite day",
      value: `${topDayOfWeek.day}s`,
      sub: `${topDayOfWeek.count} events on this day`,
    },
  ] as (HighlightData | null)[]).filter((h): h is HighlightData => h !== null);

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Highlights</Card.Title>
        <Card.Description>The standouts in this range</Card.Description>
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
            >
              <Text size="xs" color="fg.muted" mb="1" display="flex" alignItems="center">
                {h.label}
                {h.help && <InfoTip label={h.label}>{h.help}</InfoTip>}
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
