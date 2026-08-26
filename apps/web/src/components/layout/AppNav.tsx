"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const links = [
  { href: "/home", label: "Home" },
  { href: "/review", label: "Review" },
  { href: "/decks", label: "Decks" },
  { href: "/phrasebook", label: "Phrasebook" },
  { href: "/dictionary", label: "Dictionary" },
  { href: "/roleplay", label: "Roleplay" },
  { href: "/submissions", label: "Submissions" },
  { href: "/profile", label: "Profile" },
] as const;

/** Primary navigation for the authenticated app. Highlights the active section. */
export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main">
      <ul className="flex flex-wrap items-center gap-1">
        {links.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "focus-visible:ring-ring rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
