import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Tests read .env.test.local first (point it at a local `supabase start` stack), then .env.local.
config({ path: [".env.test.local", ".env.local"], quiet: true });

export const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "";

export const dbConfigured = Boolean(URL && ANON && SERVICE);

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

/** Service-role client: bypasses RLS. Used only to build fixtures and clean up. */
export const service = () => createClient(URL, SERVICE, noSession);

/** Signed-out visitor. */
export const anon = () => createClient(URL, ANON, noSession);

export const tag = randomUUID().slice(0, 8);
const PASSWORD = `T3st-${randomUUID()}`;

export type TestUser = { id: string; email: string; client: SupabaseClient };

/** Creates a confirmed user with the given role/gender and returns a client signed in as them. */
export async function createUser(
  label: string,
  opts: { role?: "youth" | "mentor" | "partner" | "staff" | "admin"; gender?: "female" | "male" | null; signIn?: boolean } = {},
): Promise<TestUser> {
  const admin = service();
  const email = `rls-${tag}-${label}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: `Test ${label}` },
  });
  if (error || !data.user) throw new Error(`createUser ${label}: ${error?.message}`);
  const id = data.user.id;

  const { error: pErr } = await admin
    .from("profiles")
    .update({ role: opts.role ?? "youth", gender: opts.gender === undefined ? "female" : opts.gender, onboarded: true })
    .eq("id", id);
  if (pErr) throw new Error(`profile ${label}: ${pErr.message}`);

  const client = anon();
  if (opts.signIn !== false) {
    const { error: sErr } = await client.auth.signInWithPassword({ email, password: PASSWORD });
    if (sErr) throw new Error(`signIn ${label}: ${sErr.message}`);
  }
  return { id, email, client };
}

export async function deleteUsers(ids: string[]) {
  const admin = service();
  for (const id of ids) await admin.auth.admin.deleteUser(id);
}

/** Throws with a readable message when a fixture write fails. */
export function must<T>(res: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as NonNullable<T>;
}
