import { VStack, Box } from 'styled-system/jsx';
import * as Card from '~/components/ui/styled/card';
import { Text } from '~/components/ui/text';
import { type StatSection, type StatItem, STAT_SECTIONS, getStreakUnit } from './StatConfig';

interface StatDisplayProps {
  analytics: any;
  sections?: StatSection[]; // Optional: override default sections
}

export function StatDisplay({ analytics, sections = STAT_SECTIONS }: StatDisplayProps) {
  if (!analytics) return null;

  return (
    <VStack gap="8" alignItems="stretch">
      <Card.Root>
        <Card.Header>
          <Card.Title>Overview</Card.Title>
        </Card.Header>
        <Card.Body>
          <VStack gap="6" alignItems="stretch">
            {sections.map((section) => (
              <VStack key={section.title} gap="3" alignItems="stretch">
                <Text size="sm" fontWeight="semibold" color="fg.default">
                  {section.title}
                </Text>
                <Box display="grid" gap="4" className={section.columns}>
                  {section.stats.map((stat) => (
                    <StatCard key={stat.id} stat={stat} analytics={analytics} />
                  ))}
                </Box>
              </VStack>
            ))}
          </VStack>
        </Card.Body>
      </Card.Root>
    </VStack>
  );
}

interface StatCardProps {
  stat: StatItem;
  analytics: any;
}

function StatCard({ stat, analytics }: StatCardProps) {
  const primaryValue = stat.accessor(analytics);
  const secondaryValue = stat.secondaryAccessor?.(analytics);

  // Determine styling based on stat type
  const isCurrentStreak = stat.id.includes('current') && stat.id.includes('Streak');
  const isActive = isCurrentStreak && analytics.streaks?.[
    stat.id.includes('Daily') ? 'daily' : 'weekly'
  ]?.isActive;

  // Get the appropriate size for primary value
  const getPrimarySize = () => {
    if (stat.format === 'number' || stat.format === 'percentage') {
      return primaryValue && primaryValue.toString().length > 4 ? '2xl' : '3xl';
    }
    return 'lg';
  };

  // Get color for primary value
  const getPrimaryColor = () => {
    if (isCurrentStreak) {
      return isActive ? 'green.default' : 'fg.muted';
    }
    return stat.format === 'number' || stat.format === 'percentage'
      ? 'colorPalette.default'
      : 'fg.default';
  };

  return (
    <VStack gap="1" alignItems="flex-start">
      <Text size="xs" color="fg.muted" fontWeight="medium">
        {stat.label}
      </Text>

      {stat.format === 'date' && secondaryValue ? (
        // Date range format
        <VStack gap="0" alignItems="flex-start">
          <Text size="sm" fontWeight="semibold" color="fg.default">
            {primaryValue}
          </Text>
          {stat.secondaryLabel && (
            <Text size="xs" color="fg.muted">{stat.secondaryLabel}</Text>
          )}
          <Text size="sm" fontWeight="semibold" color="fg.default">
            {secondaryValue}
          </Text>
        </VStack>
      ) : (
        // Standard format
        <VStack gap="0" alignItems="flex-start">
          <Text
            size={getPrimarySize()}
            fontWeight="bold"
            color={getPrimaryColor()}
          >
            {primaryValue || 0}
          </Text>

          {/* Unit label for streaks */}
          {stat.id.includes('Streak') && (
            <Text size="xs" color="fg.muted" fontWeight="medium">
              {getStreakUnit(
                Number(primaryValue) || 0,
                stat.id.toLowerCase().includes('daily') ? 'day' : 'week'
              )}
            </Text>
          )}

          {/* Secondary value/label */}
          {secondaryValue && (
            <Text size="xs" color="fg.muted">
              {secondaryValue}
            </Text>
          )}
        </VStack>
      )}
    </VStack>
  );
}
