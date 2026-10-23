import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Section } from "@/components/marketing/section";
import { legalDocs } from "./content";

export const dynamicParams = false;

export function generateStaticParams() {
  return legalDocs.map((doc) => ({ doc: doc.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }): Promise<Metadata> {
  const { doc: slug } = await params;
  const doc = legalDocs.find((d) => d.slug === slug);
  if (!doc) return {};
  return { title: doc.title, description: doc.summary, alternates: { canonical: `/legal/${doc.slug}` } };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc: slug } = await params;
  const doc = legalDocs.find((d) => d.slug === slug);
  if (!doc) notFound();
  return (
    <Section labelledBy="legal-heading">
      <article className="mx-auto flex max-w-[72ch] flex-col gap-8">
        <header className="flex flex-col gap-3 border-b border-border pb-8">
          <h1 id="legal-heading" className="text-h1 text-text">
            {doc.title}
          </h1>
          <p className="text-body-lg text-text-muted">{doc.summary}</p>
          <p className="text-small text-text-subtle">Last updated {doc.updated}</p>
        </header>
        {doc.sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-3">
            <h2 className="text-h3 text-text">{section.heading}</h2>
            {section.paragraphs.map((p) => (
              <p key={p.slice(0, 40)} className="text-body-lg text-text-muted">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </Section>
  );
}
