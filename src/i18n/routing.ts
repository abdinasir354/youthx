import { defineRouting } from "next-intl/routing";

/**
 * English only for now. Somali translations are kept in messages/so.json — to switch Somali
 * back on, add "so" to `locales` (the language switcher appears automatically).
 */
export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
