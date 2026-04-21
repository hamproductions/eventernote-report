import { HStack, VStack, Box } from "styled-system/jsx";
import { Button } from "~/components/ui/button";
import { Heading } from "~/components/ui/heading";
import { Text } from "~/components/ui/text";

interface UserProfileData {
  username: string;
  displayName: string;
  following: number;
  followers: number;
  totalEvents: number;
}

interface DashboardHeaderProps {
  colorMode: string | null | undefined;
  userProfile?: UserProfileData | null;
  onExportStats: () => void;
  onToggleColorMode: () => void;
  onChangeUser: () => void;
}

export function DashboardHeader({
  colorMode,
  userProfile,
  onExportStats,
  onToggleColorMode,
  onChangeUser
}: DashboardHeaderProps) {
  return (
    <VStack gap="4" alignItems="stretch">
      <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap" gap="3">
        <HStack gap="4" alignItems="baseline">
          <Heading size={{ base: "xl", md: "2xl" }}>Dashboard</Heading>
          {userProfile && (
            <Text size={{ base: "sm", md: "md" }} color="fg.muted">
              {userProfile.displayName || userProfile.username}
            </Text>
          )}
        </HStack>
        <HStack gap="2">
          <Button
            variant="outline"
            size="sm"
            colorPalette="blue"
            onClick={onExportStats}
          >
            Export Stats
          </Button>
          <Button
            variant="outline"
            size="sm"
            colorPalette="gray"
            onClick={onToggleColorMode}
          >
            {colorMode === "dark" ? "☀️" : "🌙"}
          </Button>
          <Button variant="outline" colorPalette="gray" onClick={onChangeUser}>
            Change User
          </Button>
        </HStack>
      </HStack>

      {userProfile && (
        <HStack gap="6">
          <HStack gap="1">
            <Text size="sm" fontWeight="bold" color="fg.default">
              {userProfile.following}
            </Text>
            <Text size="sm" color="fg.muted">Following</Text>
          </HStack>
          <HStack gap="1">
            <Text size="sm" fontWeight="bold" color="fg.default">
              {userProfile.followers}
            </Text>
            <Text size="sm" color="fg.muted">Followers</Text>
          </HStack>
          <HStack gap="1">
            <Text size="sm" fontWeight="bold" color="fg.default">
              {userProfile.totalEvents}
            </Text>
            <Text size="sm" color="fg.muted">Total Events</Text>
          </HStack>
        </HStack>
      )}
    </VStack>
  );
}
