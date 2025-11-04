import { Box } from "styled-system/jsx";
import * as Card from "~/components/ui/styled/card";
import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend
} from "recharts";
import { token } from "styled-system/tokens";
import type { RadarStats } from "~/shared/types/stats";

interface RadarChartProps {
  radarStats: RadarStats;
}

// Dimension descriptions
const dimensionDescriptions: Record<string, string> = {
  "Multi-Venue\nDays": "Percentage of active days with multiple venues (10% = 100)",
  "Core\nArtists": "Number of statistically frequent artists (20 artists = 100)",
  "Attendance\nRate": "Days attending events (30% = 100)",
  "Consistency": "Regularity of attendance patterns (70 CV score = 100)",
  "Weekend": "Percentage of weekends spent eventing (100% = 100)",
  "Events\nper Day": "Average events per active day (1.5 events/day = 100)"
};

export function RadarChart({ radarStats }: RadarChartProps) {
  // Log radar stats to browser console for debugging
  console.log("🎯 RADAR STATS:", radarStats);

  // Transform radar stats into chart data format - clip values at 100 for display, show raw values in tooltip
  const chartData = [
    {
      dimension: "Multi-Venue\nDays",
      value: Math.min(radarStats.multiVenueHustle, 100),
      actualValue: radarStats.rawValues.multiVenueDaysPercent,
      fullMark: 100,
      label: "%"
    },
    {
      dimension: "Core\nArtists",
      value: Math.min(radarStats.activeArtistsCore, 100),
      actualValue: radarStats.rawValues.coreArtistsCount,
      fullMark: 100,
      label: "artists"
    },
    {
      dimension: "Attendance\nRate",
      value: Math.min(radarStats.activityRate, 100),
      actualValue: radarStats.rawValues.attendanceRatePercent,
      fullMark: 100,
      label: "%"
    },
    {
      dimension: "Consistency",
      value: Math.min(radarStats.consistency, 100),
      actualValue: radarStats.rawValues.consistencyScore,
      fullMark: 100,
      label: ""
    },
    {
      dimension: "Weekend",
      value: Math.min(radarStats.weekendWarrior, 100),
      actualValue: radarStats.rawValues.weekendActivityPercent,
      fullMark: 100,
      label: "%"
    },
    {
      dimension: "Events\nper Day",
      value: Math.min(radarStats.intensity, 100),
      actualValue: radarStats.rawValues.eventsPerDay,
      fullMark: 100,
      label: "events/day"
    }
  ];

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Eventing Profile</Card.Title>
        <Card.Description>
          Your unique eventing characteristics across 6 dimensions (hover chart for details)
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <Box h="500px" w="full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsRadarChart data={chartData}>
              <PolarGrid
                stroke={token.var("colors.border.default")}
                opacity={0.3}
              />
              <PolarAngleAxis
                dataKey="dimension"
                tick={{
                  fill: token.var("colors.fg.default"),
                  fontSize: 12,
                  fontWeight: 500
                }}
                style={{ whiteSpace: 'pre' }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{
                  fill: token.var("colors.fg.muted"),
                  fontSize: 10
                }}
              />
              <Radar
                name="Your Stats"
                dataKey="value"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: token.var("colors.bg.default"),
                  border: "1px solid",
                  borderColor: token.var("colors.border.default"),
                  borderRadius: token.var("radii.l1"),
                  color: token.var("colors.fg.default"),
                  maxWidth: "300px"
                }}
                content={({ payload }: any) => {
                  if (!payload || !payload[0]) return null;

                  const data = payload[0].payload;
                  const actualValue = data.actualValue;
                  const label = data.label;
                  const dimension = data.dimension;
                  const description = dimensionDescriptions[dimension];

                  const displayValue =
                    label === "artists"
                      ? Math.round(actualValue)
                      : actualValue.toFixed(1);
                  const formattedValue = label
                    ? `${displayValue} ${label}`
                    : displayValue;

                  return (
                    <Box
                      bg="bg.default"
                      p="3"
                      borderWidth="1px"
                      borderColor="border.default"
                      borderRadius="l1"
                      maxW="300px"
                    >
                      <Box fontWeight="semibold" mb="1" color="fg.default">
                        {dimension.replace(/\n/g, " ")}
                      </Box>
                      <Box fontSize="lg" fontWeight="bold" color="colorPalette.default" mb="2">
                        {formattedValue}
                      </Box>
                      <Box fontSize="xs" color="fg.muted">
                        {description}
                      </Box>
                    </Box>
                  );
                }}
              />
              <Legend
                wrapperStyle={{
                  paddingTop: "20px"
                }}
              />
            </RechartsRadarChart>
          </ResponsiveContainer>
        </Box>
      </Card.Body>
    </Card.Root>
  );
}
