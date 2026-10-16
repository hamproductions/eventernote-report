import { useEffect, useRef, useState } from "react";
import { domToPng } from "modern-screenshot";
import { Download, Share2, X } from "lucide-react";
import { Box, HStack, VStack, styled } from "styled-system/jsx";
import { Button } from "~/components/ui/button";
import { Drawer } from "~/components/ui/drawer";
import { IconButton } from "~/components/ui/icon-button";
import { Text } from "~/components/ui/text";
import { LoadingStatus } from "~/components/dashboard/LoadingStatus";
import { PillGroup } from "~/components/dashboard/PillGroup";
import { SharePoster, type PosterData, type PosterTheme } from "./SharePoster";

export function ShareImageDrawer({ open, onOpenChange, data }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PosterData | null;
}) {
  const posterRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<PosterTheme>("dark");
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!open || !data) return;
    let cancelled = false;
    setRendering(true);
    setError("");
    const timer = window.setTimeout(async () => {
      try {
        await document.fonts.ready;
        if (!posterRef.current) return;
        const url = await domToPng(posterRef.current, { scale: 1, width: 1080, height: 1350 });
        if (!cancelled) setImage(url);
      } catch (renderError) {
        if (!cancelled) setError(renderError instanceof Error ? renderError.message : "Could not draw the image.");
      } finally {
        if (!cancelled) setRendering(false);
      }
    }, 50);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, data, theme]);

  const fileName = data ? `eventernote-${data.userId}-${data.period.replace(/[^\w]+/g, "-").toLowerCase()}.png` : "eventernote.png";

  const download = () => {
    if (!image) return;
    const link = document.createElement("a");
    link.href = image;
    link.download = fileName;
    link.click();
  };

  const share = async () => {
    if (!image) return;
    const blob = await (await fetch(image)).blob();
    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: `${data?.name} on Eventernote` });
      } catch (shareError) {
        if (!(shareError instanceof DOMException && shareError.name === "AbortError")) download();
      }
      return;
    }
    download();
  };

  return (
    <Drawer.Root open={open} onOpenChange={(details) => onOpenChange(details.open)} lazyMount unmountOnExit>
      <Drawer.Backdrop />
      <Drawer.Positioner w={{ base: "full", md: "640px" }} maxW="100vw">
        <Drawer.Content colorPalette="blue">
          <Drawer.Header>
            <HStack justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Drawer.Title>Save image</Drawer.Title>
                <Drawer.Description>A 1080 × 1350 summary of this range, sized for social posts.</Drawer.Description>
              </Box>
              <Drawer.CloseTrigger asChild position="static">
                <IconButton aria-label="Close" variant="ghost" size="sm">
                  <X />
                </IconButton>
              </Drawer.CloseTrigger>
            </HStack>
          </Drawer.Header>
          <Drawer.Body>
            <VStack gap="4" alignItems="stretch">
              <HStack justifyContent="space-between" gap="3" flexWrap="wrap">
                <PillGroup label="Image theme" value={theme} options={[["dark", "Dark"], ["light", "Light"]] as const} onChange={setTheme} />
                <HStack gap="2">
                  <Button variant="outline" onClick={share} disabled={!image || rendering}><Share2 /> Share</Button>
                  <Button onClick={download} disabled={!image || rendering}><Download /> Save PNG</Button>
                </HStack>
              </HStack>
              {rendering && <LoadingStatus compact label="Drawing image" />}
              {error && <Text size="sm" color="fg.error" role="alert">{error}</Text>}
              {!data && <Text size="sm" color="fg.muted">Load a report first.</Text>}
              {image && (
                <styled.img
                  src={image}
                  alt={`Summary image for ${data?.name}, ${data?.period}`}
                  w="full"
                  h="auto"
                  borderRadius="lg"
                  borderWidth="1px"
                  borderColor="border.subtle"
                  opacity={rendering ? 0.5 : 1}
                  transition="opacity 0.2s"
                />
              )}
            </VStack>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
      {open && data && (
        <Box position="fixed" top="0" left="-20000px" aria-hidden="true" pointerEvents="none">
          <SharePoster data={data} theme={theme} posterRef={posterRef} />
        </Box>
      )}
    </Drawer.Root>
  );
}
