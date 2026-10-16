import { Portal } from "@ark-ui/react/portal";
import { Info } from "lucide-react";
import { styled } from "styled-system/jsx";
import { Popover } from "~/components/ui/popover";

export function InfoTip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Popover.Root positioning={{ placement: "top" }} lazyMount unmountOnExit>
      <Popover.Trigger asChild>
        <styled.button
          type="button"
          aria-label={`What is ${label}?`}
          position="relative"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          w="5"
          h="5"
          ml="0.5"
          verticalAlign="middle"
          borderRadius="full"
          color="fg.subtle"
          cursor="help"
          flexShrink="0"
          _before={{ content: '""', position: "absolute", inset: "-12px" }}
          _hover={{ color: "fg.default", bg: "bg.subtle" }}
          _focusVisible={{ outline: "2px solid", outlineColor: "colorPalette.default" }}
        >
          <Info size={13} />
        </styled.button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content maxW="72" p="3">
            <Popover.Title fontSize="sm" fontWeight="semibold" mb="1">{label}</Popover.Title>
            <Popover.Description fontSize="xs" color="fg.muted" lineHeight="relaxed">{children}</Popover.Description>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
