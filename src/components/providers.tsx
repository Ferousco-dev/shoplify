"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 60s staleTime: a fresh navigation back to a page that was
            // viewed within the last minute uses the cached payload
            // instead of re-firing the API call. List pages override this
            // with their own refetchInterval for live polling.
            staleTime: 60_000,
            // 5min gcTime: keeps query cache alive across route changes
            // so a quick "back" feels instant.
            gcTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            // No retry — surfacing real errors fast is better UX than a
            // long wait while we retry transparently. Mutations have
            // their own retry semantics.
            retry: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
