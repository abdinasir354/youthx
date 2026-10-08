import "server-only";
import { headers } from "next/headers";
import { createAdminClient, serviceRoleKey } from "@/lib/supabase/admin";

// Fallback for when the service role key is not configured (local dev). Per-instance only.
const memory = new Map<string, { start: number; hits: number }>();

async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

/**
 * Simple IP-based limiter for public forms. Returns true when the request is allowed.
 * Backed by the `rate_limits` table (service role only) so limits hold across serverless instances.
 */
export async function rateLimit(bucket: string, max = 5, windowSeconds = 600): Promise<boolean> {
  const key = `${bucket}:${await clientIp()}`;
  if (serviceRoleKey()) {
    try {
      const { data, error } = await createAdminClient().rpc("check_rate_limit", {
        p_key: key,
        p_max: max,
        p_window_seconds: windowSeconds,
      });
      if (!error) return Boolean(data);
    } catch {
      // fall through to memory limiter
    }
  }
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now - entry.start > windowSeconds * 1000) {
    memory.set(key, { start: now, hits: 1 });
    return true;
  }
  entry.hits++;
  return entry.hits <= max;
}

/**
 * Failure-only limiter for sign-in forms: correct logins never use up attempts.
 *   if (!(await canAttempt(...))) → too many;  on wrong password → recordFailure(...);  on success → clearFailures(...)
 * Keyed by IP + account, so one person's typos don't lock out everyone behind the same network.
 */
async function failureKey(bucket: string, account: string) {
  return `${bucket}:${await clientIp()}:${account.trim().toLowerCase()}`;
}

export async function canAttempt(bucket: string, account: string, max: number, windowSeconds: number): Promise<boolean> {
  const key = await failureKey(bucket, account);
  if (serviceRoleKey()) {
    try {
      const { data, error } = await createAdminClient().rpc("peek_rate_limit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
      if (!error) return Boolean(data);
    } catch {
      // fall through to memory limiter
    }
  }
  const entry = memory.get(key);
  return !entry || Date.now() - entry.start > windowSeconds * 1000 || entry.hits < max;
}

export async function recordFailure(bucket: string, account: string, windowSeconds: number) {
  const key = await failureKey(bucket, account);
  if (serviceRoleKey()) {
    try {
      const { error } = await createAdminClient().rpc("check_rate_limit", { p_key: key, p_max: 1_000_000, p_window_seconds: windowSeconds });
      if (!error) return;
    } catch {
      // fall through to memory limiter
    }
  }
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || now - entry.start > windowSeconds * 1000) memory.set(key, { start: now, hits: 1 });
  else entry.hits++;
}

export async function clearFailures(bucket: string, account: string) {
  const key = await failureKey(bucket, account);
  memory.delete(key);
  if (serviceRoleKey()) {
    try {
      await createAdminClient().rpc("clear_rate_limit", { p_key: key });
    } catch {
      // nothing to clear
    }
  }
}

/** Honeypot: real users never fill the hidden "website" field. */
export function isBot(input: { website?: string | null }) {
  return Boolean(input.website && input.website.trim().length > 0);
}
