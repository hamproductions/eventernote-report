import { useEffect, useRef, useState } from "react";
import { Box } from "styled-system/jsx";
import * as Card from "~/components/ui/styled/card";
import {
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { token } from "styled-system/tokens";
import type { RadarStats } from "~/shared/types/stats";

interface RadarChartProps {
  radarStats: RadarStats;
}

// Dimension descriptions
const dimensionDescriptions: Record<string, string> = {
  "Multi-Venue\nDays": "Share of event days where you went to 2+ venues. 10% fills the axis.",
  "Core\nArtists": "Artists you saw far more often than your average artist. 20 such artists fills the axis.",
  "Attendance\nRate": "Days with an event, out of all days from your first to last event. 30% fills the axis.",
  "Consistency": "How evenly spaced your event days are. Steady gaps score high, bursts and long breaks score low.",
  "Weekend": "Weekends with at least one event, out of all weekends in the span.",
  "Events\nper Day": "Average events on days you went out. 1.5 per day fills the axis."
};

export function RadarChart({ radarStats }: RadarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const narrow = width > 0 && width < 440;

  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

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
          Six habits scored 0 to 100. Raw values and how each is scored are listed below.
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <Box ref={chartRef} h={{ base: "300px", md: "360px" }} w="full">
          <ResponsiveContainer width="100%" height="100%">
            <RechartsRadarChart data={chartData} outerRadius={narrow ? Math.max(48, Math.min(width / 2 - 56, 120)) : "60%"}>
              <PolarGrid
                stroke={token.var("colors.border.default")}
                opacity={0.3}
              />
              <PolarAngleAxis
                dataKey="dimension"
                tick={({ x, y, payload, textAnchor }: { x: number; y: number; payload: { value: string }; textAnchor: "start" | "middle" | "end" }) => {
                  const lines = narrow ? payload.value.split("\n") : [payload.value.replace(/\n/g, " ")];
                  return (
                    <text x={x} y={y - (lines.length - 1) * 6} textAnchor={textAnchor} fill={token.var("colors.fg.default")} fontSize={narrow ? 11 : 12} fontWeight={500}>
                      {lines.map((line, index) => (
                        <tspan key={line} x={x} dy={index ? "1.15em" : 0}>{line}</tspan>
                      ))}
                    </text>
                  );
                }}
              />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
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
                      <Box fontSize="lg" fontWeight="bold" color="colorPalette.text" mb="2">
                        {formattedValue}
                      </Box>
                      <Box fontSize="xs" color="fg.muted">
                        {description}
                      </Box>
                    </Box>
                  );
                }}
              />
            </RechartsRadarChart>
          </ResponsiveContainer>
        </Box>
        <Box as="dl" display="grid" gridTemplateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap="3" mt="4">
          {chartData.map((item) => (
            <Box key={item.dimension}>
              <Box as="dt" display="flex" justifyContent="space-between" gap="2" fontSize="xs" fontWeight="semibold" color="fg.default">
                <span>{item.dimension.replace(/\n/g, " ")}</span>
                <Box as="span" color="colorPalette.text" fontVariantNumeric="tabular-nums">
                  {item.label === "artists" ? Math.round(item.actualValue) : item.actualValue.toFixed(1)}{item.label === "%" ? "%" : item.label ? ` ${item.label}` : ""}
                </Box>
              </Box>
              <Box as="dd" fontSize="xs" color="fg.muted" mt="0.5">{dimensionDescriptions[item.dimension]}</Box>
            </Box>
          ))}
        </Box>
      </Card.Body>
    </Card.Root>
  );
}
