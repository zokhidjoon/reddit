"use client";

import { SessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

interface ProvidersProps {
  children: ReactNode;
}

// Temporary compatibility fix for NextAuth + React 19
const CompatibleSessionProvider = SessionProvider as any;

export function Providers({ children }: ProvidersProps) {
  return (
    <CompatibleSessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      {children}
    </CompatibleSessionProvider>
  );
}
