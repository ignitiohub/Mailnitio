/**
 * App shell sidebar. Groups follow the approved Stitch dashboard. `product` decides visibility from the
 * workspace's "What brings you here?" answer; `icon` is a lucide-react icon name.
 */

export type ProductInterest = "helpdesk" | "send" | "both";

export interface AppNavItem {
  label: string;
  href: string;
  icon: string;
  product?: "helpdesk" | "send";
}

export interface AppNavGroup {
  label: string;
  items: AppNavItem[];
}

export const appNav: AppNavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/app", icon: "LayoutDashboard" }],
  },
  {
    label: "Helpdesk",
    items: [
      { label: "Tickets", href: "/app/tickets", icon: "Inbox", product: "helpdesk" },
      { label: "Needs review", href: "/app/review", icon: "ListChecks", product: "helpdesk" },
      { label: "Inbox log", href: "/app/inbox-log", icon: "ScrollText", product: "helpdesk" },
    ],
  },
  {
    label: "Send",
    items: [
      { label: "Campaigns", href: "/app/campaigns", icon: "Send", product: "send" },
      { label: "Audiences", href: "/app/audiences", icon: "Users", product: "send" },
      { label: "Templates", href: "/app/templates", icon: "LayoutTemplate", product: "send" },
    ],
  },
  {
    label: "Knowledge",
    items: [{ label: "Training", href: "/app/training", icon: "GraduationCap", product: "helpdesk" }],
  },
  {
    label: "Setup",
    items: [
      { label: "Mailboxes", href: "/app/mailboxes", icon: "Mail", product: "helpdesk" },
      { label: "Domains", href: "/app/domains", icon: "Globe", product: "send" },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Members", href: "/app/settings/members", icon: "UserCog" },
      { label: "Audit log", href: "/app/settings/audit-log", icon: "ShieldCheck" },
      { label: "Settings", href: "/app/settings", icon: "Settings" },
    ],
  },
];

export function navForInterest(interest: ProductInterest | null): AppNavGroup[] {
  return appNav
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.product || !interest || interest === "both" || item.product === interest,
      ),
    }))
    .filter((group) => group.items.length > 0);
}
