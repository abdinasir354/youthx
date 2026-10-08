import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { AdminLoginForm } from "@/components/forms/auth-forms";

// Hidden back-office sign-in (see ADMIN_LOGIN_PATH). Not linked from the site, kept out of
// search engines and the sitemap. The URL is not the protection — Supabase Auth, the
// admin_users role check and RLS are.
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted px-4 py-12">
      <main id="main" className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-lg border border-border bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6 flex items-center gap-2">
            <ShieldCheck className="size-5 text-secondary" aria-hidden />
            <h1 className="text-lg font-bold text-secondary">Admin sign in</h1>
          </div>
          <AdminLoginForm />
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">Authorized YouthX Foundation staff only.</p>
      </main>
    </div>
  );
}
