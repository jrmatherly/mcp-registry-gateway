---
description: Kubernetes manifest patterns and best practices
globs:
  - "**/kubernetes/**/*.yaml"
  - "**/kubernetes/**/*.yml"
  - "**/*-deployment.yaml"
  - "**/*-service.yaml"
  - "**/helm/**/*"
  - "**/charts/**/*"
---

# Kubernetes Patterns

## Standard Labels

All resources should include standard Kubernetes labels:

```yaml
metadata:
  labels:
    app.kubernetes.io/name: myapp
    app.kubernetes.io/instance: myapp
    app.kubernetes.io/version: "1.0.0"
    app.kubernetes.io/component: backend
    app.kubernetes.io/part-of: mcp-registry
    app.kubernetes.io/managed-by: helm
```

## Deployment Pattern

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: mcp-registry
  labels:
    app.kubernetes.io/name: mcp-registry
spec:
  replicas: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: mcp-registry
  template:
    metadata:
      labels:
        app.kubernetes.io/name: mcp-registry
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: registry
          image: mcp-registry:latest
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 8000
              protocol: TCP
          env:
            - name: LOG_LEVEL
              value: "INFO"
            - name: DOCUMENTDB_HOST
              valueFrom:
                configMapKeyRef:
                  name: mcp-registry-config
                  key: db-host
            - name: DOCUMENTDB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: mcp-registry-secrets
                  key: db-password
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 1Gi
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
```

## Service Pattern

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mcp-registry
  labels:
    app.kubernetes.io/name: mcp-registry
spec:
  type: ClusterIP
  ports:
    - name: http
      port: 8000
      targetPort: http
      protocol: TCP
  selector:
    app.kubernetes.io/name: mcp-registry
```

## ConfigMap Pattern

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mcp-registry-config
data:
  db-host: "mongodb.default.svc.cluster.local"
  db-port: "27017"
  db-name: "mcp_registry"
  config.yaml: |
    server:
      port: 8000
      log_level: INFO
    features:
      semantic_search: true
```

## Secret Pattern

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: mcp-registry-secrets
type: Opaque
stringData:
  db-password: "${DB_PASSWORD}"
  secret-key: "${SECRET_KEY}"
```

## Ingress Pattern (NGINX)

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: mcp-registry
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "50m"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - registry.example.com
      secretName: mcp-registry-tls
  rules:
    - host: registry.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: mcp-registry
                port:
                  number: 8000
```

## Gateway API HTTPRoute Pattern

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: mcp-registry
spec:
  hostnames:
    - "registry.example.com"
  parentRefs:
    - name: main-gateway
      namespace: gateway-system
      sectionName: https
  rules:
    - backendRefs:
        - name: mcp-registry
          port: 8000
      matches:
        - path:
            type: PathPrefix
            value: /
```

## HorizontalPodAutoscaler Pattern

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: mcp-registry
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: mcp-registry
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

## PodDisruptionBudget Pattern

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: mcp-registry
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: mcp-registry
```

## NetworkPolicy Pattern

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: mcp-registry
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: mcp-registry
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - protocol: TCP
          port: 8000
  egress:
    # DNS
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
          podSelector:
            matchLabels:
              k8s-app: kube-dns
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
    # MongoDB
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: mongodb
      ports:
        - protocol: TCP
          port: 27017
```

## ServiceAccount Pattern

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: mcp-registry
  annotations:
    # For AWS IAM Roles
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/mcp-registry-role
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: mcp-registry
rules:
  - apiGroups: [""]
    resources: ["configmaps"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: mcp-registry
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: mcp-registry
subjects:
  - kind: ServiceAccount
    name: mcp-registry
```

## Do

- Use standard Kubernetes labels consistently
- Set resource requests and limits on all containers
- Configure liveness and readiness probes
- Use Secrets for sensitive data, ConfigMaps for configuration
- Apply security contexts (non-root, read-only filesystem)
- Define NetworkPolicies for network segmentation
- Use PodDisruptionBudgets for availability during updates
- Pin image versions in production (avoid `latest` tag)

## Do Not

- Hardcode secrets in manifests
- Run containers as root unless absolutely necessary
- Skip resource limits (can cause node instability)
- Use `hostNetwork` or `hostPID` without good reason
- Expose services directly without ingress/gateway
- Skip health checks (causes deployment issues)
- Use `kubectl apply` directly in production (use GitOps)

## Validation Commands

```bash
# Validate YAML syntax
kubectl apply --dry-run=client -f manifest.yaml

# Validate against cluster
kubectl apply --dry-run=server -f manifest.yaml

# Lint with kubeval
kubeval manifest.yaml

# Lint with kubeconform (faster)
kubeconform -summary manifest.yaml

# Security scanning
kubesec scan manifest.yaml

# Policy validation
conftest test manifest.yaml
```

## Project Helm Charts

This project includes Helm charts in the `charts/` directory:

### Chart Structure

```
charts/
├── mcp-gateway-registry-stack/   # Umbrella chart (full stack)
│   ├── Chart.yaml                # Dependencies on subcharts
│   ├── values.yaml               # Global and subchart values
│   └── templates/                # Stack-specific resources
├── registry/                     # MCP Registry service
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── ingress.yaml
│       ├── pdb.yaml
│       ├── secret.yaml
│       └── _helpers.tpl
├── auth-server/                  # Authentication service
├── keycloak-configure/           # Keycloak configuration job
└── mongodb-configure/            # MongoDB configuration job
```

### Global Values Pattern

The stack chart uses global values for cross-chart configuration:

```yaml
global:
  domain: "example.com"           # Used by all subcharts
  secretKey: "production-secret"  # Shared secret key
  ingress:
    className: alb
    tls: true
    annotations:
      alb.ingress.kubernetes.io/scheme: internet-facing
```

### Subchart Values Pattern

Each subchart follows a consistent structure:

```yaml
global:
  image:
    repository: mcpgateway/registry
    tag: v1.0.12
    pullPolicy: IfNotPresent

app:
  name: registry
  replicas: 1
  envSecretName: registry-secret

service:
  type: ClusterIP
  port: 8000

resources:
  requests:
    cpu: 1
    memory: 1Gi
  limits:
    cpu: 2
    memory: 2Gi

probes:
  liveness:
    initialDelaySeconds: 30
    periodSeconds: 10
  readiness:
    initialDelaySeconds: 10
    periodSeconds: 5

ingress:
  enabled: false
  className: alb
  hostname: ""

podDisruptionBudget:
  enabled: false
  minAvailable: 1
```

### Template Helpers Pattern

Use `_helpers.tpl` for reusable template functions:

```yaml
{{- define "registry.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "registry.labels" -}}
helm.sh/chart: {{ include "registry.chart" . }}
{{ include "registry.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{- define "registry.selectorLabels" -}}
app.kubernetes.io/name: {{ include "registry.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: {{ .Values.app.name }}
{{- end }}
```

### Helm Commands

```bash
# Update dependencies
helm dependency update charts/mcp-gateway-registry-stack

# Lint charts
helm lint charts/registry
helm lint charts/mcp-gateway-registry-stack

# Template (dry-run)
helm template mcp-stack charts/mcp-gateway-registry-stack \
  --set global.domain=example.com

# Install stack
helm install mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway --create-namespace \
  --set global.domain=example.com \
  --set global.secretKey=production-secret

# Upgrade
helm upgrade mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway \
  --set global.domain=example.com

# Uninstall
helm uninstall mcp-stack --namespace mcp-gateway
```

### Chart Testing

```bash
# Run helm test
helm test mcp-stack --namespace mcp-gateway

# Check release status
helm status mcp-stack --namespace mcp-gateway

# View release history
helm history mcp-stack --namespace mcp-gateway

# Rollback if needed
helm rollback mcp-stack 1 --namespace mcp-gateway
```

## References

- See `charts/README.md` for detailed Helm deployment guide
- See `terraform/aws-ecs/` for ECS deployment patterns
- See `docker-compose.yml` for local development services
- See `.github/workflows/` for CI/CD deployment examples
