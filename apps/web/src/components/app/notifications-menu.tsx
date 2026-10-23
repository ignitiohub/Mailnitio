"use client";

import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger, Tooltip } from "@mailnitio/ui";
import { AtSign, Bell, MessageSquareReply, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { When } from "@/components/helpdesk/display";
import { apiFetch } from "@/lib/api";
import { useApi } from "@/lib/use-api";

interface Notification {
  id: string;
  type: "assignment" | "customer_reply" | "mention";
  data: { ticketId: string; ticketKey: string; subject: string; actorName?: string | null; excerpt?: string };
  readAt: string | null;
  createdAt: string;
}

const ICONS = { assignment: UserPlus, customer_reply: MessageSquareReply, mention: AtSign } as const;

function text(n: Notification) {
  const who = n.data.actorName ?? "Someone";
  if (n.type === "assignment") return `${who} assigned ${n.data.ticketKey} to you`;
  if (n.type === "customer_reply") return `${who} replied on ${n.data.ticketKey}`;
  return `${who} mentioned you on ${n.data.ticketKey}`;
}

export function NotificationsMenu() {
  const router = useRouter();
  const { data, refetch } = useApi<{ data: Notification[]; unread: number }>("/v1/notifications", { pollMs: 30_000 });
  const unread = data?.unread ?? 0;

  async function open(n: Notification) {
    if (!n.readAt) await apiFetch("/v1/notifications/read", { method: "POST", json: { ids: [n.id] } }).catch(() => undefined);
    refetch();
    router.push(`/app/tickets/${n.data.ticketId}`);
  }

  async function markAll() {
    await apiFetch("/v1/notifications/read", { method: "POST", json: {} }).catch(() => undefined);
    refetch();
  }

  return (
    <DropdownMenu>
      <Tooltip content="Notifications">
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative max-md:size-11"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications, none unread"}
          >
            <Bell aria-hidden />
            {unread > 0 ? (
              <span aria-hidden className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] leading-none font-semibold text-surface tabular">
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-80 max-w-[calc(100vw-32px)]">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel className="px-0">Notifications</DropdownMenuLabel>
          {unread > 0 ? (
            <button type="button" className="cursor-pointer text-small text-primary hover:underline" onClick={() => void markAll()}>
              Mark all as read
            </button>
          ) : null}
        </div>
        {(data?.data ?? []).length === 0 ? (
          <p className="px-2 pb-3 text-body text-text-muted">No notifications. Assignments, customer replies and mentions appear here.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            {data?.data.map((n) => {
              const Icon = ICONS[n.type];
              return (
                <DropdownMenuItem key={n.id} onSelect={() => void open(n)} className="h-auto items-start py-2">
                  <Icon aria-hidden className="mt-0.5" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={n.readAt ? "text-text-muted" : "font-medium text-text"}>{text(n)}</span>
                    <span className="truncate text-small text-text-subtle">{n.data.excerpt ?? n.data.subject}</span>
                    <When at={n.createdAt} className="text-caption font-normal text-text-subtle" />
                  </span>
                  {!n.readAt ? <span aria-label="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" /> : null}
                </DropdownMenuItem>
              );
            })}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
