/**
 * Guidance shown to editors inside the admin. Kept in one place so the public site can make sure
 * it never shows an entry whose content is just this guidance pasted into the fields.
 */
export const ADMIN_GUIDANCE = {
  slugHelp: "Lowercase letters, numbers and dashes. Changing it changes the page address.",
  draftNote: "New entries start as drafts. Nothing is public until you publish.",
} as const;

const GUIDANCE = new Set<string>(Object.values(ADMIN_GUIDANCE).map((s) => s.toLowerCase()));

/** True when a piece of text is (only) admin guidance, ignoring case, spacing and quote marks. */
export function isAdminGuidance(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.trim().replace(/^[“"'‘]+|[”"'’]+$/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  return GUIDANCE.has(t);
}
