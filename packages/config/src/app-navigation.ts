/**
 * App shell sidebar, per docs/prompts/mailnitio-dev-prompts.md §5 (Portal screens). `product` decides
 * visibility from the workspace's "What brings you here?" answer; `icon` is a lucide-react icon name.
 */

export type ProductInterest = "helpdesk" | "send" | "both";

export interface AppNavItem {
  label: string;
  href: string;
  icon: string;
  product?: "helpdesk" | "send";
  /** Only these workspace roles see the item. */
  roles?: string[];
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
      { label: "Inbox log", href: "/app/inbox-log", icon: "ScrollText", product: "helpdesk" },
      { label: "Needs review", href: "/app/review", icon: "ListChecks", product: "helpdesk" },
      { label: "Customers", href: "/app/customers", icon: "Contact", product: "helpdesk" },
    ],
  },
  {
    label: "Insights",
    items: [{ label: "Insight report", href: "/app/insights", icon: "ChartColumn", product: "helpdesk" }],
  },
  {
    label: "Send",
    items: [
      { label: "Campaigns", href: "/app/campaigns", icon: "Send", product: "send" },
      { label: "Audiences and templates", href: "/app/audiences", icon: "Users", product: "send" },
    ],
  },
  {
    label: "Setup",
    items: [
      { label: "Mailboxes and connections", href: "/app/mailboxes", icon: "Mail", product: "helpdesk" },
      { label: "Teams, rules and categories", href: "/app/teams", icon: "Workflow", product: "helpdesk" },
    ],
  },
  {
    label: "Admin",
    items: [
      { label: "Users and audit", href: "/app/settings/members", icon: "UserCog" },
      { label: "Usage", href: "/app/usage", icon: "Gauge" },
      {
        label: "Email simulator",
        href: "/app/simulator",
        icon: "FlaskConical",
        product: "helpdesk",
        roles: ["owner", "admin"],
      },
      { label: "Settings", href: "/app/settings", icon: "Settings" },
    ],
  },
];

export function navForInterest(interest: ProductInterest | null, role?: string): AppNavGroup[] {
  return appNav
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          (!item.product || !interest || interest === "both" || item.product === interest) &&
          (!item.roles || (role !== undefined && item.roles.includes(role))),
      ),
    }))
    .filter((group) => group.items.length > 0);
}
