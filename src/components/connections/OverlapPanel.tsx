import { useState } from "react";
import { Box, Grid, HStack, VStack, styled } from "styled-system/jsx";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { PillGroup } from "~/components/dashboard/PillGroup";
import type { Overlap, OverlapItem, OverlapKind, OverlapSet } from "~/shared/utils/overlap";
import { SIDE_COLORS } from "./palette";
import { VennDiagram } from "./VennDiagram";

interface OverlapPanelProps {
  overlap: Overlap;
  nameA: string;
  nameB: string;
}

const KINDS = [
  ["artists", "Artists"],
  ["events", "Events"],
  ["venues", "Venues"],
  ["days", "Days"]
] as const;

const UNITS: Record<OverlapKind, { singular: string; plural: string; blurb: string }> = {
  artists: { singular: "artist", plural: "artists", blurb: "Seen at least once by each of you" },
  events: { singular: "event", plural: "events", blurb: "The exact same event, matched by Eventernote event ID" },
  venues: { singular: "venue", plural: "venues", blurb: "Went to the same venue, not necessarily the same night" },
  days: { singular: "day", plural: "days", blurb: "Out on the same date, even at different events" }
};

const percent = (value: number) => `${Math.round(value * 100)}%`;
const LIMIT = 8;

function ScoreCard({ set, active, onClick }: { set: OverlapSet; active: boolean; onClick: () => void }) {
  const unit = UNITS[set.kind];
  return (
    <styled.button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      textAlign="left"
      cursor="pointer"
      p="3"
      borderWidth="1px"
      borderColor={active ? "colorPalette.default" : "border.default"}
      borderRadius="lg"
      bg={active ? "bg.subtle" : "bg.default"}
      _hover={{ bg: "bg.subtle" }}
    >
      <Text size="xs" color="fg.muted" textTransform="capitalize">{unit.plural}</Text>
      <Text as="div" fontSize="2xl" fontWeight="bold" lineHeight="1.1" fontVariantNumeric="tabular-nums">{percent(set.jaccard)}</Text>
      <Text size="xs" color="fg.muted">{set.shared} in common</Text>
    </styled.button>
  );
}

function Column({ title, color, items, kind, side, empty }: { title: string; color: string; items: OverlapItem[]; kind: OverlapKind; side: "a" | "b" | "both"; empty: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, LIMIT);
  return (
    <VStack gap="2" alignItems="stretch" minW="0">
      <HStack gap="2">
        <Box w="3" h="3" borderRadius="full" style={{ background: color }} flexShrink="0" />
        <Text as="h4" fontWeight="semibold" size="sm">{title}</Text>
        <Text size="sm" color="fg.muted" fontVariantNumeric="tabular-nums">{items.length}</Text>
      </HStack>
      {!items.length && <Text size="sm" color="fg.muted">{empty}</Text>}
      <VStack as="ul" gap="0" alignItems="stretch">
        {shown.map((item) => (
          <HStack as="li" key={item.key} justifyContent="space-between" alignItems="flex-start" gap="3" py="1.5" borderBottomWidth="1px" borderColor="border.subtle">
            <Box minW="0">
              <Text size="sm" truncate>{item.label}</Text>
              {item.sub && <Text size="xs" color="fg.muted" truncate>{item.sub}</Text>}
            </Box>
            {kind !== "events" && (
              <Text size="xs" color="fg.muted" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
                {side === "both" ? `${item.a} / ${item.b}` : side === "a" ? item.a : item.b}
              </Text>
            )}
          </HStack>
        ))}
      </VStack>
      {items.length > LIMIT && (
        <Button size="xs" variant="ghost" alignSelf="flex-start" onClick={() => setAll(!all)}>
          {all ? "Show fewer" : `Show all ${items.length}`}
        </Button>
      )}
    </VStack>
  );
}

export function OverlapPanel({ overlap, nameA, nameB }: OverlapPanelProps) {
  const [kind, setKind] = useState<OverlapKind>("events");
  const set = overlap[kind];
  const unit = UNITS[kind];
  const sharedOfA = set.sizeA ? set.shared / set.sizeA : 0;
  const sharedOfB = set.sizeB ? set.shared / set.sizeB : 0;

  return (
    <VStack gap="5" alignItems="stretch">
      <Box>
        <Text as="h2" fontSize="lg" fontWeight="semibold">How much your genba overlap</Text>
        <Text size="sm" color="fg.muted">Percentages are shared divided by everything either of you has. Pick one to see the Venn diagram.</Text>
      </Box>

      <Grid gridTemplateColumns={{ base: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }} gap="3">
        {KINDS.map(([key]) => (
          <ScoreCard key={key} set={overlap[key]} active={kind === key} onClick={() => setKind(key)} />
        ))}
      </Grid>

      <Grid gridTemplateColumns={{ base: "1fr", lg: "minmax(0, 1.1fr) minmax(0, 1fr)" }} gap="6" alignItems="center">
        <VennDiagram nameA={nameA} nameB={nameB} sizeA={set.sizeA} sizeB={set.sizeB} shared={set.shared} unit={unit.plural} />
        <VStack gap="3" alignItems="stretch">
          <PillGroup label="Compare by" value={kind} options={KINDS} onChange={setKind} />
          <Text size="sm" color="fg.muted">{unit.blurb}.</Text>
          <VStack as="ul" gap="1.5" alignItems="stretch" fontSize="sm">
            <li><b>{set.shared}</b> {set.shared === 1 ? unit.singular : unit.plural} in common, {percent(set.jaccard)} of the {set.sizeA + set.sizeB - set.shared} either of you has.</li>
            <li>That is {percent(sharedOfA)} of {nameA}&apos;s {set.sizeA} and {percent(sharedOfB)} of {nameB}&apos;s {set.sizeB}.</li>
            {kind === "artists" && <li>Weighting by how often each of you saw them: <b>{percent(set.weighted)}</b> alike.</li>}
          </VStack>
        </VStack>
      </Grid>

      <Grid gridTemplateColumns={{ base: "1fr", md: "repeat(3, minmax(0, 1fr))" }} gap="6">
        <Column title={`Only ${nameA}`} color={SIDE_COLORS.mine} items={set.onlyA} kind={kind} side="a" empty={`Nothing only ${nameA} has.`} />
        <Column title="Both" color={SIDE_COLORS.both} items={set.both} kind={kind} side="both" empty={`No ${unit.plural} in common.`} />
        <Column title={`Only ${nameB}`} color={SIDE_COLORS.theirs} items={set.onlyB} kind={kind} side="b" empty={`Nothing only ${nameB} has.`} />
      </Grid>
      {kind !== "events" && set.both.length > 0 && <Text size="xs" color="fg.muted">Counts show how many events each of you had with that {unit.singular}: {nameA} / {nameB}.</Text>}
    </VStack>
  );
}
