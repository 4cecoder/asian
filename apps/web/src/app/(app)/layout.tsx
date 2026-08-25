import { AppShell } from "@/components/layout/AppShell";

/**
 * Authenticated end-user product group. Route protection lives in
 * src/proxy.ts (createRouteMatcher + isAuthenticated) — see the note in
 * AppShell for why layouts don't gate.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
