import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Envelope encryption for workspace secrets.
 *
 * - Platform KEK (key-encryption key) comes from MAILNITIO_KEK: 32 random bytes, base64.
 * - Each workspace has its own DEK (data-encryption key), stored only in wrapped (KEK-encrypted) form.
 * - Secrets are encrypted with the workspace DEK using AES-256-GCM.
 * - Associated data binds every ciphertext to its workspace (and, for secrets, a caller-supplied context
 *   such as "mailbox:<id>:client_secret"), so ciphertexts cannot be moved between workspaces or fields.
 *
 * Serialised form: "<version>.<iv>.<tag>.<ciphertext>", each part base64url.
 */

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const KEY_BYTES = 32;
const IV_BYTES = 12;

export interface Envelope {
  /** Create a new DEK for a workspace and return it wrapped by the KEK (safe to store). */
  createWorkspaceKey(workspaceId: string): string;
  encryptSecret(input: {
    workspaceId: string;
    wrappedDek: string;
    context: string;
    plaintext: string;
  }): string;
  decryptSecret(input: {
    workspaceId: string;
    wrappedDek: string;
    context: string;
    ciphertext: string;
  }): string;
}

export function generateKek(): string {
  return randomBytes(KEY_BYTES).toString("base64");
}

function parseKek(kekBase64: string): Buffer {
  const kek = Buffer.from(kekBase64, "base64");
  if (kek.length !== KEY_BYTES) {
    throw new Error(`MAILNITIO_KEK must be ${KEY_BYTES} bytes encoded as base64`);
  }
  return kek;
}

function seal(key: Buffer, plaintext: Buffer, aad: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv, tag, ciphertext]
    .map((part) => (typeof part === "string" ? part : part.toString("base64url")))
    .join(".");
}

function open(key: Buffer, sealed: string, aad: string): Buffer {
  const parts = sealed.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Unsupported ciphertext format");
  }
  const [, iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, "base64url")) as [
    Buffer,
    Buffer,
    Buffer,
    Buffer,
  ];
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    // Never surface key material or plaintext fragments in errors.
    throw new Error("Decryption failed");
  }
}

const dekAad = (workspaceId: string) => `mailnitio:dek:${workspaceId}`;
const secretAad = (workspaceId: string, context: string) => `mailnitio:secret:${workspaceId}:${context}`;

export function createEnvelope(kekBase64: string): Envelope {
  const kek = parseKek(kekBase64);

  const unwrapDek = (workspaceId: string, wrappedDek: string) => {
    const dek = open(kek, wrappedDek, dekAad(workspaceId));
    if (dek.length !== KEY_BYTES) throw new Error("Decryption failed");
    return dek;
  };

  return {
    createWorkspaceKey(workspaceId) {
      return seal(kek, randomBytes(KEY_BYTES), dekAad(workspaceId));
    },
    encryptSecret({ workspaceId, wrappedDek, context, plaintext }) {
      const dek = unwrapDek(workspaceId, wrappedDek);
      return seal(dek, Buffer.from(plaintext, "utf8"), secretAad(workspaceId, context));
    },
    decryptSecret({ workspaceId, wrappedDek, context, ciphertext }) {
      const dek = unwrapDek(workspaceId, wrappedDek);
      return open(dek, ciphertext, secretAad(workspaceId, context)).toString("utf8");
    },
  };
}
