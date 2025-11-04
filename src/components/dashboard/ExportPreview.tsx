import { RefObject, useEffect, useRef } from "react";
import { Box, VStack, HStack, Grid } from "styled-system/jsx";
import { token } from "styled-system/tokens";
import { Heading } from "~/components/ui/heading";
import { Text } from "~/components/ui/text";
import CalHeatmap from "cal-heatmap";
import "cal-heatmap/cal-heatmap.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  Label
} from "recharts";
import { STAT_SECTIONS } from "./StatConfig";

interface Analytics {
  totalEvents: number;
  uniqueVenues: number;
  uniqueArtists: number;
  totalArtistAppearances: number;
  eventsWithoutFavorites?: number;
  eventsWithoutFavoritesPercentage?: number;
  avgEventsPerMonth: string;
  uniqueDays: number;
  totalDaysInRange: number;
  daysSpentPercentage: string;
  topDayOfWeek: [string, number] | undefined;
  busiestMonth: [string, number] | undefined;
  yearsSinceFirst: string;
  dateRange: {
    earliest: string;
    latest: string;
  };
  weekendStats: {
    weekendPercentage: number;
    weekendsWithEvents: number;
    totalWeekends: number;
    weekendEventCount: number;
    weekendEventPercentage: number;
    weekdayEventCount: number;
    weekdayEventPercentage: number;
  };
  multiEventDayStats: {
    daysWithMultipleEvents: number;
    daysWithMultipleEventsPercentage: number;
    daysWithMultipleVenues: number;
    daysWithMultipleVenuesPercentage: number;
    totalDaysWithEvents: number;
    maxEventsInDay: number;
    maxEventsInDayDate: string | null;
    maxVenuesInDay: number;
    maxVenuesInDayDate: string | null;
  };
  streaks?: {
    daily: {
      currentStreak: number;
      longestStreak: number;
      currentStreakStartDate: string | null;
      currentStreakEndDate: string | null;
      longestStreakStartDate: string | null;
      longestStreakEndDate: string | null;
      isActive: boolean;
    };
    weekly: {
      currentStreak: number;
      longestStreak: number;
      currentStreakStartDate: string | null;
      currentStreakEndDate: string | null;
      longestStreakStartDate: string | null;
      longestStreakEndDate: string | null;
      isActive: boolean;
    };
  };
}

interface ChartAnalytics {
  monthlyBreakdown: [string, number][];
  cumulativeArtistData: Record<string, any>[];
  displayedArtists: string[];
  topArtists: [string, number][];
  topVenues: [string, any[]][];
  dateEventMap: Map<string, number>;
}

interface ExportPreviewProps {
  exportRef: RefObject<HTMLDivElement | null>;
  analytics: Analytics;
  chartAnalytics: ChartAnalytics;
  userId: string;
  artistsViewLimit: number;
  venuesViewLimit: number;
}

export function ExportPreview({
  exportRef,
  analytics,
  chartAnalytics,
  userId,
  artistsViewLimit,
  venuesViewLimit
}: ExportPreviewProps) {
  // Safety checks
  if (!analytics || !chartAnalytics) {
    return null;
  }

  const safeMonthlyData =
    chartAnalytics.monthlyBreakdown?.slice(0, 12).reverse() || [];
  const safeCumulativeData = chartAnalytics.cumulativeArtistData || [];
  const safeDisplayedArtists = chartAnalytics.displayedArtists || [];
  const safeTopArtists = chartAnalytics.topArtists?.slice(0, 5) || [];
  const safeTopVenues = chartAnalytics.topVenues?.slice(0, 5) || [];

  const heatmapElRef = useRef<HTMLDivElement>(null);
  const heatmapRef = useRef<CalHeatmap>(new CalHeatmap());

  useEffect(() => {
    if (
      !heatmapElRef.current ||
      !chartAnalytics.dateEventMap ||
      chartAnalytics.dateEventMap.size === 0
    )
      return;

    // Convert Map to array format
    const heatmapData: Array<{ date: string; value: number }> = [];
    let minDate: Date = new Date();
    let maxDate: Date = new Date();
    const values: number[] = [];

    chartAnalytics.dateEventMap.forEach((count, dateStr) => {
      heatmapData.push({ date: dateStr, value: count });
      values.push(count);

      const date = new Date(dateStr);
      if (!minDate || date < minDate) minDate = date;
      if (!maxDate || date > maxDate) maxDate = date;
    });

    const maxValue = Math.max(...values);
    const threshold1 = Math.ceil(maxValue * 0.25);
    const threshold2 = Math.ceil(maxValue * 0.5);
    const threshold3 = Math.ceil(maxValue * 0.75);

    const monthsDiff =
      (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
      (maxDate.getMonth() - minDate.getMonth()) +
      1;

    heatmapRef.current.paint(
      {
        theme: "dark",
        range: Math.max(1, monthsDiff),
        itemSelector: heatmapElRef.current,
        data: {
          source: heatmapData,
          x: "date",
          y: (d: any) => +d.value
        },
        date: { start: minDate },
        scale: {
          color: {
            type: "threshold",
            range: ["#14432a", "#166b34", "#37a446", "#4dd05a"],
            domain: [threshold1, threshold2, threshold3]
          }
        },
        domain: {
          type: "month",
          gutter: 2,
          label: { text: "MMM", textAlign: "start", position: "top" }
        },
        subDomain: {
          type: "ghDay",
          radius: 1,
          width: 6,
          height: 6,
          gutter: 1.5
        }
      },
      []
    );

    return () => {
      heatmapRef.current.destroy();
    };
  }, [chartAnalytics.dateEventMap]);

  return (
    <Box position="absolute" w="0" h="0" opacity="0">
      <Box
        position="relative"
        ref={exportRef}
        w="fit-content"
        minW="800px"
        p="10px"
        bg={token.var("colors.bg.default")}
        color={token.var("colors.fg.default")}
        fontFamily="system-ui"
      >
        <VStack gap="2" alignItems="stretch">
          <Box textAlign="center" mb="0">
            <Heading size="xl" color="blue.500" mb="0">
              Eventernote Report
            </Heading>
            <Text fontSize="sm" opacity={0.7}>
              @{userId || "Unknown User"}
            </Text>
            {analytics.dateRange?.earliest && analytics.dateRange?.latest && (
              <Text fontSize="xs" opacity={0.6}>
                {new Date(analytics.dateRange.earliest).toLocaleDateString(
                  "en-US",
                  { month: "long", day: "numeric", year: "numeric" }
                )}{" "}
                -{" "}
                {new Date(analytics.dateRange.latest).toLocaleDateString(
                  "en-US",
                  { month: "long", day: "numeric", year: "numeric" }
                )}
              </Text>
            )}
          </Box>

          {/* Stats Sections - Using STAT_SECTIONS structure */}
          {STAT_SECTIONS.map((section) => (
            <Box key={section.title}>
              <Text fontSize="sm" fontWeight="bold" mb="1">
                {section.title}
              </Text>
              <Grid columns={4} gap="1.5">
                {section.stats.map((stat) => {
                  const primaryValue = stat.accessor(analytics);
                  const secondaryValue = stat.secondaryAccessor?.(analytics);

                  return (
                    <Box
                      key={stat.id}
                      p="2"
                      bg={token.var("colors.bg.subtle")}
                      borderRadius="md"
                    >
                      <Text fontSize="xs" opacity={0.7} mb="0.5">
                        {stat.label}
                      </Text>
                      <Text fontSize="xl" fontWeight="bold" color="blue.500">
                        {primaryValue || "N/A"}
                      </Text>
                      {secondaryValue && (
                        <Text fontSize="xs" opacity={0.6}>
                          {secondaryValue}
                        </Text>
                      )}
                    </Box>
                  );
                })}
              </Grid>
            </Box>
          ))}

          {/* Heatmap and Monthly Activity - Side by Side */}
          <Grid columns={2} gap="2">
            {/* Heatmap */}
            <Box p="2" bg={token.var("colors.bg.subtle")} borderRadius="md">
              <Text fontSize="sm" fontWeight="bold" mb="1">
                Activity Heatmap
              </Text>
              <Box overflowX="auto" pb="2">
                <div ref={heatmapElRef} />
              </Box>
            </Box>

            {/* Monthly Breakdown */}
            <Box
              p="2"
              bg={token.var("colors.bg.subtle")}
              borderRadius="md"
              h="120px"
            >
              <Text fontSize="sm" fontWeight="bold" mb="1">
                Monthly Activity
              </Text>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={safeMonthlyData.map(([month, count]) => {
                    const [year, monthNum] = (month || "").split("-");
                    const date = new Date(
                      parseInt(year || "0"),
                      parseInt(monthNum || "1") - 1
                    );
                    return {
                      month: date.toLocaleDateString("en-US", {
                        month: "long"
                      }),
                      events: count || 0
                    };
                  })}
                  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={token.var("colors.border.default")}
                    opacity={0.3}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: token.var("colors.fg.muted"), fontSize: 10 }}
                  />
                  <YAxis
                    tick={{ fill: token.var("colors.fg.muted"), fontSize: 10 }}
                  />
                  <Bar dataKey="events" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Grid>

          {/* Cumulative Artist Attendance */}
          <Box
            p="2"
            bg={token.var("colors.bg.subtle")}
            borderRadius="md"
            h="350px"
          >
            <Text fontSize="sm" fontWeight="bold" mb="1">
              Cumulative Artist Attendance
            </Text>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={safeCumulativeData.map((item) => {
                  const [year, month] = (item.date || "").split("-");
                  const date = new Date(
                    parseInt(year || "0"),
                    parseInt(month || "1") - 1
                  );
                  return {
                    ...item,
                    date: date.toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short"
                    })
                  };
                })}
                margin={{ top: 5, right: 10, left: 0, bottom: 40 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={token.var("colors.border.default")}
                  opacity={0.3}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fill: token.var("colors.fg.muted"), fontSize: 10 }}
                  angle={-35}
                  textAnchor="end"
                  height={60}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: token.var("colors.fg.muted"), fontSize: 10 }}
                />
                <Legend wrapperStyle={{ fontSize: "9px" }} iconSize={8} />
                {safeDisplayedArtists.map((artist, index) => (
                  <Line
                    key={artist}
                    type="monotone"
                    dataKey={artist}
                    stroke={
                      [
                        "#3b82f6",
                        "#8b5cf6",
                        "#ec4899",
                        "#f59e0b",
                        "#10b981",
                        "#ef4444",
                        "#f97316",
                        "#eab308",
                        "#84cc16",
                        "#14b8a6"
                      ][index % 10]
                    }
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </Box>

          {/* Pie Charts - Artist and Venue Distribution */}
          <Grid columns={2} gap="2">
            <Box p="2" bg={token.var("colors.bg.subtle")} borderRadius="md">
              <Text fontSize="sm" fontWeight="bold" mb="1">
                Artist Distribution
              </Text>
              <Box h="200px">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={safeTopArtists.map(([name, count]) => ({
                        name: name?.substring(0, 12) || "Unknown",
                        value: count || 0
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                      }
                      labelLine={true}
                    >
                      <Label textBreakAll={true} />
                      {safeTopArtists.map((_, index) => (
                        <Cell
                          key={`cell-artist-${index}`}
                          fill={
                            [
                              "#f59e0b",
                              "#ec4899",
                              "#8b5cf6",
                              "#3b82f6",
                              "#10b981"
                            ][index % 5]
                          }
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Box>
            <Box p="2" bg={token.var("colors.bg.subtle")} borderRadius="md">
              <Text fontSize="sm" fontWeight="bold" mb="1">
                Venue Distribution
              </Text>
              <Box h="200px">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={safeTopVenues.map(([name, events]) => ({
                        name: name?.substring(0, 12) || "Unknown",
                        value: events?.length || 0
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius="80%"
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                      }
                      labelLine={true}
                    >
                      <Label textBreakAll={true} />
                      {safeTopVenues.map((_, index) => (
                        <Cell
                          key={`cell-venue-${index}`}
                          fill={
                            [
                              "#3b82f6",
                              "#8b5cf6",
                              "#ec4899",
                              "#f59e0b",
                              "#10b981"
                            ][index % 5]
                          }
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </Grid>
        </VStack>
      </Box>
    </Box>
  );
}
