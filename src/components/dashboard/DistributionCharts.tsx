import { Box, Grid } from "styled-system/jsx";
import * as Card from "~/components/ui/styled/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label
} from "recharts";
import type { EnhancedEvent } from "~/shared/types/event";

interface DistributionChartsProps {
  topVenues: [string, EnhancedEvent[]][];
  topArtists: [string, number][];
}

export function DistributionCharts({
  topVenues,
  topArtists
}: DistributionChartsProps) {
  return (
    <Grid gap="6" columns={{ base: 1, lg: 2 }}>
      {/* Venue Distribution */}
      <Card.Root>
        <Card.Header>
          <Card.Title>Venue Distribution</Card.Title>
          <Card.Description>
            How your events are spread across venues
          </Card.Description>
        </Card.Header>
        <Card.Body>
          <Box h="300px" w="full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topVenues.slice(0, 5).map(([name, events]) => ({
                    name,
                    value: events.length
                  }))}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name.substring(0, 20)}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Label textBreakAll={true} />
                  {topVenues.slice(0, 5).map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981"][
                          index % 5
                        ]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Card.Body>
      </Card.Root>

      {/* Artist Distribution */}
      <Card.Root>
        <Card.Header>
          <Card.Title>Artist Distribution</Card.Title>
          <Card.Description>
            How your attendance is distributed across artists
          </Card.Description>
        </Card.Header>
        <Card.Body>
          <Box h="300px" w="full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topArtists.slice(0, 5).map(([name, count]) => ({
                    name,
                    value: count
                  }))}
                  cx="50%"
                  cy="50%"
                  label={({ name, percent }) =>
                    `${name.substring(0, 15)}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Label textBreakAll={true} />
                  {topArtists.slice(0, 5).map((_, index) => (
                    <Cell
                      key={`cell-artist-${index}`}
                      fill={
                        ["#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6", "#10b981"][
                          index % 5
                        ]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Box>
        </Card.Body>
      </Card.Root>
    </Grid>
  );
}
