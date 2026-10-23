import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <header className="flex h-16 items-center px-4 md:px-6">
        <Link href="/" aria-label="Mailnitio home" className="rounded-control">
          <Logo />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8 md:items-center md:py-16">
        <div className="w-full max-w-[420px]">{children}</div>
      </main>
      <footer className="px-4 py-6 text-center text-small text-text-subtle">
        <Link href="/legal/privacy" className="hover:text-text">
          Privacy
        </Link>
        <span aria-hidden> · </span>
        <Link href="/legal/terms" className="hover:text-text">
          Terms
        </Link>
      </footer>
    </div>
  );
}
