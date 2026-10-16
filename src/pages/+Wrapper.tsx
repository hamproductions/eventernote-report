import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReportProvider } from "../contexts/ReportContext";
import { ColorModeProvider } from "../contexts/ColorModeContext";
import { Box } from "styled-system/jsx";
import type { ReactNode } from "react";
import "~/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 30,
      gcTime: 1000 * 60 * 60,
      refetchOnWindowFocus: false,
      retry: false
    }
  }
});

export function Wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ColorModeProvider>
        <ReportProvider>
          <Box id="app">{children}</Box>
        </ReportProvider>
      </ColorModeProvider>
    </QueryClientProvider>
  );
}
