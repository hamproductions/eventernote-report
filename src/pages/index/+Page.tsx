import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useReport } from '../../contexts/ReportContext';
import { useColorMode } from '../../contexts/ColorModeContext';
import { calculateComprehensiveAnalytics, calculateChartAnalytics } from '../../server/utils/calculations';
import { Box, VStack, HStack, Grid } from 'styled-system/jsx';
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
  FavoriteArtistsAttendance,
  ArtistAttendanceGrowth,
  MonthlyBreakdown,
  RadarChart,
  Highlights
} from '~/components/dashboard';
import type { EnhancedEvent } from '~/shared/types/event';
import { formatDate, formatDisplayDate } from '~/shared/utils/dateUtils';
import { fetchJson } from '~/shared/utils/fetchJson';
import { parseUserInput } from '~/shared/utils/parseUserInput';
import { ManualArtistAttendance } from '~/components/dashboard/ManualArtistAttendance';
import { LoadingStatus } from '~/components/dashboard/LoadingStatus';
import { ReportSection } from '~/components/dashboard/ReportSection';
import { ReceiptPanel } from '~/components/receipt/ReceiptPanel';
import { PeopleDrawer, type PeopleTab } from '~/components/dashboard/PeopleDrawer';
import { CompareDrawer } from '~/components/dashboard/CompareDrawer';
import { ConnectionsSection } from '~/components/connections/ConnectionsSection';
import { ShareImageDrawer } from '~/components/share/ShareImageDrawer';
import type { PosterData } from '~/components/share/SharePoster';

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

interface ArtistAttendance {
  name: string;
  href: string;
  userCount: number;
  totalEvents: number;
  percentage: number;
  eventDates: string[];
}

interface UserProfileResponse {
  success: boolean;
  data: {
    username: string;
    displayName: string;
    following: number;
    followers: number;
    totalEvents: number;
    artistAttendance: ArtistAttendance[];
  };
}

export default function Page() {
  const { userId, setUserId, dateRange, setDateRange, recentUsers, rememberUser, forgetUser } = useReport();
  const { colorMode, setColorMode } = useColorMode();
  const [inputValue, setInputValue] = useState(userId || '');
  const [artistsViewLimit, setArtistsViewLimit] = useState<number>(10);
  const [venuesViewLimit, setVenuesViewLimit] = useState<number>(10);
  const [filterByFavorites, setFilterByFavorites] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const queryClient = useQueryClient();
  const [peopleTab, setPeopleTab] = useState<PeopleTab | null>(null);
  const eventsListRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
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
    start: dateRange.startDate ? formatDate(dateRange.startDate) : null,
    end: dateRange.endDate ? formatDate(dateRange.endDate) : null
  }), [dateRange]);

  const {
    data: eventsData,
    isLoading,
    isError,
    error,
    refetch: refetchEvents,
    isFetching
  } = useQuery<EventsResponse>({
    queryKey: ['events', userId, dateRangeKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange.startDate) {
        params.set('startDate', formatDate(dateRange.startDate));
      }
      if (dateRange.endDate) {
        params.set('endDate', formatDate(dateRange.endDate));
      }

      return fetchJson<EventsResponse>(`/api/events/user/${encodeURIComponent(userId!)}?${params}`, 'Could not load events');
    },
    enabled: !!userId,
    retry: false,
    staleTime: 1000 * 60 * 30,
    gcTime: 1000 * 60 * 60,
    placeholderData: (previousData, previousQuery) => (previousQuery?.queryKey[1] === userId ? previousData : undefined)
  });

  const { data: favoriteArtistsData, isError: favoritesFailed } = useQuery<FavoriteArtistsResponse>({
    queryKey: ['favoriteArtists', userId],
    queryFn: async () => {
      return fetchJson<FavoriteArtistsResponse>(`/api/favorite-artists/user/${encodeURIComponent(userId!)}`, 'Could not load favorite artists');
    },
    enabled: !!userId
  });

  const { data: loadingProgress } = useQuery<{ stage: string; loaded: number; total: number }>({
    queryKey: ['attendance-progress', userId, dateRangeKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRangeKey.start) params.set('startDate', dateRangeKey.start);
      if (dateRangeKey.end) params.set('endDate', dateRangeKey.end);
      const response = await fetch(`/api/events/user/${encodeURIComponent(userId!)}/progress?${params}`);
      if (!response.ok) throw new Error('Failed to fetch loading progress');
      return response.json();
    },
    enabled: !!userId && isFetching,
    refetchInterval: isFetching ? 1500 : false,
    retry: false
  });

  const { data: userProfileData, isLoading: isProfileLoading, error: profileError, refetch: refetchProfile, isFetching: isProfileFetching } = useQuery<UserProfileResponse>({
    queryKey: ['userProfile', userId, dateRangeKey],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRangeKey.start) params.set('startDate', dateRangeKey.start);
      if (dateRangeKey.end) params.set('endDate', dateRangeKey.end);
      return fetchJson<UserProfileResponse>(`/api/user-profile/${encodeURIComponent(userId!)}?${params}`, 'Could not load favorite attendance');
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 30
  });

  const profileName = userProfileData?.data?.displayName || userProfileData?.data?.username;
  useEffect(() => {
    if (userId && eventsData?.success) rememberUser({ id: userId, name: profileName || userId });
  }, [userId, eventsData, profileName]);

  // Filter events by date range only (for statistics)
  const filteredEvents = useMemo(() => {
    if (!eventsData?.data?.events) return [];

    const now = new Date();

    return eventsData.data.events
      .map(event => ({
        ...event,
        parsedDate: new Date(`${event.date.slice(0, 10)}T00:00:00`)
      }))
      .filter(event => {
        const eventDate = event.date.slice(0, 10);

        // Exclude future events
        if (eventDate > formatDate(now)) return false;

        // Apply date range filters
        if (dateRange.startDate && eventDate < formatDate(dateRange.startDate)) return false;
        if (dateRange.endDate && eventDate > formatDate(dateRange.endDate)) return false;

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

    const favoriteSet = new Set(favoriteArtistNames);
    return filteredEvents
      .filter(event => event.artists?.some(artist => favoriteSet.has(artist)))
      .map(event => ({ ...event, artists: event.artists.filter(artist => favoriteSet.has(artist)) }));
  }, [filteredEvents, filterByFavorites, favoriteArtistsData]);

  // Calculate analytics for stats cards (using all date-filtered events)
  const analytics = useMemo(() => {
    if (!chartFilteredEvents.length) return null;

    const comprehensiveAnalytics = calculateComprehensiveAnalytics(chartFilteredEvents);

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
      allEventsCount: filteredEvents.length,
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
  }, [filteredEvents, chartFilteredEvents, favoriteArtistsData]);

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

  const filteredFavoriteArtistCounts = useMemo(() => {
    if (!chartFilteredEvents.length || !userProfileData?.data?.artistAttendance) return undefined;
    const favoriteNames = new Set(userProfileData.data.artistAttendance.map(a => a.name));
    const counts = new Map<string, number>();
    for (const event of chartFilteredEvents) {
      if (!event.artists) continue;
      for (const artist of event.artists) {
        if (favoriteNames.has(artist)) {
          counts.set(artist, (counts.get(artist) || 0) + 1);
        }
      }
    }
    return counts;
  }, [chartFilteredEvents, userProfileData]);

  const filteredArtistTotals = useMemo(() => {
    if (!userProfileData?.data?.artistAttendance) return undefined;
    const totals = new Map<string, number>();
    const startStr = dateRange.startDate ? formatDate(dateRange.startDate) : undefined;
    const today = formatDate(new Date());
    const endStr = dateRange.endDate ? [formatDate(dateRange.endDate), today].sort()[0] : today;
    for (const artist of userProfileData.data.artistAttendance) {
      if (!artist.eventDates?.length) continue;
      const count = artist.eventDates.filter(d => {
        if (startStr && d < startStr) return false;
        if (endStr && d > endStr) return false;
        return true;
      }).length;
      totals.set(artist.name, count);
    }
    return totals;
  }, [userProfileData, dateRange]);

  const favoriteAttendanceData = useMemo(() => {
    if (!filteredFavoriteArtistCounts || !filteredArtistTotals || !userProfileData?.data?.artistAttendance) return [];
    return userProfileData.data.artistAttendance.map(a => {
      const attended = filteredFavoriteArtistCounts.get(a.name) || 0;
      const total = filteredArtistTotals.get(a.name) || 0;
      const missed = total - attended;
      const pct = total > 0 ? Math.round((attended / total) * 1000) / 10 : 0;
      return { name: a.name, attended, total, missed, pct };
    }).filter(a => a.total > 0);
  }, [filteredFavoriteArtistCounts, filteredArtistTotals, userProfileData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUserId(parseUserInput(inputValue));
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
        if (!preset.startsWith('year-')) return;
        newRange = {
          startDate: new Date(Number(preset.slice(5)), 0, 1),
          endDate: new Date(Number(preset.slice(5)), 11, 31)
        };
    }

    debouncedSetDateRange(newRange);
    setActivePreset(preset);
  }, [debouncedSetDateRange]);

  const posterData = useMemo<PosterData | null>(() => {
    if (!analytics || !chartAnalytics) return null;
    const eventDates = chartFilteredEvents.map(event => event.date.slice(0, 10)).sort();
    const today = formatDate(new Date());
    const best = [...favoriteAttendanceData].sort((a, b) => b.pct - a.pct)[0];
    const rangeStart = dateRange.startDate ? formatDate(dateRange.startDate) : eventDates[0] ?? today;
    const rangeEnd = dateRange.endDate ? [formatDate(dateRange.endDate), today].sort()[0] : today;
    const weekendKey = (time: number) => {
      const date = new Date(time);
      if (date.getDay() === 0) date.setDate(date.getDate() - 1);
      return formatDate(date);
    };
    const allWeekends = new Set<string>();
    for (let time = new Date(`${rangeStart}T00:00:00`).getTime(); time <= new Date(`${rangeEnd}T00:00:00`).getTime(); time += 86400000) {
      const day = new Date(time).getDay();
      if (day === 0 || day === 6) allWeekends.add(weekendKey(time));
    }
    const weekendsOut = new Set(eventDates.filter(date => [0, 6].includes(new Date(`${date}T00:00:00`).getDay())).map(date => weekendKey(new Date(`${date}T00:00:00`).getTime())));
    const totalDays = Math.round((new Date(`${rangeEnd}T00:00:00`).getTime() - new Date(`${rangeStart}T00:00:00`).getTime()) / 86400000) + 1;
    return {
      name: profileName || recentUsers.find(user => user.id === userId)?.name || userId || '',
      userId: userId || '',
      period: dateRange.startDate ? `${formatDisplayDate(dateRange.startDate)} to ${dateRange.endDate ? formatDisplayDate(dateRange.endDate) : 'today'}` : 'All time',
      rangeStart,
      rangeEnd,
      favoritesOnly: filterByFavorites,
      eventDates,
      totalEvents: analytics.totalEvents,
      daysOut: analytics.uniqueDays,
      totalDays,
      venues: analytics.uniqueVenues,
      artists: analytics.uniqueArtists,
      weekendShare: analytics.weekendStats.weekendEventPercentage,
      weekendsOut: [weekendsOut.size, allWeekends.size],
      multiEventDays: analytics.multiEventDayStats.daysWithMultipleEvents,
      maxDay: { count: analytics.multiEventDayStats.maxEventsInDay, date: analytics.multiEventDayStats.maxEventsInDayDate },
      streak: {
        days: analytics.streaks.daily.longestStreak,
        start: analytics.streaks.daily.longestStreakStartDate,
        end: analytics.streaks.daily.longestStreakEndDate
      },
      weeklyStreak: analytics.streaks.weekly.longestStreak,
      busiestMonth: analytics.busiestMonth ?? null,
      topArtists: analytics.topArtists.slice(0, 8),
      topVenues: analytics.topVenues.slice(0, 3).map(([name, events]) => [name, events.length] as [string, number]),
      favoriteBest: best && best.total >= 3 ? { name: best.name, pct: best.pct } : null,
      url: `${window.location.origin}/?user=${encodeURIComponent(userId || '')}`
    };
  }, [analytics, chartAnalytics, chartFilteredEvents, favoriteAttendanceData, profileName, recentUsers, userId, dateRange, filterByFavorites]);

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
              Your concert history as charts, streaks and a printable receipt
            </Text>
          </VStack>

          {/* Card with Form */}
          <Card.Root>
            <Card.Header>
              <Card.Title>Open your report</Card.Title>
            </Card.Header>
            <Card.Body>
              {recentUsers.length > 0 && (
                <VStack gap="2" alignItems="stretch" mb="6">
                  <Text size="sm" fontWeight="medium">Recent</Text>
                  <HStack gap="2" flexWrap="wrap">
                    {recentUsers.map((user) => (
                      <Button key={user.id} variant="outline" size="sm" onClick={() => setUserId(user.id)}>
                        {user.name}{user.name !== user.id ? ` (@${user.id})` : ''}
                      </Button>
                    ))}
                  </HStack>
                </VStack>
              )}
              <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <VStack gap="6" alignItems="stretch">
                  <VStack gap="3" alignItems="stretch">
                    <label htmlFor="user-id" className={css({ fontSize: 'sm', fontWeight: 'medium', color: 'fg.default' })}>
                      Eventernote user ID or profile URL
                    </label>
                    <input
                      id="user-id"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="HamP_punipuni or eventernote.com/users/HamP_punipuni"
                      className={css({
                        w: 'full',
                        p: '3.5',
                        borderRadius: 'md',
                        borderWidth: '1px',
                        borderColor: 'border.control',
                        bg: 'bg.default',
                        color: 'fg.default',
                        fontSize: 'md',
                        transition: 'all 0.2s',
                        _hover: {
                          borderColor: 'fg.muted'
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
                      The ID is the last part of your profile URL: eventernote.com/users/<b>ID</b>
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
                    Show my report
                  </Button>
                </VStack>
              </form>
            </Card.Body>
          </Card.Root>

          {/* Footer hint */}
          <Text size="xs" color="fg.subtle" textAlign="center">
            Not affiliated with Eventernote. Data is read live from public profiles.
          </Text>
        </VStack>
      </Box>
    );
  }

  const resetView = () => {
    setUserId(null);
    setActivePreset('thisYear');
    setFilterByFavorites(false);
    setArtistsViewLimit(10);
    setVenuesViewLimit(10);
  };

  const refreshFromEventernote = async () => {
    const params = new URLSearchParams({ refresh: '1' });
    if (dateRangeKey.start) params.set('startDate', dateRangeKey.start);
    if (dateRangeKey.end) params.set('endDate', dateRangeKey.end);
    setRefreshing(true);
    try {
      const fresh = await fetchJson<EventsResponse>(`/api/events/user/${encodeURIComponent(userId)}?${params}`, 'Could not reload events');
      queryClient.setQueryData(['events', userId, dateRangeKey], fresh);
    } catch {
      await queryClient.invalidateQueries({ queryKey: ['events', userId, dateRangeKey] });
    } finally {
      setRefreshing(false);
    }
  };

  const openUser = (id: string) => {
    setPeopleTab(null);
    setFilterByFavorites(false);
    setArtistsViewLimit(10);
    setVenuesViewLimit(10);
    setUserId(id);
    window.scrollTo({ top: 0 });
  };

  return (
    <Box bg="bg.default" colorPalette="blue" minH="100vh" position="relative" overflowX="clip" px={{ base: '4', md: '8' }} pb={{ base: '10', md: '16' }}>
      <DashboardHeader
        userId={userId}
        colorMode={colorMode}
        userProfile={userProfileData?.data}
        attendedCount={analytics ? chartFilteredEvents.length : undefined}
        favoritesOnly={filterByFavorites}
        showSections={!!analytics}
        onOpenReceipt={() => setReceiptOpen(true)}
        onOpenCompare={() => setCompareOpen(true)}
        onRefresh={refreshFromEventernote}
        refreshing={refreshing}
        recentUsers={recentUsers}
        onSelectUser={openUser}
        onForgetUser={forgetUser}
        onOpenPeople={setPeopleTab}
        onExportStats={() => setShareOpen(true)}
        onToggleColorMode={() => setColorMode?.(colorMode === 'dark' ? 'light' : 'dark')}
        onChangeUser={resetView}
        filters={
          <FilterControls
            dateRange={dateRange}
            activePreset={activePreset}
            filterByFavorites={filterByFavorites}
            favoriteArtists={favoriteArtistsData?.data}
            favoritesFailed={favoritesFailed}
            onPresetChange={setPresetRange}
            onDateRangeChange={debouncedSetDateRange}
            onFilterByFavoritesChange={setFilterByFavorites}
            onActivePresetChange={setActivePreset}
          />
        }
      />

      <VStack as="main" gap={{ base: '10', md: '14' }} alignItems="stretch" maxW="1400px" mx="auto" pt="6">
        {(isFetching || isProfileLoading || profileError || isError) && (
          <VStack gap="3" alignItems="stretch">
            {isFetching && (
              <LoadingStatus label="Loading your report" detail={loadingProgress?.stage === 'details'
                ? `${loadingProgress.loaded} of ${loadingProgress.total} events checked`
                : 'Finding events in this date range'} loaded={loadingProgress?.loaded} total={loadingProgress?.total} />
            )}
            {isProfileLoading && (
              <LoadingStatus label="Loading favorite attendance" detail="Checking artist events for this date range" />
            )}
            {isError && !isFetching && (
              <HStack gap="3" flexWrap="wrap" role="alert">
                <Text color="fg.error">{error?.message.includes('HTTP 404') ? `No Eventernote user called "${userId}". Check the ID, or pick another user from the name menu above.` : `Events didn't load: ${error?.message}. Try again in a moment.`}</Text>
                <Button size="sm" variant="outline" onClick={() => refetchEvents()}>Try again</Button>
              </HStack>
            )}
            {profileError && !isProfileFetching && !isError && (
              <HStack gap="3" flexWrap="wrap" role="alert">
                <Text color="fg.error">Favorite attendance didn't load: {profileError.message}.</Text>
                <Button size="sm" variant="outline" onClick={() => refetchProfile()}>Try again</Button>
              </HStack>
            )}
          </VStack>
        )}

        {!isFetching && !isError && eventsData && !chartFilteredEvents.length && (
          <Card.Root>
            <Card.Body>
              <VStack gap="4" alignItems="center" py="8">
                <Text size="lg" fontWeight="medium" color="fg.default">
                  {filteredEvents.length ? 'No events with favorite artists in this range' : 'No events in this range'}
                </Text>
                <Text size="sm" color="fg.muted" textAlign="center">
                  {filteredEvents.length
                    ? `${filteredEvents.length} events are hidden by Favorites only.`
                    : <>Pick a wider range above, or check that <b>{userId}</b> is the right user.</>}
                </Text>
                <HStack gap="3" flexWrap="wrap" justifyContent="center">
                  {filteredEvents.length > 0 && <Button colorPalette="blue" onClick={() => setFilterByFavorites(false)}>Show all events</Button>}
                  {!filteredEvents.length && <Button colorPalette="blue" onClick={() => setPresetRange('allTime')}>Show all time</Button>}
                  <Button variant="outline" colorPalette="gray" onClick={resetView}>Try another user</Button>
                </HStack>
              </VStack>
            </Card.Body>
          </Card.Root>
        )}

        {analytics && (
          <Box ref={statsRef} position="relative" aria-busy={isFetching}>
            <VStack gap={{ base: '10', md: '14' }} alignItems="stretch" opacity={isFetching && !isLoading ? 0.45 : 1} transition="opacity 0.2s" pointerEvents={isFetching && !isLoading ? 'none' : 'auto'}>
              <ReportSection id="overview" title="Overview" description="Totals, habits and highlights for the selected range">
                <Grid gridTemplateColumns={{ base: '1fr', lg: '2fr 3fr' }} gap="6" alignItems="stretch">
                  {chartAnalytics && <RadarChart radarStats={chartAnalytics.radarStats} />}
                  <StatsCards analytics={analytics} />
                </Grid>
                {chartAnalytics && (
                  <Highlights
                    totalEvents={analytics.totalEvents}
                    uniqueVenues={analytics.uniqueVenues}
                    uniqueArtists={analytics.uniqueArtists}
                    totalArtistAppearances={analytics.totalArtistAppearances}
                    avgEventsPerMonth={parseFloat(String(analytics.avgEventsPerMonth))}
                    topDayOfWeek={analytics.topDayOfWeek ? { day: analytics.topDayOfWeek[0], count: analytics.topDayOfWeek[1] } : { day: "N/A", count: 0 }}
                    busiestMonth={analytics.busiestMonth ? { month: analytics.busiestMonth[0], count: analytics.busiestMonth[1] } : { month: "N/A", count: 0 }}
                    longestDailyStreak={analytics.streaks.daily.longestStreak}
                    longestWeeklyStreak={analytics.streaks.weekly.longestStreak}
                    maxEventsPerDay={analytics.multiEventDayStats.maxEventsInDay}
                    maxEventsPerDayDate={analytics.multiEventDayStats.maxEventsInDayDate || undefined}
                    weekendPercentage={analytics.weekendStats.weekendEventPercentage}
                    topArtist={analytics.mostAttendedArtist ? { name: analytics.mostAttendedArtist[0], count: analytics.mostAttendedArtist[1] } : undefined}
                    topVenue={analytics.mostVisitedVenue ? { name: analytics.mostVisitedVenue[0], count: analytics.mostVisitedVenue[1].length } : undefined}
                    favoriteAttendance={favoriteAttendanceData.length > 0 ? (() => {
                      const best = [...favoriteAttendanceData].sort((a, b) => b.pct - a.pct)[0];
                      return best ? { name: best.name, pct: best.pct } : undefined;
                    })() : undefined}
                    daysActivePercentage={parseFloat(analytics.daysSpentPercentage)}
                  />
                )}
              </ReportSection>

              {chartAnalytics && (
                <ReportSection id="activity" title="Activity" description="When you went: by day, by month, and how artist counts grew">
                  <Grid gridTemplateColumns={{ base: '1fr', lg: '3fr 2fr' }} gap="6" alignItems="start">
                    <EventHeatmap dateEventMap={chartAnalytics.dateEventMap} />
                    <MonthlyBreakdown monthlyBreakdown={chartAnalytics.monthlyBreakdown} />
                  </Grid>
                  <ArtistAttendanceGrowth
                    cumulativeArtistData={chartAnalytics.cumulativeArtistData}
                    displayedArtists={chartAnalytics.displayedArtists}
                  />
                </ReportSection>
              )}

              <ReportSection id="artists" title="Artists & venues" description="Who you saw most, where, and how many of a favorite's events you caught">
                {favoriteAttendanceData.length > 0 && <FavoriteArtistsAttendance artists={favoriteAttendanceData} />}
                <ManualArtistAttendance key={userId} userId={userId} dateRange={dateRange} />
                {chartAnalytics && (
                  <DistributionCharts topVenues={chartAnalytics.topVenues} topArtists={chartAnalytics.topArtists} totalEvents={chartAnalytics.totalEvents} />
                )}
                {chartAnalytics && (
                  <TopArtistsVenues
                    artistMap={chartAnalytics.artistMap}
                    venueMap={chartAnalytics.venueMap}
                    artistsViewLimit={artistsViewLimit}
                    venuesViewLimit={venuesViewLimit}
                    uniqueArtists={chartAnalytics.uniqueArtists}
                    uniqueVenues={chartAnalytics.uniqueVenues}
                    events={chartFilteredEvents}
                    artistAttendance={userProfileData?.data?.artistAttendance}
                    filteredArtistCounts={filteredFavoriteArtistCounts}
                    filteredArtistTotals={filteredArtistTotals}
                    onCycleArtistsView={cycleArtistsView}
                    onCycleVenuesView={cycleVenuesView}
                    getArtistsViewLabel={getArtistsViewLabel}
                    getVenuesViewLabel={getVenuesViewLabel}
                  />
                )}
              </ReportSection>

              <ReportSection id="connections" title="Connections" description="Who performs together: closer means more shared stages. Compare with someone to see how much your genba overlap">
                <ConnectionsSection key={userId} userId={userId} userLabel={profileName || userId} events={filteredEvents} range={dateRangeKey} recentUsers={recentUsers} />
              </ReportSection>

              {chartAnalytics && (
                <ReportSection id="events" title="Events" description={`Every event you attended${filterByFavorites ? ' with a favorite artist' : ''} in this range. Search, filter by venue, artist or month, and open any event on Eventernote.`}>
                  <RecentEventsList
                    key={`${userId}-${dateRangeKey.start}-${dateRangeKey.end}`}
                    events={chartFilteredEvents}
                    onExportPNG={exportEventsListAsPNG}
                    eventsListRef={eventsListRef}
                  />
                </ReportSection>
              )}
            </VStack>
          </Box>
        )}

      </VStack>

      <ShareImageDrawer open={shareOpen} onOpenChange={setShareOpen} data={posterData} />

      <CompareDrawer
        open={compareOpen}
        onOpenChange={setCompareOpen}
        userId={userId}
        userLabel={profileName || userId}
        events={filteredEvents}
        range={dateRangeKey}
        rangeLabel={dateRange.startDate ? `${formatDisplayDate(dateRange.startDate)} to ${dateRange.endDate ? formatDisplayDate(dateRange.endDate) : 'today'}` : 'all time'}
        recentUsers={recentUsers}
        onOpenUser={(id) => { setCompareOpen(false); openUser(id); }}
      />

      <PeopleDrawer
        open={peopleTab !== null}
        tab={peopleTab || 'following'}
        userId={userId}
        expected={userProfileData?.data ? { following: userProfileData.data.following, followers: userProfileData.data.followers } : undefined}
        onTabChange={setPeopleTab}
        onOpenChange={(open) => !open && setPeopleTab(null)}
        onSelect={openUser}
      />

      <ReceiptPanel
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        userId={userId}
        cardholder={userProfileData?.data?.displayName || userProfileData?.data?.username || userId}
        dashboardRange={dateRange}
        favoriteArtists={favoriteArtistsData?.data?.map(a => a.name) || []}
      />
    </Box>
  );
}
