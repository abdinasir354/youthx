import type { Perm } from "@/lib/permissions";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: string;
  perm?: Perm;
  exact?: boolean;
  /** Other paths that should highlight this item (pages shown as tabs under it). */
  match?: string[];
};
export type AdminNavGroup = { label: string; items: AdminNavItem[]; collapsible?: boolean };

/**
 * Admin sidebar: the everyday items first, the rarely used ones folded under "More".
 * Items are hidden for roles without the permission (every page re-checks on the server).
 */
export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: "",
    items: [
      { href: "/admin", label: "Dashboard", icon: "layout-dashboard", exact: true },
      { href: "/admin/pages", label: "Pages", icon: "file-text", perm: "content" },
      { href: "/admin/programs", label: "Programs", icon: "graduation-cap", perm: "programs", match: ["/admin/program-categories"] },
      { href: "/admin/opportunities", label: "Opportunities", icon: "briefcase", perm: "programs" },
      { href: "/admin/events", label: "Events", icon: "calendar", perm: "programs" },
      { href: "/admin/projects", label: "Projects", icon: "folder-kanban", perm: "content" },
      { href: "/admin/resources", label: "Resources", icon: "book-open", perm: "content", match: ["/admin/resource-categories"] },
      { href: "/admin/stories", label: "Stories", icon: "quote", perm: "content" },
      { href: "/admin/posts", label: "Blog", icon: "newspaper", perm: "content" },
      { href: "/admin/volunteers", label: "Applications", icon: "file-check", perm: "people", match: ["/admin/mentorship"] },
      { href: "/admin/messages", label: "Messages", icon: "mail", perm: "inbox", match: ["/admin/partner-requests"] },
      { href: "/admin/media", label: "Media", icon: "images", perm: "media" },
      { href: "/admin/settings", label: "Settings", icon: "settings", perm: "site", match: ["/admin/navigation", "/admin/seo"] },
      { href: "/admin/users", label: "Users", icon: "user-cog", perm: "people" },
    ],
  },
  {
    label: "More",
    collapsible: true,
    items: [
      { href: "/admin/faqs", label: "FAQs", icon: "circle-help", perm: "content" },
      { href: "/admin/partners", label: "Partner logos", icon: "handshake", perm: "content" },
      { href: "/admin/donations", label: "Donations", icon: "heart-handshake", perm: "inbox" },
      { href: "/admin/newsletter", label: "Newsletter", icon: "send", perm: "inbox" },
      { href: "/admin/audit", label: "Audit log", icon: "scroll-text", perm: "settings" },
    ],
  },
];

export type AdminTab = { href: string; label: string; perm: Perm };

/** Pages grouped under one sidebar item, shown as tabs. */
export const APPLICATION_TABS: AdminTab[] = [
  { href: "/admin/volunteers", label: "Volunteers", perm: "people" },
  { href: "/admin/mentorship", label: "Mentors", perm: "people" },
];
export const MESSAGE_TABS: AdminTab[] = [
  { href: "/admin/messages", label: "Contact messages", perm: "inbox" },
  { href: "/admin/partner-requests", label: "Partner & sponsor requests", perm: "inbox" },
];
export const SETTINGS_TABS: AdminTab[] = [
  { href: "/admin/settings", label: "Site settings", perm: "settings" },
  { href: "/admin/navigation", label: "Navigation", perm: "site" },
  { href: "/admin/seo", label: "SEO", perm: "site" },
];
