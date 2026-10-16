import type { ReactNode, RefObject } from "react";
import { Box, HStack, VStack } from "styled-system/jsx";
import { css } from "styled-system/css";
import { encode } from "uqr";
import { formatDisplayDate, formatDisplayMonth } from "~/shared/utils/dateUtils";

export type PosterTheme = "dark" | "light";

export interface PosterData {
  name: string;
  userId: string;
  period: string;
  rangeStart: string;
  rangeEnd: string;
  favoritesOnly: boolean;
  eventDates: string[];
  totalEvents: number;
  daysOut: number;
  totalDays: number;
  venues: number;
  artists: number;
  weekendShare: number;
  weekendsOut: [number, number];
  multiEventDays: number;
  maxDay: { count: number; date: string | null };
  streak: { days: number; start: string | null; end: string | null };
  weeklyStreak: number;
  busiestMonth: [string, number] | null;
  topArtists: [string, number][];
  topVenues: [string, number][];
  favoriteBest: { name: string; pct: number } | null;
  url: string;
}

const PALETTES = {
  dark: { bg: "#101012", fg: "#f3f2ee", muted: "#9d9ca3", line: "#34343b", accent: "#4aa3ff", scale: ["#1f1f24", "#163a63", "#1f5fa3", "#3b8be6", "#8cc6ff"] },
  light: { bg: "#f4f1ea", fg: "#141416", muted: "#5f5d58", line: "#cfcac0", accent: "#0b66c2", scale: ["#e4dfd4", "#b9d7f5", "#6fb0ee", "#2a7fd6", "#0b4f99"] }
} as const;

type Palette = (typeof PALETTES)[PosterTheme];

const DAY = 24 * 60 * 60 * 1000;
const GRID_WIDTH = 952;

function toTime(date: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00`).getTime();
}

function dateKey(time: number) {
  const date = new Date(time);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function level(count: number, max: number) {
  if (!count) return 0;
  if (max <= 1) return 4;
  return Math.min(4, 1 + Math.floor(((count - 1) / (max - 1)) * 3.999));
}

function DailyHeatmap({ dates, start, end, c }: { dates: string[]; start: string; end: string; c: Palette }) {
  const counts = new Map<string, number>();
  for (const date of dates) counts.set(date, (counts.get(date) || 0) + 1);
  const first = new Date(toTime(start));
  first.setDate(first.getDate() - first.getDay());
  const last = toTime(end);
  const weeks = Math.max(1, Math.ceil((last - first.getTime() + DAY) / (7 * DAY)));
  const cell = Math.min(40, Math.floor((GRID_WIDTH - 40) / weeks) - 3);
  const max = Math.max(1, ...counts.values());
  const columns: { key: string; count: number; inRange: boolean }[][] = [];
  const months: { label: string; column: number }[] = [];
  for (let week = 0; week < weeks; week++) {
    const column = [];
    for (let day = 0; day < 7; day++) {
      const time = first.getTime() + (week * 7 + day) * DAY;
      const key = dateKey(time);
      if (key >= start && (key.endsWith("-01") || key === start)) {
        const label = new Date(time).toLocaleDateString("en-US", { month: "short" });
        if (!months.length || months[months.length - 1].column < week - 2) months.push({ label, column: week });
      }
      column.push({ key, count: counts.get(key) || 0, inRange: key >= start && time <= last });
    }
    columns.push(column);
  }
  return (
    <VStack gap="8px" alignItems="flex-start">
      <Box position="relative" h="20px" w="full" ml="40px">
        {months.map((month) => (
          <Box key={`${month.label}-${month.column}`} position="absolute" fontSize="16px" style={{ left: month.column * (cell + 3), color: c.muted }}>{month.label}</Box>
        ))}
      </Box>
      <HStack gap="0" alignItems="flex-start">
        <VStack gap="3px" w="40px" fontSize="14px" alignItems="flex-start" style={{ color: c.muted }}>
          {["", "Mon", "", "Wed", "", "Fri", ""].map((label, index) => (
            <Box key={index} style={{ lineHeight: `${cell}px`, height: cell }}>{label}</Box>
          ))}
        </VStack>
        <HStack gap="3px" alignItems="flex-start">
          {columns.map((column, index) => (
            <VStack key={index} gap="3px">
              {column.map((day) => (
                <Box key={day.key} borderRadius="3px" style={{ width: cell, height: cell, background: day.inRange ? c.scale[level(day.count, max)] : "transparent" }} />
              ))}
            </VStack>
          ))}
        </HStack>
      </HStack>
    </VStack>
  );
}

function YearlyHeatmap({ dates, c }: { dates: string[]; c: Palette }) {
  const years = new Map<number, number[]>();
  for (const date of dates) {
    const time = toTime(date);
    const year = new Date(time).getFullYear();
    const week = Math.min(52, Math.floor((time - new Date(year, 0, 1).getTime()) / (7 * DAY)));
    if (!years.has(year)) years.set(year, new Array(53).fill(0));
    years.get(year)![week]++;
  }
  const known = [...years.keys()];
  const firstYear = Math.max(Math.min(...known), Math.max(...known) - 11);
  const rows: [number, number[]][] = [];
  for (let year = firstYear; year <= Math.max(...known); year++) rows.push([year, years.get(year) ?? new Array(53).fill(0)]);
  const max = Math.max(1, ...rows.flatMap(([, weeks]) => weeks));
  const cell = Math.floor((GRID_WIDTH - 64) / 53) - 2;
  const rowHeight = Math.min(cell, Math.floor(216 / rows.length) - 3);
  return (
    <VStack gap="3px" alignItems="flex-start">
      {rows.map(([year, weeks]) => (
        <HStack key={year} gap="0">
          <Box w="64px" fontSize="15px" fontWeight="600" style={{ lineHeight: `${rowHeight}px`, height: rowHeight, color: c.muted }}>{year}</Box>
          <HStack gap="2px">
            {weeks.map((count, index) => (
              <Box key={index} borderRadius="2px" style={{ width: cell, height: rowHeight, background: c.scale[level(count, max)] }} />
            ))}
          </HStack>
        </HStack>
      ))}
    </VStack>
  );
}

function QrCode({ value, size }: { value: string; size: number }) {
  const qr = encode(value, { ecc: "M", border: 2 });
  const path = qr.data.flatMap((row, y) => row.map((dark, x) => (dark ? `M${x} ${y}h1v1h-1z` : ""))).join("");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges" style={{ borderRadius: 8, flexShrink: 0 }}>
      <rect width={qr.size} height={qr.size} fill="#ffffff" />
      <path d={path} fill="#111113" />
    </svg>
  );
}

function shortDate(date: string, withYear: boolean) {
  return withYear ? formatDisplayDate(date) : formatDisplayDate(date).replace(/, \d{4}$/, "");
}

export function SharePoster({ data, theme, posterRef }: { data: PosterData; theme: PosterTheme; posterRef: RefObject<HTMLDivElement | null> }) {
  const c = PALETTES[theme];
  const multiYear = data.rangeStart.slice(0, 4) !== data.rangeEnd.slice(0, 4);
  const daily = toTime(data.rangeEnd) - toTime(data.rangeStart) <= 400 * DAY;
  const cut = { borderTop: `2px dashed ${c.line}` };
  const n = (value: ReactNode) => <Box as="span" fontWeight="800" style={{ color: c.accent }}>{value}</Box>;
  const [headliner, ...rest] = data.topArtists;
  const second = rest.slice(0, 2);
  const third = rest.slice(2, 7);
  const busiestMonth = data.busiestMonth ? (multiYear ? formatDisplayMonth(data.busiestMonth[0]) : formatDisplayMonth(data.busiestMonth[0]).replace(/ \d{4}$/, "")) : null;

  const lines: ReactNode[] = [
    <>Out on {n(data.daysOut)} of {data.totalDays} days, and {n(data.weekendsOut[0])} of {data.weekendsOut[1]} weekends.</>,
    data.maxDay.count > 1 && data.maxDay.date ? <>Record day: {n(`${data.maxDay.count} events`)} on {shortDate(data.maxDay.date, multiYear)}.</> : null,
    data.streak.days > 1 && data.streak.start && data.streak.end ? <>Longest run: {n(`${data.streak.days} days`)} straight, {shortDate(data.streak.start, multiYear && data.streak.start.slice(0, 4) !== data.streak.end.slice(0, 4))} to {shortDate(data.streak.end, multiYear)}.</> : null,
    data.busiestMonth ? <>Busiest month: {busiestMonth}, {n(data.busiestMonth[1])} events{data.weeklyStreak > 1 ? <>. {n(`${data.weeklyStreak} weeks`)} in a row with a show</> : null}.</> : null,
    data.favoriteBest ? <>Most loyal to {data.favoriteBest.name}: {n(`${Math.round(data.favoriteBest.pct)}%`)} of their events.</> : <>{n(`${Math.round(data.weekendShare)}%`)} of events on a weekend, {n(data.multiEventDays)} days with two or more.</>
  ].filter(Boolean);

  return (
    <Box
      ref={posterRef}
      w="1080px"
      h="1350px"
      px="64px"
      py="56px"
      display="flex"
      flexDirection="column"
      gap="26px"
      className={css({ transition: "none", "& *": { transition: "none" } })}
      fontFamily="system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', sans-serif"
      style={{ background: c.bg, color: c.fg }}
    >
      <HStack justifyContent="space-between" alignItems="flex-end" gap="32px">
        <VStack gap="0" alignItems="flex-start" minW="0">
          <Box fontSize="26px" fontWeight="600" style={{ color: c.muted }}>
            {data.period}{data.favoritesOnly ? " · favorites only" : ""}
          </Box>
          <HStack alignItems="baseline" gap="20px">
            <Box fontSize="168px" fontWeight="900" lineHeight="1" letterSpacing="-0.06em" fontVariantNumeric="tabular-nums" style={{ color: c.accent }}>{data.totalEvents}</Box>
            <Box fontSize="56px" fontWeight="800" letterSpacing="-0.02em">shows</Box>
          </HStack>
        </VStack>
        <VStack gap="2px" alignItems="flex-end" pb="22px" minW="0" maxW="360px">
          <Box fontSize="34px" fontWeight="800" textAlign="right" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" maxW="full">{data.name}</Box>
          <Box fontSize="20px" textAlign="right" style={{ color: c.muted }}>{data.venues} venues · {data.artists} artists</Box>
        </VStack>
      </HStack>

      <Box pt="22px" style={cut}>
        {daily ? <DailyHeatmap dates={data.eventDates} start={data.rangeStart} end={data.rangeEnd} c={c} /> : <YearlyHeatmap dates={data.eventDates} c={c} />}
      </Box>

      {headliner && (
        <VStack gap="10px" alignItems="center" textAlign="center" pt="22px" style={cut}>
          <Box fontSize="18px" fontWeight="700" letterSpacing="0.2em" style={{ color: c.muted }}>LINEUP</Box>
          <Box fontSize="76px" fontWeight="900" lineHeight="1" letterSpacing="-0.03em" maxW="full" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
            {headliner[0]}<Box as="span" fontSize="30px" fontWeight="700" ml="10px" style={{ color: c.accent }}>×{headliner[1]}</Box>
          </Box>
          {second.length > 0 && (
            <Box fontSize="44px" fontWeight="800" lineHeight="1.1" maxW="full" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
              {second.map(([name, count], index) => (
                <Box as="span" key={name}>
                  {index > 0 && <Box as="span" mx="18px" style={{ color: c.line }}>/</Box>}
                  {name}<Box as="span" fontSize="22px" fontWeight="700" ml="6px" style={{ color: c.accent }}>×{count}</Box>
                </Box>
              ))}
            </Box>
          )}
          {third.length > 0 && (
            <Box fontSize="26px" fontWeight="700" lineHeight="1.35" maxW="900px" lineClamp="2">
              {third.map(([name, count], index) => (
                <Box as="span" key={name}>
                  {index > 0 && <Box as="span" mx="12px" style={{ color: c.line }}>·</Box>}
                  {name}<Box as="span" fontSize="18px" ml="4px" style={{ color: c.muted }}>×{count}</Box>
                </Box>
              ))}
            </Box>
          )}
        </VStack>
      )}

      <VStack gap="8px" alignItems="flex-start" pt="22px" fontSize="27px" lineHeight="1.35" style={cut}>
        {lines.map((line, index) => (
          <Box key={index}>{line}</Box>
        ))}
      </VStack>

      {data.topVenues.length > 0 && (
        <Box fontSize="21px" lineHeight="1.5" lineClamp="2" style={{ color: c.muted }}>
          <Box as="span" fontWeight="700" style={{ color: c.fg }}>Venues </Box>
          {data.topVenues.map(([name, count], index) => (
            <Box as="span" key={name}>{index > 0 ? " · " : ""}{name} ×{count}</Box>
          ))}
        </Box>
      )}

      <HStack justifyContent="space-between" alignItems="center" gap="32px" mt="auto" pt="20px" style={cut}>
        <VStack gap="2px" alignItems="flex-start" minW="0">
          <Box fontSize="22px" fontWeight="700">@{data.userId} on Eventernote</Box>
          <Box fontSize="18px" style={{ color: c.muted }}>{data.url.replace(/^https?:\/\//, "")}</Box>
        </VStack>
        <QrCode value={data.url} size={96} />
      </HStack>
    </Box>
  );
}
