import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  isBluetoothSupported,
  isSerialSupported,
  isUsbSupported,
  printCanvas,
  requestBluetoothPrinter,
  requestSerialPrinter,
  requestUsbPrinter,
  type Transport
} from 'escpos-web-print';
import { Download, Printer, Share2, X } from 'lucide-react';
import { Box, Grid, HStack, VStack } from 'styled-system/jsx';
import { css } from 'styled-system/css';
import { Button } from '~/components/ui/button';
import { Drawer } from '~/components/ui/drawer';
import { IconButton } from '~/components/ui/icon-button';
import { Switch } from '~/components/ui/switch';
import { Text } from '~/components/ui/text';
import { LoadingStatus } from '~/components/dashboard/LoadingStatus';
import { PillGroup } from '~/components/dashboard/PillGroup';
import { formatDate } from '~/shared/utils/dateUtils';
import { drawReceipt, loadReceiptFont, rankRows, type ReceiptData } from './drawReceipt';
import type { EnhancedEvent } from '~/shared/types/event';

type PeriodMode = 'month' | 'year' | 'range';
type Connection = 'bluetooth' | 'usb' | 'serial';

interface ReceiptPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  cardholder: string;
  dashboardRange: { startDate: Date | null; endDate: Date | null };
  favoriteArtists: string[];
}

const PAPER_WIDTHS = { '58': 384, '80': 576 } as const;
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const PRINTER_NAME_KEY = 'eventernote-printer-name';

const fieldClass = css({
  h: '11',
  px: '3',
  borderWidth: '1px',
  borderColor: 'border.control',
  borderRadius: 'md',
  bg: 'bg.default',
  color: 'fg.default',
  fontSize: 'sm',
  w: 'full',
  _focusVisible: { outline: '2px solid', outlineColor: 'colorPalette.default', outlineOffset: '1px' }
});

function previousMonth() {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function readPrinterName() {
  try {
    return localStorage.getItem(PRINTER_NAME_KEY) || undefined;
  } catch {
    return undefined;
  }
}

function savePrinterName(name: string) {
  try {
    localStorage.setItem(PRINTER_NAME_KEY, name);
  } catch {
    return;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <VStack as="label" gap="1.5" alignItems="stretch">
      <Text as="span" size="xs" fontWeight="medium" color="fg.muted">{label}</Text>
      {children}
    </VStack>
  );
}

export function ReceiptPanel({ open, onOpenChange, userId, cardholder, dashboardRange, favoriteArtists }: ReceiptPanelProps) {
  const currentYear = new Date().getFullYear();
  const [mode, setMode] = useState<PeriodMode>('month');
  const [month, setMonth] = useState(previousMonth);
  const [year, setYear] = useState(currentYear);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [maxEvents, setMaxEvents] = useState(0);
  const [topArtists, setTopArtists] = useState(10);
  const [showVenues, setShowVenues] = useState(false);
  const [paper, setPaper] = useState<keyof typeof PAPER_WIDTHS>('58');
  const [connection, setConnection] = useState<Connection>('bluetooth');
  const [printer, setPrinter] = useState<Transport | null>(null);
  const [printStatus, setPrintStatus] = useState('');
  const [printError, setPrintError] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [receiptCanvas, setReceiptCanvas] = useState<HTMLCanvasElement | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const period = useMemo(() => {
    const today = formatDate(new Date());
    if (mode === 'month') {
      const [y, m] = month.split('-').map(Number);
      const end = formatDate(new Date(y, m, 0));
      return { start: `${month}-01`, end: [end, today].sort()[0], label: `${MONTH_NAMES[m - 1]} ${y}` };
    }
    if (mode === 'year') {
      const end = `${year}-12-31`;
      return { start: `${year}-01-01`, end: [end, today].sort()[0], label: String(year) };
    }
    const start = dashboardRange.startDate ? formatDate(dashboardRange.startDate) : null;
    const end = dashboardRange.endDate ? formatDate(dashboardRange.endDate) : null;
    return { start, end, label: start ? `${start.replaceAll('-', '/')} - ${(end || today).replaceAll('-', '/')}` : 'All Time' };
  }, [mode, month, year, dashboardRange]);

  const futurePeriod = !!period.start && period.start > formatDate(new Date());

  const { data, isFetching, error } = useQuery<{ data: { events: EnhancedEvent[] } }>({
    queryKey: ['events', userId, { start: period.start, end: period.end }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (period.start) params.set('startDate', period.start);
      if (period.end) params.set('endDate', period.end);
      const res = await fetch(`/api/events/user/${userId}?${params}`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const result = await res.json();
      if (!result.success) throw new Error(result.error?.message || 'Failed to fetch events');
      return result;
    },
    enabled: open && !futurePeriod,
    retry: false,
    staleTime: 1000 * 60 * 30
  });

  const receipt = useMemo<ReceiptData | null>(() => {
    if (!data && !futurePeriod) return null;
    const today = formatDate(new Date());
    const favorites = new Set(favoriteArtists);
    const events = (data?.data.events || [])
      .filter(event => {
        const date = event.date.slice(0, 10);
        if (date > today) return false;
        if (period.start && date < period.start) return false;
        if (period.end && date > period.end) return false;
        return !favoritesOnly || event.artists?.some(artist => favorites.has(artist));
      })
      .sort((a, b) => a.date.localeCompare(b.date));
    const multiYear = new Set(events.map(event => event.date.slice(0, 4))).size > 1;
    const artistCounts = new Map<string, number>();
    const venueCounts = new Map<string, number>();
    for (const event of events) {
      for (const artist of new Set(event.artists || [])) {
        if (!favoritesOnly || favorites.has(artist)) artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);
      }
      if (!event.place.startsWith('!_')) venueCounts.set(event.place, (venueCounts.get(event.place) || 0) + 1);
    }
    const byCount = (map: Map<string, number>) => [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    const shown = maxEvents ? events.slice(0, maxEvents) : events;
    return {
      title: 'EVENTER RECEIPT',
      period: period.label,
      userId,
      url: `${window.location.origin}/?user=${encodeURIComponent(userId)}`,
      cardholder,
      favoritesOnly,
      printedAt: new Date(),
      events: shown.map((event, index) => ({
        rank: index + 1,
        name: event.name,
        detail: event.place,
        amount: multiYear ? event.date.slice(2, 10).replaceAll('-', '/') : event.date.slice(5, 10).replace('-', '/')
      })),
      eventsOmitted: events.length - shown.length,
      artists: topArtists ? rankRows(byCount(artistCounts), name => name, topArtists) : [],
      venues: showVenues ? rankRows(byCount(venueCounts), name => name, 5) : [],
      totalEvents: events.length,
      uniqueArtists: artistCounts.size,
      uniqueVenues: venueCounts.size,
      daysOut: new Set(events.map(event => event.date.slice(0, 10))).size,
      since: events[0] ? events[0].date.slice(0, 10).replaceAll('-', '/') : null
    };
  }, [data, futurePeriod, favoriteArtists, favoritesOnly, period, maxEvents, topArtists, showVenues, userId, cardholder]);

  useEffect(() => {
    if (!receipt) return;
    let cancelled = false;
    loadReceiptFont(receipt).finally(() => {
      if (cancelled) return;
      const canvas = drawReceipt(receipt, PAPER_WIDTHS[paper]);
      canvas.setAttribute('aria-label', `Receipt preview for ${receipt.period}, ${receipt.totalEvents} events`);
      canvas.setAttribute('role', 'img');
      canvas.className = css({ display: 'block', w: 'full', h: 'auto', mixBlendMode: 'multiply' });
      previewRef.current?.replaceChildren(canvas);
      setReceiptCanvas(canvas);
    });
    return () => {
      cancelled = true;
    };
  }, [receipt, paper, open]);

  const fileName = `eventer-receipt-${userId}-${period.label.replace(/[^\w]+/g, '-').toLowerCase()}.png`;

  const toBlob = () => new Promise<Blob | null>(resolve => receiptCanvas ? receiptCanvas.toBlob(resolve, 'image/png') : resolve(null));

  const download = async () => {
    const blob = await toBlob();
    if (!blob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const share = async () => {
    const blob = await toBlob();
    if (!blob) return;
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `Eventer Receipt · ${period.label}` });
      } catch (shareError) {
        if (!(shareError instanceof DOMException && shareError.name === 'AbortError')) await download();
      }
      return;
    }
    await download();
  };

  const supported = connection === 'bluetooth' ? isBluetoothSupported() : connection === 'usb' ? isUsbSupported() : isSerialSupported();

  const connect = async () => {
    const onDisconnect = () => {
      abortRef.current?.abort();
      setPrinter(null);
      setPrintStatus('');
      setPrintError('Printer disconnected. Press Print to reconnect.');
    };
    setPrintError('');
    setPrintStatus('Choose your printer in the browser dialog');
    try {
      const transport = connection === 'usb'
        ? await requestUsbPrinter({ onDisconnect })
        : connection === 'serial'
          ? await requestSerialPrinter({ onDisconnect })
          : await requestBluetoothPrinter({ namePrefix: readPrinterName(), onDisconnect });
      if (connection === 'bluetooth' && transport.deviceName) savePrinterName(transport.deviceName);
      setPrinter(transport);
      setPrintStatus(`Connected: ${transport.label}`);
      return transport;
    } catch (connectError) {
      setPrintStatus('');
      if (!(connectError instanceof DOMException && connectError.name === 'NotFoundError')) {
        setPrintError(connectError instanceof Error ? connectError.message : 'Could not connect. Turn the printer on and try again.');
      }
      return null;
    }
  };

  const print = async () => {
    if (!receiptCanvas) return;
    const transport = printer ?? await connect();
    if (!transport) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setPrintError('');
    setProgress(0);
    setPrintStatus(`Printing on ${transport.label}`);
    try {
      await printCanvas(transport, receiptCanvas, {
        printWidth: PAPER_WIDTHS[paper],
        trim: false,
        dither: 'threshold',
        threshold: 160,
        paddingAfter: 96,
        signal: controller.signal,
        onProgress: (sent, total) => setProgress(Math.round(sent / total * 100))
      });
      setPrintStatus(`Printed on ${transport.label}`);
    } catch (sendError) {
      if (sendError instanceof DOMException && sendError.name === 'AbortError') {
        setPrintStatus('Printing cancelled');
      } else {
        setPrintStatus(`Connected: ${transport.label}`);
        setPrintError(sendError instanceof Error ? sendError.message : 'Printing failed. Check power and paper.');
      }
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  };

  const disconnect = async () => {
    await printer?.close();
    setPrinter(null);
    setPrintStatus('');
  };

  const years = Array.from({ length: currentYear - 2008 }, (_, index) => currentYear - index);

  return (
    <Drawer.Root open={open} onOpenChange={details => onOpenChange(details.open)} lazyMount unmountOnExit={false}>
      <Drawer.Backdrop />
      <Drawer.Positioner w={{ base: 'full', md: '880px' }} maxW="100vw">
        <Drawer.Content colorPalette="blue">
          <Drawer.Header>
            <HStack justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Drawer.Title>Print receipt</Drawer.Title>
                <Drawer.Description>Your events and top artists for a month or year, as a thermal-printer receipt.</Drawer.Description>
              </Box>
              <Drawer.CloseTrigger asChild position="static">
                <IconButton aria-label="Close receipt" variant="ghost" size="sm">
                  <X />
                </IconButton>
              </Drawer.CloseTrigger>
            </HStack>
          </Drawer.Header>
          <Drawer.Body>
            <Grid gridTemplateColumns={{ base: '1fr', md: '280px 1fr' }} gap="6" alignItems="start">
              <VStack gap="5" alignItems="stretch" position={{ md: 'sticky' }} top="0">
                <VStack gap="2" alignItems="stretch">
                  <Text size="sm" fontWeight="semibold">Period</Text>
                  <PillGroup
                    label="Receipt period"
                    value={mode}
                    options={[['month', 'Month'], ['year', 'Year'], ['range', 'Dashboard range']] as const}
                    onChange={setMode}
                  />
                  {mode === 'month' && (
                    <input aria-label="Month" type="month" value={month} max={formatDate(new Date()).slice(0, 7)}
                      onChange={event => event.target.value && setMonth(event.target.value)} className={fieldClass} />
                  )}
                  {mode === 'year' && (
                    <select aria-label="Year" value={year} onChange={event => setYear(Number(event.target.value))} className={fieldClass}>
                      {years.map(value => <option key={value} value={value}>{value}</option>)}
                    </select>
                  )}
                  {mode === 'range' && <Text size="xs" color="fg.muted">{period.label}</Text>}
                </VStack>

                <VStack gap="3" alignItems="stretch">
                  <Text size="sm" fontWeight="semibold">Contents</Text>
                  <Switch size="sm" minH={{ base: "11", md: "auto" }} checked={favoritesOnly} disabled={!favoriteArtists.length}
                    onCheckedChange={details => setFavoritesOnly(details.checked)}>
                    Favorites only{favoriteArtists.length ? '' : ' (no favorites)'}
                  </Switch>
                  <Grid gridTemplateColumns="1fr 1fr" gap="3">
                    <Field label="Events listed">
                      <select value={maxEvents} onChange={event => setMaxEvents(Number(event.target.value))} className={fieldClass}>
                        <option value={0}>All</option>
                        {[10, 20, 30, 50].map(value => <option key={value} value={value}>First {value}</option>)}
                      </select>
                    </Field>
                    <Field label="Top artists">
                      <select value={topArtists} onChange={event => setTopArtists(Number(event.target.value))} className={fieldClass}>
                        <option value={0}>None</option>
                        {[5, 10, 20].map(value => <option key={value} value={value}>Top {value}</option>)}
                      </select>
                    </Field>
                  </Grid>
                  <Switch size="sm" minH={{ base: "11", md: "auto" }} checked={showVenues} onCheckedChange={details => setShowVenues(details.checked)}>
                    Include top 5 venues
                  </Switch>
                </VStack>

                <VStack gap="3" alignItems="stretch">
                  <Text size="sm" fontWeight="semibold">Printer</Text>
                  <Grid gridTemplateColumns="1fr 1fr" gap="3">
                    <Field label="Paper">
                      <select value={paper} onChange={event => setPaper(event.target.value as keyof typeof PAPER_WIDTHS)} className={fieldClass}>
                        <option value="58">58 mm</option>
                        <option value="80">80 mm</option>
                      </select>
                    </Field>
                    <Field label="Connection">
                      <select value={connection} disabled={!!printer} onChange={event => setConnection(event.target.value as Connection)} className={fieldClass}>
                        <option value="bluetooth">Bluetooth</option>
                        <option value="usb">USB</option>
                        <option value="serial">Serial</option>
                      </select>
                    </Field>
                  </Grid>
                  <Button onClick={print} disabled={!receiptCanvas || !supported || progress !== null}>
                    <Printer /> {printer ? 'Print' : 'Connect & print'}
                  </Button>
                  {!supported && (
                    <Text size="xs" color="fg.muted">This browser can't reach printers over {connection === 'usb' ? 'USB' : connection === 'serial' ? 'serial' : 'Bluetooth'}. Use Chrome or Edge, or save the image instead.</Text>
                  )}
                  {progress !== null && (
                    <HStack gap="2">
                      <LoadingStatus compact label={printStatus} loaded={progress} total={100} />
                      <Button size="xs" variant="ghost" onClick={() => abortRef.current?.abort()}>Cancel</Button>
                    </HStack>
                  )}
                  {progress === null && printStatus && (
                    <HStack justifyContent="space-between" gap="2">
                      <Text size="xs" color="fg.muted" role="status">{printStatus}</Text>
                      {printer && <Button size="xs" variant="ghost" onClick={disconnect}>Disconnect</Button>}
                    </HStack>
                  )}
                  {printError && <Text size="xs" color="fg.error" role="alert">{printError}</Text>}
                  <HStack gap="2">
                    <Button flex="1" variant="outline" onClick={share} disabled={!receiptCanvas}><Share2 /> Share</Button>
                    <Button flex="1" variant="outline" onClick={download} disabled={!receiptCanvas}><Download /> Save image</Button>
                  </HStack>
                </VStack>
              </VStack>

              <VStack gap="3" alignItems="stretch" minW="0">
                {isFetching && <LoadingStatus label="Loading events" detail={period.label} />}
                {error && <Text color="fg.error" role="alert">{error.message}. Try again or pick another period.</Text>}
                {futurePeriod && <Text size="sm" color="fg.muted">This period hasn't started yet.</Text>}
                <Box
                  bg="#f4f3f0"
                  borderRadius="sm"
                  py="6"
                  px={{ base: '2', sm: '4' }}
                  style={{
                    backgroundImage: 'radial-gradient(circle at 20% 15%, rgba(255,255,255,.9), transparent 40%), radial-gradient(circle at 80% 60%, rgba(0,0,0,.05), transparent 45%), repeating-linear-gradient(115deg, rgba(0,0,0,.025) 0 2px, transparent 2px 9px), linear-gradient(160deg, #fbfaf7, #e9e7e2)'
                  }}
                >
                  <Box ref={previewRef} maxW="440px" mx="auto" opacity={isFetching ? 0.4 : 1} transition="opacity 0.2s"
                    boxShadow="0 1px 2px rgba(0,0,0,.08), 0 12px 32px -12px rgba(0,0,0,.35)" bg="white" minH="200px" px={{ base: "3", sm: "5" }} py="4" />
                </Box>
              </VStack>
            </Grid>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
}
