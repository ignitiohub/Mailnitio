import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { SessionGate } from "@/components/app/session-gate";

export const metadata: Metadata = { title: "Mailnitio", robots: { index: false, follow: false } };

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <SessionGate requireOnboarded>
      <AppShell>{children}</AppShell>
    </SessionGate>
  );
}
