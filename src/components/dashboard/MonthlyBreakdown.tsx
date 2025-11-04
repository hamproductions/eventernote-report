import { Box } from "styled-system/jsx";
import * as Card from "~/components/ui/styled/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { token } from "styled-system/tokens";

interface MonthlyBreakdownProps {
  monthlyBreakdown: [string, number][];
}

export function MonthlyBreakdown({ monthlyBreakdown }: MonthlyBreakdownProps) {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Monthly Activity</Card.Title>
        <Card.Description>
          Number of events attended each month
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <Box h="300px" w="full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyBreakdown
                .reverse()
                .map(([month, count]) => {
                  const [year, monthNum] = month.split('-');
                  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
                  return {
                    month: date.toLocaleDateString('en-US', { month: 'long' }),
                    events: count
                  };
                })}
              margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={token.var("colors.border.default")}
                opacity={0.3}
              />
              <XAxis dataKey="month" tick={{ fill: token.var("colors.fg.muted"), fontSize: 12 }} />
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
              <Bar dataKey="events" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </Card.Body>
    </Card.Root>
  );
}
