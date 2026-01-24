# MCP Gateway Registry Helm Charts

This directory contains Helm charts for deploying the MCP Gateway Registry stack on Kubernetes.

## Quick Start

```bash
# 1. Update chart dependencies
helm dependency update charts/mcp-gateway-registry-stack

# 2. Deploy the stack
helm install mcp-stack ./charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway --create-namespace \
  --set global.domain=yourdomain.com \
  --set global.secretKey=your-production-secret \
  --wait --timeout=10m

# 3. Verify deployment
kubectl get pods -n mcp-gateway
helm status mcp-stack -n mcp-gateway

# 4. Access the registry
echo "Registry: https://mcpregistry.yourdomain.com"
echo "Keycloak: https://keycloak.yourdomain.com"
```

## Install from OCI Registry

Charts are published as OCI artifacts to GitHub Container Registry. This is the recommended installation method for production.

### Install Full Stack

```bash
# Install the complete MCP Gateway stack
helm install mcp-stack oci://ghcr.io/jrmatherly/charts/mcp-gateway-registry-stack \
  --version 2.0.8 \
  --namespace mcp-gateway --create-namespace \
  --set global.domain=yourdomain.com \
  --set global.secretKey=your-production-secret \
  --wait --timeout=10m
```

### Install Individual Charts

```bash
# Install only the registry service
helm install registry oci://ghcr.io/jrmatherly/charts/registry \
  --version 2.0.8 \
  --namespace mcp-gateway

# Install only the auth server
helm install auth-server oci://ghcr.io/jrmatherly/charts/auth-server \
  --version 2.0.8 \
  --namespace mcp-gateway
```

### Pull Charts Locally

```bash
# Pull chart to local directory for inspection
helm pull oci://ghcr.io/jrmatherly/charts/registry --version 2.0.8

# Pull and untar
helm pull oci://ghcr.io/jrmatherly/charts/registry --version 2.0.8 --untar
```

### Show Chart Information

```bash
# View chart metadata
helm show chart oci://ghcr.io/jrmatherly/charts/registry --version 2.0.8

# View default values
helm show values oci://ghcr.io/jrmatherly/charts/registry --version 2.0.8
```

## Prerequisites

### Required Components

| Component | Version | Notes |
|-----------|---------|-------|
| Kubernetes cluster | v1.25+ | EKS, GKE, AKS, or self-managed |
| `helm` CLI | v3.12+ | [Installation guide](https://helm.sh/docs/intro/install/) |
| `kubectl` | v1.25+ | Configured for cluster access |
| Ingress controller | - | AWS ALB Controller, NGINX, or Traefik |
| DNS | - | Configured for your domain |
| TLS certificates | - | Optional but recommended for production |

### EKS Cluster Setup

For deploying on Amazon EKS, we recommend using the [AWS AI/ML on Amazon EKS](https://github.com/awslabs/ai-on-eks) blueprints to provision a production-ready EKS cluster with GPU support, autoscaling, and AI/ML optimizations.

**Quick Start with AI on EKS:**

```bash
# Clone the AI on EKS repository
git clone https://github.com/awslabs/ai-on-eks.git
cd ai-on-eks

# See the AI on EKS documentation for the latest installation instructions
# Custom stacks are available in infra/custom/
cd infra/custom
./install.sh
```

Once your EKS cluster is provisioned, return to this directory to deploy the MCP Gateway Registry using the Helm charts.

## Charts Overview

### Stack Chart (Recommended)

| Chart | Purpose |
|-------|---------|
| `mcp-gateway-registry-stack` | Complete stack deployment including all components below |

### Individual Charts

| Chart | Purpose |
|-------|---------|
| `auth-server` | Authentication service for the MCP Gateway |
| `registry` | MCP server registry service |
| `keycloak-configure` | Job to configure Keycloak realms and clients |
| `mongodb-configure` | Job to configure MongoDB database and users |

## Usage

### Deploy Complete Stack (Recommended)

```bash
# 1. Update dependencies
helm dependency update charts/mcp-gateway-registry-stack

# 2. Lint the chart
helm lint charts/mcp-gateway-registry-stack

# 3. Deploy
helm install mcp-stack ./charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway --create-namespace \
  --set global.domain=yourdomain.com \
  --set global.secretKey=your-production-secret \
  --wait --timeout=10m

# 4. Verify deployment
kubectl get pods -n mcp-gateway
helm status mcp-stack -n mcp-gateway
```

### Deploy Individual Services

```bash
# Auth server
helm install auth-server ./charts/auth-server \
  --namespace mcp-gateway --create-namespace

# Registry
helm install registry ./charts/registry \
  --namespace mcp-gateway
```

### Upgrade Existing Deployment

```bash
# Update dependencies first
helm dependency update charts/mcp-gateway-registry-stack

# Upgrade
helm upgrade mcp-stack ./charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway \
  --set global.domain=yourdomain.com \
  --wait --timeout=10m
```

### Uninstall

```bash
# Uninstall the release
helm uninstall mcp-stack --namespace mcp-gateway

# Optionally delete the namespace
kubectl delete namespace mcp-gateway
```

## Values Structure

The values files have been standardized with the following structure:

### Global Configuration

```yaml
global:
  # Base domain for all services
  domain: "example.com"

  # Shared secret key (change in production!)
  secretKey: "your-production-secret"

  # Common ingress settings
  ingress:
    className: alb
    tls: true
```

### Image Configuration

```yaml
global:
  image:
    repository: ghcr.io/jrmatherly/mcp-registry
    tag: v2.0.0
    pullPolicy: IfNotPresent
```

### Application Configuration

```yaml
app:
  name: registry
  replicas: 1
  envSecretName: registry-secret
```

### Service Configuration

```yaml
service:
  type: ClusterIP
  port: 8000
  annotations: {}
```

### Resources

```yaml
resources:
  requests:
    cpu: 1
    memory: 1Gi
  limits:
    cpu: 2
    memory: 2Gi
```

### Ingress

```yaml
ingress:
  enabled: true
  className: alb
  hostname: "mcpregistry.example.com"
  annotations:
    alb.ingress.kubernetes.io/scheme: internet-facing
  tls:
    enabled: true
    secretName: ""
```

### Pod Disruption Budget

```yaml
podDisruptionBudget:
  enabled: false
  minAvailable: 1
```

## Configuration

### Domain Configuration

The stack chart uses `global.domain` to automatically configure all subdomains:

| Subdomain | Service |
|-----------|---------|
| `keycloak.{domain}` | Keycloak authentication server |
| `auth-server.{domain}` | MCP Gateway auth server |
| `mcpregistry.{domain}` | MCP server registry |

**How it works:**

1. Set `global.domain` in the stack values file
2. All subchart templates reference `{{ .Values.global.domain }}` to build URLs and hostnames
3. Change the domain once and all services update automatically

**To change the domain:**

```bash
# Option 1: Edit the values file
vim charts/mcp-gateway-registry-stack/values.yaml
# Change: global.domain: "your-new-domain.com"

# Option 2: Override via command line
helm upgrade mcp-stack ./charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway \
  --set global.domain=your-new-domain.com
```

Make sure your DNS is configured to point these subdomains to your Kubernetes ingress.

### Configuration Notes

| Setting | Description | Recommendation |
|---------|-------------|----------------|
| `global.domain` | Base domain for services | Required - set to your domain |
| `global.secretKey` | Shared secret key | Required - change in production |
| `resources` | CPU/memory requests and limits | Adjust based on workload |
| `ingress` | Ingress settings | Configure for your environment |

## Key Improvements

1. **Consistent Structure**: All charts follow the same values organization
2. **Standardized Naming**: Unified naming conventions across all charts
3. **Reduced Duplication**: Eliminated redundant resource definitions
4. **Better Defaults**: Sensible default values for development and production
5. **Clean Templates**: Updated all templates to use the new values structure
6. **Clear Documentation**: Inline comments explaining configuration options

## Deployment Options: Kubernetes vs AWS ECS

This project supports two deployment methods:

### 1. Kubernetes Deployment (This Directory)

Deploy the MCP Gateway Registry on any Kubernetes cluster using Helm charts. Ideal for:

- Multi-cloud deployments (AWS EKS, Google GKE, Azure AKS)
- On-premises Kubernetes clusters
- Organizations with existing Kubernetes infrastructure
- Scenarios requiring portability and vendor neutrality

**Location:** `charts/` directory (this location)

**Tools:** Helm charts, Kubernetes manifests

### 2. AWS ECS Deployment (Terraform)

Deploy the MCP Gateway Registry on AWS ECS using Terraform for infrastructure-as-code. Ideal for:

- AWS-native deployments with full AWS integration
- Organizations using AWS Fargate for serverless containers
- Teams preferring Terraform for infrastructure management
- Deployments requiring tight AWS service integration (ALB, ECR, EFS, Secrets Manager)

**Location:** `terraform/aws-ecs/` directory

**Tools:** Terraform modules, AWS ECS task definitions, AWS Fargate

### Choosing Between Kubernetes and ECS

| Feature | Kubernetes (Helm) | AWS ECS (Terraform) |
|---------|-------------------|---------------------|
| **Portability** | High - works on any K8s cluster | AWS-specific |
| **Multi-cloud** | Yes | No (AWS only) |
| **Complexity** | Moderate - requires K8s knowledge | Lower - managed by AWS |
| **Customization** | High - full K8s ecosystem | Moderate - AWS services |
| **Auto-scaling** | K8s HPA, Cluster Autoscaler | ECS Service Auto Scaling |
| **Cost** | Depends on cluster costs | Pay-per-task (Fargate) |
| **Tools** | kubectl, helm | AWS CLI, terraform |

**Note:** The Helm charts and Terraform configurations are separate deployment methods. Choose the one that best fits your infrastructure and team expertise.

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Pods stuck in `Pending` | Check node resources: `kubectl describe pod -n mcp-gateway <pod>` |
| Pods in `CrashLoopBackOff` | Check logs: `kubectl logs -n mcp-gateway <pod> --previous` |
| Ingress not working | Check ALB controller: `kubectl logs -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller` |
| Database connection failed | Verify MongoDB is ready: `kubectl get pods -n mcp-gateway -l app.kubernetes.io/name=mongodb` |

### Diagnostic Commands

```bash
# Check all resources
kubectl get all -n mcp-gateway

# Check events
kubectl get events -n mcp-gateway --sort-by='.lastTimestamp'

# Check Helm release
helm status mcp-stack -n mcp-gateway
helm history mcp-stack -n mcp-gateway

# View logs
kubectl logs -n mcp-gateway deploy/mcp-stack-registry -f
```

### Rollback

```bash
# View release history
helm history mcp-stack -n mcp-gateway

# Rollback to previous version
helm rollback mcp-stack -n mcp-gateway

# Rollback to specific revision
helm rollback mcp-stack 2 -n mcp-gateway
```

## Additional Resources

- [Kubernetes Operations Guide](../.claude/instructions/kubernetes-operations.md)
- [Helm Chart Patterns](../.claude/skills/kubernetes-operations/references/helm-patterns.md)
- [Troubleshooting Guide](../.claude/skills/kubernetes-operations/references/troubleshooting.md)
- [Terraform ECS Deployment](../terraform/aws-ecs/README.md)
