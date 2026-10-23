"use client";

import { Button, Select, Tabs, TabsList, TabsTrigger, Textarea, toast } from "@mailnitio/ui";
import { AtSign, Check, X } from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { ApiError, apiFetch } from "@/lib/api";
import { useMe } from "@/lib/me";
import { useApi } from "@/lib/use-api";
import { useLookups } from "./lookups";
import type { TicketDetail } from "./ticket-types";

interface Canned {
  id: string;
  title: string;
  body: string;
  teamId: string | null;
}

export interface ComposerHandle {
  focus(mode: "reply" | "note"): void;
}

const draftKey = (ticketId: string, mode: string) => `mailnitio.draft.${ticketId}.${mode}`;

function readDraft(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

function writeDraft(key: string, value: string) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // Drafts are a convenience; ignore storage failures.
  }
}

/** Reply / Note composer with canned responses, mentions and an autosaved draft. Ctrl+Enter sends. */
export const TicketComposer = forwardRef<
  ComposerHandle,
  { ticket: TicketDetail; onSent: () => void; disabled?: boolean }
>(function TicketComposer({ ticket, onSent, disabled }, ref) {
  const { me } = useMe();
  const { members } = useLookups();
  const canned = useApi<{ data: Canned[] }>("/v1/canned-responses");
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState("pending");
  const [mentions, setMentions] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState<"idle" | "saving" | "saved">("idle");
  const textarea = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus(next) {
      setMode(next);
      window.setTimeout(() => textarea.current?.focus(), 0);
    },
  }));

  // Load the draft for this ticket and mode.
  useEffect(() => {
    setBody(readDraft(draftKey(ticket.id, mode)));
    setSaved("idle");
  }, [ticket.id, mode]);

  // Autosave the draft shortly after typing stops.
  useEffect(() => {
    setSaved((s) => (s === "idle" && !body ? "idle" : "saving"));
    const t = window.setTimeout(() => {
      writeDraft(draftKey(ticket.id, mode), body);
      setSaved(body ? "saved" : "idle");
    }, 600);
    return () => window.clearTimeout(t);
  }, [body, ticket.id, mode]);

  function insertCanned(id: string) {
    const c = canned.data?.data.find((x) => x.id === id);
    if (!c) return;
    const first = (ticket.customer?.name ?? "").split(" ")[0] || "there";
    const text = c.body
      .replaceAll("{{customer_first_name}}", first)
      .replaceAll("{{agent_name}}", me.user.name)
      .replaceAll("{{ticket_number}}", ticket.key);
    setBody((b) => (b ? `${b}\n\n${text}` : text));
    textarea.current?.focus();
  }

  async function send() {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      await apiFetch(`/v1/tickets/${ticket.id}/messages`, {
        method: "POST",
        json: mode === "reply" ? { type: "reply", body, status } : { type: "note", body, mentions },
      });
      writeDraft(draftKey(ticket.id, mode), "");
      setBody("");
      setMentions([]);
      setSaved("idle");
      toast.success(mode === "reply" ? "Reply recorded" : "Note added");
      onSent();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not send", {
        description: e instanceof ApiError && e.referenceId ? `Reference ${e.referenceId}` : undefined,
      });
    } finally {
      setSending(false);
    }
  }

  const teamCanned = (canned.data?.data ?? []).filter((c) => !c.teamId || c.teamId === ticket.teamId);
  const others = members.filter((m) => m.userId !== me.user.id);

  return (
    <section
      aria-label="Reply or add a note"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={mode} onValueChange={(v) => setMode(v as "reply" | "note")}>
          <TabsList aria-label="Message type">
            <TabsTrigger value="reply">Reply</TabsTrigger>
            <TabsTrigger value="note">Internal note</TabsTrigger>
          </TabsList>
        </Tabs>
        {mode === "reply" && teamCanned.length > 0 ? (
          <Select
            aria-label="Insert a canned response"
            value=""
            onChange={(e) => insertCanned(e.target.value)}
            className="w-56"
            disabled={disabled}
          >
            <option value="">Insert canned response…</option>
            {teamCanned.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </Select>
        ) : null}
      </div>
      <label className="sr-only" htmlFor={`composer-${ticket.id}`}>
        {mode === "reply" ? `Reply to ${ticket.customer?.email ?? "the customer"}` : "Internal note"}
      </label>
      <Textarea
        id={`composer-${ticket.id}`}
        ref={textarea}
        rows={6}
        value={body}
        disabled={disabled}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void send();
          }
        }}
        placeholder={
          mode === "reply"
            ? `Write to ${ticket.customer?.name ?? ticket.customer?.email ?? "the customer"}…`
            : "Write a note for your team…"
        }
        className={mode === "note" ? "bg-warning-soft" : undefined}
      />
      {mode === "note" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Mention a teammate"
            value=""
            onChange={(e) => e.target.value && setMentions((m) => [...new Set([...m, e.target.value])])}
            className="w-52"
          >
            <option value="">Mention a teammate…</option>
            {others.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.name}
              </option>
            ))}
          </Select>
          {mentions.map((id) => (
            <span
              key={id}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-border bg-surface pr-1 pl-2.5 text-small"
            >
              <AtSign aria-hidden className="size-3.5 text-text-subtle" />
              {members.find((m) => m.userId === id)?.name}
              <button
                type="button"
                className="flex size-6 cursor-pointer items-center justify-center rounded-full hover:bg-surface-2"
                aria-label={`Remove mention of ${members.find((m) => m.userId === id)?.name}`}
                onClick={() => setMentions((m) => m.filter((x) => x !== id))}
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1.5 text-small text-text-subtle" aria-live="polite">
          {saved === "saved" ? (
            <>
              <Check aria-hidden className="size-3.5 text-success" />
              Draft saved
            </>
          ) : saved === "saving" ? (
            "Saving draft…"
          ) : (
            <span>
              <kbd className="font-mono">Ctrl Enter</kbd> to send
            </span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {mode === "reply" ? (
            <Select
              aria-label="Status after sending"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-48"
            >
              <option value="pending">Send and set pending</option>
              <option value="open">Send and keep open</option>
              <option value="resolved">Send and resolve</option>
            </Select>
          ) : null}
          <Button onClick={() => void send()} loading={sending} disabled={disabled || !body.trim()}>
            {mode === "reply" ? "Send reply" : "Add note"}
          </Button>
        </div>
      </div>
    </section>
  );
});
