import { Logo } from "@/components/layout/logo";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export default function AuthLayout({ children }: LayoutProps<"/[locale]">) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-secondary-soft via-white to-primary-soft">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-5">
        <Logo preload />
        <LanguageSwitcher />
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-4 sm:items-center">
        <div className="w-full max-w-md rounded-3xl border border-border bg-white p-6 shadow-xl sm:p-8">{children}</div>
      </main>
    </div>
  );
}
