"use client";

import { isNavGroup, marketingNav } from "@mailnitio/config";
import {
  Button,
  cn,
  Drawer,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ThemeSwitcher,
} from "@mailnitio/ui";
import { ChevronDown, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "../logo";

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur-sm supports-[backdrop-filter]:bg-surface/85">
      <a
        href="#content"
        className="sr-only rounded-control bg-surface px-3 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
      >
        Skip to content
      </a>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-4 md:px-6">
        <Link href="/" aria-label="Mailnitio home" className="rounded-control">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {marketingNav.map((item) =>
            isNavGroup(item) ? (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-1 data-[state=open]:bg-surface-2">
                    {item.label}
                    <ChevronDown aria-hidden className="!size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  {item.items.map((link) => (
                    <DropdownMenuItem key={link.href} asChild className="h-auto items-start py-2">
                      <Link href={link.href} className="flex flex-col items-start gap-0.5">
                        <span className="font-medium">{link.label}</span>
                        {link.description ? (
                          <span className="text-small text-text-muted">{link.description}</span>
                        ) : null}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button key={item.href} variant="ghost" asChild>
                <Link
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                  className={cn(pathname === item.href && "text-text")}
                >
                  {item.label}
                </Link>
              </Button>
            ),
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitcher />
          <Button variant="ghost" asChild className="max-sm:hidden">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild className="max-sm:hidden">
            <Link href="/demo">Book a demo</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-11 lg:hidden"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu aria-hidden className="!size-5" />
          </Button>
        </div>
      </div>

      <Drawer open={open} onOpenChange={setOpen} title="Menu" side="right">
        <nav aria-label="Mobile" className="flex flex-col gap-6">
          {marketingNav.map((item) =>
            isNavGroup(item) ? (
              <div key={item.label} className="flex flex-col gap-1">
                <p className="text-overline text-text-subtle uppercase">{item.label}</p>
                {item.items.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="flex min-h-11 items-center rounded-control px-2 text-body-lg text-text hover:bg-surface-2"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-control px-2 text-body-lg text-text hover:bg-surface-2"
              >
                {item.label}
              </Link>
            ),
          )}
          <div className="flex flex-col gap-2 border-t border-border pt-6">
            <Button asChild size="lg">
              <Link href="/demo" onClick={() => setOpen(false)}>
                Book a demo
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/login" onClick={() => setOpen(false)}>
                Sign in
              </Link>
            </Button>
          </div>
        </nav>
      </Drawer>
    </header>
  );
}
