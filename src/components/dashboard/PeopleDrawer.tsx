import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, X } from "lucide-react";
import { Box, HStack, VStack, styled } from "styled-system/jsx";
import { css } from "styled-system/css";
import { Drawer } from "~/components/ui/drawer";
import { IconButton } from "~/components/ui/icon-button";
import { Text } from "~/components/ui/text";
import { LoadingStatus } from "./LoadingStatus";
import { PillGroup } from "./PillGroup";

interface ConnectedUser {
  userId: string;
  iconUrl: string | null;
}

export type PeopleTab = "following" | "followers";

export function PeopleDrawer({ open, tab, userId, expected, onTabChange, onOpenChange, onSelect }: {
  open: boolean;
  tab: PeopleTab;
  userId: string;
  expected?: { following: number; followers: number };
  onTabChange: (tab: PeopleTab) => void;
  onOpenChange: (open: boolean) => void;
  onSelect: (userId: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const { data, isLoading, error } = useQuery<{ following: ConnectedUser[]; followers: ConnectedUser[] }>({
    queryKey: ["connections", userId],
    queryFn: async () => {
      const res = await fetch(`/api/user-profile/${encodeURIComponent(userId)}/connections`);
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || "Failed to load followers");
      return result.data;
    },
    enabled: open,
    staleTime: 1000 * 60 * 60,
    retry: false
  });

  const users = data?.[tab] || [];
  const query = filter.trim().toLowerCase();
  const shown = query ? users.filter((user) => user.userId.toLowerCase().includes(query)) : users;
  const expectedCount = expected?.[tab];

  return (
    <Drawer.Root open={open} onOpenChange={(details) => onOpenChange(details.open)} lazyMount>
      <Drawer.Backdrop />
      <Drawer.Positioner w={{ base: "full", sm: "420px" }} maxW="100vw">
        <Drawer.Content colorPalette="blue">
          <Drawer.Header>
            <HStack justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Drawer.Title>People</Drawer.Title>
                <Drawer.Description>Pick someone to open their report. Back returns here.</Drawer.Description>
              </Box>
              <Drawer.CloseTrigger asChild position="static">
                <IconButton aria-label="Close people" variant="ghost" size="sm">
                  <X />
                </IconButton>
              </Drawer.CloseTrigger>
            </HStack>
          </Drawer.Header>
          <Drawer.Body>
            <VStack gap="4" alignItems="stretch">
              <PillGroup
                label="List"
                value={tab}
                options={[["following", `Following${expected ? ` ${expected.following}` : ""}`], ["followers", `Followers${expected ? ` ${expected.followers}` : ""}`]] as const}
                onChange={onTabChange}
              />
              <input
                aria-label="Filter by user ID"
                placeholder="Filter by user ID"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className={css({ h: "11", px: "3", borderWidth: "1px", borderColor: "border.control", borderRadius: "md", bg: "bg.default", color: "fg.default", fontSize: "sm" })}
              />
              {isLoading && <LoadingStatus compact label="Loading people" />}
              {error && <Text size="sm" color="fg.error" role="alert">{error.message}. Close and reopen to retry.</Text>}
              {data && expectedCount !== undefined && users.length < expectedCount && (
                <Text size="xs" color="fg.muted">Showing {users.length} of {expectedCount} listed on Eventernote.</Text>
              )}
              {data && !shown.length && <Text size="sm" color="fg.muted">{query ? "No one matches that filter." : tab === "following" ? "Not following anyone yet." : "No followers yet."}</Text>}
              <VStack as="ul" gap="1" alignItems="stretch">
                {shown.map((user) => (
                  <HStack as="li" key={user.userId} gap="1" borderRadius="md" _hover={{ bg: "bg.subtle" }}>
                    <styled.button
                      type="button"
                      onClick={() => onSelect(user.userId)}
                      display="flex"
                      alignItems="center"
                      gap="3"
                      flex="1"
                      minW="0"
                      px="2"
                      py="2"
                      textAlign="left"
                      cursor="pointer"
                      borderRadius="md"
                    >
                      {user.iconUrl ? (
                        <styled.img src={user.iconUrl} alt="" loading="lazy" referrerPolicy="no-referrer" w="8" h="8" borderRadius="full" objectFit="cover" flexShrink="0" bg="bg.muted" />
                      ) : (
                        <Box w="8" h="8" borderRadius="full" bg="bg.muted" display="flex" alignItems="center" justifyContent="center" fontSize="xs" fontWeight="bold" color="fg.muted" flexShrink="0">
                          {user.userId.slice(0, 2).toUpperCase()}
                        </Box>
                      )}
                      <Box minW="0">
                        <Text size="sm" fontWeight="medium" truncate>{user.userId}</Text>
                        <Text size="xs" color="fg.muted">Open report</Text>
                      </Box>
                    </styled.button>
                    <IconButton asChild variant="ghost" size="sm" aria-label={`${user.userId} on Eventernote`}>
                      <a href={`https://www.eventernote.com/users/${encodeURIComponent(user.userId)}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink />
                      </a>
                    </IconButton>
                  </HStack>
                ))}
              </VStack>
            </VStack>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  );
}
