"use client";

import { navForInterest } from "@mailnitio/config";
import { ROLE_LABELS } from "@mailnitio/shared";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  type ShellLink,
  type ShellNavGroup,
  SidebarLayout,
  ThemeSwitcher,
  Tooltip,
} from "@mailnitio/ui";
import {
  Bell,
  ChartColumn,
  Contact,
  Gauge,
  Inbox,
  LayoutDashboard,
  ListChecks,
  LogOut,
  type LucideIcon,
  Mail,
  ScrollText,
  Send,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Logo, LogoMark } from "@/components/logo";
import { authClient } from "@/lib/auth-client";
import { useMe } from "@/lib/me";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  Inbox,
  ScrollText,
  ListChecks,
  Contact,
  ChartColumn,
  Send,
  Users,
  Mail,
  Workflow,
  UserCog,
  Gauge,
  Settings,
};

const NextShellLink: ShellLink = ({ href, children, ...props }) => (
  <Link href={href} {...props}>
    {children}
  </Link>
);

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { me } = useMe();

  const groups: ShellNavGroup[] = navForInterest(me.workspace.productInterest).map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      label: item.label,
      href: item.href,
      icon: ICONS[item.icon] ?? Inbox,
    })),
  }));

  const interest = me.workspace.productInterest;
  const bottomTabs =
    interest === "send"
      ? [
          { label: "Dashboard", href: "/app", icon: LayoutDashboard },
          { label: "Campaigns", href: "/app/campaigns", icon: Send },
          { label: "Audiences", href: "/app/audiences", icon: Users },
        ]
      : [
          { label: "Dashboard", href: "/app", icon: LayoutDashboard },
          { label: "Tickets", href: "/app/tickets", icon: Inbox },
          { label: "Review", href: "/app/review", icon: ListChecks },
        ];

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <SidebarLayout
      brand={<Logo />}
      brandMark={<LogoMark />}
      groups={groups}
      pathname={pathname}
      Link={NextShellLink}
      exactRoots={["/app", "/app/settings"]}
      bottomTabs={bottomTabs}
      workspaceSwitcher={
        <div className="flex flex-col gap-0.5 rounded-card border border-border bg-surface-2 px-3 py-2">
          <span className="text-overline text-text-subtle uppercase">Workspace</span>
          <span className="truncate text-body font-medium text-text">{me.workspace.name}</span>
        </div>
      }
      sidebarFooter={
        <p className="flex items-center gap-2 text-caption text-text-muted">
          <span aria-hidden className="size-2 rounded-full bg-success" />
          All systems operational
        </p>
      }
      topBar={
        <>
          <DropdownMenu>
            <Tooltip content="Alerts">
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Alerts, none" className="max-md:size-11">
                  <Bell aria-hidden />
                </Button>
              </DropdownMenuTrigger>
            </Tooltip>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Alerts</DropdownMenuLabel>
              <p className="px-2 pb-2 text-body text-text-muted">
                No alerts. Mailbox and SLA alerts will appear here.
              </p>
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeSwitcher />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="gap-2 px-1.5 max-md:size-11"
                aria-label={`Account menu for ${me.user.name}`}
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-caption text-primary">
                  {initials(me.user.name)}
                </span>
                <span className="hidden flex-col items-start text-left leading-tight lg:flex">
                  <span className="text-small font-medium text-text">{me.user.name}</span>
                  <span className="text-caption font-normal text-text-subtle">{ROLE_LABELS[me.role]}</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="flex flex-col">
                <span className="text-body font-medium text-text">{me.user.name}</span>
                <span className="truncate text-caption font-normal">{me.user.email}</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/app/settings/security">
                  <ShieldCheck aria-hidden />
                  Security
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/app/settings">
                  <Settings aria-hidden />
                  Workspace settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void signOut()}>
                <LogOut aria-hidden />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      }
    >
      {children}
    </SidebarLayout>
  );
}
