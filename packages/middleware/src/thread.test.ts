import { describe, expect, it, vi } from "vitest";
import { findTicketKeys, normalizeSubject, sourceKey } from "./normalize";
import { resolveThread, type ThreadLookups } from "./thread";

const PATTERN = "MN-\\d+";

function lookups(overrides: Partial<ThreadLookups> = {}): ThreadLookups {
  return {
    ticketByKey: vi.fn(async () => null),
    messageIndex: vi.fn(async () => null),
    threadByConversation: vi.fn(async () => null),
    recentTicketBySenderSubject: vi.fn(async () => null),
    ...overrides,
  };
}

const email = { subject: "Redemption request", body: "Please redeem my units", from: "ada@example.com" };

describe("subject normalisation (spec §8.2)", () => {
  it("strips repeated prefixes, tokens and tags", () => {
    expect(normalizeSubject("RE: Fwd: re: [EXTERNAL] Redemption  request [MN-1042]", PATTERN)).toBe(
      "redemption request",
    );
    expect(normalizeSubject("AW: SV: Statement", PATTERN)).toBe("statement");
  });

  it("finds ticket keys in any case", () => {
    expect(findTicketKeys("about mn-1042 and MN-1043", PATTERN)).toEqual(["MN-1042", "MN-1043"]);
  });

  it("builds a stable source key that ignores message-id case", () => {
    expect(sourceKey("ws", "<ABC@x>")).toBe(sourceKey("ws", "<abc@X>"));
    expect(sourceKey("ws1", "<abc@x>")).not.toBe(sourceKey("ws2", "<abc@x>"));
  });
});

describe("thread resolver (spec §8.1)", () => {
  it("matches a ticket token first", async () => {
    const l = lookups({
      ticketByKey: vi.fn(async (key) => (key === "MN-1042" ? { ticketId: "t1", threadId: "th1" } : null)),
    });
    const match = await resolveThread(
      { ...email, subject: "RE: my redemption [MN-1042]", inReplyTo: "<x@y>" },
      l,
      { ticketPattern: PATTERN },
    );
    expect(match).toEqual({ method: "token", ticketId: "t1", threadId: "th1", confident: true });
    expect(l.messageIndex).not.toHaveBeenCalled();
  });

  it("ignores tokens for tickets that do not exist and falls through to headers", async () => {
    const l = lookups({
      messageIndex: vi.fn(async (id) => (id === "<a@x>" ? { ticketId: "t2", threadId: "th2" } : null)),
    });
    const match = await resolveThread({ ...email, subject: "MN-9999", inReplyTo: "<a@x>" }, l, {
      ticketPattern: PATTERN,
    });
    expect(match.method).toBe("headers");
    expect(match.ticketId).toBe("t2");
  });

  it("uses References, newest first, when In-Reply-To is unknown", async () => {
    const l = lookups({
      messageIndex: vi.fn(async (id) => (id === "<r2@x>" ? { ticketId: "t3", threadId: null } : null)),
    });
    const match = await resolveThread(
      { ...email, inReplyTo: "<unknown@x>", references: ["<r1@x>", "<r2@x>"] },
      l,
      { ticketPattern: PATTERN },
    );
    expect(match).toMatchObject({ method: "headers", ticketId: "t3" });
  });

  it("matches by conversation id", async () => {
    const l = lookups({ threadByConversation: vi.fn(async () => ({ threadId: "th4", ticketId: "t4" })) });
    const match = await resolveThread({ ...email, conversationId: "conv-1" }, l, { ticketPattern: PATTERN });
    expect(match).toEqual({ method: "conversation", ticketId: "t4", threadId: "th4", confident: true });
  });

  it("uses the sender + subject heuristic only for replies, and marks it not confident", async () => {
    const l = lookups({
      recentTicketBySenderSubject: vi.fn(async () => ({ ticketId: "t5", threadId: null })),
    });
    const reply = await resolveThread({ ...email, subject: "RE: Redemption request" }, l, {
      ticketPattern: PATTERN,
    });
    expect(reply).toMatchObject({ method: "heuristic", ticketId: "t5", confident: false });
    const fresh = await resolveThread(
      email,
      lookups({ recentTicketBySenderSubject: vi.fn(async () => ({ ticketId: "t5", threadId: null })) }),
      {
        ticketPattern: PATTERN,
      },
    );
    expect(fresh.method).toBe("none");
  });

  it("returns none for a brand new email", async () => {
    expect(await resolveThread(email, lookups(), { ticketPattern: PATTERN })).toEqual({
      method: "none",
      ticketId: null,
      threadId: null,
      confident: false,
    });
  });
});
