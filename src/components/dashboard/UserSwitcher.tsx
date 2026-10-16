import { useState } from "react";
import { Portal } from "@ark-ui/react/portal";
import { Check, ChevronDown, X } from "lucide-react";
import { Box, HStack, VStack, styled } from "styled-system/jsx";
import { css } from "styled-system/css";
import { Button } from "~/components/ui/button";
import { IconButton } from "~/components/ui/icon-button";
import { Popover } from "~/components/ui/popover";
import { Text } from "~/components/ui/text";
import type { RecentUser } from "~/contexts/ReportContext";
import { parseUserInput } from "~/shared/utils/parseUserInput";

export function UserSwitcher({ userId, label, recentUsers, onSelect, onForget }: {
  userId: string;
  label: string;
  recentUsers: RecentUser[];
  onSelect: (id: string) => void;
  onForget: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const select = (id: string) => {
    setOpen(false);
    setInput("");
    if (id !== userId) onSelect(id);
  };

  return (
    <Popover.Root open={open} onOpenChange={(details) => setOpen(details.open)} positioning={{ placement: "bottom-start" }}>
      <Popover.Trigger asChild>
        <styled.button
          type="button"
          aria-label={`Switch user, current: ${label}`}
          display="inline-flex"
          alignItems="center"
          gap="1"
          minW="0"
          minH={{ base: "11", md: "auto" }}
          mx="-1"
          px="1"
          borderRadius="md"
          cursor="pointer"
          _hover={{ bg: "bg.subtle" }}
        >
          <Text as="h1" size={{ base: "lg", md: "xl" }} fontWeight="bold" truncate>{label}</Text>
          <Box color="fg.muted" flexShrink="0" display="flex"><ChevronDown size={18} /></Box>
        </styled.button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content w="80" maxW="calc(100vw - 32px)" p="2">
            <VStack gap="1" alignItems="stretch">
              {recentUsers.length > 0 && (
                <Text size="xs" color="fg.muted" px="2" pt="1">Recent</Text>
              )}
              {recentUsers.map((user) => {
                const current = user.id === userId;
                return (
                  <HStack key={user.id} gap="0" borderRadius="md" bg={current ? "bg.subtle" : undefined} _hover={{ bg: "bg.subtle" }}>
                    <styled.button
                      type="button"
                      onClick={() => select(user.id)}
                      aria-current={current ? "true" : undefined}
                      flex="1"
                      minW="0"
                      minH="11"
                      px="2"
                      display="flex"
                      alignItems="center"
                      gap="2"
                      textAlign="left"
                      cursor="pointer"
                    >
                      <Box w="4" flexShrink="0" color="colorPalette.text" display="flex">{current && <Check size={16} />}</Box>
                      <Box minW="0">
                        <Text size="sm" fontWeight="medium" truncate>{user.name}</Text>
                        {user.name !== user.id && <Text size="xs" color="fg.muted" truncate>@{user.id}</Text>}
                      </Box>
                    </styled.button>
                    {!current && (
                      <IconButton size="sm" variant="ghost" aria-label={`Remove ${user.name} from recent`} onClick={() => onForget(user.id)}>
                        <X />
                      </IconButton>
                    )}
                  </HStack>
                );
              })}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const id = parseUserInput(input);
                  if (id) select(id);
                }}
                className={css({ borderTopWidth: recentUsers.length ? "1px" : "0", borderColor: "border.subtle", pt: "2", mt: "1" })}
              >
                <HStack gap="2">
                  <input
                    aria-label="Another user ID or profile URL"
                    placeholder="User ID or profile URL"
                    value={input}
                    autoCapitalize="none"
                    spellCheck={false}
                    onChange={(e) => setInput(e.target.value)}
                    className={css({ flex: "1", minW: "0", h: { base: "11", md: "9" }, px: "3", borderWidth: "1px", borderColor: "border.control", borderRadius: "md", bg: "bg.default", color: "fg.default", fontSize: "sm" })}
                  />
                  <Button type="submit" size="sm" disabled={!input.trim()}>Open</Button>
                </HStack>
              </form>
            </VStack>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
