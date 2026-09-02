import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE_NAME = "gpu_check_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;

export function isAuthConfigured(): boolean {
  return Boolean(process.env.SITE_USERNAME && process.env.SITE_PASSWORD);
}

function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a comparison of matching length so failure timing doesn't
    // leak the expected value's length.
    timingSafeEqual(bufB, bufB);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function checkCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.SITE_USERNAME;
  const expectedPass = process.env.SITE_PASSWORD;
  if (!expectedUser || !expectedPass) return false;

  return timingSafeEqualString(username, expectedUser) && timingSafeEqualString(password, expectedPass);
}

// The session cookie is signed with the site password itself, so rotating
// SITE_PASSWORD automatically invalidates every existing session.
function sign(payload: string): string {
  const secret = process.env.SITE_PASSWORD ?? "";
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function createSessionCookieValue(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

export function isValidSessionCookieValue(value: string | undefined): boolean {
  if (!value) return false;

  const [payload, signature] = value.split(".");
  if (!payload || !signature) return false;
  if (!timingSafeEqualString(signature, sign(payload))) return false;

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}
