export async function fetchJson<T>(url: string, fallbackMessage: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    throw new Error('Could not reach the server. Check your connection');
  }
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.success === false) {
    const message = typeof result?.error === 'string' ? result.error : result?.error?.message;
    throw new Error(message || `${fallbackMessage} (HTTP ${response.status})`);
  }
  return result as T;
}
