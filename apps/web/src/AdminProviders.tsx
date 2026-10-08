import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 15_000 } },
});

export function AdminProviders() {
  useEffect(() => {
    document.title = "ZUZU · Laundry OS";
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <Outlet />
        <Toaster position="top-center" richColors closeButton />
      </MotionConfig>
    </QueryClientProvider>
  );
}
