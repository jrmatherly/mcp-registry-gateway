# /helm-deploy - Deploy MCP Gateway Registry Stack

Deploy or upgrade the MCP Gateway Registry stack using Helm.

## Triggers

- Initial deployment to Kubernetes cluster
- Upgrading existing deployment
- Changing configuration values
- Rolling out new image versions

## Usage

```
/helm-deploy [environment] [--dry-run]
```

**Examples:**
- `/helm-deploy` - Deploy with default values
- `/helm-deploy production` - Deploy to production
- `/helm-deploy --dry-run` - Preview changes without applying

## Behavioral Flow

1. **Validate**: Lint charts and check dependencies
2. **Preview**: Show what will be deployed (diff if upgrading)
3. **Confirm**: Get user confirmation before applying
4. **Deploy**: Install or upgrade the Helm release
5. **Verify**: Check deployment status
6. **Report**: Provide deployment summary

## Prerequisites Check

```bash
# Check kubectl context
kubectl config current-context
kubectl cluster-info

# Check Helm
helm version

# Check namespace
kubectl get namespace mcp-gateway 2>/dev/null || echo "Namespace will be created"
```

## Deployment Steps

### 1. Update Dependencies

```bash
helm dependency update charts/mcp-gateway-registry-stack
```

### 2. Lint Charts

```bash
helm lint charts/mcp-gateway-registry-stack
helm lint charts/registry
helm lint charts/auth-server
```

### 3. Preview Deployment

```bash
# For new installation
helm template mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway \
  --set global.domain=example.com | head -100

# For upgrade (requires helm-diff plugin)
helm diff upgrade mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway \
  --set global.domain=example.com
```

### 4. Deploy

```bash
# New installation
helm install mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway --create-namespace \
  --set global.domain=example.com \
  --set global.secretKey="${SECRET_KEY}" \
  --wait --timeout=10m

# Upgrade existing
helm upgrade mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway \
  --set global.domain=example.com \
  --wait --timeout=10m
```

### 5. Verify

```bash
# Check release status
helm status mcp-stack -n mcp-gateway

# Check pods
kubectl get pods -n mcp-gateway -w

# Check services
kubectl get svc -n mcp-gateway

# Test health endpoint (after port-forward)
kubectl port-forward -n mcp-gateway svc/mcp-stack-registry 8000:8000 &
sleep 2
curl -s http://localhost:8000/health
```

## Environment Configurations

### Development

```bash
helm install mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway-dev --create-namespace \
  --set global.domain=dev.example.com \
  --set registry.app.replicas=1 \
  --set registry.resources.requests.cpu=100m \
  --set registry.resources.requests.memory=256Mi
```

### Production

```bash
helm install mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway --create-namespace \
  --set global.domain=example.com \
  --set global.secretKey="${PRODUCTION_SECRET}" \
  --set registry.app.replicas=3 \
  --set registry.podDisruptionBudget.enabled=true \
  --set registry.resources.requests.cpu=500m \
  --set registry.resources.requests.memory=512Mi \
  --set registry.resources.limits.cpu=2 \
  --set registry.resources.limits.memory=2Gi \
  --wait --timeout=15m
```

## Common Value Overrides

| Value | Description | Default |
|-------|-------------|---------|
| `global.domain` | Base domain for services | `DOMAIN` |
| `global.secretKey` | Shared secret key | (required) |
| `registry.app.replicas` | Number of registry pods | `1` |
| `registry.ingress.enabled` | Enable ingress | `true` |
| `mongodb.enabled` | Deploy MongoDB | `true` |

## Output Format

```markdown
## Helm Deployment Summary

### Configuration
- **Release**: mcp-stack
- **Namespace**: mcp-gateway
- **Chart**: mcp-gateway-registry-stack-0.1.0
- **Domain**: example.com

### Deployment Status
- **Result**: SUCCESS / FAILED
- **Duration**: X minutes
- **Revision**: N

### Components Deployed
| Component | Pods | Status |
|-----------|------|--------|
| registry | 2/2 | Running |
| auth-server | 1/1 | Running |
| keycloak | 1/1 | Running |
| mongodb | 1/1 | Running |

### Endpoints
- Registry: https://mcpregistry.example.com
- Auth Server: https://auth-server.example.com
- Keycloak: https://keycloak.example.com

### Next Steps
1. Verify DNS is configured for subdomains
2. Test health endpoints
3. Configure additional users in Keycloak
```

## Rollback

If deployment fails:

```bash
# View history
helm history mcp-stack -n mcp-gateway

# Rollback to previous
helm rollback mcp-stack -n mcp-gateway

# Rollback to specific revision
helm rollback mcp-stack 2 -n mcp-gateway
```

## Boundaries

**Will:**
- Validate charts before deployment
- Show preview of changes
- Deploy with user confirmation
- Verify deployment success
- Provide rollback instructions

**Will Not:**
- Deploy without user confirmation
- Modify charts during deployment
- Handle infrastructure provisioning (EKS, networking)
- Configure DNS or certificates
