import { footerNav, site } from "@mailnitio/config";
import Link from "next/link";
import { Logo } from "../logo";

export function MarketingFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-16 md:grid-cols-[1.5fr_repeat(3,1fr)] md:px-6">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-xs text-body text-text-muted">
            AI email operations for growing companies across Africa. Helpdesk and Send, in one workspace.
          </p>
          <a href={`mailto:${site.contactEmail}`} className="text-body text-primary hover:underline">
            {site.contactEmail}
          </a>
        </div>
        {footerNav.map((group) => (
          <nav key={group.label} aria-label={group.label} className="flex flex-col gap-3">
            <p className="text-overline text-text-subtle uppercase">{group.label}</p>
            <ul className="flex flex-col gap-2">
              {group.items.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-body text-text-muted hover:text-text">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-2 px-4 py-6 text-small text-text-subtle md:flex-row md:justify-between md:px-6">
          <p>
            © {new Date().getFullYear()} {site.company}. All rights reserved.
          </p>
          <p>Hosted in the EU (Frankfurt). Designed to align with the Nigeria Data Protection Act.</p>
        </div>
      </div>
    </footer>
  );
}
