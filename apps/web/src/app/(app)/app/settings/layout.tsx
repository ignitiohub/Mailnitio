"use client";

import { cn, PageHeader } from "@mailnitio/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const tabs = [
  { href: "/app/settings", label: "Workspace" },
  { href: "/app/settings/members", label: "Members" },
  { href: "/app/settings/security", label: "Security" },
  { href: "/app/settings/audit-log", label: "Audit log" },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description="Manage your workspace, members and security." />
      <nav
        aria-label="Settings"
        className="-mx-4 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0"
      >
        <ul className="flex gap-1">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center border-b-2 px-3 text-body whitespace-nowrap transition-colors duration-150",
                    active
                      ? "border-primary font-medium text-text"
                      : "border-transparent text-text-muted hover:text-text",
                  )}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {children}
    </div>
  );
}
