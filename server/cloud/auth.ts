import { createHash, createHmac, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const passwordKeyLength = 64;

export const sessionDays = 30;
export const claimDays = 30;

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = await scrypt(password, salt, passwordKeyLength);
  return {
    salt,
    hash: Buffer.from(key as Buffer).toString("hex")
  };
}

export async function verifyPassword(password: string, salt: string, expectedHash: string) {
  const key = await scrypt(password, salt, passwordKeyLength);
  const actual = Buffer.from(key as Buffer);
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSessionToken() {
  return `${randomUUID()}${randomUUID()}`.replaceAll("-", "");
}

export function createClaimToken() {
  return randomBytes(24).toString("base64url");
}

export function hashToken(token: string, secret = authSecret()) {
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function publicFingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

export function expiresAt(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function authSecret() {
  return process.env.MORDHEIM_AUTH_SECRET || "mordheim-local-dev-secret";
}
