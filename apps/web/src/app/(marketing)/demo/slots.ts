import { DEMO_SLOTS } from "@mailnitio/config";

export interface DemoDay {
  /** YYYY-MM-DD in West Africa Time */
  date: string;
  label: string;
  slots: { iso: string; label: string }[];
}

/**
 * Upcoming weekday demo slots in West Africa Time (UTC+01:00, no daylight saving).
 * Slots less than 24 hours away are not offered.
 */
export function upcomingDemoDays(now: Date = new Date()): DemoDay[] {
  const days: DemoDay[] = [];
  const watNow = new Date(now.getTime() + 60 * 60 * 1000);
  const earliest = now.getTime() + 24 * 60 * 60 * 1000;
  for (let offset = 1; days.length < DEMO_SLOTS.daysAhead && offset < 30; offset++) {
    const day = new Date(
      Date.UTC(watNow.getUTCFullYear(), watNow.getUTCMonth(), watNow.getUTCDate() + offset),
    );
    const weekday = day.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    const date = day.toISOString().slice(0, 10);
    const slots = DEMO_SLOTS.hours
      .map((hour) => ({ iso: `${date}T${hour}:00+01:00`, label: hour }))
      .filter((slot) => new Date(slot.iso).getTime() >= earliest);
    if (slots.length === 0) continue;
    days.push({
      date,
      label: new Intl.DateTimeFormat("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      }).format(day),
      slots,
    });
  }
  return days;
}
