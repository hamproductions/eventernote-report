/** One accent (blue) for you, neutral gray for the other person; follows the theme tokens. */
export const SIDE_COLORS = {
  mine: 'var(--colors-blue-9)',
  theirs: 'var(--colors-gray-9)',
  both: 'var(--colors-fg-default)'
} as const;

export const NODE_COLOR = 'var(--colors-fg-subtle)';
export const ACCENT = 'var(--colors-blue-9)';

const GROUP_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#f97316', '#eab308', '#84cc16', '#14b8a6'];

export const groupColor = (cluster: number) => {
  if (cluster < 0) return NODE_COLOR;
  if (cluster < GROUP_COLORS.length) return GROUP_COLORS[cluster];
  return `hsl(${Math.round((cluster * 137.508) % 360)} 62% 55%)`;
};
