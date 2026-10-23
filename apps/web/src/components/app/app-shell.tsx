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
  ChartColumn,
  Contact,
  FlaskConical,
  Gauge,
  Inbox,
  Keyboard,
  LayoutDashboard,
  ListChecks,
  LogOut,
  type LucideIcon,
  Mail,
  ScrollText,
  Search,
  Send,
  Settings,
  ShieldCheck,
  UserCog,
  Users,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useState } from "react";
import { LookupsProvider } from "@/components/helpdesk/lookups";
import { Logo, LogoMark } from "@/components/logo";
import { authClient } from "@/lib/auth-client";
import { useMe } from "@/lib/me";
import { useApi } from "@/lib/use-api";
import { CommandPalette, SearchButton } from "./command-palette";
import { NotificationsMenu } from "./notifications-menu";
import { ShortcutsHelp, useGlobalShortcuts } from "./shortcuts";
import { WorkspaceSwitcher } from "./workspace-switcher";

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
  FlaskConical,
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
  const [searchOpen, setSearchOpen] = useState(false);
  const openSearch = useCallback(() => setSearchOpen(true), []);
  const { helpOpen, setHelpOpen } = useGlobalShortcuts(openSearch);
  const helpdesk = me.workspace.productInterest !== "send";
  // Badge counts for the sidebar (polled; cheap aggregate).
  const counts = useApi<{ data: Record<string, number> }>(helpdesk ? "/v1/tickets/counts" : null, { pollMs: 30_000 });
  const reviewCount = counts.data?.data.needs_review;

  const groups: ShellNavGroup[] = navForInterest(me.workspace.productInterest, me.role).map((group) => ({
    label: group.label,
    items: group.items.map((item) => ({
      label: item.label,
      href: item.href,
      icon: ICONS[item.icon] ?? Inbox,
      badge: item.href === "/app/review" && reviewCount ? String(reviewCount) : undefined,
    })),
  }));

  const bottomTabs =
    me.workspace.productInterest === "send"
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
    <LookupsProvider>
      <SidebarLayout
        brand={<Logo />}
        brandMark={<LogoMark />}
        groups={groups}
        pathname={pathname}
        Link={NextShellLink}
        exactRoots={["/app", "/app/settings"]}
        bottomTabs={bottomTabs}
        workspaceSwitcher={<WorkspaceSwitcher />}
        sidebarFooter={
          <p className="flex items-center gap-2 text-caption text-text-muted">
            <span aria-hidden className="size-2 rounded-full bg-success" />
            All systems operational
          </p>
        }
        topBar={
          <>
            <SearchButton onClick={openSearch} />
            <Tooltip content="Search" shortcut="/">
              <Button variant="ghost" size="icon" aria-label="Search" className="max-md:size-11 lg:hidden" onClick={openSearch}>
                <Search aria-hidden />
              </Button>
            </Tooltip>
            <NotificationsMenu />
            <ThemeSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 px-1.5 max-md:size-11" aria-label={`Account menu for ${me.user.name}`}>
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
                <DropdownMenuItem onSelect={() => setHelpOpen(true)}>
                  <Keyboard aria-hidden />
                  Keyboard shortcuts
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
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </LookupsProvider>
  );
}
