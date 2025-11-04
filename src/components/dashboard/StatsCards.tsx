import { StatDisplay } from './StatDisplay';

interface Analytics {
  [key: string]: any;
}

interface StatsCardsProps {
  analytics: Analytics;
}

export function StatsCards({ analytics }: StatsCardsProps) {
  return <StatDisplay analytics={analytics} />;
}
