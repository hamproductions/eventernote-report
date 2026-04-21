import { Grid, VStack, HStack, Box } from "styled-system/jsx";
import { css } from "styled-system/css";
import * as Card from "~/components/ui/styled/card";
import { Text } from "~/components/ui/text";

interface Achievement {
  id: string;
  emoji: string;
  name: string;
  desc: string;
  unlocked: boolean;
  progress?: string;
}

interface AchievementsProps {
  totalEvents: number;
  uniqueVenues: number;
  uniqueArtists: number;
  longestDailyStreak: number;
  maxEventsPerDay: number;
  weekendPercentage: number;
  avgEventsPerMonth: number;
  daysActivePercentage: number;
  favoriteAttendancePct?: number;
  totalArtistAppearances: number;
}

function computeAchievements(props: AchievementsProps): Achievement[] {
  const {
    totalEvents, uniqueVenues, uniqueArtists, longestDailyStreak,
    maxEventsPerDay, weekendPercentage, avgEventsPerMonth,
    daysActivePercentage, favoriteAttendancePct, totalArtistAppearances
  } = props;

  return [
    {
      id: "first-event",
      emoji: "🎫",
      name: "First Steps",
      desc: "Attend your first event",
      unlocked: totalEvents >= 1,
      progress: totalEvents >= 1 ? undefined : "0/1",
    },
    {
      id: "ten-events",
      emoji: "🎪",
      name: "Getting Started",
      desc: "Attend 10 events",
      unlocked: totalEvents >= 10,
      progress: totalEvents < 10 ? `${totalEvents}/10` : undefined,
    },
    {
      id: "fifty-events",
      emoji: "🎭",
      name: "Regular",
      desc: "Attend 50 events",
      unlocked: totalEvents >= 50,
      progress: totalEvents < 50 ? `${totalEvents}/50` : undefined,
    },
    {
      id: "century",
      emoji: "💎",
      name: "Century Club",
      desc: "Attend 100 events",
      unlocked: totalEvents >= 100,
      progress: totalEvents < 100 ? `${totalEvents}/100` : undefined,
    },
    {
      id: "explorer",
      emoji: "🗺️",
      name: "Explorer",
      desc: "Visit 10+ unique venues",
      unlocked: uniqueVenues >= 10,
      progress: uniqueVenues < 10 ? `${uniqueVenues}/10` : undefined,
    },
    {
      id: "globe-trotter",
      emoji: "🌍",
      name: "Globe Trotter",
      desc: "Visit 50+ unique venues",
      unlocked: uniqueVenues >= 50,
      progress: uniqueVenues < 50 ? `${uniqueVenues}/50` : undefined,
    },
    {
      id: "streak-3",
      emoji: "🔥",
      name: "On Fire",
      desc: "3-day event streak",
      unlocked: longestDailyStreak >= 3,
      progress: longestDailyStreak < 3 ? `${longestDailyStreak}/3 days` : undefined,
    },
    {
      id: "streak-7",
      emoji: "⚡",
      name: "Streak Master",
      desc: "7-day event streak",
      unlocked: longestDailyStreak >= 7,
      progress: longestDailyStreak < 7 ? `${longestDailyStreak}/7 days` : undefined,
    },
    {
      id: "multi-3",
      emoji: "🎯",
      name: "Multi-Tasker",
      desc: "3+ events in a single day",
      unlocked: maxEventsPerDay >= 3,
      progress: maxEventsPerDay < 3 ? `Best: ${maxEventsPerDay}` : undefined,
    },
    {
      id: "multi-10",
      emoji: "🤯",
      name: "Event Machine",
      desc: "10+ events in a single day",
      unlocked: maxEventsPerDay >= 10,
      progress: maxEventsPerDay < 10 ? `Best: ${maxEventsPerDay}` : undefined,
    },
    {
      id: "weekend-warrior",
      emoji: "🗡️",
      name: "Weekend Warrior",
      desc: "80%+ events on weekends",
      unlocked: weekendPercentage >= 80,
      progress: weekendPercentage < 80 ? `${Math.round(weekendPercentage)}%` : undefined,
    },
    {
      id: "loyal-fan",
      emoji: "💯",
      name: "Loyal Fan",
      desc: "50%+ attendance for a favorite artist",
      unlocked: (favoriteAttendancePct || 0) >= 50,
      progress: favoriteAttendancePct !== undefined && favoriteAttendancePct < 50 ? `${favoriteAttendancePct}%` : undefined,
    },
    {
      id: "super-fan",
      emoji: "👑",
      name: "Super Fan",
      desc: "80%+ attendance for a favorite artist",
      unlocked: (favoriteAttendancePct || 0) >= 80,
      progress: favoriteAttendancePct !== undefined && favoriteAttendancePct < 80 ? `${favoriteAttendancePct}%` : undefined,
    },
    {
      id: "social-butterfly",
      emoji: "🦋",
      name: "Social Butterfly",
      desc: "See 100+ unique artists",
      unlocked: uniqueArtists >= 100,
      progress: uniqueArtists < 100 ? `${uniqueArtists}/100` : undefined,
    },
  ];
}

export function Achievements(props: AchievementsProps) {
  const achievements = computeAchievements(props);
  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  return (
    <Card.Root>
      <Card.Header>
        <HStack justifyContent="space-between" alignItems="center">
          <Box>
            <Card.Title>Achievements</Card.Title>
            <Card.Description>Milestones unlocked in this period</Card.Description>
          </Box>
          <HStack gap="1" alignItems="baseline">
            <Text size="2xl" fontWeight="black" color="colorPalette.default">
              {unlocked.length}
            </Text>
            <Text size="sm" color="fg.muted">
              / {achievements.length}
            </Text>
          </HStack>
        </HStack>
        {/* Overall progress bar */}
        <Box
          h="6px"
          borderRadius="full"
          bg="border.default"
          overflow="hidden"
          mt="3"
        >
          <Box
            h="full"
            borderRadius="full"
            bg="colorPalette.default"
            style={{ width: `${(unlocked.length / achievements.length) * 100}%` }}
            className={css({ transition: 'width 0.3s ease' })}
          />
        </Box>
      </Card.Header>
      <Card.Body>
        <VStack gap="4" alignItems="stretch">
          {unlocked.length > 0 && (
            <Grid columns={{ base: 2, md: 3, lg: 5 }} gap="3">
              {unlocked.map((a) => (
                <Box
                  key={a.id}
                  p="3"
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="colorPalette.default"
                  bg="colorPalette.default/5"
                  textAlign="center"
                  className={css({ transition: 'all 0.2s ease' })}
                  _hover={{ transform: 'scale(1.03)' }}
                >
                  <Text size="2xl">{a.emoji}</Text>
                  <Text size="xs" fontWeight="bold" color="fg.default" mt="1">
                    {a.name}
                  </Text>
                  <Text size="xs" color="fg.muted" lineClamp={2}>
                    {a.desc}
                  </Text>
                </Box>
              ))}
            </Grid>
          )}

          {locked.length > 0 && (
            <Box>
              <Text size="xs" fontWeight="semibold" color="fg.muted" mb="2" textTransform="uppercase" letterSpacing="wider">
                Next Up
              </Text>
              <Grid columns={{ base: 2, md: 3, lg: 5 }} gap="3">
                {locked.slice(0, 5).map((a) => (
                  <Box
                    key={a.id}
                    p="3"
                    borderRadius="lg"
                    borderWidth="1px"
                    borderColor="border.default"
                    bg="bg.default"
                    textAlign="center"
                    opacity="0.5"
                  >
                    <Text size="2xl" className={css({ filter: 'grayscale(1)' })}>{a.emoji}</Text>
                    <Text size="xs" fontWeight="bold" color="fg.muted" mt="1">
                      {a.name}
                    </Text>
                    {a.progress && (
                      <Text size="xs" color="fg.subtle">
                        {a.progress}
                      </Text>
                    )}
                  </Box>
                ))}
              </Grid>
            </Box>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
