import { Box, HStack, VStack } from 'styled-system/jsx';
import { Spinner } from '~/components/ui/spinner';
import { Text } from '~/components/ui/text';

export function LoadingStatus({ label, detail, loaded, total, compact = false }: {
  label: string;
  detail?: string;
  loaded?: number;
  total?: number;
  compact?: boolean;
}) {
  const percentage = total ? Math.min(100, Math.round((loaded || 0) / total * 100)) : null;

  return (
    <VStack role="status" aria-live="polite" aria-busy="true" alignItems="stretch" gap="3"
      px={compact ? '0' : '5'} py={compact ? '2' : '4'} borderWidth={compact ? '0' : '1px'}
      borderColor="border.default" borderRadius="lg" bg={compact ? 'transparent' : 'bg.subtle'}>
      <HStack gap="3">
        <Spinner label="" width="4" height="4" borderWidth="2px" borderTopColor="blue.9" borderRightColor="blue.9" flexShrink="0" />
        <Box flex="1" minW="0">
          <Text size="sm" fontWeight="medium">{label}</Text>
          {detail && <Text size="xs" color="fg.muted" mt="1">{detail}</Text>}
        </Box>
        {percentage !== null && <Text size="sm" color="fg.muted" fontVariantNumeric="tabular-nums">{percentage}%</Text>}
      </HStack>
      {percentage !== null && (
        <Box role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={loaded || 0}
          height="1" bg="bg.muted" borderRadius="full" overflow="hidden">
          <Box height="full" bg="blue.9" borderRadius="full" style={{ width: `${percentage}%` }} transition="width 0.2s ease" />
        </Box>
      )}
    </VStack>
  );
}
