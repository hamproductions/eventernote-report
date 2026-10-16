export function parseUserInput(value: string) {
  const trimmed = value.trim();
  return trimmed.match(/eventernote\.com\/users\/([^/?#]+)/)?.[1] ?? trimmed.replace(/^@/, '');
}
