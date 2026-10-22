import { z } from "zod";

export const cursorQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type CursorQuery = z.infer<typeof cursorQuerySchema>;

export function pageSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({ data: z.array(item), nextCursor: z.string().nullable() });
}

/** Opaque cursor for keyset pagination on (createdAt, id). */
export function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify([createdAt.toISOString(), id])).toString("base64url");
}

export function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const [createdAt, id] = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as [string, string];
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime()) || typeof id !== "string") return null;
    return { createdAt: date, id };
  } catch {
    return null;
  }
}
