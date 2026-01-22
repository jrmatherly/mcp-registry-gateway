# Kubernetes Operations Skill

Manage Kubernetes deployments for the MCP Gateway Registry using Helm charts and kubectl.

## Quick Reference

```bash
# Deploy stack
helm install mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway --create-namespace \
  --set global.domain=example.com

# Check status
kubectl get pods -n mcp-gateway
helm status mcp-stack -n mcp-gateway

# View logs
kubectl logs -n mcp-gateway deploy/mcp-stack-registry -f

# Upgrade
helm upgrade mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway \
  --set global.domain=example.com
```

## Available Charts

| Chart | Purpose | Location |
|-------|---------|----------|
| `mcp-gateway-registry-stack` | Full stack (umbrella) | `charts/mcp-gateway-registry-stack/` |
| `registry` | MCP Registry service | `charts/registry/` |
| `auth-server` | Authentication service | `charts/auth-server/` |
| `keycloak-configure` | Keycloak setup job | `charts/keycloak-configure/` |
| `mongodb-configure` | MongoDB setup job | `charts/mongodb-configure/` |

## Common Operations

### Deploy Full Stack

```bash
# 1. Update dependencies
helm dependency update charts/mcp-gateway-registry-stack

# 2. Lint
helm lint charts/mcp-gateway-registry-stack

# 3. Deploy
helm install mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway --create-namespace \
  --set global.domain=example.com \
  --set global.secretKey=your-secret \
  --wait --timeout=10m
```

### Deploy Individual Service

```bash
# Registry only
helm install registry charts/registry \
  --namespace mcp-gateway \
  --set global.image.tag=v1.0.12 \
  --set app.authServerUrl=http://auth-server:8888
```

### Upgrade Deployment

```bash
# View changes first
helm diff upgrade mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway

# Apply upgrade
helm upgrade mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway \
  --wait
```

### Rollback

```bash
# View history
helm history mcp-stack -n mcp-gateway

# Rollback
helm rollback mcp-stack -n mcp-gateway
```

### Scale Services

```bash
# Via kubectl
kubectl scale deployment -n mcp-gateway mcp-stack-registry --replicas=3

# Via Helm values
helm upgrade mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway \
  --set registry.app.replicas=3
```

### View Logs

```bash
# Registry logs
kubectl logs -n mcp-gateway deploy/mcp-stack-registry -f

# Auth server logs
kubectl logs -n mcp-gateway deploy/mcp-stack-auth-server -f

# All pods
kubectl logs -n mcp-gateway -l app.kubernetes.io/part-of=mcp-gateway --all-containers
```

### Debug Access

```bash
# Shell into pod
kubectl exec -it -n mcp-gateway deploy/mcp-stack-registry -- /bin/sh

# Port forward for local testing
kubectl port-forward -n mcp-gateway svc/mcp-stack-registry 8000:8000

# Test health endpoint
curl http://localhost:8000/health
```

### Check Status

```bash
# All resources
kubectl get all -n mcp-gateway

# Helm release
helm status mcp-stack -n mcp-gateway

# Events
kubectl get events -n mcp-gateway --sort-by='.lastTimestamp'

# Pod details
kubectl describe pod -n mcp-gateway -l app.kubernetes.io/name=registry
```

### Uninstall

```bash
# Uninstall release
helm uninstall mcp-stack -n mcp-gateway

# Delete namespace (if needed)
kubectl delete namespace mcp-gateway
```

## Troubleshooting

### Pod Not Starting

```bash
# Check events
kubectl describe pod -n mcp-gateway <pod-name> | grep -A 20 Events

# Check logs
kubectl logs -n mcp-gateway <pod-name> --previous

# Check resources
kubectl top pods -n mcp-gateway
```

### Service Not Accessible

```bash
# Check endpoints
kubectl get endpoints -n mcp-gateway

# Test DNS
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  nslookup mcp-stack-registry.mcp-gateway.svc.cluster.local

# Test connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -v http://mcp-stack-registry.mcp-gateway:8000/health
```

### Database Connection Issues

```bash
# Check MongoDB
kubectl logs -n mcp-gateway -l app.kubernetes.io/name=mongodb

# Test connection
kubectl run -it --rm mongo-test --image=mongo:7 --restart=Never -- \
  mongosh "mongodb://mcp-stack-mongodb:27017" --eval "db.adminCommand('ping')"
```

### Ingress Issues

```bash
# Check ingress
kubectl get ingress -n mcp-gateway
kubectl describe ingress -n mcp-gateway <ingress-name>

# Check ALB controller (EKS)
kubectl logs -n kube-system deploy/aws-load-balancer-controller
```

## Values Configuration

### Minimal Production Values

```yaml
global:
  domain: "example.com"
  secretKey: "production-secret-key"
  ingress:
    className: alb
    tls: true

registry:
  app:
    replicas: 2
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 2
      memory: 2Gi
  podDisruptionBudget:
    enabled: true
    minAvailable: 1
```

### Override Values

```bash
# Via command line
helm upgrade mcp-stack charts/mcp-gateway-registry-stack \
  --set global.domain=prod.example.com \
  --set registry.app.replicas=3

# Via values file
helm upgrade mcp-stack charts/mcp-gateway-registry-stack \
  -f values-production.yaml
```

## References

- [Helm Chart Patterns](references/helm-patterns.md)
- [Troubleshooting Guide](references/troubleshooting.md)
- [Charts README](../../../charts/README.md)
