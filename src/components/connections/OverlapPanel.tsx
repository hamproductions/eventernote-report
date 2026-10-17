import { useState } from "react";
import { Box, Grid, HStack, VStack } from "styled-system/jsx";
import { Text } from "~/components/ui/text";
import { InfoTip } from "~/components/dashboard/InfoTip";
import { PillGroup } from "~/components/dashboard/PillGroup";
import type { Overlap, OverlapKind } from "~/shared/utils/overlap";
import { VennDiagram } from "./VennDiagram";

interface OverlapPanelProps {
  overlap: Overlap;
  nameA: string;
  nameB: string;
}

const UNITS: Record<OverlapKind, string> = { artists: "artists", events: "events", venues: "venues", days: "days" };
const LABELS: Record<OverlapKind, string> = { artists: "Artists", events: "Events", venues: "Venues", days: "Days" };
const percent = (value: number) => `${Math.round(value * 100)}%`;
type Side = "a" | "both" | "b";

export function OverlapPanel({ overlap, nameA, nameB }: OverlapPanelProps) {
  const [kind, setKind] = useState<OverlapKind>("events");
  const [side, setSide] = useState<Side>("both");
  const set = overlap[kind];
  const items = side === "a" ? set.onlyA : side === "b" ? set.onlyB : set.both;
  const kinds = (Object.keys(LABELS) as OverlapKind[]).map((key) => [key, `${LABELS[key]} ${percent(overlap[key].jaccard)}`] as const);

  return (
    <VStack gap="3" alignItems="stretch">
      <HStack gap="3" flexWrap="wrap">
        <HStack gap="0.5">
          <Text as="h3" fontWeight="semibold">Genba overlap</Text>
          <InfoTip label="overlap">Shared divided by everything either of you has. Events are matched by Eventernote event ID. For artists and venues, counts show events each of you had.</InfoTip>
        </HStack>
        <Box overflowX="auto" maxW="full"><PillGroup label="Compare by" value={kind} options={kinds} onChange={setKind} /></Box>
      </HStack>
      <Grid gridTemplateColumns={{ base: "1fr", md: "260px minmax(0, 1fr)" }} gap={{ base: "3", md: "6" }} alignItems="center">
        <VennDiagram nameA={nameA} nameB={nameB} sizeA={set.sizeA} sizeB={set.sizeB} shared={set.shared} unit={UNITS[kind]} />
        <VStack gap="2" alignItems="stretch" minW="0">
          <Text size="sm" color="fg.muted">
            <b>{set.shared}</b> of {set.sizeA + set.sizeB - set.shared} {UNITS[kind]} in common · {percent(set.sizeA ? set.shared / set.sizeA : 0)} of {nameA}&apos;s, {percent(set.sizeB ? set.shared / set.sizeB : 0)} of {nameB}&apos;s
            {kind === "artists" && ` · ${percent(set.weighted)} alike by how often`}
          </Text>
          <PillGroup<Side>
            label="Show"
            value={side}
            options={[["a", `Only ${nameA} ${set.onlyA.length}`], ["both", `Both ${set.both.length}`], ["b", `Only ${nameB} ${set.onlyB.length}`]]}
            onChange={setSide}
          />
          <VStack as="ul" gap="0" alignItems="stretch" maxH="168px" overflowY="auto">
            {!items.length && <Text size="sm" color="fg.muted" py="2">Nothing here.</Text>}
            {items.map((item) => (
              <HStack as="li" key={item.key} justifyContent="space-between" gap="3" py="1" borderBottomWidth="1px" borderColor="border.subtle">
                <Text size="sm" truncate>{item.label}{item.sub && <Text as="span" size="xs" color="fg.muted"> · {item.sub}</Text>}</Text>
                {kind !== "events" && (
                  <Text size="xs" color="fg.muted" whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
                    {side === "both" ? `${item.a} / ${item.b}` : side === "a" ? item.a : item.b}
                  </Text>
                )}
              </HStack>
            ))}
          </VStack>
        </VStack>
      </Grid>
    </VStack>
  );
}
