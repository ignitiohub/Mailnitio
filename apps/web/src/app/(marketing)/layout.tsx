import type { ReactNode } from "react";
import { MarketingFooter } from "@/components/marketing/footer";
import { MarketingHeader } from "@/components/marketing/header";
import { UtmCapture } from "@/components/marketing/utm-capture";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <UtmCapture />
      <MarketingHeader />
      <main id="content" className="flex-1">
        {children}
      </main>
      <MarketingFooter />
    </div>
  );
}
