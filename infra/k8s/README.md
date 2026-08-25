# infra/k8s

Kubernetes manifests for the Vultr cluster (issue #20, Track 1).

## Apply order

1. Apply the Namespace manifests first.
2. Apply the ResourceQuota and LimitRange manifests.

The quotas and limit ranges target `lingo-prod` and `lingo-staging`.
They fail if the namespaces do not exist yet.

```sh
kubectl apply -f infra/k8s/base/namespaces/namespace-lingo-prod.yaml
kubectl apply -f infra/k8s/base/namespaces/namespace-lingo-staging.yaml
kubectl apply -f infra/k8s/base/namespaces/resourcequota-lingo-prod.yaml
kubectl apply -f infra/k8s/base/namespaces/resourcequota-lingo-staging.yaml
kubectl apply -f infra/k8s/base/namespaces/limitrange-lingo-prod.yaml
kubectl apply -f infra/k8s/base/namespaces/limitrange-lingo-staging.yaml
```

## Validate without a cluster

`kubectl apply --dry-run=client` needs API discovery from a live server.
Without a cluster, validate structure instead:

```sh
for f in infra/k8s/base/namespaces/*.yaml; do
  kubectl create --dry-run=client --validate=false -f "$f" > /dev/null && echo "OK $f"
done
```

Run full `--dry-run=client` validation against the real cluster before the
first apply.
