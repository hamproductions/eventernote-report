import { useEffect, useRef, useState, type ReactNode } from "react";
import { Portal } from "@ark-ui/react/portal";
import { Download, Ellipsis, LogOut, Moon, Network, ReceiptText, RefreshCw, Sun, Users } from "lucide-react";
import { navigate } from "vike/client/router";
import { HStack, VStack, Box, styled } from "styled-system/jsx";
import { css } from "styled-system/css";
import { Button } from "~/components/ui/button";
import { IconButton } from "~/components/ui/icon-button";
import { Menu } from "~/components/ui/menu";
import { InfoTip } from "./InfoTip";
import { UserSwitcher } from "./UserSwitcher";
import type { RecentUser } from "~/contexts/ReportContext";
import { Text } from "~/components/ui/text";

interface UserProfileData {
  username: string;
  displayName: string;
  following: number;
  followers: number;
  totalEvents: number;
}

export const DASHBOARD_SECTIONS = [
  ["overview", "Overview", "Overview"],
  ["activity", "Activity", "Activity"],
  ["artists", "Artists & venues", "Artists"],
  ["events", "Events", "Events"]
] as const;

interface DashboardHeaderProps {
  userId: string;
  colorMode: string | null | undefined;
  userProfile?: UserProfileData | null;
  attendedCount?: number;
  favoritesOnly: boolean;
  filters: ReactNode;
  showSections: boolean;
  onOpenReceipt: () => void;
  onOpenCompare: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  recentUsers: RecentUser[];
  onSelectUser: (id: string) => void;
  onForgetUser: (id: string) => void;
  onOpenPeople: (tab: "following" | "followers") => void;
  onExportStats: () => void;
  onToggleColorMode: () => void;
  onChangeUser: () => void;
}

function usePinnedOffset() {
  const headerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const header = headerRef.current;
    const nav = navRef.current;
    if (!header || !nav) return;
    const narrow = window.matchMedia("(max-width: 767px)");
    const update = () => {
      setOffset(narrow.matches ? nav.offsetTop : 0);
      document.documentElement.style.setProperty("--header-pinned-height", `${narrow.matches ? nav.offsetHeight : header.offsetHeight}px`);
    };
    const observer = new ResizeObserver(update);
    observer.observe(header);
    narrow.addEventListener("change", update);
    update();
    return () => {
      observer.disconnect();
      narrow.removeEventListener("change", update);
    };
  }, []);

  return { headerRef, navRef, offset };
}

function useActiveSection(enabled: boolean) {
  const [active, setActive] = useState<string>(DASHBOARD_SECTIONS[0][0]);

  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const offset = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-pinned-height")) || 0;
        let current: string = DASHBOARD_SECTIONS[0][0];
        for (const [id] of DASHBOARD_SECTIONS) {
          const element = document.getElementById(id);
          if (element && element.getBoundingClientRect().top <= offset + 32) current = id;
        }
        setActive(current);
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [enabled]);

  return active;
}

export function DashboardHeader({
  userId,
  colorMode,
  userProfile,
  attendedCount,
  favoritesOnly,
  filters,
  showSections,
  onOpenReceipt,
  onOpenCompare,
  onRefresh,
  refreshing,
  recentUsers,
  onSelectUser,
  onForgetUser,
  onOpenPeople,
  onExportStats,
  onToggleColorMode,
  onChangeUser
}: DashboardHeaderProps) {
  const active = useActiveSection(showSections);
  const { headerRef, navRef, offset } = usePinnedOffset();

  return (
    <Box
      as="header"
      ref={headerRef}
      position="sticky"
      style={{ top: -offset }}
      zIndex="20"
      mx={{ base: "-4", md: "-8" }}
      px={{ base: "4", md: "8" }}
      pt={{ base: "3", md: "4" }}
      bg="bg.default"
      borderBottomWidth="1px"
      borderColor="border.subtle"
    >
      <VStack gap="3" alignItems="stretch" maxW="1400px" mx="auto">
        <HStack justifyContent="space-between" alignItems="center" gap="3">
          <VStack gap="0.5" alignItems="flex-start" minW="0">
            <Text as="span" size="xs" fontWeight="medium" color="fg.muted">
              Eventernote Reports
            </Text>
            <HStack gap="2" alignItems="baseline" minW="0">
              <UserSwitcher
                userId={userId}
                label={userProfile?.displayName || userProfile?.username || userId}
                recentUsers={recentUsers}
                onSelect={onSelectUser}
                onForget={onForgetUser}
              />
              {attendedCount !== undefined && (
                <Text size="sm" color="fg.muted" whiteSpace="nowrap" hideBelow="sm">
                  {attendedCount} events attended{favoritesOnly ? " with favorites" : ""}
                </Text>
              )}
            </HStack>
          </VStack>
          <HStack gap="2" flexShrink="0">
            <Button size="sm" onClick={onOpenReceipt}>
              <ReceiptText /> <Box as="span" hideBelow="sm">Print receipt</Box><Box as="span" hideFrom="sm">Receipt</Box>
            </Button>
            <Button size="sm" variant="outline" onClick={onOpenCompare} hideBelow="md">
              <Users /> Compare
            </Button>
            <Button size="sm" variant="outline" hideBelow="md" asChild>
              <a href={`/connections?user=${encodeURIComponent(userId)}`}><Network /> Connections</a>
            </Button>
            <Button size="sm" variant="outline" onClick={onExportStats} hideBelow="lg">
              <Download /> Save image
            </Button>
            <HStack gap="1" hideBelow="md">
              <IconButton size="sm" variant="ghost" aria-label="Reload from Eventernote" title="Reload from Eventernote (picks up registrations you just changed)" onClick={onRefresh} disabled={refreshing} aria-busy={refreshing}>
                <RefreshCw className={refreshing ? css({ animation: "spin" }) : undefined} />
              </IconButton>
              <IconButton size="sm" variant="ghost" aria-label={colorMode === "dark" ? "Switch to light mode" : "Switch to dark mode"} onClick={onToggleColorMode}>
                {colorMode === "dark" ? <Sun /> : <Moon />}
              </IconButton>
              <IconButton size="sm" variant="ghost" aria-label="Change user" title="Change user" onClick={onChangeUser}>
                <LogOut />
              </IconButton>
            </HStack>
            <Menu.Root
              positioning={{ placement: "bottom-end" }}
              onSelect={(details) => {
                if (details.value === "compare") onOpenCompare();
                if (details.value === "connections") navigate(`/connections?user=${encodeURIComponent(userId)}`);
                if (details.value === "save") onExportStats();
                if (details.value === "reload") onRefresh();
                if (details.value === "theme") onToggleColorMode();
                if (details.value === "user") onChangeUser();
              }}
            >
              <Menu.Trigger asChild>
                <IconButton size="sm" variant="outline" aria-label="More actions" hideFrom="lg">
                  <Ellipsis />
                </IconButton>
              </Menu.Trigger>
              <Portal>
                <Menu.Positioner>
                  <Menu.Content minW="52">
                    <Menu.Item gap="2" value="compare" hideFrom="md"><Users /> Compare with someone</Menu.Item>
                    <Menu.Item gap="2" value="connections" hideFrom="md"><Network /> Artist connections</Menu.Item>
                    <Menu.Item gap="2" value="save"><Download /> Save image</Menu.Item>
                    <Menu.Item gap="2" value="reload" hideFrom="md" disabled={refreshing}><RefreshCw /> Reload from Eventernote</Menu.Item>
                    <Menu.Item gap="2" value="theme" hideFrom="md">{colorMode === "dark" ? <Sun /> : <Moon />} {colorMode === "dark" ? "Light mode" : "Dark mode"}</Menu.Item>
                    <Menu.Item gap="2" value="user" hideFrom="md"><LogOut /> Change user</Menu.Item>
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          </HStack>
        </HStack>

        {userProfile && (
          <HStack gap="1" flexWrap="wrap" fontSize="xs" color="fg.muted">
            <styled.button type="button" onClick={() => onOpenPeople("following")} display="inline-flex" alignItems="center" minH={{ base: "11", md: "auto" }} cursor="pointer" textDecoration="underline" textDecorationColor="fg.subtle" textUnderlineOffset="3px" _hover={{ color: "fg.default" }}>
              {userProfile.following} following
            </styled.button>
            <span aria-hidden>·</span>
            <styled.button type="button" onClick={() => onOpenPeople("followers")} display="inline-flex" alignItems="center" minH={{ base: "11", md: "auto" }} cursor="pointer" textDecoration="underline" textDecorationColor="fg.subtle" textUnderlineOffset="3px" _hover={{ color: "fg.default" }}>
              {userProfile.followers} followers
            </styled.button>
            <Box as="span" hideBelow="md" display="inline-flex" alignItems="center">
              <span aria-hidden>·&nbsp;</span>{userProfile.totalEvents} registrations
              <InfoTip label="Registrations">Every event on the Eventernote profile, including upcoming ones and duplicates. The report counts only attended events up to today.</InfoTip>
            </Box>
          </HStack>
        )}

        {filters}

        <HStack as="nav" ref={navRef} aria-label="Report sections" gap="1" overflowX="auto" mb="-1px" visibility={showSections ? "visible" : "hidden"}>
          {DASHBOARD_SECTIONS.map(([id, label, short]) => (
            <styled.a
              key={id}
              href={`#${id}`}
              aria-current={active === id ? "location" : undefined}
              px={{ base: "2", md: "3" }}
              py="3"
              fontSize="sm"
              fontWeight="medium"
              whiteSpace="nowrap"
              color={active === id ? "fg.default" : "fg.muted"}
              borderBottomWidth="2px"
              borderColor={active === id ? "colorPalette.default" : "transparent"}
              _hover={{ color: "fg.default" }}
            >
              <Box as="span" hideBelow="sm">{label}</Box>
              <Box as="span" hideFrom="sm">{short}</Box>
            </styled.a>
          ))}
        </HStack>
      </VStack>
    </Box>
  );
}
