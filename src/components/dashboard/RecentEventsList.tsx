import { Box, VStack, HStack } from "styled-system/jsx";
import * as Card from "~/components/ui/styled/card";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import type { EnhancedEvent } from "~/shared/types/event";

interface RecentEventsListProps {
  events: EnhancedEvent[];
  eventsViewLimit: number;
  onExportPNG: () => void;
  onCopyToClipboard: () => void;
  onCycleView: () => void;
  getViewLabel: () => string;
  eventsListRef: React.RefObject<HTMLDivElement | null>;
}

export function RecentEventsList({
  events,
  eventsViewLimit,
  onExportPNG,
  onCopyToClipboard,
  onCycleView,
  getViewLabel,
  eventsListRef
}: RecentEventsListProps) {
  return (
    <Card.Root>
      <Card.Header>
        <HStack justifyContent="space-between">
          <Box>
            <Card.Title>Recent Events</Card.Title>
            <Card.Description>Your latest attended events</Card.Description>
          </Box>
          <HStack gap="2">
            <Button size="sm" variant="outline" onClick={onExportPNG}>
              Export PNG
            </Button>
            <Button size="sm" variant="outline" onClick={onCopyToClipboard}>
              Copy List
            </Button>
            <Button size="sm" variant="ghost" onClick={onCycleView}>
              {getViewLabel()}
            </Button>
          </HStack>
        </HStack>
      </Card.Header>
      <Card.Body>
        <VStack gap="3" alignItems="stretch" ref={eventsListRef}>
          {[...events]
            .sort(
              (a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            .slice(0, eventsViewLimit)
            .map((event) => (
              <Box
                key={event.href}
                as="a"
                href={`https://eventernote.com${event.href}`}
                target="_blank"
                rel="noopener noreferrer"
                display="block"
                p="4"
                borderRadius="md"
                borderWidth="1px"
                borderColor="border.default"
                transition="all 0.2s"
                _hover={{
                  borderColor: "colorPalette.default",
                  bg: "bg.subtle",
                  transform: "translateX(4px)"
                }}
              >
                <VStack gap="2" alignItems="flex-start">
                  <Text size="sm" fontWeight="semibold" color="fg.default">
                    {event.name}
                  </Text>
                  <HStack gap="4" flexWrap="wrap">
                    <Text size="xs" color="fg.muted">
                      {event.date}
                    </Text>
                    <Text size="xs" color="fg.muted">
                      {event.place}
                    </Text>
                  </HStack>
                  {event.artists && event.artists.length > 0 && (
                    <HStack gap="2" flexWrap="wrap">
                      {event.artists.map((artist) => (
                        <Box
                          key={artist}
                          px="2.5"
                          py="1"
                          bg="accent.default"
                          borderRadius="md"
                          fontSize="xs"
                          color="accent.fg"
                          fontWeight="bold"
                        >
                          {artist}
                        </Box>
                      ))}
                    </HStack>
                  )}
                </VStack>
              </Box>
            ))}
        </VStack>
      </Card.Body>
    </Card.Root>
  );
}
