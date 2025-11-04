import { HStack } from "styled-system/jsx";
import { Button } from "~/components/ui/button";
import { Heading } from "~/components/ui/heading";

interface DashboardHeaderProps {
  colorMode: string | null | undefined;
  onExportStats: () => void;
  onToggleColorMode: () => void;
  onChangeUser: () => void;
}

export function DashboardHeader({
  colorMode,
  onExportStats,
  onToggleColorMode,
  onChangeUser
}: DashboardHeaderProps) {
  return (
    <HStack justifyContent="space-between" alignItems="center">
      <Heading size="2xl">Dashboard</Heading>
      <HStack gap="3">
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
  );
}
