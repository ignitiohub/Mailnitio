import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { SessionGate } from "@/components/app/session-gate";
import { Logo } from "@/components/logo";

export const metadata: Metadata = { title: "Set up your workspace", robots: { index: false, follow: false } };

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return (
    <SessionGate requireOnboarded={false}>
      <div className="flex min-h-dvh flex-col bg-bg">
        <header className="flex h-16 items-center px-4 md:px-6">
          <Link href="/" aria-label="Mailnitio home" className="rounded-control">
            <Logo />
          </Link>
        </header>
        <main className="flex flex-1 justify-center px-4 py-8 md:py-16">
          <div className="w-full max-w-[560px]">{children}</div>
        </main>
      </div>
    </SessionGate>
  );
}
