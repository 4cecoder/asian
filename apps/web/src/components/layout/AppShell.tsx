import Link from "next/link";

import { AppNav } from "@/components/layout/AppNav";

/**
 * Chrome for the authenticated (app) group. Auth gating itself lives in
 * src/proxy.ts — layouts must not gate (@convex-dev/auth warns layout
 * checks don't stop nested pages from rendering).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/home" className="font-heading text-base font-semibold tracking-tight">
            Asian
          </Link>
          <AppNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
