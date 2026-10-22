"use client";

import { type LucideIcon, Menu, MoreHorizontal, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type ComponentType, type ReactNode, useEffect, useState } from "react";
import { cn } from "../lib/cn";
import { Button } from "./button";
import { Drawer } from "./dialog";
import { Tooltip } from "./tooltip";

export interface ShellNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface ShellNavGroup {
  label: string;
  items: ShellNavItem[];
}

export type ShellLink = ComponentType<{
  href: string;
  className?: string;
  children: ReactNode;
  "aria-current"?: "page";
  "aria-label"?: string;
  onClick?: () => void;
}>;

const COLLAPSE_KEY = "mailnitio.sidebar-collapsed";

function isActive(pathname: string, href: string, exactRoots: string[]) {
  if (exactRoots.includes(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({
  groups,
  pathname,
  Link,
  collapsed,
  exactRoots,
  onNavigate,
}: {
  groups: ShellNavGroup[];
  pathname: string;
  Link: ShellLink;
  collapsed: boolean;
  exactRoots: string[];
  onNavigate?: () => void;
}) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-0.5">
          {collapsed ? (
            <span aria-hidden className="mx-3 mb-1 h-px bg-border" />
          ) : (
            <p className="px-3 pb-1 text-overline text-text-subtle uppercase">{group.label}</p>
          )}
          {group.items.map((item) => {
            const active = isActive(pathname, item.href, exactRoots);
            const link = (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={collapsed ? item.label : undefined}
                onClick={onNavigate}
                className={cn(
                  "flex h-9 items-center gap-3 rounded-control px-3 text-body transition-colors duration-150 max-md:h-11",
                  active
                    ? "bg-primary-soft font-medium text-primary"
                    : "text-text-muted hover:bg-surface-2 hover:text-text",
                  collapsed && "justify-center px-0",
                )}
              >
                <item.icon aria-hidden className="size-5 shrink-0 stroke-[1.75]" />
                {collapsed ? null : <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && item.badge ? (
                  <span className="rounded-full bg-surface-2 px-2 text-caption text-text-muted tabular">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
            return collapsed ? (
              <Tooltip key={item.href} content={item.label} side="right">
                {link}
              </Tooltip>
            ) : (
              <div key={item.href}>{link}</div>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/**
 * App shell. >= lg: full sidebar (collapsible to an icon rail, persisted). md: icon rail.
 * < md: sidebar becomes a drawer via the hamburger, plus a bottom tab bar for four key areas.
 */
export function SidebarLayout({
  brand,
  brandMark,
  workspaceSwitcher,
  groups,
  pathname,
  Link,
  topBar,
  sidebarFooter,
  bottomTabs,
  exactRoots = [],
  children,
}: {
  brand: ReactNode;
  /** Compact logo for the icon rail. */
  brandMark: ReactNode;
  workspaceSwitcher?: ReactNode;
  groups: ShellNavGroup[];
  pathname: string;
  Link: ShellLink;
  /** Search, alerts and profile, rendered on the right of the top bar. */
  topBar?: ReactNode;
  sidebarFooter?: ReactNode;
  /** Up to three tabs; a fourth "More" tab opens the navigation drawer. */
  bottomTabs: ShellNavItem[];
  /** hrefs that should only match exactly (e.g. the dashboard root). */
  exactRoots?: string[];
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "true");
    } catch {
      // Not persisted.
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, String(!value));
      } catch {
        // Not persisted.
      }
      return !value;
    });
  };

  return (
    <div className="flex min-h-dvh bg-bg">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>

      {/* md+: sidebar (icon rail at md, full at lg unless collapsed) */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface md:flex",
          "w-16 transition-[width] duration-200",
          !collapsed && "lg:w-[248px]",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center border-b border-border px-4",
            collapsed ? "justify-center px-0" : "max-lg:justify-center max-lg:px-0",
          )}
        >
          {collapsed ? (
            brandMark
          ) : (
            <>
              <span className="max-lg:hidden">{brand}</span>
              <span className="lg:hidden">{brandMark}</span>
            </>
          )}
        </div>
        {workspaceSwitcher && !collapsed ? (
          <div className="p-3 max-lg:hidden">{workspaceSwitcher}</div>
        ) : null}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className={cn(collapsed ? "" : "max-lg:hidden")}>
            <NavList
              groups={groups}
              pathname={pathname}
              Link={Link}
              collapsed={collapsed}
              exactRoots={exactRoots}
            />
          </div>
          {collapsed ? null : (
            <div className="lg:hidden">
              <NavList groups={groups} pathname={pathname} Link={Link} collapsed exactRoots={exactRoots} />
            </div>
          )}
        </div>
        {sidebarFooter && !collapsed ? (
          <div className="border-t border-border p-3 max-lg:hidden">{sidebarFooter}</div>
        ) : null}
        <div className="hidden border-t border-border p-2 lg:block">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleCollapsed}
            className={cn("w-full", collapsed ? "justify-center" : "justify-start")}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen aria-hidden /> : <PanelLeftClose aria-hidden />}
            {collapsed ? null : "Collapse"}
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-surface px-4 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="size-11 md:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu aria-hidden className="!size-5" />
          </Button>
          <span className="md:hidden">{brand}</span>
          <div className="ml-auto flex items-center gap-1">{topBar}</div>
        </header>

        <main id="main" className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 pb-36 md:px-6 md:pb-8">
          {children}
        </main>
      </div>

      {/* < md: navigation drawer */}
      <Drawer open={mobileOpen} onOpenChange={setMobileOpen} title="Navigation" side="left">
        <div className="flex flex-col gap-4">
          {workspaceSwitcher}
          <NavList
            groups={groups}
            pathname={pathname}
            Link={Link}
            collapsed={false}
            exactRoots={exactRoots}
            onNavigate={() => setMobileOpen(false)}
          />
          {sidebarFooter}
        </div>
      </Drawer>

      {/* < md: bottom tab bar */}
      <nav
        aria-label="Quick navigation"
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 grid-cols-4 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {bottomTabs.slice(0, 3).map((tab) => {
          const active = isActive(pathname, tab.href, exactRoots);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-caption",
                active ? "text-primary" : "text-text-muted",
              )}
            >
              <tab.icon aria-hidden className="size-5 stroke-[1.75]" />
              {tab.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex cursor-pointer flex-col items-center justify-center gap-1 text-caption text-text-muted"
        >
          <MoreHorizontal aria-hidden className="size-5 stroke-[1.75]" />
          More
        </button>
      </nav>
    </div>
  );
}
