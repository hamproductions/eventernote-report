import { Box } from "styled-system/jsx";
import * as Card from "~/components/ui/styled/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { token } from "styled-system/tokens";

interface ArtistAttendanceGrowthProps {
  cumulativeArtistData: Record<string, any>[];
  displayedArtists: string[];
}

export function ArtistAttendanceGrowth({
  cumulativeArtistData,
  displayedArtists
}: ArtistAttendanceGrowthProps) {
  if (cumulativeArtistData.length === 0) return null;

  // Format dates for display
  const formattedData = cumulativeArtistData.map(item => {
    const [year, month] = item.date.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return {
      ...item,
      date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    };
  });

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Cumulative Artist Attendance</Card.Title>
        <Card.Description>
          Track how your attendance grows for your most-seen artists
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <Box h="500px" w="full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{ top: 20, right: 10, left: 10, bottom: 60 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={token.var("colors.border.default")}
                opacity={0.3}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: token.var("colors.fg.muted"), fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fill: token.var("colors.fg.muted"), fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: token.var("colors.bg.default"),
                  border: "1px solid",
                  borderColor: token.var("colors.border.default"),
                  borderRadius: token.var("radii.l1"),
                  color: token.var("colors.fg.default")
                }}
              />
              <Legend />
              {displayedArtists.map((artist, index) => (
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
      </Card.Body>
    </Card.Root>
  );
}
