import { describe, expect, it } from "vitest";
import { createEnvelope, generateKek } from "./envelope";

const WS_A = "0b9f7c1e-5d1a-4f5e-9a51-1f2d3c4b5a60";
const WS_B = "6a1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d";

describe("envelope encryption", () => {
  const envelope = createEnvelope(generateKek());

  it("round-trips a secret through a wrapped workspace DEK", () => {
    const wrappedDek = envelope.createWorkspaceKey(WS_A);
    const ciphertext = envelope.encryptSecret({
      workspaceId: WS_A,
      wrappedDek,
      context: "mailbox:1:client_secret",
      plaintext: "s3cr3t-value",
    });
    expect(ciphertext).not.toContain("s3cr3t-value");
    expect(
      envelope.decryptSecret({
        workspaceId: WS_A,
        wrappedDek,
        context: "mailbox:1:client_secret",
        ciphertext,
      }),
    ).toBe("s3cr3t-value");
  });

  it("uses a fresh IV so identical plaintexts produce different ciphertexts", () => {
    const wrappedDek = envelope.createWorkspaceKey(WS_A);
    const input = { workspaceId: WS_A, wrappedDek, context: "c", plaintext: "same" };
    expect(envelope.encryptSecret(input)).not.toBe(envelope.encryptSecret(input));
  });

  it("refuses a wrapped DEK presented for another workspace", () => {
    const wrappedDek = envelope.createWorkspaceKey(WS_A);
    expect(() =>
      envelope.encryptSecret({ workspaceId: WS_B, wrappedDek, context: "c", plaintext: "x" }),
    ).toThrow("Decryption failed");
  });

  it("refuses a ciphertext moved to a different context", () => {
    const wrappedDek = envelope.createWorkspaceKey(WS_A);
    const ciphertext = envelope.encryptSecret({
      workspaceId: WS_A,
      wrappedDek,
      context: "a",
      plaintext: "x",
    });
    expect(() => envelope.decryptSecret({ workspaceId: WS_A, wrappedDek, context: "b", ciphertext })).toThrow(
      "Decryption failed",
    );
  });

  it("detects tampering", () => {
    const wrappedDek = envelope.createWorkspaceKey(WS_A);
    const ciphertext = envelope.encryptSecret({
      workspaceId: WS_A,
      wrappedDek,
      context: "c",
      plaintext: "hello",
    });
    const parts = ciphertext.split(".");
    const body = Buffer.from(parts[3] as string, "base64url");
    body[0] = (body[0] as number) ^ 0xff;
    parts[3] = body.toString("base64url");
    expect(() =>
      envelope.decryptSecret({ workspaceId: WS_A, wrappedDek, context: "c", ciphertext: parts.join(".") }),
    ).toThrow("Decryption failed");
  });

  it("cannot unwrap DEKs with a different KEK", () => {
    const wrappedDek = envelope.createWorkspaceKey(WS_A);
    const other = createEnvelope(generateKek());
    expect(() =>
      other.encryptSecret({ workspaceId: WS_A, wrappedDek, context: "c", plaintext: "x" }),
    ).toThrow("Decryption failed");
  });

  it("rejects a KEK of the wrong length", () => {
    expect(() => createEnvelope(Buffer.alloc(16).toString("base64"))).toThrow("MAILNITIO_KEK");
  });
});
