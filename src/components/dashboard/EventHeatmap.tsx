import { useEffect, useRef } from "react";
import { Box, HStack } from "styled-system/jsx";
import * as Card from "~/components/ui/styled/card";
import CalHeatmap from "cal-heatmap";
import Tooltip from "cal-heatmap/plugins/Tooltip";
import "cal-heatmap/cal-heatmap.css";
import LegendLite from "cal-heatmap/plugins/LegendLite";
import CalendarLabel from "cal-heatmap/plugins/CalendarLabel";
import { useColorMode } from "~/contexts/ColorModeContext";

interface EventHeatmapProps {
  dateEventMap: Map<string, number>;
}

export function EventHeatmap({ dateEventMap }: EventHeatmapProps) {
  const heatmapRef = useRef<HTMLDivElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);
  const calInstance = useRef<CalHeatmap>(new CalHeatmap());
  const { colorMode } = useColorMode();

  useEffect(() => {
    if (!heatmapRef.current || !dateEventMap || dateEventMap.size === 0) return;

    // Convert Map to array format and find date range
    const heatmapData: Array<{ date: string; value: number }> = [];
    let minDate: Date = new Date();
    let maxDate: Date = new Date();
    const values: number[] = [];

    dateEventMap.forEach((count, dateStr) => {
      heatmapData.push({ date: dateStr, value: count });
      values.push(count);

      const date = new Date(dateStr);
      if (!minDate || date < minDate) minDate = date;
      if (!maxDate || date > maxDate) maxDate = date;
    });

    // Calculate dynamic thresholds based on data
    const maxValue = Math.max(...values);
    const threshold1 = Math.ceil(maxValue * 0.25);
    const threshold2 = Math.ceil(maxValue * 0.5);
    const threshold3 = Math.ceil(maxValue * 0.75);

    // Calculate number of months in the range
    const monthsDiff =
      (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
      (maxDate.getMonth() - minDate.getMonth()) +
      1;

    calInstance.current.paint(
      {
        theme: colorMode,
        range: Math.max(1, monthsDiff),
        itemSelector: heatmapRef.current,
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
          gutter: 4,
          label: { text: "MMM", textAlign: "start", position: "top" }
        },
        subDomain: {
          type: "ghDay",
          radius: 2,
          width: 11,
          height: 11,
          gutter: 4
        }
      },
      [
        [
          Tooltip,
          {
            text: function (_date: Date, value: number | null, dayjsDate: any) {
              return (
                (value ? value : "No") +
                " events on " +
                dayjsDate.format("dddd, MMMM D, YYYY")
              );
            }
          }
        ],
        [
          LegendLite,
          {
            includeBlank: true,
            itemSelector: legendRef.current,
            radius: 2,
            width: 11,
            height: 11,
            gutter: 4
          }
        ],
        [
          CalendarLabel,
          {
            width: 30,
            textAlign: "start",
            text: () =>
              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) =>
                i % 2 == 0 ? "" : d
              ),
            padding: [25, 0, 0, 0]
          }
        ]
      ]
    );

    return () => {
      calInstance.current.destroy();
    };
  }, [dateEventMap, colorMode]);

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Activity Heatmap</Card.Title>
        <Card.Description>
          Visual overview of your event attendance patterns
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <Box w="full" overflowX="auto">
          <div ref={heatmapRef} />
          <HStack
            gap="1"
            justifyContent="flex-end"
            mt="2"
            fontSize="xs"
            color="fg.muted"
          >
            <Box>Less</Box>
            <div ref={legendRef} />
            <Box>More</Box>
          </HStack>
        </Box>
      </Card.Body>
    </Card.Root>
  );
}
