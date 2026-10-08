import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Seats split by the foundation's women-first rule. Mirrors the SQL in accept_application(). */
export function seatSplit(capacity: number | null, femaleRatio = 0.75) {
  if (capacity == null) return null;
  const female = Math.ceil(capacity * femaleRatio);
  return { female, male: capacity - female };
}

export function ageFromDob(dob: string | null | undefined, now = new Date()) {
  if (!dob) return null;
  const d = new Date(dob);
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

export function ageGroup(age: number | null) {
  if (age == null) return "unknown";
  if (age < 18) return "15-17";
  if (age < 25) return "18-24";
  if (age < 30) return "25-29";
  return "30-35";
}

export function formatDate(value: string | null | undefined, locale = "en") {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale === "so" ? "so-SO" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Mogadishu",
  }).format(new Date(value));
}

/** True when the deadline has passed. Only call from request-time (dynamic) code. */
export function isPastDeadline(deadline: string | null | undefined) {
  return deadline != null && new Date(deadline).getTime() < Date.now();
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : Array.isArray(v) ? v.join("; ") : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
}
