import type { ReactNode } from "react";
import { VStack } from "styled-system/jsx";
import { Text } from "~/components/ui/text";

export function ReportSection({ id, title, description, children }: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <VStack as="section" id={id} aria-labelledby={`${id}-title`} gap="5" alignItems="stretch" style={{ scrollMarginTop: "calc(var(--header-pinned-height, 200px) + 16px)" }}>
      <VStack gap="1" alignItems="flex-start" pt="2">
        <Text as="h2" id={`${id}-title`} size="2xl" fontWeight="bold" letterSpacing="tight">{title}</Text>
        <Text size="sm" color="fg.muted">{description}</Text>
      </VStack>
      {children}
    </VStack>
  );
}
