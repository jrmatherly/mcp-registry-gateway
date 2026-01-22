# /k8s-status - Kubernetes Deployment Status

Check the status of the MCP Gateway Registry Kubernetes deployment.

## Triggers

- Need to check deployment health
- Verify Helm release status
- Diagnose deployment issues
- Pre/post deployment verification

## Usage

```
/k8s-status [namespace]
```

**Examples:**
- `/k8s-status` - Check default namespace (mcp-gateway)
- `/k8s-status production` - Check specific namespace

## Behavioral Flow

1. **Check Helm Release**: Verify Helm deployment status
2. **Check Pods**: List all pods and their status
3. **Check Services**: Verify services and endpoints
4. **Check Ingress**: Verify ingress configuration
5. **Check Events**: Show recent events for issues
6. **Report**: Provide summary with any issues

## Status Checks

### Helm Release Status

```bash
# Check if release exists
helm list -n mcp-gateway

# Get detailed status
helm status mcp-stack -n mcp-gateway

# View release history
helm history mcp-stack -n mcp-gateway
```

### Pod Status

```bash
# List all pods
kubectl get pods -n mcp-gateway -o wide

# Check pod health
kubectl top pods -n mcp-gateway 2>/dev/null || echo "Metrics not available"

# Check for issues
kubectl get pods -n mcp-gateway -o json | \
  jq -r '.items[] | select(.status.phase != "Running" and .status.phase != "Succeeded") |
  "\(.metadata.name): \(.status.phase)"'
```

### Service Status

```bash
# List services
kubectl get svc -n mcp-gateway

# Check endpoints
kubectl get endpoints -n mcp-gateway

# Verify service has endpoints
kubectl get endpoints -n mcp-gateway -o json | \
  jq -r '.items[] | select(.subsets == null or .subsets == []) | .metadata.name' | \
  while read svc; do echo "WARNING: $svc has no endpoints"; done
```

### Ingress Status

```bash
# List ingresses
kubectl get ingress -n mcp-gateway

# Check ingress details
kubectl describe ingress -n mcp-gateway 2>/dev/null | grep -E "Address|Host|Path|Backend"
```

### Recent Events

```bash
# Get warning events
kubectl get events -n mcp-gateway --sort-by='.lastTimestamp' \
  --field-selector type=Warning | tail -10

# Get all recent events
kubectl get events -n mcp-gateway --sort-by='.lastTimestamp' | tail -20
```

## Output Format

```markdown
## Kubernetes Status: mcp-gateway

### Helm Release
- **Release**: mcp-stack
- **Status**: deployed
- **Revision**: 3
- **Updated**: 2024-01-15 10:30:00

### Pods (X/Y Ready)
| Name | Status | Restarts | Age |
|------|--------|----------|-----|
| mcp-stack-registry-xxx | Running | 0 | 2d |
| mcp-stack-auth-server-xxx | Running | 0 | 2d |

### Services
| Name | Type | Cluster-IP | Port |
|------|------|------------|------|
| mcp-stack-registry | ClusterIP | 10.x.x.x | 8000 |

### Ingress
| Host | Path | Backend |
|------|------|---------|
| registry.example.com | / | mcp-stack-registry:8000 |

### Issues
- [List any warnings or errors]

### Health Summary
- Pods: X/Y healthy
- Services: All endpoints available
- Ingress: Configured and active
```

## Quick Diagnostic Commands

If issues are found, these commands help diagnose:

```bash
# Pod not starting
kubectl describe pod -n mcp-gateway <pod-name>
kubectl logs -n mcp-gateway <pod-name> --previous

# Service no endpoints
kubectl get pods -n mcp-gateway -l app.kubernetes.io/name=registry
kubectl describe svc -n mcp-gateway mcp-stack-registry

# Ingress not working
kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller
```

## Boundaries

**Will:**
- Check deployment status across all components
- Report issues and warnings
- Provide diagnostic command suggestions
- Show resource utilization if metrics available

**Will Not:**
- Make changes to the deployment
- Apply fixes automatically
- Access application-level health endpoints
- Modify any resources
