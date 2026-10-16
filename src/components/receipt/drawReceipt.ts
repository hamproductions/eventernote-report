import { encode } from 'uqr';

export const RECEIPT_FONT = '"BIZ UDGothic", "Osaka-Mono", "MS Gothic", monospace';

export interface ReceiptRow {
  rank: number;
  name: string;
  detail?: string;
  amount: string;
}

export interface ReceiptData {
  title: string;
  period: string;
  userId: string;
  url: string;
  cardholder: string;
  favoritesOnly: boolean;
  printedAt: Date;
  events: ReceiptRow[];
  eventsOmitted: number;
  artists: ReceiptRow[];
  venues: ReceiptRow[];
  totalEvents: number;
  uniqueArtists: number;
  uniqueVenues: number;
  daysOut: number;
  since: string | null;
}

const WEEKDAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

export function receiptText(data: ReceiptData) {
  return [data.title, data.period, data.cardholder, data.userId, ...data.events.flatMap(row => [row.name, row.detail || '']), ...data.artists.map(row => row.name), ...data.venues.map(row => row.name), data.url]
    .join('')
    .toUpperCase() + '0123456789:#*-/.,()!?@x ';
}

export async function loadReceiptFont(data: ReceiptData) {
  const text = receiptText(data);
  await Promise.all([
    document.fonts.load(`400 16px ${RECEIPT_FONT}`, text),
    document.fonts.load(`700 16px ${RECEIPT_FONT}`, text)
  ]);
}

export function rankRows<T>(items: [T, number][], toName: (item: T) => string, limit: number): ReceiptRow[] {
  const rows: ReceiptRow[] = [];
  let rank = 0;
  let previous: number | null = null;
  items.slice(0, limit).forEach(([item, count], index) => {
    if (count !== previous) rank = index + 1;
    previous = count;
    rows.push({ rank, name: toName(item), amount: `x${count}` });
  });
  return rows;
}

function wrap(context: CanvasRenderingContext2D, text: string, width: number) {
  const lines: string[] = [];
  let line = '';
  for (const char of text) {
    const next = line + char;
    if (context.measureText(next).width <= width || !line) {
      line = next;
      continue;
    }
    const space = line.lastIndexOf(' ');
    if (char !== ' ' && space > 0 && space > line.length - 12) {
      lines.push(line.slice(0, space));
      line = line.slice(space + 1) + char;
    } else {
      lines.push(line.trimEnd());
      line = char === ' ' ? '' : char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function drawReceipt(data: ReceiptData, width: number) {
  const unit = width / 384;
  const pad = Math.round(2 * unit);
  const body = Math.round(20 * unit);
  const line = Math.round(body * 1.35);
  const inner = width - pad * 2;
  const qtyWidth = Math.round(body * 2.4);
  const amtWidth = Math.round(body * 3.4);
  const itemWidth = inner - qtyWidth - amtWidth;

  const ops: ((context: CanvasRenderingContext2D, y: number) => number)[] = [];
  const measure = document.createElement('canvas').getContext('2d')!;
  const font = (size: number, bold = false) => `${bold ? 700 : 400} ${size}px ${RECEIPT_FONT}`;

  const text = (value: string, options: { size?: number; bold?: boolean; align?: CanvasTextAlign; gap?: number; keepCase?: boolean } = {}) => {
    const size = options.size ?? body;
    const height = Math.round(size * 1.35);
    measure.font = font(size, options.bold);
    const lines = wrap(measure, options.keepCase ? value : value.toUpperCase(), inner);
    ops.push((context, y) => {
      context.font = font(size, options.bold);
      context.textAlign = options.align ?? 'left';
      const x = options.align === 'center' ? width / 2 : options.align === 'right' ? width - pad : pad;
      lines.forEach((value, index) => context.fillText(value, x, y + height * index + size));
      return lines.length * height + (options.gap ?? 0);
    });
  };

  const pair = (left: string, right: string, bold = false) => {
    ops.push((context, y) => {
      context.font = font(body, bold);
      context.textAlign = 'left';
      context.fillText(left.toUpperCase(), pad, y + body);
      context.textAlign = 'right';
      context.fillText(right.toUpperCase(), width - pad, y + body);
      return line;
    });
  };

  const rule = () => {
    ops.push((context, y) => {
      context.font = font(body);
      context.textAlign = 'left';
      const dash = context.measureText('-').width;
      context.fillText('-'.repeat(Math.floor(inner / dash)), pad, y + body * 0.9);
      return line;
    });
  };

  const space = (height = line / 2) => ops.push(() => height);

  const table = (heading: string, amountLabel: string, rows: ReceiptRow[]) => {
    pair(`QTY ${heading}`, amountLabel);
    rule();
    for (const row of rows) {
      measure.font = font(body);
      const nameLines = wrap(measure, row.name.toUpperCase(), itemWidth);
      measure.font = font(Math.round(body * 0.84));
      const detailLines = row.detail ? wrap(measure, `@ ${row.detail}`.toUpperCase(), itemWidth) : [];
      ops.push((context, y) => {
        context.textAlign = 'left';
        context.font = font(body);
        context.fillText(String(row.rank).padStart(2, '0'), pad, y + body);
        nameLines.forEach((value, index) => context.fillText(value, pad + qtyWidth, y + line * index + body));
        context.textAlign = 'right';
        context.fillText(row.amount, width - pad, y + body);
        const small = Math.round(body * 0.84);
        context.textAlign = 'left';
        context.font = font(small);
        const detailTop = y + line * nameLines.length;
        detailLines.forEach((value, index) => context.fillText(value, pad + qtyWidth, detailTop + Math.round(small * 1.3) * index + small));
        return line * nameLines.length + Math.round(small * 1.3) * detailLines.length + Math.round(line * 0.25);
      });
    }
  };

  space(Math.round(line * 0.8));
  text(data.title, { size: Math.round(body * 2), bold: true, align: 'center', gap: Math.round(line * 0.2) });
  text(data.period, { align: 'center', gap: line });
  text(`RECEIPT FOR ${data.cardholder}`);
  if (data.cardholder !== data.userId) text(`@${data.userId}`);
  if (data.favoritesOnly) text('FAVORITES ONLY');
  const printed = data.printedAt;
  text(`${WEEKDAYS[printed.getDay()]}, ${MONTHS[printed.getMonth()]} ${printed.getDate()}, ${printed.getFullYear()}`);
  rule();

  if (data.events.length) {
    table('EVENT', 'DATE', data.events);
    if (data.eventsOmitted > 0) text(`... ${data.eventsOmitted} MORE EVENTS`, { align: 'center' });
  } else {
    text('NO EVENTS IN THIS PERIOD', { align: 'center' });
  }
  rule();
  pair('ITEM COUNT:', String(data.events.length));
  pair('TOTAL EVENTS:', String(data.totalEvents), true);
  rule();

  if (data.artists.length) {
    text('TOP ARTISTS', { bold: true, align: 'center' });
    table('ARTIST', 'AMT', data.artists);
    rule();
  }
  if (data.venues.length) {
    text('TOP VENUES', { bold: true, align: 'center' });
    table('VENUE', 'AMT', data.venues);
    rule();
  }

  if (data.since) pair('FIRST EVENT', data.since);
  pair('DAYS OUT', String(data.daysOut));
  pair('ARTISTS', String(data.uniqueArtists));
  pair('VENUES', String(data.uniqueVenues));
  pair('TOTAL', String(data.totalEvents), true);
  rule();
  space(line);
  text('THANK YOU FOR VISITING!', { align: 'center', gap: Math.round(line * 0.4) });

  const qr = encode(data.url, { ecc: 'M', border: 0 });
  const module = Math.max(2, Math.floor((inner * 0.42) / qr.size));
  ops.push((context, y) => {
    const left = Math.round((width - qr.size * module) / 2);
    qr.data.forEach((row, rowIndex) => row.forEach((dark, column) => {
      if (dark) context.fillRect(left + column * module, y + rowIndex * module, module, module);
    }));
    return qr.size * module + Math.round(line * 0.4);
  });
  text('SCAN FOR YOUR FULL REPORT', { size: Math.round(body * 0.84), align: 'center' });
  text(data.url.replace(/^https?:\/\//, ''), { size: Math.round(body * 0.84), align: 'center', keepCase: true });
  space(line);

  const height = ops.reduce((total, op) => total + op(measure, total), 0);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = Math.ceil(height);
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#000000';
  context.textBaseline = 'alphabetic';
  let y = 0;
  for (const op of ops) y += op(context, y);
  return canvas;
}
