export interface NavLink {
  label: string;
  href: string;
  description?: string;
}

export interface NavGroup {
  label: string;
  items: NavLink[];
}

export function isNavGroup(item: NavLink | NavGroup): item is NavGroup {
  return "items" in item;
}

export const industryLinks: NavLink[] = [
  { label: "Financial services", href: "/industries/financial-services" },
  { label: "Utilities", href: "/industries/utilities" },
  { label: "Telecoms", href: "/industries/telecoms" },
  { label: "Insurance", href: "/industries/insurance" },
  { label: "Education", href: "/industries/education" },
];

export const marketingNav: (NavLink | NavGroup)[] = [
  {
    label: "Product",
    items: [
      {
        label: "Helpdesk",
        href: "/product/helpdesk",
        description: "AI email customer service: routing, tickets and a team inbox",
      },
      {
        label: "Send",
        href: "/product/send",
        description: "Templates, audiences and bulk email with deliverability built in",
      },
    ],
  },
  { label: "Industries", items: industryLinks },
  { label: "Pricing", href: "/pricing" },
  { label: "Security", href: "/security" },
];

export const footerNav: NavGroup[] = [
  {
    label: "Product",
    items: [
      { label: "Helpdesk", href: "/product/helpdesk" },
      { label: "Send", href: "/product/send" },
      { label: "Pricing", href: "/pricing" },
      { label: "Book a demo", href: "/demo" },
    ],
  },
  { label: "Industries", items: industryLinks },
  {
    label: "Trust",
    items: [
      { label: "Security and compliance", href: "/security" },
      { label: "Privacy policy", href: "/legal/privacy" },
      { label: "Terms of service", href: "/legal/terms" },
      { label: "Acceptable use policy", href: "/legal/aup" },
    ],
  },
];
