/** Fixed colours so the graph reads the same in light and dark mode. */
export const SIDE_COLORS = {
  mine: '#3b82f6',
  theirs: '#f08a24',
  both: '#8b5cf6'
} as const;

export const CLUSTER_COLORS = ['#4f8ef7', '#f2994a', '#27ae8f', '#d85a9a', '#9b6bdf', '#d9a826', '#4fb3d9', '#e0675a', '#8fa84a'] as const;
export const NO_CLUSTER_COLOR = '#8a93a3';

export const clusterColor = (cluster: number) => (cluster < 0 ? NO_CLUSTER_COLOR : CLUSTER_COLORS[cluster % CLUSTER_COLORS.length]);
