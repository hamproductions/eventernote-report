import { Box, HStack, VStack, styled } from "styled-system/jsx";
import { X } from "lucide-react";
import { IconButton } from "~/components/ui/icon-button";
import { Text } from "~/components/ui/text";
import type { ArtistGraph, GraphEvent } from "~/shared/utils/artistGraph";
import { formatDisplayDate } from "~/shared/utils/dateUtils";
import { SIDE_COLORS } from "./palette";

interface ArtistPanelProps {
  graph: ArtistGraph;
  artist: string;
  events: { event: GraphEvent; mine: boolean; theirs: boolean }[];
  comparing: boolean;
  nameA: string;
  nameB: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function ArtistPanel({ graph, artist, events, comparing, nameA, nameB, onSelect, onClose }: ArtistPanelProps) {
  const node = graph.nodes.find((candidate) => candidate.id === artist)!;
  const partners = graph.links
    .filter((link) => link.a === artist || link.b === artist)
    .map((link) => ({ id: link.a === artist ? link.b : link.a, weight: link.weight, strength: link.strength, mine: link.mine, theirs: link.theirs }))
    .sort((x, y) => y.weight - x.weight || y.strength - x.strength || x.id.localeCompare(y.id));
  const appearances = events
    .filter(({ event }) => event.artists?.includes(artist))
    .sort((x, y) => y.event.date.localeCompare(x.event.date));

  return (
    <VStack gap="4" alignItems="stretch">
      <HStack justifyContent="space-between" alignItems="flex-start" gap="2">
        <Box minW="0">
          <Text as="h3" fontWeight="semibold" fontSize="lg" lineClamp="2">{artist}</Text>
          <Text size="sm" color="fg.muted">
            {node.count} {node.count === 1 ? "event" : "events"}
            {comparing && ` · ${nameA} ${node.mine}, ${nameB} ${node.theirs}${node.both ? `, together ${node.both}` : ""}`}
          </Text>
        </Box>
        <IconButton size="sm" variant="ghost" aria-label="Clear selection" onClick={onClose}><X /></IconButton>
      </HStack>

      <VStack gap="1" alignItems="stretch">
        <Text as="h4" size="sm" fontWeight="semibold">Performs with</Text>
        {!partners.length && <Text size="sm" color="fg.muted">No one else at these events, with the current filters.</Text>}
        {partners.slice(0, 10).map((partner) => (
          <styled.button key={partner.id} type="button" display="flex" alignItems="center" w="full" onClick={() => onSelect(partner.id)} justifyContent="space-between" gap="3" py="1.5" cursor="pointer" textAlign="left" borderBottomWidth="1px" borderColor="border.subtle" _hover={{ bg: "bg.subtle" }}>
            <Text size="sm" truncate>{partner.id}</Text>
            <Text size="xs" color="fg.muted" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
              {partner.weight}× · {Math.round(partner.strength * 100)}% close
            </Text>
          </styled.button>
        ))}
        {partners.length > 10 && <Text size="xs" color="fg.muted">and {partners.length - 10} more</Text>}
      </VStack>

      <VStack gap="1" alignItems="stretch">
        <Text as="h4" size="sm" fontWeight="semibold">Events</Text>
        <VStack as="ul" gap="0" alignItems="stretch">
          {appearances.slice(0, 6).map(({ event, mine, theirs }) => (
            <HStack as="li" key={event.href} gap="2" alignItems="flex-start" py="1.5" borderBottomWidth="1px" borderColor="border.subtle">
              {comparing && (
                <Box mt="1.5" w="2.5" h="2.5" borderRadius="full" flexShrink="0" title={mine && theirs ? "Both of you" : mine ? nameA : nameB}
                  style={{ background: mine && theirs ? SIDE_COLORS.both : mine ? SIDE_COLORS.mine : SIDE_COLORS.theirs }} />
              )}
              <Box minW="0">
                <styled.a href={`https://www.eventernote.com${event.href}`} target="_blank" rel="noopener noreferrer" fontSize="sm" _hover={{ textDecoration: "underline" }}>{event.name}</styled.a>
                <Text size="xs" color="fg.muted">{formatDisplayDate(event.date)} @ {event.place}</Text>
              </Box>
            </HStack>
          ))}
        </VStack>
        {appearances.length > 6 && <Text size="xs" color="fg.muted">and {appearances.length - 6} more</Text>}
      </VStack>
    </VStack>
  );
}
