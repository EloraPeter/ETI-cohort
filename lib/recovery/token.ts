import "server-only";
import crypto from "crypto";

/** 30 minutes — long enough to check email, short enough to matter if leaked. */
export const RECOVERY_TOKEN_TTL_MS = 30 * 60 * 1000;

/** 32 bytes (256 bits) of randomness, hex-encoded for a URL-safe token. */
export function generateRecoveryToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** The only form of the token that's ever written to the database. */
export function hashRecoveryToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function isRecoveryTokenExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() < Date.now();
}

export function recoveryTokenExpiryTimestamp(): string {
  return new Date(Date.now() + RECOVERY_TOKEN_TTL_MS).toISOString();
}
