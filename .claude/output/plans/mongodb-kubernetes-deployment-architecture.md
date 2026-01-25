# MongoDB CE 8.2 Kubernetes Deployment Architecture

**Created**: 2026-01-24
**Status**: Draft
**Version**: 1.0

## Executive Summary

This plan provides a comprehensive Kubernetes deployment architecture for MongoDB CE 8.2 with native vector search support. It covers the MongoDB Kubernetes Operator (unified operator), MongoDBSearch CRD for mongot pods, resource sizing, high availability patterns, and production-ready configurations.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Kubernetes Cluster                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        mcp-gateway Namespace                            ││
│  │                                                                          ││
│  │  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  ││
│  │  │  MCP Registry    │───▶│   MongoDB RS     │◀───│  MongoDBSearch   │  ││
│  │  │  (Deployment)    │    │   (StatefulSet)  │    │  (mongot pods)   │  ││
│  │  │                  │    │                  │    │                  │  ││
│  │  │  - registry pod  │    │  - mongod-0      │    │  - mongot-0      │  ││
│  │  │  - registry pod  │    │  - mongod-1      │    │  - mongot-1      │  ││
│  │  │                  │    │  - mongod-2      │    │                  │  ││
│  │  └──────────────────┘    └──────────────────┘    └──────────────────┘  ││
│  │           │                       │                       │             ││
│  │           ▼                       ▼                       ▼             ││
│  │  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  ││
│  │  │    Service       │    │    Service       │    │    PVC           │  ││
│  │  │  (ClusterIP)     │    │  (Headless)      │    │  (mongot data)   │  ││
│  │  └──────────────────┘    └──────────────────┘    └──────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                     mongodb-operator Namespace                          ││
│  │  ┌──────────────────────────────────────────────────────────────────┐  ││
│  │  │              MongoDB Kubernetes Operator                          │  ││
│  │  │              (unified operator v1.1+)                             │  ││
│  │  │                                                                    │  ││
│  │  │  Manages: MongoDB, MongoDBSearch, MongoDBMultiCluster CRDs        │  ││
│  │  └──────────────────────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. MongoDB Kubernetes Operator

The **unified MongoDB Kubernetes Operator** (`mongodb/mongodb-kubernetes`) replaces the deprecated community operator (`mongodb/mongodb-kubernetes-operator`). The deprecation was announced in November 2025.

**Key Features:**
- Manages MongoDB replica sets and sharded clusters
- Supports MongoDBSearch CRD for mongot deployment
- Handles rolling upgrades, scaling, and backups
- Integrates with cert-manager for TLS

**Helm Installation:**

```bash
# Add MongoDB Helm repository
helm repo add mongodb https://mongodb.github.io/helm-charts
helm repo update

# Install the operator
helm install mongodb-operator mongodb/mongodb-kubernetes \
  --namespace mongodb-operator \
  --create-namespace \
  --set operator.watchNamespace="mcp-gateway"
```

### 2. MongoDB Replica Set

**File**: `charts/mcp-gateway-registry-stack/templates/mongodb-replicaset.yaml`

```yaml
apiVersion: mongodb.com/v1
kind: MongoDB
metadata:
  name: mcp-mongodb
  namespace: mcp-gateway
spec:
  type: ReplicaSet
  members: 3
  version: "8.2.0"

  # Security configuration
  security:
    authentication:
      modes: ["SCRAM"]

  # Pod template for mongod
  podSpec:
    podTemplate:
      spec:
        containers:
          - name: mongod
            resources:
              requests:
                cpu: "500m"
                memory: "2Gi"
              limits:
                cpu: "2"
                memory: "4Gi"
        # Pod anti-affinity for HA
        affinity:
          podAntiAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
              - weight: 100
                podAffinityTerm:
                  labelSelector:
                    matchLabels:
                      app.kubernetes.io/name: mcp-mongodb
                  topologyKey: kubernetes.io/hostname

  # Persistent storage
  persistent: true
  podSpec:
    persistence:
      single:
        storage: 50Gi
        storageClass: standard  # Adjust for your cluster

  # Additional mongod configuration
  additionalMongodConfig:
    storage:
      wiredTiger:
        engineConfig:
          cacheSizeGB: 1.5
    net:
      maxIncomingConnections: 1000
```

### 3. MongoDBSearch (mongot) Deployment

The `MongoDBSearch` CRD deploys mongot pods that handle vector indexing and similarity search. This is the critical component for MongoDB CE 8.2 native vector search.

**File**: `charts/mcp-gateway-registry-stack/templates/mongodb-search.yaml`

```yaml
apiVersion: mongodb.com/v1
kind: MongoDBSearch
metadata:
  name: mcp-mongodb-search
  namespace: mcp-gateway
spec:
  # Reference to the MongoDB replica set
  mongoDBResourceRef:
    name: mcp-mongodb

  # Resource requirements for mongot pods
  resourceRequirements:
    requests:
      cpu: "500m"
      memory: "2Gi"
    limits:
      cpu: "2"
      memory: "8Gi"

  # Persistence for mongot index data
  persistence:
    single:
      storage: 20Gi
      storageClass: standard

  # Optional: Pod template customization
  podSpec:
    podTemplate:
      spec:
        affinity:
          podAntiAffinity:
            preferredDuringSchedulingIgnoredDuringExecution:
              - weight: 100
                podAffinityTerm:
                  labelSelector:
                    matchLabels:
                      app.kubernetes.io/name: mcp-mongodb-search
                  topologyKey: kubernetes.io/hostname
```

---

## Resource Sizing Guidelines

### Memory Sizing for Vector Search

MongoDB CE 8.2 vector search uses HNSW algorithm, which requires vectors to reside in RAM for optimal performance.

**Formula:**
```
mongot_memory = (num_vectors × dimensions × 4 bytes) × 1.25 buffer
```

**Sizing Table:**

| Embedding Dimensions | Document Count | Raw Vector Size | Recommended mongot Memory |
|---------------------|----------------|-----------------|---------------------------|
| 384 | 10,000 | 15 MB | 512 Mi |
| 384 | 100,000 | 147 MB | 1 Gi |
| 384 | 1,000,000 | 1.47 GB | 4 Gi |
| 768 | 10,000 | 30 MB | 512 Mi |
| 768 | 100,000 | 294 MB | 1 Gi |
| 768 | 1,000,000 | 2.94 GB | 8 Gi |
| 1536 | 10,000 | 60 MB | 512 Mi |
| 1536 | 100,000 | 588 MB | 2 Gi |
| 1536 | 1,000,000 | 5.88 GB | 16 Gi |

**Quantization Options:**

| Type | Memory Reduction | Use Case |
|------|------------------|----------|
| None (float32) | 1x | Highest accuracy |
| Scalar (int8) | ~3.75x | Good balance |
| Binary (1-bit) | ~24x | Maximum reduction, some accuracy loss |

### CPU Sizing

| Workload | mongod CPU | mongot CPU |
|----------|------------|------------|
| Development | 500m | 500m |
| Small Production (<100k docs) | 1 | 1 |
| Medium Production (100k-1M docs) | 2 | 2 |
| Large Production (>1M docs) | 4 | 4 |

### Storage Sizing

| Component | Base Size | Per 100k Docs | Notes |
|-----------|-----------|---------------|-------|
| mongod data | 10 Gi | +5 Gi | Document storage + indexes |
| mongot data | 5 Gi | +2 Gi | Vector index files |

---

## High Availability Configuration

### Production HA Pattern

For production deployments, use a 3-member replica set with mongot replicas:

```yaml
# MongoDB HA configuration
apiVersion: mongodb.com/v1
kind: MongoDB
metadata:
  name: mcp-mongodb
spec:
  type: ReplicaSet
  members: 3  # Primary + 2 secondaries

  # Enable read preference for scaling reads
  additionalMongodConfig:
    replication:
      readConcern:
        default: majority
      writeConcern:
        default:
          w: majority

---
apiVersion: mongodb.com/v1
kind: MongoDBSearch
metadata:
  name: mcp-mongodb-search
spec:
  mongoDBResourceRef:
    name: mcp-mongodb
  # mongot pods scale independently
  # One mongot per mongod for full HA
```

### Pod Disruption Budget

**File**: `charts/mcp-gateway-registry-stack/templates/mongodb-pdb.yaml`

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: mcp-mongodb-pdb
  namespace: mcp-gateway
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app.kubernetes.io/name: mcp-mongodb
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: mcp-mongodb-search-pdb
  namespace: mcp-gateway
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app.kubernetes.io/name: mcp-mongodb-search
```

### Topology Spread Constraints

For clusters with multiple availability zones:

```yaml
spec:
  podSpec:
    podTemplate:
      spec:
        topologySpreadConstraints:
          - maxSkew: 1
            topologyKey: topology.kubernetes.io/zone
            whenUnsatisfiable: DoNotSchedule
            labelSelector:
              matchLabels:
                app.kubernetes.io/name: mcp-mongodb
```

---

## Helm Chart Integration

### Updated Stack Chart Dependencies

**File**: `charts/mcp-gateway-registry-stack/Chart.yaml`

```yaml
apiVersion: v2
name: mcp-gateway-registry-stack
description: MCP Gateway Registry Stack with MongoDB CE 8.2
version: 2.1.0
appVersion: "2.0.14"

dependencies:
  - name: registry
    version: "1.0.x"
    repository: "file://../registry"
    condition: registry.enabled

  - name: auth-server
    version: "1.0.x"
    repository: "file://../auth-server"
    condition: auth-server.enabled

  # MongoDB operator is installed separately, not as dependency
  # These are the application components
```

### Stack Values for MongoDB CE 8.2

**File**: `charts/mcp-gateway-registry-stack/values.yaml`

```yaml
global:
  domain: "example.com"
  secretKey: ""

  # MongoDB CE 8.2 configuration
  mongodb:
    enabled: true
    architecture: replicaset
    version: "8.2.0"
    replicaCount: 3

    # Resource sizing (adjust based on expected load)
    resources:
      mongod:
        requests:
          cpu: "1"
          memory: "2Gi"
        limits:
          cpu: "2"
          memory: "4Gi"
      mongot:
        requests:
          cpu: "500m"
          memory: "2Gi"
        limits:
          cpu: "2"
          memory: "8Gi"

    # Storage configuration
    persistence:
      mongod:
        enabled: true
        size: 50Gi
        storageClass: ""  # Uses default storage class
      mongot:
        enabled: true
        size: 20Gi
        storageClass: ""

    # Authentication
    auth:
      enabled: true
      existingSecret: "mcp-mongodb-credentials"

    # Vector search specific settings
    vectorSearch:
      enabled: true
      dimensions: 384  # Match your embedding model
      expectedDocuments: 100000  # For sizing calculations

# Registry configuration
registry:
  enabled: true
  replicaCount: 2

  env:
    STORAGE_BACKEND: "mongodb-ce-82"
    DOCUMENTDB_HOST: "mcp-mongodb-svc.mcp-gateway.svc.cluster.local"
    DOCUMENTDB_PORT: "27017"
    DOCUMENTDB_DATABASE: "mcp_registry"
    MONGODB_VECTOR_INDEX_NAME: "vector_index"
```

### MongoDB Templates

**File**: `charts/mcp-gateway-registry-stack/templates/mongodb.yaml`

```yaml
{{- if .Values.global.mongodb.enabled }}
apiVersion: mongodb.com/v1
kind: MongoDB
metadata:
  name: mcp-mongodb
  namespace: {{ .Release.Namespace }}
  labels:
    {{- include "mcp-stack.labels" . | nindent 4 }}
spec:
  type: ReplicaSet
  members: {{ .Values.global.mongodb.replicaCount }}
  version: {{ .Values.global.mongodb.version | quote }}

  security:
    authentication:
      modes: ["SCRAM"]
    {{- if .Values.global.mongodb.auth.enabled }}
    users:
      - name: admin
        db: admin
        passwordSecretRef:
          name: {{ .Values.global.mongodb.auth.existingSecret }}
          key: mongodb-root-password
        roles:
          - name: root
            db: admin
      - name: registry
        db: mcp_registry
        passwordSecretRef:
          name: {{ .Values.global.mongodb.auth.existingSecret }}
          key: mongodb-registry-password
        roles:
          - name: readWrite
            db: mcp_registry
    {{- end }}

  podSpec:
    podTemplate:
      spec:
        containers:
          - name: mongod
            resources:
              {{- toYaml .Values.global.mongodb.resources.mongod | nindent 14 }}

  persistent: {{ .Values.global.mongodb.persistence.mongod.enabled }}
  {{- if .Values.global.mongodb.persistence.mongod.enabled }}
  podSpec:
    persistence:
      single:
        storage: {{ .Values.global.mongodb.persistence.mongod.size }}
        {{- if .Values.global.mongodb.persistence.mongod.storageClass }}
        storageClass: {{ .Values.global.mongodb.persistence.mongod.storageClass }}
        {{- end }}
  {{- end }}

  additionalMongodConfig:
    storage:
      wiredTiger:
        engineConfig:
          # Use 50% of container memory for WiredTiger cache
          cacheSizeGB: {{ div (include "mongodb.memoryLimitGi" .Values.global.mongodb.resources.mongod.limits.memory) 2 }}
{{- end }}
---
{{- if and .Values.global.mongodb.enabled .Values.global.mongodb.vectorSearch.enabled }}
apiVersion: mongodb.com/v1
kind: MongoDBSearch
metadata:
  name: mcp-mongodb-search
  namespace: {{ .Release.Namespace }}
  labels:
    {{- include "mcp-stack.labels" . | nindent 4 }}
spec:
  mongoDBResourceRef:
    name: mcp-mongodb

  resourceRequirements:
    {{- toYaml .Values.global.mongodb.resources.mongot | nindent 4 }}

  persistence:
    single:
      storage: {{ .Values.global.mongodb.persistence.mongot.size }}
      {{- if .Values.global.mongodb.persistence.mongot.storageClass }}
      storageClass: {{ .Values.global.mongodb.persistence.mongot.storageClass }}
      {{- end }}
{{- end }}
```

### Secrets Template

**File**: `charts/mcp-gateway-registry-stack/templates/mongodb-secrets.yaml`

```yaml
{{- if and .Values.global.mongodb.enabled .Values.global.mongodb.auth.enabled }}
{{- if not .Values.global.mongodb.auth.existingSecret }}
apiVersion: v1
kind: Secret
metadata:
  name: mcp-mongodb-credentials
  namespace: {{ .Release.Namespace }}
  labels:
    {{- include "mcp-stack.labels" . | nindent 4 }}
type: Opaque
stringData:
  mongodb-root-password: {{ .Values.global.mongodb.auth.rootPassword | required "mongodb.auth.rootPassword is required" | quote }}
  mongodb-registry-password: {{ .Values.global.mongodb.auth.registryPassword | required "mongodb.auth.registryPassword is required" | quote }}
{{- end }}
{{- end }}
```

---

## Network Policies

**File**: `charts/mcp-gateway-registry-stack/templates/mongodb-networkpolicy.yaml`

```yaml
{{- if .Values.global.mongodb.enabled }}
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: mcp-mongodb-network-policy
  namespace: {{ .Release.Namespace }}
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: mcp-mongodb
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow from registry pods
    - from:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: registry
      ports:
        - protocol: TCP
          port: 27017
    # Allow from mongot pods
    - from:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: mcp-mongodb-search
      ports:
        - protocol: TCP
          port: 27017
    # Allow replica set members to communicate
    - from:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: mcp-mongodb
      ports:
        - protocol: TCP
          port: 27017
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
    # Replica set members
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: mcp-mongodb
      ports:
        - protocol: TCP
          port: 27017
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: mcp-mongodb-search-network-policy
  namespace: {{ .Release.Namespace }}
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: mcp-mongodb-search
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # mongot receives change streams from mongod
    - from:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: mcp-mongodb
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
    # Connect to mongod for change streams
    - to:
        - podSelector:
            matchLabels:
              app.kubernetes.io/name: mcp-mongodb
      ports:
        - protocol: TCP
          port: 27017
{{- end }}
```

---

## Monitoring and Observability

### Prometheus ServiceMonitor

**File**: `charts/mcp-gateway-registry-stack/templates/mongodb-servicemonitor.yaml`

```yaml
{{- if and .Values.global.mongodb.enabled .Values.global.monitoring.enabled }}
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: mcp-mongodb-monitor
  namespace: {{ .Release.Namespace }}
  labels:
    {{- include "mcp-stack.labels" . | nindent 4 }}
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: mcp-mongodb
  endpoints:
    - port: prometheus
      interval: 30s
      path: /metrics
{{- end }}
```

### Key Metrics to Monitor

| Metric | Alert Threshold | Description |
|--------|-----------------|-------------|
| `mongodb_connections_current` | > 80% of max | Connection pool saturation |
| `mongodb_mongot_index_size_bytes` | > 80% of memory | Vector index memory pressure |
| `mongodb_mongot_query_latency_ms` | > 500ms p95 | Vector search performance |
| `mongodb_replication_lag_seconds` | > 10s | Replica set lag |
| `mongodb_mongot_change_stream_lag` | > 60s | mongot sync delay |

### Grafana Dashboard

Create a MongoDB CE 8.2 Vector Search dashboard with panels for:
- Vector search latency distribution
- mongot memory usage vs limit
- Index build progress
- Query volume and patterns
- Replication status

---

## Deployment Runbook

### Initial Deployment

```bash
# 1. Install MongoDB Operator (if not already installed)
helm repo add mongodb https://mongodb.github.io/helm-charts
helm repo update

helm install mongodb-operator mongodb/mongodb-kubernetes \
  --namespace mongodb-operator \
  --create-namespace \
  --set operator.watchNamespace="mcp-gateway"

# 2. Wait for operator to be ready
kubectl wait --for=condition=available deployment/mongodb-operator \
  --namespace mongodb-operator \
  --timeout=120s

# 3. Create secrets
kubectl create secret generic mcp-mongodb-credentials \
  --namespace mcp-gateway \
  --from-literal=mongodb-root-password="$(openssl rand -base64 32)" \
  --from-literal=mongodb-registry-password="$(openssl rand -base64 32)"

# 4. Deploy the stack
helm install mcp-stack charts/mcp-gateway-registry-stack \
  --namespace mcp-gateway \
  --create-namespace \
  --set global.domain=registry.example.com \
  --set global.mongodb.enabled=true \
  --set global.mongodb.vectorSearch.enabled=true

# 5. Wait for MongoDB replica set to be ready
kubectl wait --for=condition=ready mongodb/mcp-mongodb \
  --namespace mcp-gateway \
  --timeout=600s

# 6. Wait for MongoDBSearch to be ready
kubectl wait --for=condition=ready mongodbsearch/mcp-mongodb-search \
  --namespace mcp-gateway \
  --timeout=600s

# 7. Verify vector search is working
kubectl exec -it deployment/registry -n mcp-gateway -- \
  python -c "from registry.repositories.factory import get_search_repository; import asyncio; asyncio.run(get_search_repository().initialize())"
```

### Scaling Operations

```bash
# Scale mongod replica set (requires operator action)
kubectl patch mongodb mcp-mongodb -n mcp-gateway \
  --type merge \
  --patch '{"spec": {"members": 5}}'

# Increase mongot resources
kubectl patch mongodbsearch mcp-mongodb-search -n mcp-gateway \
  --type merge \
  --patch '{"spec": {"resourceRequirements": {"limits": {"memory": "16Gi"}}}}'
```

### Backup and Restore

```bash
# Create backup (using MongoDB operator backup feature)
kubectl apply -f - <<EOF
apiVersion: mongodb.com/v1
kind: MongoDBBackup
metadata:
  name: mcp-mongodb-backup-$(date +%Y%m%d)
  namespace: mcp-gateway
spec:
  mongoDBResourceRef:
    name: mcp-mongodb
  s3:
    bucket: mcp-backups
    prefix: mongodb/
EOF

# Restore from backup
kubectl apply -f - <<EOF
apiVersion: mongodb.com/v1
kind: MongoDBRestore
metadata:
  name: mcp-mongodb-restore
  namespace: mcp-gateway
spec:
  mongoDBResourceRef:
    name: mcp-mongodb
  backupRef:
    name: mcp-mongodb-backup-20260124
EOF
```

---

## Troubleshooting

### Common Issues

| Issue | Symptoms | Resolution |
|-------|----------|------------|
| mongot not syncing | `$vectorSearch` returns empty results | Check mongot logs, verify change stream connectivity |
| Memory pressure | mongot OOMKilled | Increase memory limits, consider quantization |
| Slow vector search | High latency on queries | Increase `numCandidates`, check index health |
| Replica set not forming | Pods stuck in pending | Verify PVCs, check node resources |
| Search index not created | Index creation fails | Ensure mongot is running, check mongod logs |

### Debug Commands

```bash
# Check MongoDB pod status
kubectl get pods -l app.kubernetes.io/name=mcp-mongodb -n mcp-gateway

# Check mongot pod status
kubectl get pods -l app.kubernetes.io/name=mcp-mongodb-search -n mcp-gateway

# View MongoDB operator logs
kubectl logs -l app.kubernetes.io/name=mongodb-operator -n mongodb-operator

# Check replica set status
kubectl exec -it mcp-mongodb-0 -n mcp-gateway -- mongosh --eval "rs.status()"

# Check search indexes
kubectl exec -it mcp-mongodb-0 -n mcp-gateway -- mongosh mcp_registry --eval "db.hybrid_search.getSearchIndexes()"

# View mongot logs
kubectl logs -l app.kubernetes.io/name=mcp-mongodb-search -n mcp-gateway

# Test vector search from registry pod
kubectl exec -it deployment/registry -n mcp-gateway -- python -c "
from registry.repositories.factory import get_search_repository
import asyncio

async def test():
    repo = get_search_repository()
    await repo.initialize()
    results = await repo.search('weather api')
    print(f'Found {len(results.get(\"servers\", []))} servers')

asyncio.run(test())
"
```

---

## Migration from Existing Deployments

### From MongoDB CE < 8.2 (client-side search)

1. Upgrade MongoDB to 8.2
2. Deploy mongot via MongoDBSearch CRD
3. Update `STORAGE_BACKEND` to `mongodb-ce-82`
4. Run index migration: registry will create search indexes on startup
5. Monitor search performance

### From AWS DocumentDB

1. Export data from DocumentDB
2. Import to MongoDB CE 8.2 cluster
3. Update connection strings
4. Registry will auto-detect and create appropriate indexes

### From FAISS file-based storage

1. Deploy MongoDB CE 8.2 cluster
2. Update `STORAGE_BACKEND` to `mongodb-ce-82`
3. Run data migration script to import servers/agents
4. Embeddings will be regenerated during import

---

## Cost Considerations

### Resource Costs (Example: AWS EKS)

| Component | Instance Type | Monthly Cost (approx) |
|-----------|---------------|----------------------|
| MongoDB Primary | m6i.large | $70 |
| MongoDB Secondary (x2) | m6i.large | $140 |
| mongot (x3) | r6i.large | $225 |
| EBS Storage (200Gi total) | gp3 | $20 |
| **Total** | | **~$455/month** |

### Cost Optimization

1. **Development environments**: Use single-node replica set with minimal resources
2. **Staging**: Use 3-node replica set with reduced memory
3. **Production**: Full HA with sizing based on actual load
4. **Quantization**: Use scalar quantization to reduce mongot memory by 3.75x

---

## Security Checklist

- [ ] TLS enabled for all MongoDB connections
- [ ] Authentication enabled (SCRAM-SHA-256)
- [ ] Network policies restrict access to MongoDB pods
- [ ] Secrets stored in Kubernetes secrets (not in values files)
- [ ] RBAC configured for operator service account
- [ ] Pod security policies/standards enforced
- [ ] Regular backups configured and tested
- [ ] Audit logging enabled for compliance

---

## Files to Create/Modify

| Action | File | Description |
|--------|------|-------------|
| Create | `charts/mcp-gateway-registry-stack/templates/mongodb.yaml` | MongoDB + MongoDBSearch CRDs |
| Create | `charts/mcp-gateway-registry-stack/templates/mongodb-secrets.yaml` | Credentials secret |
| Create | `charts/mcp-gateway-registry-stack/templates/mongodb-pdb.yaml` | Pod disruption budgets |
| Create | `charts/mcp-gateway-registry-stack/templates/mongodb-networkpolicy.yaml` | Network policies |
| Create | `charts/mcp-gateway-registry-stack/templates/mongodb-servicemonitor.yaml` | Prometheus monitoring |
| Modify | `charts/mcp-gateway-registry-stack/Chart.yaml` | Update version |
| Modify | `charts/mcp-gateway-registry-stack/values.yaml` | Add MongoDB configuration |
| Modify | `charts/registry/values.yaml` | Add mongodb-ce-82 backend config |

---

## Timeline Summary

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Helm chart updates | 2 days | None |
| Testing in dev cluster | 2 days | Chart updates |
| Staging deployment | 1 day | Dev testing |
| Production deployment | 1 day | Staging validation |
| Monitoring setup | 1 day | Production deployment |
| **Total** | **7 days** | - |

---

## Appendix A: Full MongoDBSearch CRD Reference

```yaml
apiVersion: mongodb.com/v1
kind: MongoDBSearch
metadata:
  name: example-search
  namespace: example
spec:
  # Required: Reference to MongoDB replica set
  mongoDBResourceRef:
    name: my-mongodb
    namespace: example  # Optional, defaults to same namespace

  # Resource requirements for mongot pods
  resourceRequirements:
    requests:
      cpu: "500m"
      memory: "1Gi"
    limits:
      cpu: "2"
      memory: "4Gi"

  # Persistence for mongot index data
  persistence:
    single:
      storage: 10Gi
      storageClass: standard

  # Optional: Pod template customization
  podSpec:
    podTemplate:
      metadata:
        labels:
          custom-label: value
        annotations:
          custom-annotation: value
      spec:
        affinity: {}
        tolerations: []
        nodeSelector: {}
        securityContext: {}

  # Optional: Custom mongot configuration
  additionalMongotConfig: {}
```

## Appendix B: MongoDB Operator RBAC

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: mongodb-kubernetes-operator
rules:
  - apiGroups: ["mongodb.com"]
    resources: ["mongodb", "mongodbsearch", "mongodbmulticluster"]
    verbs: ["*"]
  - apiGroups: [""]
    resources: ["pods", "services", "configmaps", "secrets", "persistentvolumeclaims"]
    verbs: ["*"]
  - apiGroups: ["apps"]
    resources: ["statefulsets"]
    verbs: ["*"]
```
