"use client";

import { Button, Modal, Skeleton, Tooltip } from "@mailnitio/ui";
import { Contact, CornerDownLeft, Inbox, Mail, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { TicketKey } from "@/components/helpdesk/display";
import { apiFetch } from "@/lib/api";

interface Results {
  tickets: { id: string; key: string; subject: string; status: string }[];
  emails: { id: string; subject: string; sender: string }[];
  customers: { id: string; name: string | null; email: string }[];
}

interface Item {
  id: string;
  group: string;
  label: string;
  detail?: string;
  href: string;
  icon: typeof Inbox;
  mono?: string;
}

const PAGES: Item[] = [
  { id: "p-dash", group: "Go to", label: "Dashboard", href: "/app", icon: Inbox },
  { id: "p-tickets", group: "Go to", label: "Tickets", href: "/app/tickets", icon: Inbox },
  { id: "p-review", group: "Go to", label: "Needs review", href: "/app/review", icon: Inbox },
  { id: "p-log", group: "Go to", label: "Inbox log", href: "/app/inbox-log", icon: Mail },
  { id: "p-customers", group: "Go to", label: "Customers", href: "/app/customers", icon: Contact },
];

/** ⌘/Ctrl+K and "/" open global search: tickets (key or subject), emails (sender or subject), customers. */
export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setQ("");
      setResults(null);
      return;
    }
    // Focus the search field once the dialog has mounted (Radix would focus the close button first).
    const t = window.setTimeout(() => input.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      apiFetch<{ data: Results }>(`/v1/search?q=${encodeURIComponent(q.trim())}`)
        .then((r) => setResults(r.data))
        .catch(() => setResults({ tickets: [], emails: [], customers: [] }))
        .finally(() => setLoading(false));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [q]);

  const items = useMemo<Item[]>(() => {
    if (!results) return PAGES.filter((p) => !q || p.label.toLowerCase().includes(q.toLowerCase()));
    return [
      ...results.tickets.map((t) => ({
        id: `t-${t.id}`,
        group: "Tickets",
        label: t.subject,
        mono: t.key,
        href: `/app/tickets/${t.id}`,
        icon: Inbox,
      })),
      ...results.emails.map((e) => ({
        id: `e-${e.id}`,
        group: "Emails",
        label: e.subject,
        detail: e.sender,
        href: `/app/inbox-log/${e.id}`,
        icon: Mail,
      })),
      ...results.customers.map((c) => ({
        id: `c-${c.id}`,
        group: "Customers",
        label: c.name ?? c.email,
        detail: c.email,
        href: `/app/customers/${c.id}`,
        icon: Contact,
      })),
    ];
  }, [results, q]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reset the highlight when the results change
  useEffect(() => setActive(0), [items.length]);

  function go(item: Item | undefined) {
    if (!item) return;
    onOpenChange(false);
    router.push(item.href);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(items[active]);
    }
  }

  let lastGroup = "";
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Search"
      description="Find a ticket by number or subject, an email by sender or subject, or a customer."
      className="max-w-xl"
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: arrow keys from the combobox input bubble here */}
      <div className="flex flex-col gap-3" onKeyDown={onKeyDown}>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 stroke-[1.75] text-text-subtle"
          />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="MN-1042, a sender or a subject"
            aria-label="Search"
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls="command-results"
            aria-activedescendant={items[active] ? `cmd-${items[active]?.id}` : undefined}
            className="h-11 w-full rounded-control border border-border-strong bg-surface pr-3 pl-9 text-body-lg text-text focus-visible:border-primary"
          />
        </div>
        <div id="command-results" role="listbox" aria-label="Results" className="max-h-80 overflow-y-auto">
          {loading && !results ? (
            <div className="flex flex-col gap-2 p-1">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : items.length === 0 ? (
            <p className="px-2 py-6 text-center text-body text-text-muted">No matches for “{q}”.</p>
          ) : (
            items.map((item, i) => {
              const header = item.group !== lastGroup ? item.group : null;
              lastGroup = item.group;
              return (
                <div key={item.id}>
                  {header ? (
                    <p className="px-2 pt-2 pb-1 text-overline text-text-subtle uppercase">{header}</p>
                  ) : null}
                  <div
                    id={`cmd-${item.id}`}
                    role="option"
                    tabIndex={-1}
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(item)}
                    onKeyDown={(e) => e.key === "Enter" && go(item)}
                    className={`flex min-h-10 cursor-pointer items-center gap-3 rounded-control px-2 py-1.5 ${i === active ? "bg-primary-soft" : ""}`}
                  >
                    <item.icon aria-hidden className="size-4 shrink-0 stroke-[1.75] text-text-muted" />
                    {item.mono ? <TicketKey value={item.mono} /> : null}
                    <span className="min-w-0 flex-1 truncate text-body text-text">{item.label}</span>
                    {item.detail ? (
                      <span className="max-w-40 truncate text-small text-text-subtle">{item.detail}</span>
                    ) : null}
                    {i === active ? <CornerDownLeft aria-hidden className="size-4 text-text-subtle" /> : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}

export function SearchButton({ onClick }: { onClick: () => void }) {
  return (
    <Tooltip content="Search" shortcut="Ctrl K">
      <Button
        variant="secondary"
        size="sm"
        onClick={onClick}
        className="w-56 justify-start gap-2 text-text-subtle max-lg:hidden"
      >
        <Search aria-hidden />
        <span className="flex-1 text-left">Search tickets, emails…</span>
        <kbd className="font-mono text-[11px]">/</kbd>
      </Button>
    </Tooltip>
  );
}
