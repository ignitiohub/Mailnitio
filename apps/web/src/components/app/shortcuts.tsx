"use client";

import { Modal } from "@mailnitio/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export const SHORTCUTS: { keys: string; action: string }[] = [
  { keys: "Ctrl K  or  /", action: "Search" },
  { keys: "g  d", action: "Go to dashboard" },
  { keys: "g  t", action: "Go to tickets" },
  { keys: "g  r", action: "Go to needs review" },
  { keys: "g  l", action: "Go to inbox log" },
  { keys: "j  /  k", action: "Next / previous row" },
  { keys: "Enter", action: "Open the selected row" },
  { keys: "e", action: "Assign ticket to me" },
  { keys: "r", action: "Reply" },
  { keys: "n", action: "Add a note" },
  { keys: "Ctrl Enter", action: "Send" },
  { keys: "?", action: "Show keyboard shortcuts" },
];

function typing(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return Boolean(el?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']"));
}

/** Global shortcuts. Screen-level shortcuts (j/k, e, r, n) listen for the "mailnitio:shortcut" event. */
export function useGlobalShortcuts(onSearch: () => void) {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const pendingG = useRef<number | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onSearch();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey || typing(event.target)) return;
      if (event.key === "/") {
        event.preventDefault();
        onSearch();
        return;
      }
      if (event.key === "?") {
        setHelpOpen(true);
        return;
      }
      if (pendingG.current) {
        window.clearTimeout(pendingG.current);
        pendingG.current = null;
        const target = { d: "/app", t: "/app/tickets", r: "/app/review", l: "/app/inbox-log" }[event.key];
        if (target) router.push(target);
        return;
      }
      if (event.key === "g") {
        pendingG.current = window.setTimeout(() => {
          pendingG.current = null;
        }, 1000);
        return;
      }
      if (["j", "k", "e", "r", "n", "Enter"].includes(event.key)) {
        window.dispatchEvent(new CustomEvent("mailnitio:shortcut", { detail: event.key }));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSearch, router]);

  return { helpOpen, setHelpOpen };
}

/** Listen for a screen-level shortcut. */
export function useShortcut(key: string, handler: () => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    function on(e: Event) {
      if ((e as CustomEvent<string>).detail === key) ref.current();
    }
    window.addEventListener("mailnitio:shortcut", on);
    return () => window.removeEventListener("mailnitio:shortcut", on);
  }, [key]);
}

export function ShortcutsHelp({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Keyboard shortcuts">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
        {SHORTCUTS.map((s) => (
          <div key={s.keys} className="contents">
            <dt>
              <kbd className="rounded-control border border-border bg-surface-2 px-1.5 py-0.5 font-mono text-caption text-text">{s.keys}</kbd>
            </dt>
            <dd className="text-body text-text-muted">{s.action}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
