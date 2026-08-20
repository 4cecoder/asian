# Security & data policy

## Repo visibility

This repo is **public**, with one deliberate carve-out: **Convex
deployment data**. Everything else — source code, the full 1,000-task
knowledge base, CI/CD config, infra manifests — is meant to be public.

## What "except the Convex data" means in practice

Public and fine:

- Convex **schema and function code** once Track 8 is implemented
  (`convex/schema.ts`, `convex/*.ts` query/mutation definitions) — this is
  source code, not data.
- The Track 8 knowledge-base pages describing the schema design.

Never commit, and gitignored accordingly (see `.gitignore`):

- `convex/_generated/` — generated bindings tied to a specific deployment.
- `.convex/` and any local dev database state.
- Convex deploy keys, admin keys, or deployment URLs — these go in
  Netlify/GitHub Actions environment variables (`CONVEX_DEPLOY_KEY`,
  `NEXT_PUBLIC_CONVEX_URL`), never in a file tracked by git.
- Any exported user data, seed data with real user content, or database
  dumps. Synthetic/example seed data for tests is fine; anything that
  could be real user data is not.

## If a secret leaks anyway

1. Rotate it immediately at the source (Convex dashboard, Netlify, GitHub
   settings) — assume it's compromised the moment it's pushed, even to a
   private branch.
2. Force-pushing to rewrite history does **not** remove it from anyone
   who already fetched — rotation is the only real fix.
3. Open an issue (can be minimal/redacted) so there's a record of when
   rotation happened.

## Reporting a vulnerability

Open a private security advisory via GitHub
(Security tab → "Report a vulnerability") rather than a public issue.
