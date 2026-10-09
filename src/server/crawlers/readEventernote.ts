const waiting: { priority: number; resolve: () => void }[] = [];
let active = 0;

export async function readEventernote(url: string, priority = 0): Promise<string> {
  if (active >= 24) await new Promise<void>(resolve => {
    const request = { priority, resolve };
    const index = waiting.findIndex(item => item.priority < priority);
    if (index < 0) waiting.push(request);
    else waiting.splice(index, 0, request);
  });
  else active++;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Eventernote returned HTTP ${response.status}`);
    return await response.text();
  } finally {
    const next = waiting.shift();
    if (next) next.resolve();
    else active--;
  }
}
