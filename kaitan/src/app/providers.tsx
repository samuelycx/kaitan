"use client";

import { StoreProvider } from "@/lib/store";
import { Shell } from "@/components/shell";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <Shell>{children}</Shell>
    </StoreProvider>
  );
}
