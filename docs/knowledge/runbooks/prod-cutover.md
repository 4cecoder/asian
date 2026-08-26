---
okf_version: "0.2"
package_id: prod-cutover-runbook
title: "Runbook: Production Cutover (issue #25)"
track: meta
status: draft
stale_after: 2027-08-25
tags: [runbook, production, convex, netlify, k8s, github-actions]
related: [track-08-convex-db, t02-cd-rollout-rollbacks, adr-0005-community-ingestion-pipeline]
---

# Runbook: Production Cutover (issue #25)

Takes the platform from shared-dev-only to a real production backend:
a dedicated prod Convex deployment, GitHub secrets for CI-driven deploys,
Netlify's production context repointed at prod, and the Python worker
running on the Kubernetes cluster behind trusted TLS.

Follow the steps in order. Each step has one command and one expected
result. A human runs every step that handles credential values.

**Status is `draft` on purpose:** every command below is written and
statically validated, but no human has executed a full cutover yet. After
one successful run, fix anything this runbook got wrong and change
`status` to `stable`.

## Prerequisites

- The staging bootstrap from `infra/k8s/RUNBOOK.md` steps 1–5 is done:
  cert-manager installed, both ClusterIssuers `READY True`, ingress-nginx
  running with an external IP.
- `kubectl` points at the Vultr cluster.
- `gh` is installed and logged in.
- `bun` is installed.
- You own the DNS zone for `lingo.yourdomain.com`.
- Read `SECURITY.md` "Where secrets actually live" before touching any
  secret: Convex runtime secrets go through `bunx convex env set`; CI/CD
  secrets go through `gh secret set`. Never commit a `.env`.

Replace every occurrence of `lingo.yourdomain.com` in this runbook and in
`infra/k8s/overlays/prod/*.yaml` with your real domain before applying
anything. Substitute `<prod-name>` (step 3 output), `<worker-secret>`
(steps 4, 5, 8), and `<sha-tag>` (steps 9, 12) once you have their real
values.

## 1. Confirm cluster access

Run:

```sh
kubectl get nodes
```

Expected result: one or more nodes print with `STATUS` `Ready`.

## 2. Log the Convex CLI in

Run:

```sh
cd apps/web && bunx convex login
```

Expected result: a browser opens; after approving, the terminal prints a
success message naming your account.

## 3. Create the production Convex deployment

Run from `apps/web`:

```sh
bunx convex deploy --prod
```

Expected result: the first run prompts for team and project selection
(pick the same team/project as dev, `asian`), then prints a new
**production** deployment name plus its URLs — record all three:

- `<prod-name>` (deployment name)
- `https://<prod-name>.convex.cloud` (queries/mutations/auth)
- `https://<prod-name>.convex.site` (HTTP actions)

Later runs print the existing values instead of prompting. This
deployment starts empty — it shares nothing with `bytecats:asian:dev`,
which stays untouched for dev and previews ([[track-08-convex-db]]).

## 4. Generate the worker secret value

Run:

```sh
openssl rand -hex 32
```

Expected result: 64 hexadecimal characters print. Save this value in a
password manager now. Steps 5 and 8 both need it; they must receive the
same value or the worker↔Convex ingestion loop fails auth
([[adr-0005-community-ingestion-pipeline]]).

## 5. Set WORKER_SECRET on the prod deployment

Run from `apps/web`, substituting the step 4 value:

```sh
bunx convex env set WORKER_SECRET <worker-secret> --prod
```

Expected result: the CLI confirms the variable was set on the production
deployment.

## 6. Verify Convex env keys exist — without printing values

Run:

```sh
bunx convex env list --prod | cut -d= -f1
```

Expected result: key **names only** print, including `WORKER_SECRET`.
Do not run plain `bunx convex env list`: it prints full values, and
SECURITY.md records a past incident where exactly that leaked a signing
key into a transcript.

## 7. Set the three GitHub Actions secrets

Values are supplied interactively by you; paste each when prompted.

Convex production deploy key — copy it from
`https://dashboard.convex.dev` → project `asian` → Settings → Deploy keys
(use the **production** key):

```sh
gh secret set CONVEX_DEPLOY_KEY --repo 4cecoder/asian
```

Netlify personal access token — create it at Netlify → User settings →
Applications → Personal access tokens:

```sh
gh secret set NETLIFY_AUTH_TOKEN --repo 4cecoder/asian
```

Netlify site API ID — from Netlify → Site configuration → Site
information → Site ID:

```sh
gh secret set NETLIFY_SITE_ID --repo 4cecoder/asian
```

Expected result for each: the prompt accepts stdin silently. Verify all
three landed:

```sh
gh secret list --repo 4cecoder/asian
```

Expected result: `CONVEX_DEPLOY_KEY`, `NETLIFY_AUTH_TOKEN`, and
`NETLIFY_SITE_ID` each appear with an updated timestamp.

## 8. Create the worker's Kubernetes secret

This is the worker-side half of the pair from step 5, plus its own
signing key. Run, substituting the step 4 value and the step 3
`.convex.site` URL:

```sh
kubectl -n lingo-prod create secret generic lingo-worker-env \
  --from-literal=ENVIRONMENT=production \
  --from-literal=SECURITY__SECRET_KEY="$(openssl rand -hex 32)" \
  --from-literal=CONVEX__BASE_URL="https://<prod-name>.convex.site" \
  --from-literal=CONVEX__WORKER_SECRET="<worker-secret>"
```

Expected result: `secret/lingo-worker-env created`. The Deployment in
`infra/k8s/overlays/prod/worker-deployment.yaml` mounts exactly these
four keys via `envFrom`; the app refuses to boot in production if
`SECURITY__SECRET_KEY` or `CONVEX__WORKER_SECRET` is missing
(`apps/worker/app/settings.py`). Confirm key names without decoding
values:

```sh
kubectl -n lingo-prod get secret lingo-worker-env \
  -o go-template='{{range $k,$_ := .data}}{{printf "%s\n" $k}}{{end}}'
```

Expected result: `CONVEX__BASE_URL`, `CONVEX__WORKER_SECRET`,
`ENVIRONMENT`, `SECURITY__SECRET_KEY` print — names only.

## 9. Build and push the worker image

Run:

```sh
gh workflow run worker-deploy-prod.yml --ref main --repo 4cecoder/asian
```

Expected result: the command exits 0. Watch it finish:

```sh
gh run watch --repo 4cecoder/asian $(gh run list --workflow=worker-deploy-prod.yml --repo 4cecoder/asian --limit 1 --json databaseId -q '.[0].databaseId')
```

Expected result: the run reaches `completed` / `success`, including the
`/healthz` smoke test step. Record the image tag: it is the short SHA of
the commit the workflow ran against —

```sh
git rev-parse --short origin/main
```

Expected result: e.g. `1a2b3c4` prints; the image tag is `sha-1a2b3c4`
(`<sha-tag>`). Tag pushes (`v*`) also produce semver tags via the same
workflow. GHCR needs no extra credentials — the workflow uses the
built-in `GITHUB_TOKEN` with `packages: write`.

## 10. Point Netlify's production context at prod

These are public URLs, not secrets. Export the token once so the CLI
runs non-interactively:

```sh
export NETLIFY_AUTH_TOKEN="<value from step 7>"
bunx netlify-cli env:set NEXT_PUBLIC_CONVEX_URL "https://<prod-name>.convex.cloud" --context production
bunx netlify-cli env:set NEXT_PUBLIC_CONVEX_SITE_URL "https://<prod-name>.convex.site" --context production
```

Expected result: each command reports the variable was set for the
production context. Verify both sides of the split — prod flipped, dev
preserved:

```sh
bunx netlify-cli env:list --context production
bunx netlify-cli env:list --context deploy-preview
```

Expected result: the production listing shows the `<prod-name>` URLs for
both variables; the deploy-preview listing still shows the dev
deployment URLs (`fearless-gull-12`). Previews keep testing against dev,
per issue #25's scope.

## 11. Point DNS at the ingress

Get the load balancer address:

```sh
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

Expected result: the `EXTERNAL-IP` column shows an address, not
`<pending>`.

Create a DNS `A` record for `lingo.yourdomain.com` pointing at that
address. Wait for resolution:

```sh
dig +short lingo.yourdomain.com
```

Expected result: the same IP address prints. HTTP-01 validation fails
without working DNS, so do not continue early.

## 12. Pin the image tag in the prod overlay

Edit `infra/k8s/overlays/prod/kustomization.yaml`: replace
`REPLACE_WITH_SHA_TAG` with the `<sha-tag>` recorded in step 9. Verify
the pin took:

```sh
kubectl kustomize infra/k8s/overlays/prod | grep "image: ghcr.io/4cecoder/asian/lingo-worker"
```

Expected result: one line prints, ending `:sha-<your-sha-tag>`.

## 13. Confirm the lingo-prod namespace exists

Run:

```sh
kubectl get ns lingo-prod
```

Expected result: the namespace prints with `STATUS` `Active`. If it does
not exist yet, apply the sibling module first —
`kubectl apply -k infra/k8s/base/namespaces` — and re-run the check
until `Active` prints.

## 14. Apply the production overlay

Blast radius: this creates the real production Deployment, Service,
Ingress, Certificate, and ServiceAccount, and re-registers the
letsencrypt-prod ClusterIssuer. Nothing here touches lingo-staging or
the dev deployment.

Run:

```sh
kubectl apply -k infra/k8s/overlays/prod
```

Expected result: seven lines print, each ending `created`, `configured`,
or `unchanged` — including `clusterissuer.cert-manager.io/
letsencrypt-prod configured` and `deployment.apps/lingo-worker created`.
Wait for the rollout:

```sh
kubectl rollout status deploy/lingo-worker -n lingo-prod
```

Expected result: `successfully rolled out`. If pods sit unready, run
`kubectl describe pod -n lingo-prod -l app=lingo-worker` — the most
common causes are a misspelled secret key name (step 8) or the image tag
pin not matching what step 9 pushed.

## 15. Verify the TLS certificate issues

Watch until ready:

```sh
kubectl get certificate lingo-tls-cert -n lingo-prod --watch
```

Expected result: `READY` flips to `True` within about 2 minutes. Press
Ctrl-C once it does. If it stays `False`, diagnose with
`kubectl describe certificate lingo-tls-cert -n lingo-prod` and
`kubectl get challenges -n lingo-prod` (usually step 11 DNS). Do not
delete-and-recreate repeatedly: the letsencrypt-prod issuer allows only
5 duplicate certificates per week.

## 16. Verify the health checks through the ingress with valid TLS

No `-k` flag anywhere in this step — production certs must chain to a
trusted root. That is the point.

```sh
curl -sS https://lingo.yourdomain.com/healthz
curl -sS https://lingo.yourdomain.com/readyz
curl -sS https://lingo.yourdomain.com/livez
curl -sv https://lingo.yourdomain.com/healthz 2>&1 | grep -E 'issuer|subject'
```

Expected result: the first three commands each return HTTP 200 JSON with
`"status":"ok"` (`/readyz` also lists its dependency checks). The last
shows an `issuer:` line containing `Let's Encrypt` **without** the word
`STAGING` — that satisfies issue #25's acceptance criterion "Worker
health check reachable from the production ingress with valid TLS".
Anything other than `/healthz`, `/readyz`, `/livez` must return 404 from
the ingress: `/internal/*` routes stay cluster-internal until an auth
story exists for them (apps/worker/README.md).

## 17. Verify signup writes to prod — and only prod

This covers issue #25's first two acceptance criteria.

Sign up a brand-new account through the web app on your production
Netlify domain. Then open the data browser for the **prod** deployment:
`https://dashboard.convex.dev/d/<team>/asian/<prod-name>/data`.

Expected result: the auth users table contains the account you just
created, with today's timestamp.

Open the data browser for the **dev** deployment
(`bytecats:asian:dev`) the same way.

Expected result: the account you just created does **not** appear there,
and the pre-existing dev-only test accounts do **not** appear in prod.
Dev and prod are verifiably separate.

If signup itself errors, check the Netlify function logs first — the
most common cause is step 10's production-context variable not actually
applied (a deploy made before the flip still carries old values;
re-deploy and retry).

## 18. Close out the cutover

1. Tick issue #25's acceptance criteria boxes with links to the evidence
   you just produced (curl outputs, dashboard observations).
2. Decide CI's e2e target: `vars.NEXT_PUBLIC_CONVEX_URL` still points at
   dev on purpose. Leave it unless/until per-PR preview deployments
   (`convex deploy --preview-create`) land — record the decision on the
   issue either way.
3. From now on, shipping web changes to production means pushing a
   `v*` tag (or running `web-deploy-prod.yml` via dispatch). Worker image
   rebuilds go through `worker-deploy-prod.yml`, followed by updating the
   `newTag:` pin in `infra/k8s/overlays/prod/kustomization.yaml`
   (step 12) and re-applying the overlay (step 14).
4. Change this file's frontmatter `status` from `draft` to `stable` and
   note any corrections made along the way.

## Related

- [[track-08-convex-db]] — the dev deployment this cuts over from.
- [[t02-cd-rollout-rollbacks]] — the CD conventions the two workflows follow.
- [[adr-0005-community-ingestion-pipeline]] — why WORKER_SECRET must match on both sides.
