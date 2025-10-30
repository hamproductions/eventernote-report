import { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useReport } from '../../contexts/ReportContext';
import { useColorMode } from '../../contexts/ColorModeContext';
import { Box, VStack, HStack, Grid } from 'styled-system/jsx';
import { css } from 'styled-system/css';
import { Button } from '~/components/ui/button';
import * as Card from '~/components/ui/styled/card';
import * as Accordion from '~/components/ui/styled/accordion';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import { domToPng } from 'modern-screenshot';
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
  const [showCustomDates, setShowCustomDates] = useState(false);
  const [artistsViewLimit, setArtistsViewLimit] = useState<number>(10);
  const [venuesViewLimit, setVenuesViewLimit] = useState<number>(10);
  const [eventsViewLimit, setEventsViewLimit] = useState<number>(20);
  const [filterByFavorites, setFilterByFavorites] = useState(false);
  const eventsListRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  const {
    data: eventsData,
    isLoading,
    isError
  } = useQuery<EventsResponse>({
    queryKey: ['events', userId, dateRange],
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
    enabled: !!userId
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

    return eventsData.data.events.filter(event => {
      const eventDate = new Date(event.date);

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

    // Unique venues (filter out venues starting with "!_")
    const venueMap = new Map<string, EnhancedEvent[]>();
    filteredEvents.forEach(event => {
      if (!event.place.startsWith('!_')) {
        const existing = venueMap.get(event.place) || [];
        venueMap.set(event.place, [...existing, event]);
      }
    });

    // Unique artists
    const artistMap = new Map<string, number>();
    filteredEvents.forEach(event => {
      event.artists?.forEach(artist => {
        artistMap.set(artist, (artistMap.get(artist) || 0) + 1);
      });
    });

    // Monthly breakdown
    const monthlyMap = new Map<string, number>();
    filteredEvents.forEach(event => {
      const eventDate = new Date(event.date);
      const key = `${event.year}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
    });

    // Top venues
    const topVenues = Array.from(venueMap.entries())
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 10);

    // Top artists
    const topArtists = Array.from(artistMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    // Recent events (last 20)
    const recentEvents = [...filteredEvents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);

    // Day of week analysis
    const dayOfWeekMap = new Map<string, number>();
    filteredEvents.forEach(event => {
      dayOfWeekMap.set(event.dayOfWeek, (dayOfWeekMap.get(event.dayOfWeek) || 0) + 1);
    });
    const topDayOfWeek = Array.from(dayOfWeekMap.entries()).sort(([, a], [, b]) => b - a)[0];

    // Average events per month
    const monthCount = monthlyMap.size || 1;
    const avgEventsPerMonth = (filteredEvents.length / monthCount).toFixed(1);

    // Busiest month
    const busiestMonth = Array.from(monthlyMap.entries()).sort(([, a], [, b]) => b - a)[0];

    // Most attended artist
    const mostAttendedArtist = topArtists[0];

    // Most visited venue
    const mostVisitedVenue = topVenues[0];

    // Time span
    const earliestDate = new Date(filteredEvents[filteredEvents.length - 1]?.date.split(' ')[0]);
    const latestDate = new Date(filteredEvents[0]?.date.split(' ')[0]);
    const daysSinceFirst = Math.floor((latestDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
    const yearsSinceFirst = (daysSinceFirst / 365).toFixed(1);

    return {
      totalEvents: filteredEvents.length,
      uniqueVenues: venueMap.size,
      uniqueArtists: artistMap.size,
      totalArtistAppearances: Array.from(artistMap.values()).reduce((sum, count) => sum + count, 0),
      topVenues,
      topArtists,
      monthlyBreakdown: Array.from(monthlyMap.entries()).sort(([a], [b]) => b.localeCompare(a)),
      recentEvents,
      dateRange: {
        earliest: filteredEvents[filteredEvents.length - 1]?.date.split(' ')[0],
        latest: filteredEvents[0]?.date.split(' ')[0]
      },
      artistMap,
      venueMap,
      avgEventsPerMonth,
      topDayOfWeek,
      busiestMonth,
      mostAttendedArtist,
      mostVisitedVenue,
      yearsSinceFirst,
      daysSinceFirst
    };
  }, [filteredEvents]);

  // Calculate analytics for charts (using favorite artists filter)
  const chartAnalytics = useMemo(() => {
    if (!chartFilteredEvents.length) return null;

    const favoriteArtistNames = favoriteArtistsData?.data?.map(a => a.name) || [];

    // Unique venues (filter out venues starting with "!_")
    const venueMap = new Map<string, EnhancedEvent[]>();
    chartFilteredEvents.forEach(event => {
      if (!event.place.startsWith('!_')) {
        const existing = venueMap.get(event.place) || [];
        venueMap.set(event.place, [...existing, event]);
      }
    });

    // Unique artists - ONLY count favorite artists if filter is on
    const artistMap = new Map<string, number>();
    chartFilteredEvents.forEach(event => {
      event.artists?.forEach(artist => {
        // If filter is on, only count favorite artists
        if (filterByFavorites && favoriteArtistNames.length > 0) {
          if (favoriteArtistNames.includes(artist)) {
            artistMap.set(artist, (artistMap.get(artist) || 0) + 1);
          }
        } else {
          // If filter is off, count all artists
          artistMap.set(artist, (artistMap.get(artist) || 0) + 1);
        }
      });
    });

    // Monthly breakdown
    const monthlyMap = new Map<string, number>();
    chartFilteredEvents.forEach(event => {
      const eventDate = new Date(event.date);
      const key = `${event.year}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + 1);
    });

    // Top venues
    const topVenues = Array.from(venueMap.entries())
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 10);

    // Top artists
    const topArtists = Array.from(artistMap.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10);

    // Recent events (last 20)
    const recentEvents = [...chartFilteredEvents]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);

    // Day of week analysis
    const dayOfWeekMap = new Map<string, number>();
    chartFilteredEvents.forEach(event => {
      dayOfWeekMap.set(event.dayOfWeek, (dayOfWeekMap.get(event.dayOfWeek) || 0) + 1);
    });
    const topDayOfWeek = Array.from(dayOfWeekMap.entries()).sort(([, a], [, b]) => b - a)[0];

    // Average events per month
    const monthCount = monthlyMap.size || 1;
    const avgEventsPerMonth = (chartFilteredEvents.length / monthCount).toFixed(1);

    // Busiest month
    const busiestMonth = Array.from(monthlyMap.entries()).sort(([, a], [, b]) => b - a)[0];

    // Cumulative artist attendance over time (for currently displayed artists)
    const displayedArtists = topArtists.slice(0, artistsViewLimit).map(([name]) => name);
    const sortedEvents = [...chartFilteredEvents].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Group events by month and calculate cumulative counts
    const monthlyData = new Map<string, Record<string, number>>();
    const artistCounts: Record<string, number> = {};
    displayedArtists.forEach(artist => artistCounts[artist] = 0);

    sortedEvents.forEach(event => {
      const monthYear = event.date.split(' ')[0].substring(0, 7); // YYYY-MM

      event.artists?.forEach(artist => {
        if (displayedArtists.includes(artist)) {
          artistCounts[artist]++;
        }
      });

      // Store cumulative counts for this month
      monthlyData.set(monthYear, { ...artistCounts });
    });

    // Convert to array and fill missing months
    const cumulativeData: Record<string, any>[] = [];
    if (monthlyData.size > 0) {
      const months = Array.from(monthlyData.keys()).sort();
      const startDate = new Date(months[0] + '-01');
      const endDate = new Date(months[months.length - 1] + '-01');

      let currentDate = new Date(startDate);
      let lastCounts = { ...artistCounts };
      displayedArtists.forEach(artist => lastCounts[artist] = 0);

      while (currentDate <= endDate) {
        const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        if (monthlyData.has(monthKey)) {
          lastCounts = monthlyData.get(monthKey)!;
        }

        cumulativeData.push({
          date: monthKey,
          ...lastCounts
        });

        currentDate.setMonth(currentDate.getMonth() + 1);
      }
    }

    return {
      totalEvents: chartFilteredEvents.length,
      uniqueVenues: venueMap.size,
      uniqueArtists: artistMap.size,
      totalArtistAppearances: Array.from(artistMap.values()).reduce((sum, count) => sum + count, 0),
      topVenues,
      topArtists,
      monthlyBreakdown: Array.from(monthlyMap.entries()).sort(([a], [b]) => b.localeCompare(a)),
      recentEvents,
      dateRange: {
        earliest: chartFilteredEvents[chartFilteredEvents.length - 1]?.date.split(' ')[0],
        latest: chartFilteredEvents[0]?.date.split(' ')[0]
      },
      artistMap,
      venueMap,
      avgEventsPerMonth,
      topDayOfWeek,
      busiestMonth,
      cumulativeArtistData: cumulativeData,
      displayedArtists
    };
  }, [chartFilteredEvents, filterByFavorites, favoriteArtistsData, artistsViewLimit]);

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
        backgroundColor: colorMode === 'dark' ? '#1a1a1a' : '#ffffff'
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
      await new Promise(resolve => setTimeout(resolve, 2000));

      const dataUrl = await domToPng(exportRef.current, {
        scale: 2,
        backgroundColor: colorMode === 'dark' ? '#1a1a1a' : '#ffffff'
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

  const setPresetRange = (preset: string) => {
    const now = new Date();
    const currentYear = now.getFullYear();

    switch (preset) {
      case 'thisYear':
        setDateRange({
          startDate: new Date(currentYear, 0, 1),
          endDate: now
        });
        break;
      case 'last30Days':
        setDateRange({
          startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          endDate: now
        });
        break;
      case 'last6Months':
        setDateRange({
          startDate: new Date(now.getFullYear(), now.getMonth() - 6, now.getDate()),
          endDate: now
        });
        break;
      case 'lastYear':
        setDateRange({
          startDate: new Date(currentYear - 1, 0, 1),
          endDate: new Date(currentYear - 1, 11, 31)
        });
        break;
      case 'last2Years':
        setDateRange({
          startDate: new Date(now.getFullYear() - 2, now.getMonth(), now.getDate()),
          endDate: now
        });
        break;
      case 'last3Years':
        setDateRange({
          startDate: new Date(now.getFullYear() - 3, now.getMonth(), now.getDate()),
          endDate: now
        });
        break;
      case 'allTime':
        setDateRange({
          startDate: null,
          endDate: now
        });
        break;
    }
    setActivePreset(preset);
    setShowCustomDates(false);
  };

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
        <HStack justifyContent="space-between" alignItems="center">
          <Heading size="2xl">Dashboard</Heading>
          <HStack gap="3">
            <Button
              variant="outline"
              size="sm"
              colorPalette="blue"
              onClick={exportStatsAsPNG}
            >
              Export Stats
            </Button>
            <Button
              variant="outline"
              size="sm"
              colorPalette="gray"
              onClick={() => setColorMode?.(colorMode === 'dark' ? 'light' : 'dark')}
            >
              {colorMode === 'dark' ? '☀️' : '🌙'}
            </Button>
            <Button variant="outline" colorPalette="gray" onClick={() => setUserId(null)}>
              Change User
            </Button>
          </HStack>
        </HStack>

        {/* Filter Controls */}
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
                  {showCustomDates ? 'Hide Custom' : 'Custom Dates'}
                </Button>
              </HStack>
            </Card.Header>
          <Card.Body>
            <VStack gap="4" alignItems="stretch">
              {/* Preset Buttons */}
              <HStack gap="3" flexWrap="wrap">
                <Button
                  size="sm"
                  variant={activePreset === 'thisYear' ? 'solid' : 'outline'}
                  colorPalette="blue"
                  onClick={() => setPresetRange('thisYear')}
                >
                  This Year
                </Button>
                <Button
                  size="sm"
                  variant={activePreset === 'last30Days' ? 'solid' : 'outline'}
                  colorPalette="blue"
                  onClick={() => setPresetRange('last30Days')}
                >
                  Last 30 Days
                </Button>
                <Button
                  size="sm"
                  variant={activePreset === 'last6Months' ? 'solid' : 'outline'}
                  colorPalette="blue"
                  onClick={() => setPresetRange('last6Months')}
                >
                  Last 6 Months
                </Button>
                <Button
                  size="sm"
                  variant={activePreset === 'lastYear' ? 'solid' : 'outline'}
                  colorPalette="blue"
                  onClick={() => setPresetRange('lastYear')}
                >
                  Last Year
                </Button>
                <Button
                  size="sm"
                  variant={activePreset === 'last2Years' ? 'solid' : 'outline'}
                  colorPalette="blue"
                  onClick={() => setPresetRange('last2Years')}
                >
                  Last 2 Years
                </Button>
                <Button
                  size="sm"
                  variant={activePreset === 'last3Years' ? 'solid' : 'outline'}
                  colorPalette="blue"
                  onClick={() => setPresetRange('last3Years')}
                >
                  Last 3 Years
                </Button>
                <Button
                  size="sm"
                  variant={activePreset === 'allTime' ? 'solid' : 'outline'}
                  colorPalette="blue"
                  onClick={() => setPresetRange('allTime')}
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
                      value={dateRange.startDate?.toISOString().split('T')[0] || ''}
                      onChange={(e) => {
                        const newDate = e.target.value ? new Date(e.target.value) : null;
                        setDateRange({
                          ...dateRange,
                          startDate: newDate
                        });
                        setActivePreset(null);
                      }}
                      className={css({
                        p: '2',
                        borderRadius: 'md',
                        borderWidth: '1px',
                        borderColor: 'border.default',
                        bg: 'bg.default',
                        color: 'fg.default',
                        fontSize: 'sm',
                        _focus: {
                          outline: 'none',
                          borderColor: 'colorPalette.default',
                          ring: '2px',
                          ringColor: 'colorPalette.default'
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
                      value={dateRange.endDate?.toISOString().split('T')[0] || ''}
                      onChange={(e) => {
                        const newDate = e.target.value ? new Date(e.target.value) : null;
                        setDateRange({
                          ...dateRange,
                          endDate: newDate
                        });
                        setActivePreset(null);
                      }}
                      className={css({
                        p: '2',
                        borderRadius: 'md',
                        borderWidth: '1px',
                        borderColor: 'border.default',
                        bg: 'bg.default',
                        color: 'fg.default',
                        fontSize: 'sm',
                        _focus: {
                          outline: 'none',
                          borderColor: 'colorPalette.default',
                          ring: '2px',
                          ringColor: 'colorPalette.default'
                        }
                      })}
                    />
                  </VStack>
                </HStack>
              )}

              {/* Current Range Display */}
              <Text size="xs" color="fg.muted">
                Showing events from{' '}
                <Text as="span" fontWeight="semibold" color="fg.default">
                  {dateRange.startDate?.toLocaleDateString() || 'beginning'}
                </Text>
                {' to '}
                <Text as="span" fontWeight="semibold" color="fg.default">
                  {dateRange.endDate?.toLocaleDateString() || 'now'}
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
                onClick={() => setFilterByFavorites(!filterByFavorites)}
                disabled={!favoriteArtistsData?.data?.length}
              >
                {filterByFavorites ? '✓ Showing Favorite Artists Only' : 'Show All Artists'}
              </Button>

              {favoriteArtistsData?.data && favoriteArtistsData.data.length > 0 && (
                <Text size="xs" color="fg.muted">
                  {favoriteArtistsData.data.length} favorite artist{favoriteArtistsData.data.length !== 1 ? 's' : ''} found:{' '}
                  {favoriteArtistsData.data.map(a => a.name).join(', ')}
                </Text>
              )}

              {(!favoriteArtistsData?.data || favoriteArtistsData.data.length === 0) && (
                <Text size="xs" color="fg.muted">
                  No favorite artists found in your Eventernote profile
                </Text>
              )}
            </VStack>
          </Card.Body>
        </Card.Root>
      </Grid>

        {isLoading && <Text color="fg.muted">Loading events...</Text>}
        {isError && <Text color="fg.error">Error loading events</Text>}

        {analytics && (
          <Box ref={statsRef}>
            {/* Stats Cards */}
            <VStack gap="8" alignItems="stretch">
            <Grid gap="6" columns={{ base: 1, sm: 2, lg: 4 }}>
              <Card.Root>
                <Card.Header>
                  <Card.Title>Total Events</Card.Title>
                </Card.Header>
                <Card.Body>
                  <Text size="4xl" fontWeight="bold" color="colorPalette.default">
                    {analytics.totalEvents}
                  </Text>
                </Card.Body>
              </Card.Root>

              <Card.Root>
                <Card.Header>
                  <Card.Title>Unique Venues</Card.Title>
                </Card.Header>
                <Card.Body>
                  <Text size="4xl" fontWeight="bold" color="colorPalette.default">
                    {analytics.uniqueVenues}
                  </Text>
                </Card.Body>
              </Card.Root>

              <Card.Root>
                <Card.Header>
                  <Card.Title>Unique Artists</Card.Title>
                </Card.Header>
                <Card.Body>
                  <VStack gap="2" alignItems="flex-start">
                    <Text size="4xl" fontWeight="bold" color="colorPalette.default">
                      {analytics.uniqueArtists}
                    </Text>
                    <Text size="sm" color="fg.muted">
                      {analytics.totalArtistAppearances} total appearances
                    </Text>
                  </VStack>
                </Card.Body>
              </Card.Root>

              <Card.Root>
                <Card.Header>
                  <Card.Title>Date Range</Card.Title>
                </Card.Header>
                <Card.Body>
                  <VStack gap="1" alignItems="flex-start">
                    <Text size="lg" fontWeight="semibold" color="fg.default">
                      {analytics.dateRange.earliest}
                    </Text>
                    <Text size="xs" color="fg.muted">to</Text>
                    <Text size="lg" fontWeight="semibold" color="fg.default">
                      {analytics.dateRange.latest}
                    </Text>
                  </VStack>
                </Card.Body>
              </Card.Root>
            </Grid>

            {/* Insights Section */}
            <Grid gap="6" columns={{ base: 1, md: 3 }}>
              <Card.Root>
                <Card.Header>
                  <Card.Title>Avg Events/Month</Card.Title>
                </Card.Header>
                <Card.Body>
                  <Text size="3xl" fontWeight="bold" color="colorPalette.default">
                    {analytics.avgEventsPerMonth}
                  </Text>
                </Card.Body>
              </Card.Root>

              <Card.Root>
                <Card.Header>
                  <Card.Title>Most Active Day</Card.Title>
                </Card.Header>
                <Card.Body>
                  <VStack gap="1" alignItems="flex-start">
                    <Text size="xl" fontWeight="bold" color="fg.default">
                      {analytics.topDayOfWeek?.[0] || 'N/A'}
                    </Text>
                    <Text size="sm" color="fg.muted">
                      {analytics.topDayOfWeek?.[1] || 0} events
                    </Text>
                  </VStack>
                </Card.Body>
              </Card.Root>

              <Card.Root>
                <Card.Header>
                  <Card.Title>Busiest Month</Card.Title>
                </Card.Header>
                <Card.Body>
                  <VStack gap="1" alignItems="flex-start">
                    <Text size="xl" fontWeight="bold" color="fg.default">
                      {analytics.busiestMonth?.[0] || 'N/A'}
                    </Text>
                    <Text size="sm" color="fg.muted">
                      {analytics.busiestMonth?.[1] || 0} events
                    </Text>
                  </VStack>
                </Card.Body>
              </Card.Root>
            </Grid>

            {/* Distribution Charts - Side by Side */}
            {chartAnalytics && (
              <Grid gap="6" columns={{ base: 1, lg: 2 }}>
                {/* Venue Distribution Pie Chart */}
                <Card.Root>
                  <Card.Header>
                    <Card.Title>Top Venues Distribution</Card.Title>
                    <Card.Description>Distribution of events across top venues</Card.Description>
                  </Card.Header>
                  <Card.Body>
                    <Box h="300px" w="full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartAnalytics.topVenues.slice(0, 5).map(([name, events]) => ({
                              name,
                              value: events.length
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name.substring(0, 20)}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {chartAnalytics.topVenues.slice(0, 5).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][index % 5]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1a1a1a',
                              border: '1px solid #333',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Card.Body>
                </Card.Root>

                {/* Artist Distribution Pie Chart */}
                <Card.Root>
                  <Card.Header>
                    <Card.Title>Top Artists Distribution</Card.Title>
                    <Card.Description>Distribution of appearances across top artists</Card.Description>
                  </Card.Header>
                  <Card.Body>
                    <Box h="300px" w="full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartAnalytics.topArtists.slice(0, 5).map(([name, count]) => ({
                              name,
                              value: count
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name.substring(0, 15)}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {chartAnalytics.topArtists.slice(0, 5).map((_, index) => (
                              <Cell key={`cell-artist-${index}`} fill={['#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981'][index % 5]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1a1a1a',
                              border: '1px solid #333',
                              borderRadius: '8px',
                              color: '#fff'
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </Box>
                  </Card.Body>
                </Card.Root>
              </Grid>
            )}

            {/* Top Artists & Venues - Side by Side */}
            {chartAnalytics && (
              <Grid gap="6" columns={{ base: 1, lg: 2 }}>
                {/* Top Artists - Accordion */}
                {chartAnalytics.topArtists.length > 0 && (
                  <Card.Root>
                    <Card.Header>
                      <HStack justifyContent="space-between">
                        <Box>
                          <Card.Title>Top Artists</Card.Title>
                          <Card.Description>Most frequently attended</Card.Description>
                        </Box>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cycleArtistsView(chartAnalytics.uniqueArtists)}
                        >
                          {getArtistsViewLabel(chartAnalytics.uniqueArtists)}
                        </Button>
                      </HStack>
                    </Card.Header>
                    <Card.Body>
                      <Accordion.Root multiple>
                        {Array.from(chartAnalytics.artistMap.entries())
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, artistsViewLimit)
                          .map(([artist, count], idx) => (
                          <Accordion.Item key={artist} value={artist}>
                            <Accordion.ItemTrigger>
                              <HStack justifyContent="space-between" flex="1" gap="4">
                                <Text size="sm" fontWeight="medium" color="fg.default">
                                  {idx + 1}. {artist}
                                </Text>
                                <Text size="lg" fontWeight="bold" color="colorPalette.default" minW="10" textAlign="right">
                                  {count}
                                </Text>
                              </HStack>
                              <Accordion.ItemIndicator />
                            </Accordion.ItemTrigger>
                            <Accordion.ItemContent>
                              <VStack gap="2" alignItems="stretch" pt="3">
                                {chartFilteredEvents
                                  .filter(e => e.artists?.includes(artist))
                                  .map(event => (
                                    <Box
                                      key={event.href}
                                      as="a"
                                      href={`https://eventernote.com${event.href}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      display="block"
                                      pl="4"
                                      py="1"
                                      borderRadius="sm"
                                      _hover={{ bg: 'bg.subtle' }}
                                    >
                                      <Text size="sm" color="fg.muted">
                                        • {event.date.split(' ')[0]} - {event.name}
                                      </Text>
                                    </Box>
                                  ))}
                              </VStack>
                            </Accordion.ItemContent>
                          </Accordion.Item>
                        ))}
                      </Accordion.Root>
                    </Card.Body>
                  </Card.Root>
                )}

                {/* Top Venues - Accordion */}
                <Card.Root>
                  <Card.Header>
                    <HStack justifyContent="space-between">
                      <Box>
                        <Card.Title>Top Venues</Card.Title>
                        <Card.Description>Most visited venues</Card.Description>
                      </Box>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cycleVenuesView(chartAnalytics.uniqueVenues)}
                      >
                        {getVenuesViewLabel(chartAnalytics.uniqueVenues)}
                      </Button>
                    </HStack>
                  </Card.Header>
                  <Card.Body>
                    <Accordion.Root multiple>
                      {Array.from(chartAnalytics.venueMap.entries())
                        .sort(([, a], [, b]) => b.length - a.length)
                        .slice(0, venuesViewLimit)
                        .map(([venue, events], idx) => (
                        <Accordion.Item key={venue} value={venue}>
                          <Accordion.ItemTrigger>
                            <HStack justifyContent="space-between" flex="1" gap="4">
                              <Text size="sm" fontWeight="medium" color="fg.default">
                                {idx + 1}. {venue}
                              </Text>
                              <Text size="lg" fontWeight="bold" color="fg.default" minW="10" textAlign="right">
                                {events.length}
                              </Text>
                            </HStack>
                            <Accordion.ItemIndicator />
                          </Accordion.ItemTrigger>
                          <Accordion.ItemContent>
                            <VStack gap="2" alignItems="stretch" pt="3">
                              {events.map(event => (
                                <Box
                                  key={event.href}
                                  as="a"
                                  href={`https://eventernote.com${event.href}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  display="block"
                                  pl="4"
                                  py="1"
                                  borderRadius="sm"
                                  _hover={{ bg: 'bg.subtle' }}
                                >
                                  <Text size="sm" color="fg.muted">
                                    • {event.date.split(' ')[0]} - {event.name}
                                  </Text>
                                </Box>
                              ))}
                            </VStack>
                          </Accordion.ItemContent>
                        </Accordion.Item>
                      ))}
                    </Accordion.Root>
                  </Card.Body>
                </Card.Root>
              </Grid>
            )}

            {/* Cumulative Artist Attendance */}
            {chartAnalytics && chartAnalytics.cumulativeArtistData.length > 0 && (
              <Card.Root>
                <Card.Header>
                  <Card.Title>Artist Attendance Growth</Card.Title>
                  <Card.Description>Cumulative attendance over time - updates based on Top Artists view</Card.Description>
                </Card.Header>
                <Card.Body>
                  <Box h="400px" w="full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartAnalytics.cumulativeArtistData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#888', fontSize: 11 }}
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis tick={{ fill: '#888', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1a1a1a',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                        />
                        <Legend />
                        {chartAnalytics.displayedArtists.map((artist, index) => (
                          <Line
                            key={artist}
                            type="monotone"
                            dataKey={artist}
                            stroke={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#f97316', '#eab308', '#84cc16', '#14b8a6'][index % 10]}
                            strokeWidth={2}
                            dot={false}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </Box>
                </Card.Body>
              </Card.Root>
            )}

            {/* Monthly Breakdown - Bar Chart */}
            {chartAnalytics && (
              <Card.Root>
                <Card.Header>
                  <Card.Title>Monthly Breakdown</Card.Title>
                  <Card.Description>Events per month over the last 12 months</Card.Description>
                </Card.Header>
                <Card.Body>
                  <Box h="300px" w="full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartAnalytics.monthlyBreakdown.slice(0, 12).reverse().map(([month, count]) => ({
                          month: month.substring(5),
                          events: count
                        }))}
                        margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                        <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#888', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1a1a1a',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                        />
                        <Bar dataKey="events" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Card.Body>
              </Card.Root>
            )}

            {/* Recent Events */}
            {chartAnalytics && (
              <Card.Root>
                <Card.Header>
                  <HStack justifyContent="space-between">
                    <Box>
                      <Card.Title>Recent Events</Card.Title>
                      <Card.Description>Your latest attended events</Card.Description>
                    </Box>
                    <HStack gap="2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={exportEventsListAsPNG}
                      >
                        Export PNG
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={copyEventsToClipboard}
                      >
                        Copy List
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cycleEventsView(chartAnalytics.totalEvents)}
                      >
                        {getEventsViewLabel(chartAnalytics.totalEvents)}
                      </Button>
                    </HStack>
                  </HStack>
                </Card.Header>
                <Card.Body>
                  <VStack gap="3" alignItems="stretch" ref={eventsListRef}>
                    {[...chartFilteredEvents]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, eventsViewLimit)
                      .map((event) => (
                      <Box
                        key={event.href}
                        as="a"
                        href={`https://eventernote.com${event.href}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        display="block"
                        p="4"
                        borderRadius="md"
                        borderWidth="1px"
                        borderColor="border.default"
                        transition="all 0.2s"
                        _hover={{
                          borderColor: 'colorPalette.default',
                          bg: 'bg.subtle',
                          transform: 'translateX(4px)'
                        }}
                      >
                        <VStack gap="2" alignItems="flex-start">
                          <Text size="sm" fontWeight="semibold" color="fg.default">
                            {event.name}
                          </Text>
                          <HStack gap="4" flexWrap="wrap">
                            <Text size="xs" color="fg.muted">
                              {event.date}
                            </Text>
                            <Text size="xs" color="fg.muted">
                              {event.place}
                            </Text>
                          </HStack>
                          {event.artists && event.artists.length > 0 && (
                            <HStack gap="2" flexWrap="wrap">
                              {event.artists.map(artist => (
                                <Box
                                  key={artist}
                                  px="2.5"
                                  py="1"
                                  bg="accent.default"
                                  borderRadius="md"
                                  fontSize="xs"
                                  color="accent.fg"
                                  fontWeight="bold"
                                >
                                  {artist}
                                </Box>
                              ))}
                            </HStack>
                          )}
                        </VStack>
                      </Box>
                    ))}
                  </VStack>
                </Card.Body>
              </Card.Root>
            )}
            </VStack>
          </Box>
        )}

        {/* Hidden export div */}
        {analytics && chartAnalytics && (
          <Box
            position="relative"
            w="0"
            h="0"
            overflow="hidden"
          >
            <Box
              ref={exportRef}
              position="absolute"
              top="0"
              left="0"
              w="1400px"
              p="40px"
              bg={colorMode === 'dark' ? '#1a1a1a' : '#ffffff'}
              color={colorMode === 'dark' ? '#fff' : '#000'}
              fontFamily="system-ui"
            >
            <VStack gap="6" alignItems="stretch">
              <Box textAlign="center" mb="4">
                <Heading size="3xl" color="blue.500" mb="2">Eventernote Report</Heading>
                <Text fontSize="lg" opacity={0.7}>@{userId}</Text>
                <Text fontSize="sm" opacity={0.6} mt="2">{analytics.dateRange.earliest} - {analytics.dateRange.latest}</Text>
              </Box>

              <Grid columns={4} gap="4">
                <Box p="4" bg={colorMode === 'dark' ? '#2a2a2a' : '#f5f5f5'} borderRadius="lg">
                  <Text fontSize="xs" opacity={0.7} mb="2">Total Events</Text>
                  <Text fontSize="3xl" fontWeight="bold" color="blue.500">{analytics.totalEvents}</Text>
                </Box>
                <Box p="4" bg={colorMode === 'dark' ? '#2a2a2a' : '#f5f5f5'} borderRadius="lg">
                  <Text fontSize="xs" opacity={0.7} mb="2">Unique Venues</Text>
                  <Text fontSize="3xl" fontWeight="bold" color="pink.500">{analytics.uniqueVenues}</Text>
                </Box>
                <Box p="4" bg={colorMode === 'dark' ? '#2a2a2a' : '#f5f5f5'} borderRadius="lg">
                  <Text fontSize="xs" opacity={0.7} mb="2">Unique Artists</Text>
                  <Text fontSize="3xl" fontWeight="bold" color="purple.500">{analytics.uniqueArtists}</Text>
                </Box>
                <Box p="4" bg={colorMode === 'dark' ? '#2a2a2a' : '#f5f5f5'} borderRadius="lg">
                  <Text fontSize="xs" opacity={0.7} mb="2">Avg Events/Month</Text>
                  <Text fontSize="3xl" fontWeight="bold" color="orange.500">{analytics.avgEventsPerMonth}</Text>
                </Box>
              </Grid>

              <Grid columns={3} gap="4">
                <Box p="4" bg={colorMode === 'dark' ? '#2a2a2a' : '#f5f5f5'} borderRadius="lg">
                  <Text fontSize="xs" opacity={0.7} mb="2">Most Active Day</Text>
                  <Text fontSize="xl" fontWeight="bold" color="green.500">{analytics.topDayOfWeek?.[0] || 'N/A'}</Text>
                  <Text fontSize="xs" opacity={0.6} mt="1">{analytics.topDayOfWeek?.[1] || 0} events</Text>
                </Box>
                <Box p="4" bg={colorMode === 'dark' ? '#2a2a2a' : '#f5f5f5'} borderRadius="lg">
                  <Text fontSize="xs" opacity={0.7} mb="2">Busiest Month</Text>
                  <Text fontSize="lg" fontWeight="bold" color="blue.500">{analytics.busiestMonth?.[0] || 'N/A'}</Text>
                  <Text fontSize="xs" opacity={0.6} mt="1">{analytics.busiestMonth?.[1] || 0} events</Text>
                </Box>
                <Box p="4" bg={colorMode === 'dark' ? '#2a2a2a' : '#f5f5f5'} borderRadius="lg">
                  <Text fontSize="xs" opacity={0.7} mb="2">Years Active</Text>
                  <Text fontSize="3xl" fontWeight="bold" color="purple.500">{analytics.yearsSinceFirst}</Text>
                </Box>
              </Grid>

              <Box p="4" bg={colorMode === 'dark' ? '#2a2a2a' : '#f5f5f5'} borderRadius="lg" h="280px">
                <Text fontSize="sm" fontWeight="bold" mb="3">Monthly Breakdown</Text>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartAnalytics.monthlyBreakdown.slice(0, 12).reverse().map(([month, count]) => ({
                      month: month.substring(5),
                      events: count
                    }))}
                    margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fill: '#888', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                    <Bar dataKey="events" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>

              <Box p="4" bg={colorMode === 'dark' ? '#2a2a2a' : '#f5f5f5'} borderRadius="lg" h="280px">
                <Text fontSize="sm" fontWeight="bold" mb="3">Cumulative Artist Attendance</Text>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartAnalytics.cumulativeArtistData}
                    margin={{ top: 10, right: 20, left: 0, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                    <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                    {chartAnalytics.displayedArtists.map((artist, index) => (
                      <Line
                        key={artist}
                        type="monotone"
                        dataKey={artist}
                        stroke={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#f97316', '#eab308', '#84cc16', '#14b8a6'][index % 10]}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </Box>

              <Grid columns={2} gap="4">
                <Box p="4" bg={colorMode === 'dark' ? '#2a2a2a' : '#f5f5f5'} borderRadius="lg">
                  <Text fontSize="sm" fontWeight="bold" mb="3">Top Artists</Text>
                  {chartAnalytics.topArtists.slice(0, artistsViewLimit).map(([name, count]) => (
                    <HStack key={name} justifyContent="space-between" mb="2" fontSize="xs">
                      <Text>{name}</Text>
                      <Text opacity={0.7}>{count}</Text>
                    </HStack>
                  ))}
                </Box>
                <Box p="4" bg={colorMode === 'dark' ? '#2a2a2a' : '#f5f5f5'} borderRadius="lg">
                  <Text fontSize="sm" fontWeight="bold" mb="3">Top Venues</Text>
                  {chartAnalytics.topVenues.slice(0, venuesViewLimit).map(([name, events]) => (
                    <HStack key={name} justifyContent="space-between" mb="2" fontSize="xs">
                      <Text overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">{name}</Text>
                      <Text opacity={0.7} ml="2">{events.length}</Text>
                    </HStack>
                  ))}
                </Box>
              </Grid>
            </VStack>
            </Box>
          </Box>
        )}
      </VStack>
    </Box>
  );
}
