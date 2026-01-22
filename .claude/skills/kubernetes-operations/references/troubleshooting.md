# Kubernetes Troubleshooting Guide

## Diagnostic Flowchart

```
Pod Issue?
├── Pending
│   ├── Check node resources: kubectl describe node
│   ├── Check PVC binding: kubectl get pvc
│   └── Check node selectors/taints
├── CrashLoopBackOff
│   ├── Check logs: kubectl logs <pod> --previous
│   ├── Check probe configuration
│   └── Check environment variables
├── ImagePullBackOff
│   ├── Verify image tag exists
│   ├── Check registry authentication
│   └── Check image pull secrets
├── OOMKilled
│   ├── Increase memory limits
│   ├── Check for memory leaks
│   └── Review resource usage
└── Running but not ready
    ├── Check readiness probe
    ├── Check dependencies (DB, etc.)
    └── Check service endpoints
```

## Pod Issues

### Pending State

**Symptom**: Pod stuck in `Pending` state.

**Diagnosis**:
```bash
# Check pod events
kubectl describe pod -n mcp-gateway <pod-name> | grep -A 20 Events

# Check node resources
kubectl describe nodes | grep -A 5 "Allocated resources"

# Check PVC binding
kubectl get pvc -n mcp-gateway
```

**Common Causes**:
- Insufficient CPU/memory on nodes
- PersistentVolumeClaim not bound
- Node selector/affinity not satisfied
- Taints without tolerations

**Solutions**:
```bash
# Scale up nodes (EKS)
eksctl scale nodegroup --cluster=mcp-cluster --name=ng-1 --nodes=3

# Check and fix PVC
kubectl get pvc -n mcp-gateway
kubectl describe pvc -n mcp-gateway <pvc-name>
```

### CrashLoopBackOff

**Symptom**: Container repeatedly crashing.

**Diagnosis**:
```bash
# Check current logs
kubectl logs -n mcp-gateway <pod-name>

# Check previous container logs
kubectl logs -n mcp-gateway <pod-name> --previous

# Check exit code
kubectl describe pod -n mcp-gateway <pod-name> | grep -A 3 "Last State"
```

**Common Causes**:
- Application error on startup
- Missing environment variables
- Database connection failure
- Incorrect probe configuration

**Solutions**:
```bash
# Check environment
kubectl exec -n mcp-gateway <pod-name> -- env | sort

# Test database connection
kubectl exec -n mcp-gateway <pod-name> -- nc -zv mongodb 27017

# Adjust probe timing
# In values.yaml:
# probes:
#   liveness:
#     initialDelaySeconds: 60
#     periodSeconds: 30
```

### ImagePullBackOff

**Symptom**: Cannot pull container image.

**Diagnosis**:
```bash
kubectl describe pod -n mcp-gateway <pod-name> | grep -A 5 Events
```

**Common Causes**:
- Image tag doesn't exist
- Registry authentication failed
- Network issues to registry

**Solutions**:
```bash
# Verify image exists
docker pull mcpgateway/registry:v1.0.12

# Create/update image pull secret
kubectl create secret docker-registry regcred \
  --docker-server=ghcr.io \
  --docker-username=user \
  --docker-password=token \
  -n mcp-gateway

# Update deployment to use secret
# imagePullSecrets:
#   - name: regcred
```

### OOMKilled

**Symptom**: Container killed due to memory.

**Diagnosis**:
```bash
kubectl describe pod -n mcp-gateway <pod-name> | grep -A 3 "Last State"
# Look for: Reason: OOMKilled

kubectl top pod -n mcp-gateway
```

**Solutions**:
```bash
# Increase memory limits in values.yaml
resources:
  limits:
    memory: 2Gi

# Or via helm
helm upgrade mcp-stack charts/mcp-gateway-registry-stack \
  --set registry.resources.limits.memory=2Gi
```

## Service Issues

### Service Not Accessible

**Diagnosis**:
```bash
# Check service exists
kubectl get svc -n mcp-gateway

# Check endpoints
kubectl get endpoints -n mcp-gateway

# Test from within cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl -v http://mcp-stack-registry.mcp-gateway:8000/health
```

**Common Causes**:
- No pods matching selector
- Pods not ready
- Wrong port configuration

**Solutions**:
```bash
# Verify selector matches pods
kubectl get svc -n mcp-gateway -o yaml | grep -A 3 selector
kubectl get pods -n mcp-gateway -l app.kubernetes.io/name=registry

# Check pod readiness
kubectl get pods -n mcp-gateway -o wide
```

### DNS Resolution Failure

**Diagnosis**:
```bash
kubectl run -it --rm debug --image=busybox --restart=Never -- \
  nslookup mcp-stack-registry.mcp-gateway.svc.cluster.local

kubectl run -it --rm debug --image=busybox --restart=Never -- \
  nslookup kubernetes.default
```

**Solutions**:
```bash
# Check CoreDNS
kubectl get pods -n kube-system -l k8s-app=kube-dns
kubectl logs -n kube-system -l k8s-app=kube-dns

# Restart CoreDNS
kubectl rollout restart deployment/coredns -n kube-system
```

## Ingress Issues

### Ingress Not Working

**Diagnosis**:
```bash
# Check ingress resource
kubectl get ingress -n mcp-gateway -o wide
kubectl describe ingress -n mcp-gateway <ingress-name>

# Check ingress controller logs (ALB)
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller

# Check ingress controller logs (NGINX)
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx
```

**Common Causes**:
- Ingress controller not installed
- Invalid annotations
- TLS secret missing
- Service not found

**Solutions**:
```bash
# Verify ingress class
kubectl get ingressclass

# Create TLS secret if needed
kubectl create secret tls mcp-tls \
  --cert=tls.crt --key=tls.key \
  -n mcp-gateway

# Check ALB created (EKS)
aws elbv2 describe-load-balancers --query 'LoadBalancers[*].[LoadBalancerName,DNSName]'
```

## Database Issues

### MongoDB Connection Failed

**Diagnosis**:
```bash
# Check MongoDB pods
kubectl get pods -n mcp-gateway -l app.kubernetes.io/name=mongodb

# Check MongoDB logs
kubectl logs -n mcp-gateway -l app.kubernetes.io/name=mongodb

# Test connection
kubectl run -it --rm mongo-test --image=mongo:7 --restart=Never -- \
  mongosh "mongodb://mcp-stack-mongodb:27017" --eval "db.adminCommand('ping')"
```

**Common Causes**:
- MongoDB not ready
- Wrong connection string
- Authentication failure
- Network policy blocking

**Solutions**:
```bash
# Check MongoDB service
kubectl get svc -n mcp-gateway | grep mongo

# Verify credentials
kubectl get secret -n mcp-gateway mongo-credentials -o jsonpath='{.data}'

# Port forward for local testing
kubectl port-forward -n mcp-gateway svc/mcp-stack-mongodb 27017:27017
mongosh "mongodb://localhost:27017"
```

## Helm Issues

### Helm Release Stuck

**Diagnosis**:
```bash
helm status mcp-stack -n mcp-gateway
helm history mcp-stack -n mcp-gateway
```

**Solutions**:
```bash
# Force upgrade
helm upgrade mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway --force

# Rollback
helm rollback mcp-stack -n mcp-gateway

# Uninstall and reinstall (last resort)
helm uninstall mcp-stack -n mcp-gateway
helm install mcp-stack charts/mcp-gateway-registry-stack -n mcp-gateway
```

### Values Not Applied

**Diagnosis**:
```bash
# Check effective values
helm get values mcp-stack -n mcp-gateway

# Check all values including defaults
helm get values mcp-stack -n mcp-gateway --all
```

**Solutions**:
```bash
# Template to verify
helm template mcp-stack charts/mcp-gateway-registry-stack \
  --set registry.app.replicas=3 | grep replicas

# Upgrade with explicit values
helm upgrade mcp-stack charts/mcp-gateway-registry-stack \
  -n mcp-gateway -f values-prod.yaml
```

## Resource Issues

### High CPU Usage

**Diagnosis**:
```bash
kubectl top pods -n mcp-gateway
kubectl top nodes
```

**Solutions**:
```bash
# Scale horizontally
kubectl scale deployment -n mcp-gateway mcp-stack-registry --replicas=3

# Enable HPA
kubectl autoscale deployment mcp-stack-registry \
  -n mcp-gateway --min=2 --max=10 --cpu-percent=70
```

### High Memory Usage

**Diagnosis**:
```bash
kubectl top pods -n mcp-gateway --containers
kubectl describe pod -n mcp-gateway <pod-name> | grep -A 5 Limits
```

**Solutions**:
```bash
# Increase limits
helm upgrade mcp-stack charts/mcp-gateway-registry-stack \
  --set registry.resources.limits.memory=2Gi

# Check for memory leaks (profile application)
```

## Quick Diagnostic Commands

```bash
# Overall cluster health
kubectl cluster-info
kubectl get nodes -o wide
kubectl top nodes

# Namespace overview
kubectl get all -n mcp-gateway
kubectl get events -n mcp-gateway --sort-by='.lastTimestamp'

# Pod diagnostics
kubectl get pods -n mcp-gateway -o wide
kubectl describe pod -n mcp-gateway <pod-name>
kubectl logs -n mcp-gateway <pod-name> --tail=100

# Service diagnostics
kubectl get svc,ep -n mcp-gateway
kubectl describe svc -n mcp-gateway <svc-name>

# Ingress diagnostics
kubectl get ingress -n mcp-gateway
kubectl describe ingress -n mcp-gateway <ingress-name>

# Helm diagnostics
helm list -n mcp-gateway
helm status mcp-stack -n mcp-gateway
helm history mcp-stack -n mcp-gateway
```

## Common Error Messages

| Error | Likely Cause | Quick Fix |
|-------|--------------|-----------|
| `FailedScheduling` | No nodes with resources | Scale nodegroup |
| `CrashLoopBackOff` | App startup failure | Check logs --previous |
| `ImagePullBackOff` | Image not found | Verify image tag |
| `CreateContainerError` | Config issue | Check secrets/configmaps |
| `Unhealthy` | Probe failing | Adjust probe settings |
| `connection refused` | Service not ready | Check endpoints |
| `no endpoints available` | No ready pods | Check pod status |
