import Link from "next/link";

/**
 * Chrome for the public (marketing) group: minimal nav plus footer, no
 * app navigation.
 */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-heading text-base font-semibold tracking-tight">
            Asian
          </Link>
          <nav aria-label="Marketing" className="flex items-center gap-4 text-sm font-medium">
            <Link href="/sign-in" className="text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="bg-primary text-primary-foreground hover:bg-primary/80 rounded-lg px-3 py-1.5"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t">
        <div className="text-muted-foreground mx-auto w-full max-w-5xl px-4 py-6 text-sm">
          Asian — situational fluency for JA, KO, ZH, TH, and VI.
        </div>
      </footer>
    </div>
  );
}
