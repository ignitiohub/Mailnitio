"use client";

const KEY = "mailnitio.utm";
const FIELDS = ["source", "medium", "campaign", "term", "content"] as const;
export type Utm = Partial<Record<(typeof FIELDS)[number], string>>;

/** Remember the first UTM parameters of this visit (first touch). Storage can be unavailable; that is fine. */
export function captureUtm(search: string) {
  const params = new URLSearchParams(search);
  const utm: Utm = {};
  for (const field of FIELDS) {
    const value = params.get(`utm_${field}`);
    if (value) utm[field] = value.slice(0, 120);
  }
  if (Object.keys(utm).length === 0) return;
  try {
    if (!window.sessionStorage.getItem(KEY)) window.sessionStorage.setItem(KEY, JSON.stringify(utm));
  } catch {
    // Not persisted.
  }
}

export function readUtm(): Utm | undefined {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const utm: Utm = {};
    for (const field of FIELDS) {
      const value = parsed[field];
      if (typeof value === "string") utm[field] = value.slice(0, 120);
    }
    return Object.keys(utm).length > 0 ? utm : undefined;
  } catch {
    return undefined;
  }
}
