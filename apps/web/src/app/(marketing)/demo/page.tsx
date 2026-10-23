import { CalendarClock, MessagesSquare, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Section } from "@/components/marketing/section";
import { DemoForm } from "./demo-form";

export const metadata: Metadata = {
  title: "Book a demo",
  description:
    "Book a 30-minute Mailnitio demo. See how our AI would route a sample of your customer emails, in shadow mode, before anything changes for your team.",
  alternates: { canonical: "/demo" },
};

const expectations = [
  {
    icon: CalendarClock,
    title: "30 minutes",
    body: "A focused call with a product specialist at a time that suits you.",
  },
  {
    icon: MessagesSquare,
    title: "Your emails, your categories",
    body: "We walk through examples from your industry and how your teams are organised.",
  },
  {
    icon: ShieldCheck,
    title: "A proof of concept plan",
    body: "Leave with a plan for a 30-day shadow-mode trial on one mailbox.",
  },
];

export default function DemoPage() {
  return (
    <Section labelledBy="demo-heading" className="bg-bg">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-6">
          <p className="text-overline text-primary uppercase">Book a demo</p>
          <h1 id="demo-heading" className="text-h1 text-text">
            See Mailnitio on emails like yours
          </h1>
          <p className="text-body-lg text-text-muted">
            Tell us a little about your team and pick a time. We will confirm within one working day.
          </p>
          <ul className="flex flex-col gap-5">
            {expectations.map((item) => (
              <li key={item.title} className="flex gap-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary">
                  <item.icon aria-hidden className="size-5 stroke-[1.75]" />
                </span>
                <div>
                  <p className="text-h4 text-text">{item.title}</p>
                  <p className="text-body text-text-muted">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <Suspense>
          <DemoForm />
        </Suspense>
      </div>
    </Section>
  );
}
