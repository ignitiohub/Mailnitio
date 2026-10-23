import { describe, expect, it } from "vitest";
import { createLogger } from "./logger";

describe("logger redaction", () => {
  it("never writes credentials", () => {
    const lines: string[] = [];
    const logger = createLogger("test", { destination: { write: (line: string) => void lines.push(line) } });
    logger.info(
      { user: { email: "ada@acme.example", password: "hunter2" }, mailbox: { clientSecret: "abc123" } },
      "signed in",
    );
    const output = lines.join("");
    expect(output).toContain("ada@acme.example");
    expect(output).not.toContain("hunter2");
    expect(output).not.toContain("abc123");
    expect(output).toContain("[redacted]");
  });
});
