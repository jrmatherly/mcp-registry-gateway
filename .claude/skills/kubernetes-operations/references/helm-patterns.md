# Helm Chart Patterns

## Project Chart Structure

This project uses an umbrella chart pattern with subcharts:

```
charts/
├── mcp-gateway-registry-stack/   # Umbrella chart
│   ├── Chart.yaml               # Dependencies
│   ├── Chart.lock               # Locked versions
│   ├── values.yaml              # Global + subchart values
│   ├── charts/                  # Packaged dependencies
│   │   ├── registry-0.1.0.tgz
│   │   ├── auth-server-0.1.0.tgz
│   │   ├── keycloak-25.2.0.tgz
│   │   └── ...
│   └── templates/               # Stack-specific templates
│       ├── _helpers.tpl
│       ├── mongodb-cluster.yaml
│       └── keycloak-ingress-patch.yaml
├── registry/                    # Subchart
├── auth-server/                 # Subchart
├── keycloak-configure/          # Subchart
└── mongodb-configure/           # Subchart
```

## Global Values Pattern

The umbrella chart passes global values to all subcharts:

```yaml
# charts/mcp-gateway-registry-stack/values.yaml
global:
  domain: "example.com"
  secretKey: "shared-secret"
  ingress:
    className: alb
    tls: true
    annotations:
      alb.ingress.kubernetes.io/scheme: internet-facing

# Subcharts access via {{ .Values.global.domain }}
```

## Subchart Values Structure

Each subchart follows a consistent pattern:

```yaml
# Global image config
global:
  image:
    repository: mcpgateway/registry
    tag: v1.0.12
    pullPolicy: IfNotPresent

# Application config
app:
  name: registry
  replicas: 1
  envSecretName: registry-secret

# Service config
service:
  type: ClusterIP
  port: 8000
  annotations: {}

# Resource limits
resources:
  requests:
    cpu: 1
    memory: 1Gi
  limits:
    cpu: 2
    memory: 2Gi

# Health probes
probes:
  liveness:
    initialDelaySeconds: 30
    periodSeconds: 10
  readiness:
    initialDelaySeconds: 10
    periodSeconds: 5
  startup:
    initialDelaySeconds: 10
    periodSeconds: 10
    failureThreshold: 30

# Ingress config
ingress:
  enabled: false
  className: alb
  hostname: ""
  annotations: {}
  tls:
    enabled: false
    secretName: ""

# PDB config
podDisruptionBudget:
  enabled: false
  minAvailable: 1

# Network policy
networkPolicy:
  enabled: false
```

## Template Helpers

Standard helpers in `_helpers.tpl`:

```yaml
{{/*
Expand the name of the chart.
*/}}
{{- define "registry.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "registry.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "registry.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "registry.labels" -}}
helm.sh/chart: {{ include "registry.chart" . }}
{{ include "registry.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "registry.selectorLabels" -}}
app.kubernetes.io/name: {{ include "registry.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/component: {{ .Values.app.name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "registry.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "registry.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
```

## Deployment Template Pattern

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "registry.fullname" . }}
  namespace: {{ include "common.names.namespace" . | quote }}
  labels:
    {{- include "registry.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.app.replicas }}
  selector:
    matchLabels:
      {{- include "registry.selectorLabels" . | nindent 6 }}
  template:
    metadata:
      labels:
        {{- include "registry.selectorLabels" . | nindent 8 }}
    spec:
      serviceAccountName: {{ include "registry.serviceAccountName" . }}
      automountServiceAccountToken: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        runAsGroup: 1000
        fsGroup: 1000
      containers:
        - name: {{ .Values.app.name }}
          image: "{{ .Values.global.image.repository }}:{{ .Values.global.image.tag }}"
          imagePullPolicy: {{ .Values.global.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.port }}
              name: http
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: false
            capabilities:
              drop:
                - ALL
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
          envFrom:
            - secretRef:
                name: {{ .Values.app.envSecretName }}
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: {{ .Values.probes.liveness.initialDelaySeconds }}
            periodSeconds: {{ .Values.probes.liveness.periodSeconds }}
          readinessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: {{ .Values.probes.readiness.initialDelaySeconds }}
            periodSeconds: {{ .Values.probes.readiness.periodSeconds }}
```

## Conditional Resources

```yaml
# PodDisruptionBudget
{{- if .Values.podDisruptionBudget.enabled }}
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ include "registry.fullname" . }}
spec:
  {{- if .Values.podDisruptionBudget.minAvailable }}
  minAvailable: {{ .Values.podDisruptionBudget.minAvailable }}
  {{- else }}
  maxUnavailable: {{ .Values.podDisruptionBudget.maxUnavailable }}
  {{- end }}
  selector:
    matchLabels:
      {{- include "registry.selectorLabels" . | nindent 6 }}
{{- end }}

# Ingress
{{- if .Values.ingress.enabled }}
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: {{ include "registry.fullname" . }}
  {{- with .Values.ingress.annotations }}
  annotations:
    {{- toYaml . | nindent 4 }}
  {{- end }}
spec:
  ingressClassName: {{ .Values.ingress.className }}
  {{- if .Values.ingress.tls.enabled }}
  tls:
    - hosts:
        - {{ .Values.ingress.hostname }}
      secretName: {{ .Values.ingress.tls.secretName }}
  {{- end }}
  rules:
    - host: {{ .Values.ingress.hostname }}
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: {{ include "registry.fullname" . }}
                port:
                  number: {{ .Values.service.port }}
{{- end }}
```

## Dependency Management

### Chart.yaml Dependencies

```yaml
apiVersion: v2
name: mcp-registry-gateway-stack
version: 0.1.0
dependencies:
  # External chart from OCI registry
  - name: keycloak
    version: 25.2.0
    repository: oci://registry-1.docker.io/bitnamicharts

  # External chart from Helm repo
  - name: mongodb-kubernetes
    version: 1.6.1
    repository: https://mongodb.github.io/helm-charts
    condition: mongodb.enabled

  # Local subchart
  - name: registry
    version: 0.1.0
    repository: "file://../registry"
```

### Update Dependencies

```bash
# Update and download dependencies
helm dependency update charts/mcp-gateway-registry-stack

# List dependencies
helm dependency list charts/mcp-gateway-registry-stack
```

## Best Practices

### Values Organization

1. **Global values** for cross-chart settings (domain, secrets)
2. **App values** for application-specific config
3. **Service values** for Kubernetes service config
4. **Resources** separate from app config
5. **Probes** separate for easy tuning
6. **Ingress** always conditional
7. **PDB** always conditional

### Security Defaults

```yaml
spec:
  template:
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - securityContext:
            allowPrivilegeEscalation: false
            capabilities:
              drop:
                - ALL
```

### Resource Defaults

```yaml
resources:
  requests:
    cpu: 100m      # Minimum for scheduling
    memory: 256Mi  # Minimum for operation
  limits:
    cpu: 1000m     # Burst capacity
    memory: 1Gi    # OOM protection
```

## Commands Reference

```bash
# Dependency management
helm dependency update charts/mcp-gateway-registry-stack
helm dependency list charts/mcp-gateway-registry-stack
helm dependency build charts/mcp-gateway-registry-stack

# Linting
helm lint charts/registry
helm lint charts/mcp-gateway-registry-stack

# Templating
helm template mcp-stack charts/mcp-gateway-registry-stack
helm template mcp-stack charts/mcp-gateway-registry-stack --debug

# Installation
helm install mcp-stack charts/mcp-gateway-registry-stack -n mcp-gateway
helm install mcp-stack charts/mcp-gateway-registry-stack -n mcp-gateway --dry-run
helm install mcp-stack charts/mcp-gateway-registry-stack -n mcp-gateway -f values-prod.yaml

# Upgrade
helm upgrade mcp-stack charts/mcp-gateway-registry-stack -n mcp-gateway
helm upgrade --install mcp-stack charts/mcp-gateway-registry-stack -n mcp-gateway

# Status
helm status mcp-stack -n mcp-gateway
helm list -n mcp-gateway
helm history mcp-stack -n mcp-gateway

# Uninstall
helm uninstall mcp-stack -n mcp-gateway
```
