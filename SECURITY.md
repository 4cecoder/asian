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
- **Auth and login data specifically** — user identities, sessions,
  credentials, OAuth tokens. This is the highest-sensitivity category of
  "Convex data" and gets the same treatment as any other Convex data:
  never in the repo, never in a screenshot in an issue/PR, full stop.

## Where secrets actually live

Two places, chosen by which system needs them at runtime — never a third
place (no `.env` files committed, no secrets pasted into issues/PRs/commit
messages):

- **Convex-side runtime secrets** (API keys Convex functions call out
  with, auth provider secrets, anything the Convex deployment itself
  needs to execute) — set via the Convex CLI, `bunx convex env set KEY
value`, scoped per deployment (dev/preview/prod are separate Convex
  deployments with separate env vars).
  **`bunx convex env list` prints full values, not just key names** —
  learned the hard way setting up auth (a freshly-generated dev signing
  key ended up in a session transcript and had to be rotated
  immediately). Never run it where the output gets logged, screen-shared,
  or pasted anywhere. To check _which_ keys are set without their
  values: `bunx convex env list | cut -d= -f1`.
- **CI/CD and cross-service secrets** (`CONVEX_DEPLOY_KEY`,
  `NETLIFY_AUTH_TOKEN`, anything GitHub Actions or Netlify's build needs)
  — set via `gh secret set KEY --repo 4cecoder/asian`, consumed in
  workflows as `${{ secrets.KEY }}`. `gh secret list` to audit.

If a value is needed in both places, set it in both explicitly — don't
try to make one system read the other's store implicitly; that's exactly
the kind of "clever" indirection that makes an incident response take
longer, not shorter.

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
