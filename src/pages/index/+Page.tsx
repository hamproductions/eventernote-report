import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReport } from '../../contexts/ReportContext';
import { useColorMode } from '../../contexts/ColorModeContext';
import { calculateComprehensiveAnalytics, calculateChartAnalytics } from '../../server/utils/calculations';
import { Box, VStack, Grid } from 'styled-system/jsx';
import { css } from 'styled-system/css';
import { token } from 'styled-system/tokens';
import { Button } from '~/components/ui/button';
import * as Card from '~/components/ui/styled/card';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { domToPng } from 'modern-screenshot';
import {
  DashboardHeader,
  StatsCards,
  DistributionCharts,
  EventHeatmap,
  RecentEventsList,
  FilterControls,
  TopArtistsVenues,
  ArtistAttendanceGrowth,
  MonthlyBreakdown,
  ExportPreview,
  RadarChart
} from '~/components/dashboard';
import type { EnhancedEvent } from '~/shared/types/event';

interface EventsResponse {
  success: boolean;
  data: {
    events: EnhancedEvent[];
    totalCount: number;
    cached: boolean;
  };
}

interface FavoriteArtist {
  name: string;
  href: string;
}

interface FavoriteArtistsResponse {
  success: boolean;
  data: FavoriteArtist[];
}

export default function Page() {
  const { userId, setUserId, dateRange, setDateRange } = useReport();
  const { colorMode, setColorMode } = useColorMode();
  const [inputValue, setInputValue] = useState(userId || '');
  const [artistsViewLimit, setArtistsViewLimit] = useState<number>(10);
  const [venuesViewLimit, setVenuesViewLimit] = useState<number>(10);
  const [eventsViewLimit, setEventsViewLimit] = useState<number>(20);
  const [filterByFavorites, setFilterByFavorites] = useState(false);
  const eventsListRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const dateChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced date range setter to prevent race conditions
  const debouncedSetDateRange = useCallback((newRange: typeof dateRange) => {
    if (dateChangeTimeoutRef.current) {
      clearTimeout(dateChangeTimeoutRef.current);
    }
    dateChangeTimeoutRef.current = setTimeout(() => {
      setDateRange(newRange);
    }, 300); // 300ms debounce
  }, [setDateRange]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (dateChangeTimeoutRef.current) {
        clearTimeout(dateChangeTimeoutRef.current);
      }
    };
  }, []);

  // Serialize date range for stable query key
  const dateRangeKey = useMemo(() => ({
    start: dateRange.startDate?.toISOString().split('T')[0] || null,
    end: dateRange.endDate?.toISOString().split('T')[0] || null
  }), [dateRange]);

  const {
    data: eventsData,
    isLoading,
    isError,
    isFetching
  } = useQuery<EventsResponse>({
    queryKey: ['events', userId, dateRangeKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate) {
        params.set('startDate', dateRange.startDate.toISOString().split('T')[0]);
      }
      if (dateRange.endDate) {
        params.set('endDate', dateRange.endDate.toISOString().split('T')[0]);
      }

      const res = await fetch(`/api/events/user/${userId}?${params}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      return res.json();
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    placeholderData: (previousData) => previousData // Keep previous data while fetching
  });

  const { data: favoriteArtistsData } = useQuery<FavoriteArtistsResponse>({
    queryKey: ['favoriteArtists', userId],
    queryFn: async () => {
      const res = await fetch(`/api/favorite-artists/user/${userId}`);
      if (!res.ok) throw new Error('Failed to fetch favorite artists');
      return res.json();
    },
    enabled: !!userId
  });

  // Filter events by date range only (for statistics)
  const filteredEvents = useMemo(() => {
    if (!eventsData?.data?.events) return [];

    const now = new Date();

    return eventsData.data.events
      .map(event => ({
        ...event,
        parsedDate: new Date(event.date)
      }))
      .filter(event => {
        const eventDate = event.parsedDate;

        // Exclude future events
        if (eventDate > now) return false;

        // Apply date range filters
        if (dateRange.startDate && eventDate < dateRange.startDate) return false;
        if (dateRange.endDate && eventDate > dateRange.endDate) return false;

        return true;
      });
  }, [eventsData, dateRange]);

  // Filter events for charts (date range + favorite artists)
  const chartFilteredEvents = useMemo(() => {
    if (!filteredEvents.length) return [];

    const favoriteArtistNames = favoriteArtistsData?.data?.map(a => a.name) || [];

    if (!filterByFavorites || favoriteArtistNames.length === 0) {
      return filteredEvents;
    }

    return filteredEvents.filter(event => {
      const hasFavoriteArtist = event.artists?.some(artist =>
        favoriteArtistNames.includes(artist)
      );
      return hasFavoriteArtist;
    });
  }, [filteredEvents, filterByFavorites, favoriteArtistsData]);

  // Calculate analytics for stats cards (using all date-filtered events)
  const analytics = useMemo(() => {
    if (!filteredEvents.length) return null;

    const comprehensiveAnalytics = calculateComprehensiveAnalytics(filteredEvents);

    // Calculate events without favorites
    const favoriteArtistNames = favoriteArtistsData?.data?.map(a => a.name) || [];
    const eventsWithoutFavorites = favoriteArtistNames.length > 0
      ? filteredEvents.filter(event => {
          const hasFavoriteArtist = event.artists?.some(artist =>
            favoriteArtistNames.includes(artist)
          );
          return !hasFavoriteArtist;
        }).length
      : 0;
    const eventsWithoutFavoritesPercentage = favoriteArtistNames.length > 0
      ? (eventsWithoutFavorites / filteredEvents.length) * 100
      : 0;

    // Flatten structure for component consumption
    return {
      totalEvents: comprehensiveAnalytics.basic.totalEvents,
      uniqueVenues: comprehensiveAnalytics.basic.uniqueVenues,
      uniqueArtists: comprehensiveAnalytics.basic.uniqueArtists,
      totalArtistAppearances: comprehensiveAnalytics.basic.totalArtistAppearances,
      dateRange: comprehensiveAnalytics.basic.dateRange,
      eventsWithoutFavorites,
      eventsWithoutFavoritesPercentage,
      avgEventsPerMonth: comprehensiveAnalytics.temporal.avgEventsPerMonth,
      topDayOfWeek: comprehensiveAnalytics.temporal.topDayOfWeek,
      busiestMonth: comprehensiveAnalytics.temporal.busiestMonth,
      monthlyBreakdown: comprehensiveAnalytics.temporal.monthlyBreakdown,
      uniqueDays: comprehensiveAnalytics.activity.uniqueDays,
      totalDaysInRange: comprehensiveAnalytics.activity.totalDaysInRange,
      daysSpentPercentage: comprehensiveAnalytics.activity.daysSpentPercentage,
      yearsSinceFirst: comprehensiveAnalytics.activity.yearsSinceFirst,
      daysSinceFirst: comprehensiveAnalytics.activity.daysSinceFirst,
      weekendStats: comprehensiveAnalytics.activity.weekendStats,
      multiEventDayStats: comprehensiveAnalytics.activity.multiEventDayStats,
      streaks: {
        daily: {
          currentStreak: comprehensiveAnalytics.streaks.daily.currentStreak,
          longestStreak: comprehensiveAnalytics.streaks.daily.longestStreak,
          currentStreakStartDate: comprehensiveAnalytics.streaks.daily.currentStreakStartDate?.toISOString() || null,
          currentStreakEndDate: comprehensiveAnalytics.streaks.daily.currentStreakEndDate?.toISOString() || null,
          longestStreakStartDate: comprehensiveAnalytics.streaks.daily.longestStreakStartDate?.toISOString() || null,
          longestStreakEndDate: comprehensiveAnalytics.streaks.daily.longestStreakEndDate?.toISOString() || null,
          isActive: comprehensiveAnalytics.streaks.daily.isActive
        },
        weekly: {
          currentStreak: comprehensiveAnalytics.streaks.weekly.currentStreak,
          longestStreak: comprehensiveAnalytics.streaks.weekly.longestStreak,
          currentStreakStartDate: comprehensiveAnalytics.streaks.weekly.currentStreakStartDate?.toISOString() || null,
          currentStreakEndDate: comprehensiveAnalytics.streaks.weekly.currentStreakEndDate?.toISOString() || null,
          longestStreakStartDate: comprehensiveAnalytics.streaks.weekly.longestStreakStartDate?.toISOString() || null,
          longestStreakEndDate: comprehensiveAnalytics.streaks.weekly.longestStreakEndDate?.toISOString() || null,
          isActive: comprehensiveAnalytics.streaks.weekly.isActive
        }
      },
      topVenues: comprehensiveAnalytics.topLists.topVenues,
      topArtists: comprehensiveAnalytics.topLists.topArtists,
      recentEvents: comprehensiveAnalytics.topLists.recentEvents,
      mostAttendedArtist: comprehensiveAnalytics.topLists.topArtists[0],
      mostVisitedVenue: comprehensiveAnalytics.topLists.topVenues[0],
      artistMap: comprehensiveAnalytics.artistMap,
      venueMap: comprehensiveAnalytics.venueMap
    };
  }, [filteredEvents, favoriteArtistsData]);

  // Calculate analytics for charts (using favorite artists filter)
  const chartAnalytics = useMemo(() => {
    if (!chartFilteredEvents.length) return null;

    const chartData = calculateChartAnalytics(chartFilteredEvents, artistsViewLimit);

    // Flatten structure for component consumption
    return {
      totalEvents: chartData.basic.totalEvents,
      uniqueVenues: chartData.basic.uniqueVenues,
      uniqueArtists: chartData.basic.uniqueArtists,
      totalArtistAppearances: chartData.basic.totalArtistAppearances,
      dateRange: chartData.basic.dateRange,
      avgEventsPerMonth: chartData.temporal.avgEventsPerMonth,
      topDayOfWeek: chartData.temporal.topDayOfWeek,
      busiestMonth: chartData.temporal.busiestMonth,
      monthlyBreakdown: chartData.temporal.monthlyBreakdown,
      topVenues: chartData.topLists.topVenues,
      topArtists: chartData.topLists.topArtists,
      recentEvents: chartData.topLists.recentEvents,
      artistMap: chartData.artistMap,
      venueMap: chartData.venueMap,
      cumulativeArtistData: chartData.cumulativeArtistData,
      displayedArtists: chartData.displayedArtists,
      dateEventMap: chartData.dateEventMap,
      radarStats: chartData.radarStats
    };
  }, [chartFilteredEvents, artistsViewLimit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserId(inputValue);
  };

  const cycleArtistsView = (total: number) => {
    if (artistsViewLimit === 10) setArtistsViewLimit(50);
    else if (artistsViewLimit === 50) setArtistsViewLimit(100);
    else if (artistsViewLimit === 100) setArtistsViewLimit(total);
    else setArtistsViewLimit(10);
  };

  const cycleVenuesView = (total: number) => {
    if (venuesViewLimit === 10) setVenuesViewLimit(50);
    else if (venuesViewLimit === 50) setVenuesViewLimit(100);
    else if (venuesViewLimit === 100) setVenuesViewLimit(total);
    else setVenuesViewLimit(10);
  };

  const cycleEventsView = (total: number) => {
    if (eventsViewLimit === 20) setEventsViewLimit(50);
    else if (eventsViewLimit === 50) setEventsViewLimit(100);
    else if (eventsViewLimit === 100) setEventsViewLimit(total);
    else setEventsViewLimit(20);
  };

  const getArtistsViewLabel = (total: number) => {
    if (artistsViewLimit === 10) return 'Show Top 50';
    if (artistsViewLimit === 50) return 'Show Top 100';
    if (artistsViewLimit === 100) return `Show All (${total})`;
    return 'Show Top 10';
  };

  const getVenuesViewLabel = (total: number) => {
    if (venuesViewLimit === 10) return 'Show Top 50';
    if (venuesViewLimit === 50) return 'Show Top 100';
    if (venuesViewLimit === 100) return `Show All (${total})`;
    return 'Show Top 10';
  };

  const getEventsViewLabel = (total: number) => {
    if (eventsViewLimit === 20) return 'Show Top 50';
    if (eventsViewLimit === 50) return 'Show Top 100';
    if (eventsViewLimit === 100) return `Show All (${total})`;
    return 'Show Recent 20';
  };

  const copyEventsToClipboard = () => {
    if (!chartFilteredEvents.length) return;

    const eventsList = [...chartFilteredEvents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, eventsViewLimit)
      .map(event => {
        const date = event.date.split(' ')[0]; // Just the date part
        const monthDay = date.substring(5); // Remove year (YYYY-MM-DD -> MM-DD)
        return `${monthDay} - ${event.name}`;
      })
      .join('\n');

    navigator.clipboard.writeText(eventsList);
  };

  const exportEventsListAsPNG = async () => {
    if (!eventsListRef.current) return;

    try {
      const dataUrl = await domToPng(eventsListRef.current, {
        scale: 2,
        backgroundColor: token.var('colors.bg.default')
      });

      const link = document.createElement('a');
      link.download = `events-${userId}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to export PNG:', error);
    }
  };

  const exportStatsAsPNG = async () => {
    if (!exportRef.current) return;

    try {
      const dataUrl = await domToPng(exportRef.current, {
        scale: 2,
        backgroundColor: token.var('colors.bg.default')
      });

      const link = document.createElement('a');
      link.download = `stats-${userId}-${new Date().toISOString().split('T')[0]}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Failed to export stats PNG:', error);
    }
  };

  const [activePreset, setActivePreset] = useState<string | null>('thisYear');

  const setPresetRange = useCallback((preset: string) => {
    const now = new Date();
    const currentYear = now.getFullYear();

    let newRange;
    switch (preset) {
      case 'thisYear':
        newRange = {
          startDate: new Date(currentYear, 0, 1),
          endDate: now
        };
        break;
      case 'last30Days':
        newRange = {
          startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          endDate: now
        };
        break;
      case 'last6Months':
        newRange = {
          startDate: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
          endDate: now
        };
        break;
      case 'lastYear':
        newRange = {
          startDate: new Date(currentYear - 1, 0, 1),
          endDate: new Date(currentYear - 1, 11, 31)
        };
        break;
      case 'last2Years':
        newRange = {
          startDate: new Date(now.getFullYear() - 2, now.getMonth(), now.getDate()),
          endDate: now
        };
        break;
      case 'last3Years':
        newRange = {
          startDate: new Date(now.getFullYear() - 3, now.getMonth(), now.getDate()),
          endDate: now
        };
        break;
      case 'allTime':
        newRange = {
          startDate: null,
          endDate: now
        };
        break;
      default:
        return;
    }

    debouncedSetDateRange(newRange);
    setActivePreset(preset);
  }, [debouncedSetDateRange]);

  if (!userId) {
    return (
      <Box bg="bg.default" colorPalette="blue" minH="100vh" display="flex" alignItems="center" justifyContent="center" p={{ base: '6', md: '8' }}>
        <VStack gap="8" alignItems="stretch" maxW="550px" w="full">
          {/* Header */}
          <VStack gap="3" alignItems="center" textAlign="center">
            <Heading size="4xl" color="fg.default">
              Eventernote Reports
            </Heading>
            <Text size="md" color="fg.muted" maxW="400px">
              Analyze your concert history, discover patterns, and visualize your live music journey
            </Text>
          </VStack>

          {/* Card with Form */}
          <Card.Root>
            <Card.Header>
              <Card.Title>Get Started</Card.Title>
              <Card.Description>
                Enter your Eventernote User ID to generate your personalized report
              </Card.Description>
            </Card.Header>
            <Card.Body>
              <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <VStack gap="6" alignItems="stretch">
                  <VStack gap="3" alignItems="stretch">
                    <Text size="sm" fontWeight="medium" color="fg.default">
                      Eventernote User ID
                    </Text>
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="e.g., HamP_punipuni"
                      className={css({
                        w: 'full',
                        p: '3.5',
                        borderRadius: 'md',
                        borderWidth: '1px',
                        borderColor: 'border.default',
                        bg: 'bg.default',
                        color: 'fg.default',
                        fontSize: 'md',
                        transition: 'all 0.2s',
                        _hover: {
                          borderColor: 'border.emphasized'
                        },
                        _focus: {
                          outline: 'none',
                          borderColor: 'colorPalette.default',
                          ring: '2px',
                          ringColor: 'colorPalette.default',
                          ringOffset: '2px'
                        },
                        _placeholder: {
                          color: 'fg.subtle'
                        }
                      })}
                    />
                    <Text size="xs" color="fg.muted">
                      Find your User ID in your Eventernote profile URL
                    </Text>
                  </VStack>

                  <Button
                    type="submit"
                    w="full"
                    size="lg"
                    colorPalette="blue"
                    disabled={!inputValue.trim()}
                    className={css({
                      cursor: 'pointer',
                      touchAction: 'manipulation',
                      WebkitTapHighlightColor: 'transparent'
                    })}
                  >
                    Generate Report
                  </Button>
                </VStack>
              </form>
            </Card.Body>
          </Card.Root>

          {/* Footer hint */}
          <Text size="xs" color="fg.subtle" textAlign="center">
            Your data is fetched in real-time from Eventernote and cached for 5 minutes
          </Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box bg="bg.default" colorPalette="blue" minH="100vh" p={{ base: '4', md: '8' }}>
      <VStack gap="8" alignItems="stretch">
        <DashboardHeader
          colorMode={colorMode}
          onExportStats={exportStatsAsPNG}
          onToggleColorMode={() => setColorMode?.(colorMode === 'dark' ? 'light' : 'dark')}
          onChangeUser={() => setUserId(null)}
        />

        <FilterControls
          dateRange={dateRange}
          activePreset={activePreset}
          filterByFavorites={filterByFavorites}
          favoriteArtists={favoriteArtistsData?.data}
          onPresetChange={setPresetRange}
          onDateRangeChange={debouncedSetDateRange}
          onFilterByFavoritesChange={setFilterByFavorites}
          onActivePresetChange={setActivePreset}
        />

        {isLoading && <Text color="fg.muted">Loading events...</Text>}
        {isError && <Text color="fg.error">Error loading events</Text>}

        {analytics && (
          <Box ref={statsRef} position="relative">
            {/* Loading overlay to prevent stale data display */}
            {isFetching && !isLoading && (
              <Box
                position="absolute"
                top="0"
                left="0"
                right="0"
                bottom="0"
                bg="bg.default"
                opacity="0.7"
                zIndex="10"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="fg.muted" fontWeight="medium">Updating...</Text>
              </Box>
            )}
            <VStack gap="8" alignItems="stretch">
              {/* Profile and Overview - Side by Side */}
              <Grid
                gridTemplateColumns={{ base: '1fr', md: '2fr 3fr' }}
                gap="6"
                alignItems="stretch"
              >
                {/* Radar Chart - Eventing Profile */}
                {chartAnalytics && (
                  <RadarChart radarStats={chartAnalytics.radarStats} />
                )}

                {/* Stats Cards - Overview */}
                <StatsCards analytics={analytics} />
              </Grid>

              {/* Event Heatmap and Monthly Activity - Side by Side */}
              {chartAnalytics && (
                <Grid
                  gridTemplateColumns={{ base: '1fr', lg: '3fr 2fr' }}
                  gap="6"
                  alignItems="stretch"
                >
                  <EventHeatmap
                    dateEventMap={chartAnalytics.dateEventMap}
                  />
                  <MonthlyBreakdown
                    monthlyBreakdown={chartAnalytics.monthlyBreakdown}
                  />
                </Grid>
              )}

              {/* Cumulative Attendance - Artist Growth */}
              {chartAnalytics && (
                <ArtistAttendanceGrowth
                  cumulativeArtistData={chartAnalytics.cumulativeArtistData}
                  displayedArtists={chartAnalytics.displayedArtists}
                />
              )}

              {/* Distribution Charts - Side by Side */}
              {chartAnalytics && (
                <DistributionCharts
                  topVenues={chartAnalytics.topVenues}
                  topArtists={chartAnalytics.topArtists}
                />
              )}

              {/* Top Artists & Venues */}
              {chartAnalytics && (
                <TopArtistsVenues
                  artistMap={chartAnalytics.artistMap}
                  venueMap={chartAnalytics.venueMap}
                  artistsViewLimit={artistsViewLimit}
                  venuesViewLimit={venuesViewLimit}
                  uniqueArtists={chartAnalytics.uniqueArtists}
                  uniqueVenues={chartAnalytics.uniqueVenues}
                  events={chartFilteredEvents}
                  onCycleArtistsView={cycleArtistsView}
                  onCycleVenuesView={cycleVenuesView}
                  getArtistsViewLabel={getArtistsViewLabel}
                  getVenuesViewLabel={getVenuesViewLabel}
                />
              )}

              {/* Recent Events */}
              {chartAnalytics && (
                <RecentEventsList
                  events={chartFilteredEvents}
                  eventsViewLimit={eventsViewLimit}
                  onExportPNG={exportEventsListAsPNG}
                  onCopyToClipboard={copyEventsToClipboard}
                  onCycleView={() => cycleEventsView(chartAnalytics.totalEvents)}
                  getViewLabel={() => getEventsViewLabel(chartAnalytics.totalEvents)}
                  eventsListRef={eventsListRef}
                />
              )}
            </VStack>
          </Box>
        )}

        {/* Hidden export div */}
        {analytics && chartAnalytics && (
          <ExportPreview
            exportRef={exportRef}
            analytics={analytics}
            chartAnalytics={chartAnalytics}
            userId={userId!}
            artistsViewLimit={artistsViewLimit}
            venuesViewLimit={venuesViewLimit}
          />
        )}
      </VStack>
    </Box>
  );
}
