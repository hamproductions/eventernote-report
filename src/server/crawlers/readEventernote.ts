const MAX_ACTIVE = 4;
const MIN_GAP_MS = 125;
const waiting: { priority: number; resolve: () => void }[] = [];
let active = 0;
let nextSlot = 0;

async function pace() {
  const now = Date.now();
  const wait = Math.max(0, nextSlot - now);
  nextSlot = Math.max(now, nextSlot) + MIN_GAP_MS;
  if (wait) await new Promise(resolve => setTimeout(resolve, wait));
}

export async function readEventernote(url: string, priority = 0): Promise<string> {
  if (active >= MAX_ACTIVE) await new Promise<void>(resolve => {
    const request = { priority, resolve };
    const index = waiting.findIndex(item => item.priority < priority);
    if (index < 0) waiting.push(request);
    else waiting.splice(index, 0, request);
  });
  else active++;
  try {
    await pace();
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'eventernote-report (personal attendance stats; cached, rate-limited)' }
    });
    if (!response.ok) throw new Error(`Eventernote returned HTTP ${response.status}`);
    return await response.text();
  } finally {
    const next = waiting.shift();
    if (next) next.resolve();
    else active--;
  }
}
