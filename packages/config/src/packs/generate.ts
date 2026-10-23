import type { ClassifierDecision, IndustryPack, SampleEmail } from "./types";

/**
 * Deterministic synthetic email generator. The same pack and seed always produce the same samples,
 * so seeding is repeatable and idempotent. All people, companies and numbers are invented.
 */

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  "Adaeze",
  "Chinedu",
  "Funmilayo",
  "Ibrahim",
  "Ngozi",
  "Tunde",
  "Aisha",
  "Emeka",
  "Kelechi",
  "Bisi",
  "Olumide",
  "Halima",
  "Segun",
  "Chiamaka",
  "Musa",
  "Yetunde",
  "Obinna",
  "Zainab",
  "Femi",
  "Amaka",
  "Kunle",
  "Hauwa",
  "Ifeoma",
  "Babajide",
  "Nkechi",
  "Usman",
  "Temitope",
  "Uchenna",
  "Folake",
  "Sani",
];
const LAST_NAMES = [
  "Okafor",
  "Adeyemi",
  "Bello",
  "Eze",
  "Bakare",
  "Ogunleye",
  "Nwosu",
  "Abubakar",
  "Okeke",
  "Balogun",
  "Ibrahim",
  "Afolabi",
  "Chukwu",
  "Danjuma",
  "Ojo",
  "Lawal",
  "Obi",
  "Ekwueme",
  "Aliyu",
  "Oyelaran",
];
const EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
];
const FUNDS = ["Money Market Fund", "Fixed Income Fund", "Balanced Fund", "Dollar Fund", "Equity Fund"];
const AREAS = [
  "Lekki Phase 1",
  "Ikeja GRA",
  "Surulere",
  "Yaba",
  "Ajah",
  "Gbagada",
  "Magodo",
  "Festac",
  "Ikoyi",
  "Ogba",
];

const DAY = 24 * 60;

interface Person {
  name: string;
  first: string;
  email: string;
}

export function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, k: string) => values[k] ?? match);
}

export function generateSamples(
  pack: IndustryPack,
  options: { count?: number; seed?: number } = {},
): SampleEmail[] {
  const count = options.count ?? 500;
  const rand = mulberry32(options.seed ?? 20261022);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)] as T;
  const between = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
  const prefix = pack.id === "financial-services" ? "fs" : pack.id === "utilities" ? "ut" : "gn";

  const people: Person[] = Array.from({ length: 160 }, (_, i) => {
    const first = FIRST_NAMES[i % FIRST_NAMES.length] as string;
    const last = LAST_NAMES[(i * 7) % LAST_NAMES.length] as string;
    const handle = `${first}.${last}${i >= 60 ? i : ""}`.toLowerCase();
    return { name: `${first} ${last}`, first, email: `${handle}@${pick(EMAIL_DOMAINS)}` };
  });

  const values = (person: Person) => ({
    name: person.first,
    fullname: person.name,
    amount: `₦${(between(5, 500) * 5000).toLocaleString("en-GB")}`,
    fund: pick(FUNDS),
    month: pick(MONTHS),
    account: String(between(1_000_000_000, 9_999_999_999)),
    bvn: String(between(10_000_000_000, 99_999_999_999)),
    meter: `0${between(100_000_000, 999_999_999)}${between(10, 99)}`,
    phone: `080${between(10_000_000, 99_999_999)}`,
    area: pick(AREAS),
    days: String(between(2, 9)),
    units: String(between(20, 400)),
    ref: `TRX${between(100000, 999999)}`,
  });

  const totalWeight = pack.templates.reduce((sum, t) => sum + t.weight, 0);
  const pickTemplate = () => {
    let r = rand() * totalWeight;
    for (const t of pack.templates) {
      r -= t.weight;
      if (r <= 0) return t;
    }
    return pack.templates[0] as (typeof pack.templates)[number];
  };

  const categoryMailbox = (category: string) => {
    // Most emails arrive in the mailbox for their category; ~18% land in the wrong one (rerouted).
    const own = pack.mailboxes.find((m) => m.defaultCategory === category);
    if (own && rand() > 0.18) return own;
    return pick(pack.mailboxes.filter((m) => m.mode !== "paused"));
  };

  const samples: SampleEmail[] = [];
  const agents = pack.agents.filter((a) => a.role === "agent" || a.role === "supervisor");
  let n = 0;
  const nextId = () => `${prefix}-${String(++n).padStart(4, "0")}`;

  while (samples.length < count) {
    const roll = rand();
    const person = pick(people);
    const v = values(person);
    const ageMinutes = between(10, 30 * DAY);

    if (roll < 0.025) {
      // Out-of-office and delivery failures: pre-filter skips them.
      const ooo = rand() < 0.6;
      samples.push({
        id: nextId(),
        label: ooo ? "Automatic reply" : "Delivery failure",
        mailbox: pick(pack.mailboxes).address,
        from: ooo ? person.email : "mailer-daemon@googlemail.com",
        fromName: ooo ? person.name : "Mail Delivery Subsystem",
        subject: ooo ? "Automatic reply: Out of office" : "Undeliverable: Your request",
        body: ooo
          ? `I am out of the office until next week with limited access to email. — ${person.name}`
          : "Delivery has failed to these recipients or groups.",
        ageMinutes,
        headers: ooo ? { "Auto-Submitted": "auto-replied" } : {},
      });
      continue;
    }

    if (roll < 0.035) {
      samples.push({
        id: nextId(),
        label: "Spam",
        mailbox: pick(pack.mailboxes).address,
        from: `promo${between(100, 999)}@deals-mail.example`,
        fromName: "Investment Deals",
        subject: "Earn 40% monthly returns guaranteed",
        body: "Join our exclusive investment club today and double your money in 30 days. Click to register.",
        ageMinutes,
        classifier: {
          category: "spam",
          confidence: 0.97,
          priority: "low",
          summary: "Unsolicited promotional email",
          reason: "Bulk promotional content with unrealistic return claims",
          escalation: { flag: false, reason: null },
        },
      });
      continue;
    }

    if (roll < 0.075) {
      const esc = pick(pack.escalationEmails);
      const mailbox = pick(pack.mailboxes.filter((m) => m.mode !== "paused"));
      samples.push({
        id: nextId(),
        label: "Escalation",
        mailbox: mailbox.address,
        from: person.email,
        fromName: person.name,
        subject: fillTemplate(esc.subject, v),
        body: fillTemplate(esc.body, v),
        ageMinutes,
        classifier: {
          category: pack.templates[0]?.category ?? pack.config.defaultCategory,
          confidence: 0.86 + rand() * 0.1,
          priority: "urgent",
          summary: fillTemplate(esc.subject, v),
          reason: esc.reason,
          escalation: { flag: true, reason: esc.reason },
        },
        followUp:
          rand() < 0.5
            ? {
                assignee: pick(agents).email,
                note: {
                  body: "Escalated to the head of customer experience. Call the customer today.",
                  afterMinutes: 25,
                },
                status: "open",
              }
            : undefined,
      });
      continue;
    }

    const template = pickTemplate();
    const mailbox = categoryMailbox(template.category);
    const subject = fillTemplate(pick(template.subjects), v);
    const body = fillTemplate(pick(template.bodies), v);

    let confidence = 0.86 + rand() * 0.13;
    let label = template.category.replaceAll("_", " ");
    let aiFails = false;
    let processingFails = false;
    const band = rand();
    if (band < 0.05) {
      confidence = 0.62 + rand() * 0.2; // between low and high: routed + Needs Review
      label = `${label} (needs review)`;
    } else if (band < 0.075) {
      confidence = 0.35 + rand() * 0.2; // below low: mailbox default + Needs Review
      label = `${label} (low confidence)`;
    } else if (band < 0.085) {
      aiFails = true;
      label = `${label} (AI failure)`;
    } else if (band < 0.092) {
      processingFails = true;
      label = `${label} (processing failure)`;
    }

    const classifier: ClassifierDecision = {
      category: template.category,
      confidence: Math.round(confidence * 1000) / 1000,
      priority: pack.config.categories.find((c) => c.key === template.category)?.defaultPriority ?? "medium",
      summary: fillTemplate(pick(template.summaries), v),
      reason: fillTemplate(pick(template.reasons), v),
      escalation: { flag: false, reason: null },
    };

    const followRoll = rand();
    const assignee = pick(agents).email;
    const replyBody = fillTemplate(pick(template.replies), v);
    const followUp =
      followRoll < 0.45
        ? {
            assignee,
            reply: { body: replyBody, afterMinutes: between(20, 600) },
            status: (rand() < 0.75 ? "resolved" : "pending") as "resolved" | "pending",
          }
        : followRoll < 0.6
          ? {
              assignee,
              note: {
                body: "Checked the account history; waiting for operations to confirm.",
                afterMinutes: between(15, 240),
              },
              status: "open" as const,
            }
          : followRoll < 0.72
            ? { assignee }
            : undefined;

    const original: SampleEmail = {
      id: nextId(),
      label: `${label[0]?.toUpperCase()}${label.slice(1)}`,
      mailbox: mailbox.address,
      from: person.email,
      fromName: person.name,
      subject,
      body: `Hello,\n\n${body}\n\nRegards,\n${person.name}\n${v.phone}`,
      ageMinutes,
      classifier,
      aiFails,
      processingFails,
      followUp: aiFails || processingFails ? undefined : followUp,
    };
    samples.push(original);

    // Follow-up replies from the same customer, threaded by headers.
    if (!aiFails && !processingFails && rand() < 0.16 && ageMinutes > 2 * DAY) {
      const replyAge = Math.max(5, ageMinutes - between(60, DAY));
      const kind = rand();
      if (kind < 0.55) {
        samples.push({
          id: nextId(),
          label: "Follow-up (continuation)",
          mailbox: mailbox.address,
          from: person.email,
          fromName: person.name,
          subject: `RE: ${subject}`,
          body: `Hello,\n\n${pick(pack.followUpLines.continuation)}\n\n${person.name}`,
          ageMinutes: replyAge,
          inReplyTo: original.id,
          context: {
            decision: "same_case",
            replyType: "continuation",
            confidence: 0.9 + rand() * 0.08,
            reason: "Customer is chasing the same request",
            updatedSummary: `${classifier.summary}; customer followed up`,
            newIssueSummary: null,
          },
        });
      } else if (kind < 0.8) {
        samples.push({
          id: nextId(),
          label: "Follow-up (closure)",
          mailbox: mailbox.address,
          from: person.email,
          fromName: person.name,
          subject: `RE: ${subject}`,
          body: `${pick(pack.followUpLines.closure)}\n\n${person.name}`,
          ageMinutes: replyAge,
          inReplyTo: original.id,
          context: {
            decision: "same_case",
            replyType: "closure",
            confidence: 0.93,
            reason: "Customer confirms the issue is resolved",
            updatedSummary: `${classifier.summary}; customer confirmed resolution`,
            newIssueSummary: null,
          },
        });
      } else {
        const extra = pick(pack.followUpLines.newIssue);
        samples.push({
          id: nextId(),
          label: "Follow-up (thanks + new issue)",
          mailbox: mailbox.address,
          from: person.email,
          fromName: person.name,
          subject: `RE: ${subject}`,
          body: `Thanks for your help. ${fillTemplate(extra.line, v)}\n\n${person.name}`,
          ageMinutes: replyAge,
          inReplyTo: original.id,
          context: {
            decision: "mixed",
            replyType: "mixed",
            confidence: 0.88,
            reason: "Thanks the team and raises a separate issue",
            updatedSummary: `${classifier.summary}; customer thanked the team`,
            newIssueSummary: fillTemplate(extra.line, v),
          },
          classifier: {
            category: extra.category,
            confidence: 0.9,
            priority:
              pack.config.categories.find((c) => c.key === extra.category)?.defaultPriority ?? "medium",
            summary: fillTemplate(extra.line, v),
            reason: "New issue raised in a reply",
            escalation: { flag: false, reason: null },
          },
        });
      }
    }
  }

  return samples.slice(0, count).sort((a, b) => b.ageMinutes - a.ageMinutes);
}
