import { useState } from "react";
import { Grid, VStack, HStack } from "styled-system/jsx";
import { css } from "styled-system/css";
import * as Card from "~/components/ui/styled/card";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";

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
  onPresetChange: (preset: string) => void;
  onDateRangeChange: (range: { startDate: Date | null; endDate: Date | null }) => void;
  onFilterByFavoritesChange: (value: boolean) => void;
  onActivePresetChange: (preset: string | null) => void;
}

export function FilterControls({
  dateRange,
  activePreset,
  filterByFavorites,
  favoriteArtists,
  onPresetChange,
  onDateRangeChange,
  onFilterByFavoritesChange,
  onActivePresetChange
}: FilterControlsProps) {
  const [showCustomDates, setShowCustomDates] = useState(false);

  return (
    <Grid gap="6" columns={{ base: 1, lg: 2 }}>
      {/* Date Range Filters */}
      <Card.Root>
        <Card.Header>
          <HStack justifyContent="space-between" alignItems="center">
            <Card.Title>Date Range</Card.Title>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCustomDates(!showCustomDates)}
            >
              {showCustomDates ? "Hide Custom" : "Custom Dates"}
            </Button>
          </HStack>
        </Card.Header>
        <Card.Body>
          <VStack gap="4" alignItems="stretch">
            {/* Preset Buttons */}
            <HStack gap="3" flexWrap="wrap">
              <Button
                size="sm"
                variant={activePreset === "thisYear" ? "solid" : "outline"}
                colorPalette="blue"
                onClick={() => onPresetChange("thisYear")}
              >
                This Year
              </Button>
              <Button
                size="sm"
                variant={activePreset === "last30Days" ? "solid" : "outline"}
                colorPalette="blue"
                onClick={() => onPresetChange("last30Days")}
              >
                Last 30 Days
              </Button>
              <Button
                size="sm"
                variant={activePreset === "last6Months" ? "solid" : "outline"}
                colorPalette="blue"
                onClick={() => onPresetChange("last6Months")}
              >
                Last 6 Months
              </Button>
              <Button
                size="sm"
                variant={activePreset === "lastYear" ? "solid" : "outline"}
                colorPalette="blue"
                onClick={() => onPresetChange("lastYear")}
              >
                Last Year
              </Button>
              <Button
                size="sm"
                variant={activePreset === "last2Years" ? "solid" : "outline"}
                colorPalette="blue"
                onClick={() => onPresetChange("last2Years")}
              >
                Last 2 Years
              </Button>
              <Button
                size="sm"
                variant={activePreset === "last3Years" ? "solid" : "outline"}
                colorPalette="blue"
                onClick={() => onPresetChange("last3Years")}
              >
                Last 3 Years
              </Button>
              <Button
                size="sm"
                variant={activePreset === "allTime" ? "solid" : "outline"}
                colorPalette="blue"
                onClick={() => onPresetChange("allTime")}
              >
                All Time
              </Button>
            </HStack>

            {/* Custom Date Inputs */}
            {showCustomDates && (
              <HStack gap="4" flexWrap="wrap">
                <VStack gap="2" alignItems="flex-start">
                  <Text size="xs" fontWeight="medium" color="fg.muted">
                    Start Date
                  </Text>
                  <input
                    type="date"
                    value={dateRange.startDate?.toISOString().split("T")[0] || ""}
                    onChange={(e) => {
                      const newDate = e.target.value ? new Date(e.target.value) : null;
                      onDateRangeChange({
                        ...dateRange,
                        startDate: newDate
                      });
                      onActivePresetChange(null);
                    }}
                    className={css({
                      p: "2",
                      borderRadius: "md",
                      borderWidth: "1px",
                      borderColor: "border.default",
                      bg: "bg.default",
                      color: "fg.default",
                      fontSize: "sm",
                      _focus: {
                        outline: "none",
                        borderColor: "colorPalette.default",
                        ring: "2px",
                        ringColor: "colorPalette.default"
                      }
                    })}
                  />
                </VStack>

                <VStack gap="2" alignItems="flex-start">
                  <Text size="xs" fontWeight="medium" color="fg.muted">
                    End Date
                  </Text>
                  <input
                    type="date"
                    value={dateRange.endDate?.toISOString().split("T")[0] || ""}
                    onChange={(e) => {
                      const newDate = e.target.value ? new Date(e.target.value) : null;
                      onDateRangeChange({
                        ...dateRange,
                        endDate: newDate
                      });
                      onActivePresetChange(null);
                    }}
                    className={css({
                      p: "2",
                      borderRadius: "md",
                      borderWidth: "1px",
                      borderColor: "border.default",
                      bg: "bg.default",
                      color: "fg.default",
                      fontSize: "sm",
                      _focus: {
                        outline: "none",
                        borderColor: "colorPalette.default",
                        ring: "2px",
                        ringColor: "colorPalette.default"
                      }
                    })}
                  />
                </VStack>
              </HStack>
            )}

            {/* Current Range Display */}
            <Text size="xs" color="fg.muted">
              Showing events from{" "}
              <Text as="span" fontWeight="semibold" color="fg.default">
                {dateRange.startDate?.toLocaleDateString() || "beginning"}
              </Text>
              {" to "}
              <Text as="span" fontWeight="semibold" color="fg.default">
                {dateRange.endDate?.toLocaleDateString() || "now"}
              </Text>
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>

      {/* Favorite Artists Filter */}
      <Card.Root>
        <Card.Header>
          <Card.Title>Artist Filter</Card.Title>
          <Card.Description>
            Show only events with your favorite artists
          </Card.Description>
        </Card.Header>
        <Card.Body>
          <VStack gap="4" alignItems="stretch">
            <Button
              size="md"
              variant={filterByFavorites ? "solid" : "outline"}
              colorPalette={filterByFavorites ? "blue" : "gray"}
              onClick={() => onFilterByFavoritesChange(!filterByFavorites)}
              disabled={!favoriteArtists?.length}
            >
              {filterByFavorites
                ? "✓ Showing Favorite Artists Only"
                : "Show All Artists"}
            </Button>

            {favoriteArtists && favoriteArtists.length > 0 && (
              <Text size="xs" color="fg.muted">
                {favoriteArtists.length} favorite artist
                {favoriteArtists.length !== 1 ? "s" : ""} found:{" "}
                {favoriteArtists.map((a) => a.name).join(", ")}
              </Text>
            )}

            {(!favoriteArtists || favoriteArtists.length === 0) && (
              <Text size="xs" color="fg.muted">
                No favorite artists found in your Eventernote profile
              </Text>
            )}
          </VStack>
        </Card.Body>
      </Card.Root>
    </Grid>
  );
}
