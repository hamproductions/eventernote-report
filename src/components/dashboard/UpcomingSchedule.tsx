import { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Box, Grid, HStack, VStack, styled } from 'styled-system/jsx';
import { css } from 'styled-system/css';
import { Button } from '~/components/ui/button';
import { Heading } from '~/components/ui/heading';
import { Text } from '~/components/ui/text';
import { fetchJson } from '~/shared/utils/fetchJson';
import { formatDate } from '~/shared/utils/dateUtils';
import { parseUserInput } from '~/shared/utils/parseUserInput';
import type { Event } from '~/shared/types/event';
import type { ScheduleResponse } from '~/shared/types/schedule';
import type { RecentUser } from '~/contexts/ReportContext';

interface UpcomingScheduleProps {
  userId: string;
  recentUsers: RecentUser[];
}

interface ScheduleEvent extends Event {
  users: string[];
}

const control = css({ minW: '0', minH: '11', px: '3', borderWidth: '1px', borderColor: 'border.control', borderRadius: 'md', bg: 'bg.default', color: 'fg.default', fontSize: 'sm' });

export function UpcomingSchedule({ userId, recentUsers }: UpcomingScheduleProps) {
  const today = formatDate(new Date());
  const currentMonth = today.slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [selected, setSelected] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [peopleKind, setPeopleKind] = useState<'following' | 'followers'>('following');
  const [peopleSearch, setPeopleSearch] = useState('');
  const [day, setDay] = useState<string | null>(null);
  const [sharedOnly, setSharedOnly] = useState(false);
  const [year, monthNumber] = month.split('-').map(Number);
  const monthLabel = new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const maxMonth = formatDate(new Date(new Date().getFullYear(), new Date().getMonth() + 12, 1)).slice(0, 7);
  const users = [userId, ...selected];
  const schedules = useQueries({
    queries: users.map(id => ({
      queryKey: ['schedule', id, month],
      queryFn: () => fetchJson<ScheduleResponse>(`/api/events/user/${encodeURIComponent(id)}/schedule?month=${month}`, 'Could not load schedule'),
      staleTime: (query: { state: { data: ScheduleResponse | undefined; dataUpdatedAt: number } }) => query.state.data
        ? Math.max(0, new Date(query.state.data.data.expiresAt).getTime() - query.state.dataUpdatedAt)
        : 0,
      gcTime: 24 * 60 * 60 * 1000,
      retry: false,
      refetchOnWindowFocus: false
    }))
  });
  const connections = useQuery<{ data: { following: { userId: string }[]; followers: { userId: string }[] } }>({
    queryKey: ['connections-raw', userId],
    queryFn: () => fetchJson(`/api/user-profile/${encodeURIComponent(userId)}/connections`, 'Could not load people'),
    enabled: peopleOpen,
    staleTime: 6 * 60 * 60 * 1000,
    retry: false
  });

  const events = useMemo(() => {
    const merged = new Map<string, ScheduleEvent>();
    schedules.forEach((schedule, index) => {
      if (!schedule.isSuccess) return;
      for (const event of schedule.data.data.events) {
        if (event.date.slice(0, 10) < today) continue;
        const existing = merged.get(event.href);
        if (existing) existing.users.push(users[index]);
        else merged.set(event.href, { ...event, users: [users[index]] });
      }
    });
    return [...merged.values()].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
  }, [schedules, today, users]);
  const byDay = new Map<string, ScheduleEvent[]>();
  for (const event of events) {
    const date = event.date.slice(0, 10);
    byDay.set(date, [...(byDay.get(date) || []), event]);
  }
  const visibleDays = [...byDay.entries()].filter(([date, items]) => (!day || date === day) && (!sharedOnly || items.some(event => event.users.length > 1)));
  const busy = schedules.some(schedule => schedule.isFetching);
  const complete = schedules.every(schedule => schedule.isSuccess && !schedule.isFetching);
  const label = (id: string) => recentUsers.find(user => user.id.toLowerCase() === id.toLowerCase())?.name || id;

  const addPerson = (value: string) => {
    const id = parseUserInput(value);
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
      setInputError('Enter an Eventernote user ID or profile URL.');
      return;
    }
    if (users.some(user => user.toLowerCase() === id.toLowerCase())) {
      setInputError('This person is already shown.');
      return;
    }
    if (selected.length >= 3) return;
    setSelected(current => [...current, id]);
    setInput('');
    setInputError('');
  };
  const changeMonth = (value: string) => {
    setMonth(value);
    setDay(null);
  };
  const stepMonth = (delta: number) => changeMonth(formatDate(new Date(year, monthNumber - 1 + delta, 1)).slice(0, 7));
  const candidates = (connections.data?.data[peopleKind] || []).filter(person => !users.some(id => id.toLowerCase() === person.userId.toLowerCase()) && person.userId.toLowerCase().includes(peopleSearch.toLowerCase()));
  const firstWeekday = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthNumber, 0).getDate();

  return (
    <VStack as="section" aria-label="Upcoming schedules" gap="6" alignItems="stretch">
      <Box>
        <Heading as="h1" size="2xl">Upcoming</Heading>
        <Text color="fg.muted" mt="2">Your registered events from today onward. Add people to see where your plans meet.</Text>
      </Box>

      <VStack gap="3" alignItems="stretch">
        <HStack gap="2" flexWrap="wrap">
          <Text size="sm" fontWeight="semibold">{label(userId)} (you)</Text>
          {selected.map(id => <Button key={id} variant="outline" size="sm" aria-label={`Remove ${id}`} onClick={() => { setSelected(current => current.filter(user => user !== id)); if (selected.length === 1) setSharedOnly(false); }}>{label(id)} ×</Button>)}
          <Text size="xs" color="fg.muted">{selected.length}/3 people added</Text>
        </HStack>
        <form onSubmit={event => { event.preventDefault(); addPerson(input); }}>
          <HStack gap="2" flexWrap="wrap">
            <input aria-label="Person to add" placeholder="User ID or Eventernote profile URL" value={input} onChange={event => { setInput(event.target.value); setInputError(''); }} disabled={selected.length >= 3} autoCapitalize="none" spellCheck={false} className={css({ flex: '1', minW: '180px' }) + ' ' + control} />
            <Button type="submit" variant="outline" disabled={!input.trim() || selected.length >= 3}>Add person</Button>
            <Button type="button" variant="ghost" aria-expanded={peopleOpen} onClick={() => setPeopleOpen(!peopleOpen)}>{peopleOpen ? 'Hide people' : 'Following / followers'}</Button>
          </HStack>
          {inputError && <Text size="sm" color="fg.error" role="alert" mt="2">{inputError}</Text>}
        </form>
        {selected.length === 3 && <Text size="sm" color="fg.muted">Remove someone to compare another person.</Text>}
        {peopleOpen && (
          <VStack gap="3" alignItems="stretch" p="4" borderWidth="1px" borderColor="border.subtle" borderRadius="md">
            <HStack gap="2" flexWrap="wrap">
              <Button size="sm" variant={peopleKind === 'following' ? 'solid' : 'outline'} aria-pressed={peopleKind === 'following'} onClick={() => setPeopleKind('following')}>Following</Button>
              <Button size="sm" variant={peopleKind === 'followers' ? 'solid' : 'outline'} aria-pressed={peopleKind === 'followers'} onClick={() => setPeopleKind('followers')}>Followers</Button>
              <input aria-label="Search people" placeholder="Filter user IDs" value={peopleSearch} onChange={event => setPeopleSearch(event.target.value)} className={control} />
            </HStack>
            {connections.isFetching && <Text size="sm" role="status">Loading people…</Text>}
            {connections.isError && <Box role="alert"><Text color="fg.error" size="sm">{connections.error.message}</Text><Button size="sm" variant="outline" onClick={() => connections.refetch()}>Retry people</Button></Box>}
            {connections.isSuccess && <>
              <Box maxH="60" overflowY="auto">
                <HStack gap="2" flexWrap="wrap">{candidates.slice(0, 100).map(person => <Button key={person.userId} variant="outline" size="sm" disabled={selected.length >= 3} onClick={() => addPerson(person.userId)}>{person.userId}</Button>)}</HStack>
                {!candidates.length && <Text size="sm" color="fg.muted">No matching people in this list. Enter a user ID above.</Text>}
              </Box>
              <Text size="xs" color="fg.muted">Available public {peopleKind}; the list may be incomplete. Filter to find more. Schedules load only when you add someone.</Text>
            </>}
          </VStack>
        )}
      </VStack>

      <HStack justifyContent="space-between" gap="3" flexWrap="wrap">
        <HStack gap="2" flexWrap="wrap">
          <Button variant="outline" aria-label="Previous month" disabled={month <= currentMonth} onClick={() => stepMonth(-1)}>‹</Button>
          <input type="month" aria-label="Schedule month" value={month} min={currentMonth} max={maxMonth} onChange={event => { if (event.target.value >= currentMonth && event.target.value <= maxMonth) changeMonth(event.target.value); }} className={control} />
          <Button variant="outline" aria-label="Next month" disabled={month >= maxMonth} onClick={() => stepMonth(1)}>›</Button>
          <Button variant="ghost" onClick={() => changeMonth(currentMonth)}>Today</Button>
        </HStack>
        <Button variant="outline" disabled={busy} onClick={() => schedules.forEach(schedule => schedule.refetch())}>Check schedules</Button>
      </HStack>

      <VStack gap="2" alignItems="stretch" aria-live="polite">
        {schedules.map((schedule, index) => <HStack key={users[index]} gap="2" flexWrap="wrap">
          <Text size="xs" color={schedule.isError ? 'fg.error' : 'fg.muted'}>
            {label(users[index])}: {schedule.isFetching ? 'Loading schedule…' : schedule.isError ? schedule.error.message : schedule.data ? `Snapshot loaded ${new Date(schedule.data.data.loadedAt).toLocaleString()}. Cached until ${new Date(schedule.data.data.expiresAt).toLocaleTimeString()}.` : ''}
          </Text>
          {schedule.isError && !schedule.isFetching && <Button size="xs" variant="outline" onClick={() => schedule.refetch()}>Retry {users[index]}</Button>}
        </HStack>)}
        <Text size="xs" color="fg.muted">One month at a time. Cached for one hour; checking again reuses the cache. Times and ticket status are not included.</Text>
      </VStack>

      <Grid gridTemplateColumns={{ base: 'minmax(0, 1fr)', lg: 'minmax(300px, 2fr) minmax(0, 3fr)' }} gap={{ base: '6', lg: '8' }} alignItems="start">
        <Box borderWidth="1px" borderColor="border.subtle" borderRadius="md" p={{ base: '3', md: '5' }} hideBelow="sm">
          <Heading as="h2" size="md" mb="4">{monthLabel}</Heading>
          <Grid gridTemplateColumns="repeat(7, minmax(0, 1fr))" gap="1">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(weekday => <Text key={weekday} size="xs" color="fg.muted" textAlign="center" pb="2">{weekday}</Text>)}
            {Array.from({ length: firstWeekday }, (_, index) => <Box key={`blank-${index}`} />)}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const date = `${month}-${String(index + 1).padStart(2, '0')}`;
              const items = byDay.get(date) || [];
              const shared = items.some(event => event.users.length > 1);
              return <styled.button key={date} type="button" disabled={date < today} onClick={() => setDay(day === date ? null : date)} aria-pressed={day === date} aria-label={`${date}: ${items.length} events${shared ? ', shared event' : ''}`} minH="11" minW="0" py="1" borderWidth="1px" borderRadius="sm" borderColor={date === today || day === date ? 'colorPalette.default' : 'transparent'} bg={day === date ? 'colorPalette.subtle' : items.length ? 'bg.subtle' : 'transparent'} color="fg.default" cursor="pointer" _hover={{ bg: 'bg.muted' }} _disabled={{ opacity: 0.4, cursor: 'default' }}>
                <Text as="span" display="block" size="sm" fontWeight={date === today ? 'bold' : 'normal'}>{index + 1}</Text>
                <Text as="span" display="block" fontSize="10px" minH="3.5" color={shared ? 'colorPalette.text' : 'fg.muted'}>{items.length ? `${items.length}${shared ? ' •' : ''}` : ''}</Text>
              </styled.button>;
            })}
          </Grid>
          <Text size="xs" color="fg.muted" mt="4">Counts are distinct events. A dot marks a shared event. Pick a date to filter the agenda.</Text>
        </Box>

        <VStack gap="4" alignItems="stretch">
          <label className={css({ display: { base: 'flex', sm: 'none' }, gap: '2', alignItems: 'center', fontSize: 'sm' })}>Date
            <select aria-label="Agenda date" value={day || ''} onChange={event => setDay(event.target.value || null)} className={control}>
              <option value="">All dates</option>
              {[...byDay.keys()].map(date => <option key={date} value={date}>{date}</option>)}
            </select>
          </label>
          <HStack justifyContent="space-between" gap="2" flexWrap="wrap">
            <Heading as="h2" size="lg">{day ? new Date(`${day}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'This month’s plans'}</Heading>
            <HStack gap="2" flexWrap="wrap">
              {day && <Button size="sm" variant="ghost" onClick={() => setDay(null)}>All dates</Button>}
              <Button size="sm" variant={sharedOnly ? 'solid' : 'outline'} aria-pressed={sharedOnly} disabled={!selected.length} onClick={() => setSharedOnly(!sharedOnly)}>Shared only</Button>
            </HStack>
          </HStack>
          {!complete && <Text size="sm" color="fg.muted">{busy ? 'Loading selected schedules. Events appear as each person loads.' : 'Some schedules could not load. Shared events may be missing; retry above.'}</Text>}
          {complete && !visibleDays.length && <Box p="5" bg="bg.subtle" borderRadius="md"><Text fontWeight="medium">{sharedOnly ? 'No shared registrations in this selection' : 'No upcoming registrations in this selection'}</Text><Text size="sm" color="fg.muted" mt="2">{day ? 'Choose All dates to see the rest of the month.' : 'Choose another month or add someone to compare.'}</Text></Box>}
          {visibleDays.map(([date, items]) => <VStack key={date} gap="3" alignItems="stretch">
            <HStack gap="3" flexWrap="wrap" borderBottomWidth="1px" borderColor="border.subtle" pb="2">
              <Text as="h3" fontWeight="semibold">{new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}{date === today ? ' · Today' : ''}</Text>
              {items.length > 1 && <Text size="xs" color="fg.muted">{items.length} different events on this day; times not checked</Text>}
            </HStack>
            {items.filter(event => !sharedOnly || event.users.length > 1).map(event => <Box as="article" key={event.href} pb="3">
              <styled.a href={`https://www.eventernote.com${event.href}`} target="_blank" rel="noopener noreferrer" display="block" py="2" minH="11" fontWeight="medium" overflowWrap="anywhere" _hover={{ textDecoration: 'underline' }}>{event.name}</styled.a>
              <Text size="sm" color="fg.muted" overflowWrap="anywhere">{event.place || 'Venue not listed'}</Text>
              <Text size="sm" mt="2" color={event.users.length > 1 ? 'colorPalette.text' : 'fg.muted'} overflowWrap="anywhere">{event.users.length > 1 ? 'Shared · ' : ''}{event.users.map(id => id === userId ? `${label(id)} (you)` : label(id)).join(', ')}</Text>
            </Box>)}
          </VStack>)}
          <Text size="xs" color="fg.muted">Registrations come from Eventernote’s public lists. Open an event for the latest venue, performers and times. A registration is not a ticket confirmation.</Text>
        </VStack>
      </Grid>
    </VStack>
  );
}
