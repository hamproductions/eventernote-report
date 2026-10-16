import { HStack, Box } from "styled-system/jsx";
import { css } from "styled-system/css";
import { Switch } from "~/components/ui/switch";
import { Text } from "~/components/ui/text";
import { PillGroup } from "./PillGroup";
import { InfoTip } from "./InfoTip";
import { formatDate, formatDisplayDate } from "~/shared/utils/dateUtils";

interface FavoriteArtist {
  name: string;
  href: string;
}

interface FilterControlsProps {
  dateRange: {
    startDate: Date | null;
    endDate: Date | null;
  };
  activePreset: string | null;
  filterByFavorites: boolean;
  favoriteArtists: FavoriteArtist[] | undefined;
  favoritesFailed?: boolean;
  onPresetChange: (preset: string) => void;
  onDateRangeChange: (range: { startDate: Date | null; endDate: Date | null }) => void;
  onFilterByFavoritesChange: (value: boolean) => void;
  onActivePresetChange: (preset: string | null) => void;
}

const PRESETS = [
  ["thisYear", "This year"],
  ["last30Days", "30 days"],
  ["last6Months", "6 months"],
  ["lastYear", "Last year"],
  ["last2Years", "2 years"],
  ["last3Years", "3 years"],
  ["allTime", "All time"],
  ["custom", "Custom"]
] as const;

const YEARS = Array.from({ length: new Date().getFullYear() - 2008 }, (_, index) => new Date().getFullYear() - index);

const dateInput = css({
  h: { base: "11", md: "8" },
  px: "2",
  borderRadius: "md",
  borderWidth: "1px",
  borderColor: "border.control",
  bg: "bg.default",
  color: "fg.default",
  fontSize: "sm",
  colorScheme: "light dark"
});

export function FilterControls({
  dateRange,
  activePreset,
  filterByFavorites,
  favoriteArtists,
  favoritesFailed,
  onPresetChange,
  onDateRangeChange,
  onFilterByFavoritesChange,
  onActivePresetChange
}: FilterControlsProps) {
  const value = activePreset === null ? "custom" : activePreset;

  return (
    <HStack gap="3" flexWrap="wrap" justifyContent="space-between">
      <HStack gap="3" flexWrap="wrap" minW="0" maxW="full">
        <Box
          overflowX="auto"
          maxW="full"
          scrollbarWidth="none"
          maskImage={{ base: "linear-gradient(to right, black calc(100% - 32px), transparent)", lg: "none" }}
          pr={{ base: "6", lg: "0" }}
        >
          <PillGroup
            label="Date range"
            value={value}
            options={PRESETS}
            onChange={(key) => (key === "custom" ? onActivePresetChange(null) : onPresetChange(key))}
          />
        </Box>

        <select
          aria-label="Pick a year"
          value={activePreset?.startsWith("year-") ? activePreset : ""}
          onChange={(e) => e.target.value && onPresetChange(e.target.value)}
          className={dateInput}
        >
          <option value="">Pick year…</option>
          {YEARS.map((year) => (
            <option key={year} value={`year-${year}`}>{year}</option>
          ))}
        </select>

        {value === "custom" ? (
          <HStack gap="2">
            <input
              type="date"
              aria-label="Start date"
              value={dateRange.startDate ? formatDate(dateRange.startDate) : ""}
              onChange={(e) => onDateRangeChange({ ...dateRange, startDate: e.target.value ? new Date(`${e.target.value}T00:00:00`) : null })}
              className={dateInput}
            />
            <Text size="sm" color="fg.muted">to</Text>
            <input
              type="date"
              aria-label="End date"
              value={dateRange.endDate ? formatDate(dateRange.endDate) : ""}
              onChange={(e) => onDateRangeChange({ ...dateRange, endDate: e.target.value ? new Date(`${e.target.value}T00:00:00`) : null })}
              className={dateInput}
            />
          </HStack>
        ) : (
          <Text size="sm" color="fg.muted" fontVariantNumeric="tabular-nums" whiteSpace="nowrap">
            {dateRange.startDate ? formatDisplayDate(dateRange.startDate) : "First event"} to {dateRange.endDate ? formatDisplayDate(dateRange.endDate) : "today"}
          </Text>
        )}
      </HStack>

      <HStack gap="0">
      <Switch
        size="sm"
        minH={{ base: "11", md: "auto" }}
        checked={filterByFavorites}
        disabled={!favoriteArtists?.length}
        onCheckedChange={(details) => onFilterByFavoritesChange(details.checked)}
      >
        {favoritesFailed
          ? "Favorites unavailable"
          : favoriteArtists === undefined
          ? "Favorites only (loading…)"
          : favoriteArtists.length
            ? `Favorites only (${favoriteArtists.length})`
            : "No favorites on profile"}
      </Switch>
      <InfoTip label="Favorites only">
        Limits every section to events where at least one artist you marked as a favorite on Eventernote performed
        {favoriteArtists?.length ? `: ${favoriteArtists.map((artist) => artist.name).join(", ")}` : ""}. Events Without Favorites still compares against all events.
      </InfoTip>
      </HStack>
    </HStack>
  );
}
