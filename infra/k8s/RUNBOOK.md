# Runbook: Ingress-NGINX + cert-manager + staging hello-world on Vultr

Applies issue #20's Track 1 bootstrap subset for ingress and TLS. Follow
the steps in order. Each step has one command and one expected result.

Do not skip step 2 before step 6. The ClusterIssuers register ACME
accounts only after cert-manager runs.

## Prerequisites

- A Vultr Kubernetes cluster exists.
- `helm` v3 is installed locally.
- `kubectl` points at the Vultr cluster.
- You own a DNS zone for `lingo.yourdomain.com`.
- The sibling modules are applied first: `infra/k8s/base/namespaces/`,
  `infra/k8s/base/rbac/`, `infra/k8s/base/networkpolicies/`.

Replace every occurrence of `lingo.yourdomain.com` in this runbook and in
`infra/k8s/base/cert-manager/*.yaml` with your real domain before you
apply anything. The ACME `email:` fields need a mailbox you read.

## 1. Confirm cluster access

Run:

```sh
kubectl get nodes
```

Expected result: one or more nodes print with `STATUS` `Ready`.

## 2. Install cert-manager

```sh
helm repo add jetstack https://charts.jetstack.io && helm repo update
helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  -f infra/k8s/base/cert-manager/values.yaml
kubectl wait --for=condition=Available deploy -n cert-manager --all --timeout=180s
```

Expected result: each line ends with `condition met`, and three
deployments report `deployment.cert-manager/cert-manager condition met`
plus `cainjector` and `webhook`.

## 3. Register the ClusterIssuers

```sh
kubectl apply -k infra/k8s/base/cert-manager
kubectl get clusterissuers
```

Expected result: `letsencrypt-prod` and `letsencrypt-staging` both show
`READY` `True`. If they show `False`, run
`kubectl describe clusterissuer letsencrypt-staging` and fix the reported
ACME registration error before continuing.

## 4. Install ingress-nginx

```sh
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx && helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  -f infra/k8s/base/ingress/values.yaml
kubectl wait --for=condition=Available deploy -n ingress-nginx ingress-nginx-controller --timeout=300s
```

Expected result: `deployment.ingress-nginx/ingress-nginx-controller
condition met`.

## 5. Get the load balancer IP and point DNS at it

Run:

```sh
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

Expected result: the `EXTERNAL-IP` column shows an address, not
`<pending>`.

Create a DNS `A` record for `staging.lingo.yourdomain.com` pointing at
that address. Wait until resolution works:

```sh
dig +short staging.lingo.yourdomain.com
```

Expected result: the same IP address prints. Let's Encrypt fails
HTTP-01 validation without working DNS, so do not continue early.

## 6. Apply the staging overlay

This creates the hello-world Deployment, Service, Ingress, Certificate,
and NetworkPolicy in `lingo-staging`. It assumes the namespaces module
already created `lingo-staging`; verify first:

```sh
kubectl get ns lingo-staging
```

Expected result: the namespace prints with `STATUS` `Active`.

Then apply:

```sh
kubectl apply -k infra/k8s/overlays/staging
```

Expected result: seven lines print, each ending `created` or
`unchanged`, including `clusterissuer.cert-manager.io/
letsencrypt-staging configured`.

## 7. Verify the hello-world pod serves through the ingress

Wait for the rollout:

```sh
kubectl rollout status deploy/hello-world -n lingo-staging
```

Expected result: `successfully rolled out`.

Check the Ingress got an address from the controller:

```sh
kubectl get ingress hello-ingress -n lingo-staging
```

Expected result: `ADDRESS` shows the load balancer IP and `PORTS` shows
`80, 443`.

## 8. Verify the certificate issues

Watch until the Certificate is ready:

```sh
kubectl get certificate lingo-tls-cert -n lingo-staging --watch
```

Expected result: `READY` flips to `True` within about 2 minutes. Press
Ctrl-C once it does.

If it stays `False`: `kubectl describe certificate lingo-tls-cert -n
lingo-staging` and `kubectl get challenges -n lingo-staging` show why.
The most common cause is step 5 DNS not resolving publicly yet.

Confirm the secret exists:

```sh
kubectl get secret lingo-tls-cert -n lingo-staging
```

Expected result: a secret of type `kubernetes.io/tls` prints.

## 9. Verify HTTPS end to end

Let's Encrypt **staging** certificates chain to a root your OS does not
trust by design. Use `-k` here. Trust warnings disappear once workloads
move to the prod issuer.

```sh
curl -sk https://staging.lingo.yourdomain.com | head -n 5
curl -svk https://staging.lingo.yourdomain.com 2>&1 | grep -E 'issuer|subject'
```

Expected result: the first command prints a `traefik/whoami` response
starting with `Hostname:`. The second shows
`issuer:/C=US/O=Let's Encrypt/CN=E5 or R3 (STAGING)` style output
containing `STAGING`.

## 10. Verify audio-sized uploads pass (no HTTP 413)

Create a 20 MB test payload and push it through the ingress:

```sh
dd if=/dev/urandom of=/tmp/opencode/upload-20m.bin bs=1048576 count=20
curl -sk -o /dev/null -w '%{http_code}\n' \
  -X POST --data-binary @/tmp/opencode/upload-20m.bin \
  https://staging.lingo.yourdomain.com/
rm /tmp/opencode/upload-20m.bin
```

Expected result: `200` prints. `413` means the proxy-body-size tuning in
`infra/k8s/base/ingress/values.yaml` did not reach the controller;
re-run the helm command in step 4.

## 11. Verify real client IP forwarding

```sh
curl -sk https://staging.lingo.yourdomain.com | grep X-Forwarded-For
```

Expected result: a line containing your public IP address prints.

## Tear down the smoke test

When the Phase 3 worker deploys, remove the proof app so the worker owns
the route:

Delete only the smoke-test resources by name:

```sh
kubectl delete -n lingo-staging \
  ingress/hello-ingress certificate/lingo-tls-cert \
  deploy/hello-world svc/hello-service networkpolicy/allow-ingress-to-hello
```

Expected result: five lines print, each ending `deleted`. The
ClusterIssuers are not in this command and stay installed because the
worker's future Ingress consumes them too.
