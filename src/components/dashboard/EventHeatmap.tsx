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
  const scrollRef = useRef<HTMLDivElement>(null);
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

    const heatmapTarget = document.createElement("div");
    const legendTarget = document.createElement("div");
    heatmapRef.current.replaceChildren(heatmapTarget);
    legendRef.current?.replaceChildren(legendTarget);
    const calendar = new CalHeatmap();
    calendar.paint(
      {
        theme: colorMode,
        range: Math.max(1, monthsDiff),
        itemSelector: heatmapTarget,
        data: {
          source: heatmapData,
          x: "date",
          y: (d: any) => +d.value
        },
        date: { start: minDate },
        scale: {
          color: {
            type: "threshold",
            range: colorMode === "dark"
              ? ["#104d87", "#2870bd", "#3b9eff", "#70b8ff"]
              : ["#acd8fc", "#5eb1ef", "#0588f0", "#0d74ce"],
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
            includeBlank: false,
            itemSelector: legendTarget,
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

    const scrollToLatest = window.setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }, 300);

    return () => {
      window.clearTimeout(scrollToLatest);
      calendar.destroy();
      heatmapTarget.remove();
      legendTarget.remove();
    };
  }, [dateEventMap, colorMode]);

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>Days you went out</Card.Title>
        <Card.Description>
          One square per day. Stronger blue means more events that day.
        </Card.Description>
      </Card.Header>
      <Card.Body>
        <Box ref={scrollRef} w="full" overflowX="auto" scrollbarWidth="thin">
          <div ref={heatmapRef} />
        </Box>
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
      </Card.Body>
    </Card.Root>
  );
}
