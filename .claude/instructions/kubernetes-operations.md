# Kubernetes Operations Guide

Best practices and operational patterns for Kubernetes deployments of the MCP Gateway Registry.

## Deployment Options

This project supports two Kubernetes deployment methods:

| Method | Location | Use Case |
|--------|----------|----------|
| **Helm Charts** | `charts/` | Production Kubernetes (EKS, GKE, AKS) |
| **Terraform ECS** | `terraform/aws-ecs/` | AWS-native serverless deployment |

---

## Helm Deployment Workflow

### Prerequisites

- Kubernetes cluster (EKS recommended)
- `kubectl` configured for cluster access
- `helm` v3.0+ installed
- Ingress controller (ALB, NGINX)
- DNS configured for your domain

### Standard Deployment

```bash
# 1. Update chart dependencies
helm dependency update charts/mcp-gateway-registry-stack

# 2. Lint before deploying
helm lint charts/mcp-gateway-registry-stack

# 3. Dry-run to verify
helm template mcp-stack charts/mcp-gateway-registry-stack \
  --set global.domain=example.com \
  --set global.secretKey=your-secret > /tmp/manifests.yaml

kubectl apply --dry-run=client -f /tmp/manifests.yaml

# 4. Deploy
helm install mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway --create-namespace \
  --set global.domain=example.com \
  --set global.secretKey=your-production-secret \
  --wait --timeout=10m

# 5. Verify deployment
kubectl get pods -n mcp-gateway
helm status mcp-stack -n mcp-gateway
```

### Upgrade Workflow

```bash
# 1. Review changes
helm diff upgrade mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway \
  --set global.domain=example.com

# 2. Apply upgrade
helm upgrade mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway \
  --set global.domain=example.com \
  --wait --timeout=10m

# 3. Verify
kubectl rollout status deployment/mcp-stack-registry -n mcp-gateway
```

### Rollback

```bash
# View history
helm history mcp-stack -n mcp-gateway

# Rollback to previous
helm rollback mcp-stack -n mcp-gateway

# Rollback to specific revision
helm rollback mcp-stack 2 -n mcp-gateway
```

---

## Cluster Operations

### Health Checks

```bash
# Cluster health
kubectl cluster-info
kubectl get nodes -o wide

# Namespace status
kubectl get all -n mcp-gateway

# Pod health
kubectl get pods -n mcp-gateway -o wide
kubectl top pods -n mcp-gateway

# Service endpoints
kubectl get endpoints -n mcp-gateway
```

### Log Analysis

```bash
# Pod logs
kubectl logs -n mcp-gateway deploy/mcp-stack-registry -f

# Previous container logs (after crash)
kubectl logs -n mcp-gateway deploy/mcp-stack-registry --previous

# All containers in pod
kubectl logs -n mcp-gateway <pod-name> --all-containers

# Logs with timestamps
kubectl logs -n mcp-gateway deploy/mcp-stack-registry --timestamps

# Last N lines
kubectl logs -n mcp-gateway deploy/mcp-stack-registry --tail=100
```

### Resource Management

```bash
# Resource usage
kubectl top nodes
kubectl top pods -n mcp-gateway

# Describe resource issues
kubectl describe pod -n mcp-gateway <pod-name> | grep -A 10 Events

# Check resource quotas
kubectl describe resourcequota -n mcp-gateway

# View limits
kubectl get limitrange -n mcp-gateway -o yaml
```

---

## Troubleshooting

### Pod Issues

| Symptom | Diagnosis | Resolution |
|---------|-----------|------------|
| `Pending` | Resource constraints | Check node capacity, PVC binding |
| `CrashLoopBackOff` | Container failing | Check logs, probe configuration |
| `ImagePullBackOff` | Image not found | Verify image tag, registry auth |
| `OOMKilled` | Memory exceeded | Increase memory limits |
| `Evicted` | Node pressure | Check node resources, add nodes |

### Debugging Commands

```bash
# Describe pod for events
kubectl describe pod -n mcp-gateway <pod-name>

# Get events sorted by time
kubectl get events -n mcp-gateway --sort-by='.lastTimestamp'

# Execute into running pod
kubectl exec -it -n mcp-gateway <pod-name> -- /bin/sh

# Port forward for local testing
kubectl port-forward -n mcp-gateway svc/mcp-stack-registry 8000:8000

# Check service DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  nslookup mcp-stack-registry.mcp-gateway.svc.cluster.local
```

### Network Issues

```bash
# Test service connectivity
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -v http://mcp-stack-registry.mcp-gateway.svc.cluster.local:8000/health

# Check network policies
kubectl get networkpolicies -n mcp-gateway -o yaml

# Verify ingress
kubectl get ingress -n mcp-gateway
kubectl describe ingress -n mcp-gateway <ingress-name>

# Check service endpoints
kubectl get endpoints -n mcp-gateway mcp-stack-registry
```

### Database Connectivity

```bash
# Test MongoDB connection
kubectl run -it --rm mongo-test --image=mongo:7 --restart=Never -- \
  mongosh "mongodb://mcp-stack-mongodb:27017" --eval "db.adminCommand('ping')"

# Check MongoDB pod
kubectl logs -n mcp-gateway -l app.kubernetes.io/name=mongodb -f

# Port forward MongoDB for local access
kubectl port-forward -n mcp-gateway svc/mcp-stack-mongodb 27017:27017
```

---

## Scaling

### Manual Scaling

```bash
# Scale deployment
kubectl scale deployment -n mcp-gateway mcp-stack-registry --replicas=3

# Scale via Helm
helm upgrade mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway \
  --set registry.app.replicas=3
```

### Horizontal Pod Autoscaler

```bash
# Check HPA status
kubectl get hpa -n mcp-gateway

# Describe HPA for metrics
kubectl describe hpa -n mcp-gateway mcp-stack-registry

# View scaling events
kubectl get events -n mcp-gateway --field-selector reason=SuccessfulRescale
```

---

## Secret Management

### Creating Secrets

```bash
# From literal values
kubectl create secret generic mcp-secrets -n mcp-gateway \
  --from-literal=secret-key=your-secret \
  --from-literal=db-password=db-pass

# From file
kubectl create secret generic mcp-certs -n mcp-gateway \
  --from-file=tls.crt=./cert.pem \
  --from-file=tls.key=./key.pem

# From .env file
kubectl create secret generic mcp-env -n mcp-gateway \
  --from-env-file=.env
```

### External Secrets (AWS)

```yaml
# ExternalSecret for AWS Secrets Manager
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: mcp-registry-secrets
  namespace: mcp-gateway
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: mcp-registry-secrets
  data:
    - secretKey: secret-key
      remoteRef:
        key: mcp-gateway/registry
        property: secret-key
```

---

## Monitoring

### Prometheus Metrics

```bash
# Check if metrics endpoint is exposed
kubectl port-forward -n mcp-gateway svc/mcp-stack-registry 8000:8000
curl http://localhost:8000/metrics

# ServiceMonitor for Prometheus Operator
kubectl get servicemonitor -n mcp-gateway
```

### Grafana Dashboards

The project includes Grafana dashboard configurations in `config/grafana/dashboards/`.

### Alerting

```yaml
# Example PrometheusRule
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: mcp-registry-alerts
  namespace: mcp-gateway
spec:
  groups:
    - name: mcp-registry
      rules:
        - alert: RegistryDown
          expr: up{job="mcp-registry"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "MCP Registry is down"
```

---

## CI/CD Integration

### GitHub Actions Deployment

See `.github/workflows/helm-test.yml` for Helm chart testing patterns.

```yaml
# Example deployment step
- name: Deploy to Kubernetes
  run: |
    helm upgrade --install mcp-stack ./charts/mcp-gateway-registry-stack \
      --namespace mcp-gateway --create-namespace \
      --set global.domain=${{ vars.DOMAIN }} \
      --set global.secretKey=${{ secrets.SECRET_KEY }} \
      --wait --timeout=10m
```

### ArgoCD GitOps

```yaml
# Example ArgoCD Application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: mcp-gateway-registry
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/mcp-registry-gateway
    targetRevision: main
    path: charts/mcp-gateway-registry-stack
    helm:
      valueFiles:
        - values-prod.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: mcp-gateway
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

---

## Best Practices

### Security

- Run containers as non-root (`runAsNonRoot: true`)
- Use read-only root filesystem where possible
- Drop all capabilities (`capabilities.drop: ["ALL"]`)
- Use NetworkPolicies to restrict traffic
- Store secrets in external secret manager (AWS Secrets Manager, HashiCorp Vault)
- Enable Pod Security Standards

### Reliability

- Set appropriate resource requests and limits
- Configure liveness, readiness, and startup probes
- Use PodDisruptionBudgets for availability
- Implement HorizontalPodAutoscaler for load
- Use anti-affinity for pod distribution

### Observability

- Export Prometheus metrics
- Configure structured JSON logging
- Set up alerting for critical paths
- Use distributed tracing (OpenTelemetry)

---

## Quick Reference

### Common Commands

```bash
# Status check
kubectl get pods -n mcp-gateway
helm status mcp-stack -n mcp-gateway

# Logs
kubectl logs -n mcp-gateway deploy/mcp-stack-registry -f

# Debug access
kubectl exec -it -n mcp-gateway <pod> -- /bin/sh

# Port forward
kubectl port-forward -n mcp-gateway svc/mcp-stack-registry 8000:8000

# Scale
kubectl scale deploy -n mcp-gateway mcp-stack-registry --replicas=3

# Restart
kubectl rollout restart deploy -n mcp-gateway mcp-stack-registry
```

### Environment-Specific Values

| Environment | Values File | Domain |
|-------------|-------------|--------|
| Development | `values-dev.yaml` | `dev.example.com` |
| Staging | `values-staging.yaml` | `staging.example.com` |
| Production | `values-prod.yaml` | `example.com` |

---

## References

- `charts/README.md` - Helm charts documentation
- `terraform/aws-ecs/` - ECS deployment alternative
- `.github/workflows/helm-test.yml` - CI/CD examples
- `config/grafana/` - Monitoring dashboards
