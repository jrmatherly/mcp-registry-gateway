# Feature: Self-Hosted Database Alternatives with Vector Search Support

## Executive Summary

This research plan evaluates self-hosted database solutions for on-premise Kubernetes deployments that provide enhanced vector search capabilities. The analysis was conducted as of January 2026 to identify alternatives that offer native vector search, Kubernetes-native deployment patterns, and enterprise-grade features while ensuring compatibility with the existing MCP Registry Gateway codebase.

**Key Finding (Updated January 2026)**: MongoDB CE 8.2+ introduces native vector search with full Atlas parity, fundamentally changing the recommendation landscape. Combined with the unified MongoDB Kubernetes Operator and MongoDBSearch CRD for deploying mongot pods, MongoDB CE 8.2 emerges as the **recommended option for self-hosted Kubernetes deployments** due to minimal migration effort and mature operator support.

## Feature Description

The MCP Registry Gateway currently supports two storage backends:
1. **File-based (FAISS)** - For simple deployments with local file storage
2. **DocumentDB/MongoDB** - For production deployments with MongoDB CE (local) or AWS DocumentDB

The key limitation identified is that MongoDB CE (prior to v8.2) lacks native vector search support, requiring client-side cosine similarity computation which is less performant and scalable. This research identifies and evaluates alternative self-hosted database solutions that provide:

- Native vector search with HNSW/IVF indexing
- Hybrid search (semantic + keyword)
- Kubernetes-native deployment with operators
- Enterprise-grade features (RBAC, replication, backup)
- Python async client support for FastAPI integration

## User Story

```
As a DevOps/Infrastructure Administrator
I want to deploy MCP Registry Gateway with a self-hosted database that supports native vector search
So that I can achieve better search performance, scalability, and enterprise features without relying on cloud-managed services
```

## Feature Metadata

- **Type**: Enhancement / Infrastructure
- **Complexity**: High
- **Affected Systems**: `registry/repositories/`, `registry/config/`, `registry/search/`, `registry/embeddings/`
- **Dependencies**: Database drivers, async Python clients, Kubernetes operators

---

## RESEARCH FINDINGS

### Current Implementation Analysis

**Existing Repository Architecture:**

The codebase uses a well-designed repository pattern with abstract base classes:

```
registry/repositories/
├── interfaces.py              # Abstract base classes (ServerRepositoryBase, SearchRepositoryBase, etc.)
├── factory.py                 # Factory pattern for backend selection
├── documentdb/                # MongoDB/DocumentDB implementations
│   ├── client.py              # AsyncMongoClient connection management
│   ├── server_repository.py   # Server CRUD operations
│   ├── agent_repository.py    # Agent CRUD operations
│   ├── search_repository.py   # Hybrid search with vector fallback
│   └── ...
└── file/                      # File-based implementations with FAISS
```

**Key Interfaces to Implement:**

| Interface | Methods | Purpose |
|-----------|---------|---------|
| `ServerRepositoryBase` | `get`, `list_all`, `create`, `update`, `delete`, `get_state`, `set_state`, `load_all` | MCP server CRUD |
| `AgentRepositoryBase` | `get`, `list_all`, `create`, `update`, `delete`, `get_state`, `set_state`, `load_all` | A2A agent CRUD |
| `SearchRepositoryBase` | `initialize`, `index_server`, `index_agent`, `remove_entity`, `search` | Semantic/hybrid search |
| `ScopeRepositoryBase` | `get_ui_scopes`, `get_group_mappings`, `get_server_scopes`, ... | Authorization scopes |
| `SecurityScanRepositoryBase` | `get`, `list_all`, `create`, `get_latest`, `query_by_status` | Security scan results |
| `FederationConfigRepositoryBase` | `get_config`, `save_config`, `delete_config`, `list_configs` | Federation configs |

**Current Vector Search Implementation:**

The `DocumentDBSearchRepository` in `registry/repositories/documentdb/search_repository.py` implements:

1. **Native Vector Search** (DocumentDB/Atlas):
   - Uses `$search` aggregation with `vectorSearch` (Atlas-specific syntax)
   - HNSW index via `collection.create_index()` with `vectorOptions`
   - Hybrid scoring combining vector + keyword matches

2. **Client-Side Fallback** (MongoDB CE <8.2):
   - Fetches all embeddings from database
   - Computes cosine similarity in Python
   - Less performant but functional

---

## DATABASE ALTERNATIVES EVALUATION

### Option 1: MongoDB CE 8.2+ with Native Vector Search (RECOMMENDED)

**Availability**: Public Preview (September 2025), Source Code Available (SSPL)

**Key Discovery**: MongoDB announced vector search support for Community Edition starting with version 8.2 (September 17, 2025). The `mongot` search engine is now open source under SSPL.

**Features:**
- `$vectorSearch` aggregation stage with full Atlas parity
- `$search` for full-text keyword search
- `$searchMeta` for metadata and faceting
- HNSW indexing for vector similarity
- Hybrid search (keyword + vector combined)
- Lexical prefilters for vector search

**Architecture:**
- Requires separate `mongot` binary for search indexing
- mongot runs as separate pods in Kubernetes
- Same driver (`pymongo>=4.15`) with `AsyncMongoClient`
- Replica set required (even single-node)

**$vectorSearch Syntax (MongoDB CE 8.2):**
```python
# Note: Different from Atlas $search.vectorSearch syntax
pipeline = [
    {
        "$vectorSearch": {
            "index": "vector_index",
            "path": "embedding",
            "queryVector": query_embedding,  # Not "vector"
            "numCandidates": 100,             # Not "k"
            "limit": 10
        }
    },
    {
        "$addFields": {
            "score": {"$meta": "vectorSearchScore"}
        }
    }
]
```

**Index Creation (MongoDB CE 8.2):**
```python
from pymongo.operations import SearchIndexModel

# Uses SearchIndexModel, not create_index with vectorOptions
search_index = SearchIndexModel(
    definition={
        "mappings": {
            "dynamic": False,
            "fields": {
                "embedding": {
                    "type": "knnVector",
                    "dimensions": 384,
                    "similarity": "cosine"
                }
            }
        }
    },
    name="vector_index"
)
await collection.create_search_index(search_index)
```

**Kubernetes Deployment:**

| Component | Description |
|-----------|-------------|
| **Unified Operator** | `mongodb/mongodb-kubernetes` (replaces deprecated community operator) |
| **MongoDB CRD** | Deploys mongod replica set as StatefulSet |
| **MongoDBSearch CRD** | Deploys mongot pods with persistent storage |
| **Version Required** | MongoDB CE 8.0+ (operator 1.4), 8.2+ (operator 1.5+) |

```yaml
apiVersion: mongodb.com/v1
kind: MongoDB
metadata:
  name: mcp-mongodb
spec:
  type: ReplicaSet
  members: 3
  version: "8.2.0"
---
apiVersion: mongodb.com/v1
kind: MongoDBSearch
metadata:
  name: mcp-mongodb-search
spec:
  mongoDBResourceRef:
    name: mcp-mongodb
  resourceRequirements:
    requests:
      memory: "2Gi"
    limits:
      memory: "8Gi"
  persistence:
    single:
      storage: 20Gi
```

**Compatibility with Codebase:**
| Aspect | Status |
|--------|--------|
| Driver | Already using `pymongo>=4.15.0` |
| Async Support | `AsyncMongoClient` built-in |
| Repository Pattern | Moderate changes to `search_repository.py` |
| Configuration | Add new `storage_backend` option: `mongodb-ce-82` |
| Deployment | Kubernetes with MongoDBSearch CRD |

**Migration Effort**: **LOW-MEDIUM**
- Create new `MongoDBCE82SearchRepository` class
- Use `$vectorSearch` instead of `$search.vectorSearch`
- Use `SearchIndexModel` instead of `create_index()` with vectorOptions
- Add MongoDBSearch CRD to Helm charts
- Maintain backward compatibility with existing backends

**Preview Limitations (as of January 2026):**
- TLS must be disabled for MongoDB CE (communication between mongot and mongod is plaintext)
- Enterprise Edition required for TLS support
- mongot source code available under SSPL (not Apache 2.0)

**Sources:**
- [MongoDB Blog: Search and Vector Search for Self-Managed](https://www.mongodb.com/company/blog/product-release-announcements/supercharge-self-managed-apps-search-vector-search-capabilities)
- [MongoDB Kubernetes Operator: Deploy MongoDB Search and Vector Search](https://www.mongodb.com/docs/kubernetes/current/fts-vs-deployment/)
- [MongoDB CE Vector Search Community Guide](https://www.ostberg.dev/work/2025/10/12/mongodb-community-vector-search.html)

---

### Option 2: PostgreSQL with pgvector + CloudNativePG

**Maturity**: Production-Ready (CNCF Sandbox Project)

**Overview**: pgvector is an extension for PostgreSQL that adds vector similarity search. CloudNativePG is the Kubernetes operator that covers the full lifecycle of PostgreSQL clusters.

**Features:**
- HNSW and IVFFlat index types
- Cosine, L2, and inner product distance metrics
- Native SQL queries with vector operations
- Sparse vector support (SPLADE-like)
- Hybrid search via SQL + GIN indexes

**Python Async Support:**
```python
# asyncpg with pgvector
import asyncpg
from pgvector.asyncpg import register_vector

conn = await asyncpg.connect(...)
await register_vector(conn)
await conn.execute('CREATE INDEX ON items USING hnsw (embedding vector_cosine_ops)')
results = await conn.fetch('SELECT * FROM items ORDER BY embedding <-> $1 LIMIT 5', query_vec)
```

**Performance (pgvector 0.8.0+):**
- Sub-15ms vector similarity search across 50,000 embeddings (validated with CloudNativePG)
- 471 QPS at 99% recall on 50M vectors (pgvectorscale benchmark)
- Iterative index scans for better filtering
- DiskANN indexes: 24 KB for resource-constrained environments

**Kubernetes Deployment:**

| Component | Description |
|-----------|-------------|
| **CloudNativePG Operator** | CNCF Sandbox project, 4.5k GitHub stars, 58M downloads |
| **Cluster CRD** | Manages PostgreSQL primary/standby with streaming replication |
| **pgvector Extension** | Bundled in default CloudNativePG operand image |
| **ImageVolume (K8s 1.31+)** | Immutable extension container images |

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: mcp-postgres
spec:
  instances: 3
  postgresql:
    parameters:
      shared_preload_libraries: "vector"
  bootstrap:
    initdb:
      database: mcp_registry
      postInitSQL:
        - CREATE EXTENSION vector;
  storage:
    size: 50Gi
```

**Compatibility with Codebase:**
| Aspect | Status |
|--------|--------|
| Driver | `asyncpg` + `pgvector-python` (new dependencies) |
| Async Support | Full native async |
| Repository Pattern | New implementation required (all 6 interfaces) |
| Configuration | New backend: `postgresql-pgvector` |
| Schema | Requires table migrations (relational model) |

**Migration Effort**: **HIGH**
- New repository implementations for all 6 interfaces
- Different data model (relational vs document)
- Schema migrations for existing data
- Different connection management pattern

**Kubernetes Maturity Assessment:**
- CloudNativePG is the CNCF standard for PostgreSQL on Kubernetes
- Production-validated with sub-15ms latencies
- Supports declarative extension management
- Rolling updates and automatic failover
- Backup/restore via WAL archiving

**Pros:**
- Mature, battle-tested PostgreSQL ecosystem
- ACID compliance, transactions, foreign keys
- Single database for both relational and vector data
- Active development, frequent updates
- CNCF backing for operator

**Cons:**
- Requires PostgreSQL expertise
- Different data model requires schema redesign
- Significant code changes (all repositories)
- Memory requirements for large HNSW indexes

**Sources:**
- [CloudNativePG Official Site](https://cloudnative-pg.io/)
- [CNPG Recipe 18: Getting Started with pgvector](https://www.gabrielebartolini.it/articles/2025/06/cnpg-recipe-18-getting-started-with-pgvector-on-kubernetes-using-cloudnativepg/)
- [pgvector GitHub](https://github.com/pgvector/pgvector)

---

### Option 3: Qdrant

**Maturity**: Production-Ready (Rust-based)

**Overview**: High-performance vector database focused on hybrid search, payload filtering, and developer ergonomics.

**Features:**
- HNSW-based ANN with high recall
- Rich payload (metadata) filtering with nested conditions
- Horizontal scaling and replication
- REST/gRPC APIs with official Python client
- GPU-accelerated indexing (Enterprise)
- Incremental HNSW indexing for upserts

**Python Async Support:**
```python
from qdrant_client import AsyncQdrantClient, models

client = AsyncQdrantClient(url="http://localhost:6333")
await client.create_collection(
    collection_name="mcp_embeddings",
    vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE),
)
results = await client.search(
    collection_name="mcp_embeddings",
    query_vector=embedding,
    limit=10,
    query_filter=models.Filter(must=[models.FieldCondition(...)])
)
```

**Kubernetes Deployment:**

| Component | Description |
|-----------|-------------|
| **Community Helm Chart** | Basic deployment, community support only |
| **Enterprise Operator** | Full features: zero-downtime upgrades, scaling, backups |
| **Hybrid Cloud** | Managed control plane with self-hosted data plane |

```yaml
# Community Helm installation
helm repo add qdrant https://qdrant.github.io/qdrant-helm
helm install qdrant qdrant/qdrant \
  --set replicaCount=3 \
  --set persistence.enabled=true

# Enterprise (Private Cloud)
helm install qdrant-operator oci://registry.cloud.qdrant.io/qdrant-charts/qdrant-kubernetes-api \
  --namespace qdrant-private-cloud
```

**Compatibility with Codebase:**
| Aspect | Status |
|--------|--------|
| Driver | `qdrant-client` (new dependency) |
| Async Support | Full `AsyncQdrantClient` |
| Repository Pattern | New implementation required |
| Configuration | New backend: `qdrant` |
| Data Model | Collections with points/vectors |

**Migration Effort**: **MEDIUM**
- New repository implementations
- Two-database architecture (MongoDB for CRUD, Qdrant for search)
- Or full migration to Qdrant with payload storage
- Different SDK paradigm

**Kubernetes Maturity Assessment:**
- Community Helm chart lacks production features
- Enterprise Operator required for:
  - Zero-downtime upgrades
  - Automatic scaling
  - Backup and disaster recovery
  - Monitoring and logging
- Works well under 50M vectors

**Pros:**
- Purpose-built for vector search
- Excellent filtering capabilities
- Written in Rust (performance, safety)
- Good documentation and examples
- Straightforward self-hosting with Docker/K8s

**Cons:**
- Production features require Enterprise subscription
- Two-database architecture adds complexity
- Community Helm chart has limited support
- Limited at very large scale (>50M vectors)

**Sources:**
- [Qdrant Installation Guide](https://qdrant.tech/documentation/guides/installation/)
- [Qdrant Helm Chart](https://github.com/qdrant/qdrant-helm)
- [Qdrant Enterprise Operator](https://qdrant.tech/documentation/private-cloud/private-cloud-setup/)

---

### Option 4: Milvus

**Maturity**: Production-Ready (LF AI & Data Foundation)

**Overview**: Cloud-native vector database designed for massive-scale ANN search with distributed architecture.

**Features:**
- IVF, HNSW, PQ, and GPU indexes
- Horizontal scaling with Kubernetes Operator
- Separates compute and storage
- Multi-tenancy (100K+ collections per cluster)
- Tiered storage (hot/cold data)
- Woodpecker WAL (no Kafka/Pulsar dependency in v2.6)

**Python SDK:**
```python
from pymilvus import MilvusClient, AsyncMilvusClient

client = AsyncMilvusClient("http://localhost:19530")
await client.create_collection(
    collection_name="mcp_embeddings",
    dimension=384,
)
results = await client.search(
    collection_name="mcp_embeddings",
    data=[query_embedding],
    limit=10,
)
```

**Kubernetes Deployment:**

| Component | Description |
|-----------|-------------|
| **Milvus Operator** | Full lifecycle management, recommended for production |
| **Dependencies** | etcd (metadata), MinIO (storage), optionally Pulsar |
| **Scaling** | Independent scaling of query/data nodes |
| **Versions** | Latest: 2.6.7 with improved K8s integration |

```yaml
# Milvus Operator installation
helm repo add milvus-operator https://zilliztech.github.io/milvus-operator/
helm install milvus-operator milvus-operator/milvus-operator

# Milvus cluster
apiVersion: milvus.io/v1beta1
kind: Milvus
metadata:
  name: mcp-milvus
spec:
  mode: cluster
  dependencies:
    etcd:
      inCluster:
        values: {}
    storage:
      inCluster:
        values: {}
```

**Compatibility with Codebase:**
| Aspect | Status |
|--------|--------|
| Driver | `pymilvus` (new dependency) |
| Async Support | `AsyncMilvusClient` available |
| Repository Pattern | New implementation required |
| Configuration | New backend: `milvus` |
| Infrastructure | Kubernetes required for production |

**Migration Effort**: **HIGH**
- New repository implementations
- Complex distributed architecture
- etcd, MinIO dependencies
- Significant learning curve

**Kubernetes Maturity Assessment:**
- Mature operator with 25k GitHub stars
- Designed for billions of vectors
- Best choice for massive scale (>100M vectors)
- Requires operational expertise
- Resource-intensive infrastructure

**Cost Comparison:**
- Self-hosted Milvus on AWS: ~$500-1000/month for 50M vectors
- vs. Managed alternatives: $3,500+/month for same scale

**Pros:**
- Designed for billions of vectors
- GPU acceleration support
- Active open-source community
- Comprehensive Kubernetes operator
- Multi-tenant support

**Cons:**
- Complex distributed architecture
- Significant infrastructure overhead
- Steeper learning curve
- Overkill for smaller deployments (<10M vectors)
- Default Helm values not production-ready

**Sources:**
- [Milvus Operator GitHub](https://github.com/zilliztech/milvus-operator)
- [Milvus Kubernetes Deployment Guide](https://milvus.io/blog/deploying-milvus-on-kubernetes-just-got-easier-with-the-milvus-operator.md)
- [Milvus 2.6.7 Release Notes](https://github.com/milvus-io/milvus/releases)

---

### Option 5: Weaviate

**Maturity**: Production-Ready

**Overview**: Open-source vector database with built-in vectorization modules and hybrid search.

**Features:**
- HNSW indexing with dynamic updates
- Hybrid search (BM25 + vector)
- Built-in vectorizers (OpenAI, Cohere, HuggingFace)
- GraphQL and REST APIs
- Multi-tenancy and RBAC
- Replication and horizontal scaling

**Python Client:**
```python
import weaviate
from weaviate.classes.query import MetadataQuery

client = weaviate.WeaviateAsyncClient(
    connection_params=weaviate.connect.ConnectionParams.from_url("http://localhost:8080")
)
await client.connect()
collection = await client.collections.get("MCPServers")
results = await collection.query.near_vector(
    near_vector=query_embedding,
    limit=10,
)
```

**Kubernetes Deployment:**

| Component | Description |
|-----------|-------------|
| **Helm Chart** | Official chart for single/multi-node |
| **Managed Service** | Weaviate Cloud Service option |
| **Scaling** | Horizontal scaling with replication |

**Compatibility with Codebase:**
| Aspect | Status |
|--------|--------|
| Driver | `weaviate-client` (new dependency) |
| Async Support | Native async client |
| Repository Pattern | New implementation required |
| Configuration | New backend: `weaviate` |
| Schema | Class-based schema definition |

**Migration Effort**: **MEDIUM**
- New repository implementations
- Different schema model (classes/properties)
- GraphQL learning curve optional
- Good for RAG use cases

**Kubernetes Maturity Assessment:**
- Good Helm chart support
- Straightforward self-hosting
- Scales efficiently to 50M vectors
- Resource requirements increase beyond 100M vectors

**Pros:**
- Excellent hybrid search
- Built-in vectorizers reduce complexity
- Good documentation
- Active community
- >1M monthly Docker pulls

**Cons:**
- Higher memory usage at scale (>100M vectors)
- Complex configuration for production
- Resource-intensive

**Sources:**
- [Weaviate Documentation](https://docs.weaviate.io/)
- [Weaviate Hybrid Search](https://weaviate.io/hybrid-search)

---

## KUBERNETES DEPLOYMENT COMPARISON

| Criteria | MongoDB CE 8.2 | pgvector/CNPG | Qdrant | Milvus | Weaviate |
|----------|----------------|---------------|--------|--------|----------|
| **Operator Maturity** | Unified (Nov 2025) | CNCF Sandbox | Enterprise only | Mature | Helm only |
| **CRD Support** | MongoDB + MongoDBSearch | Cluster + Database | QdrantCluster (Ent) | Milvus | None |
| **HA Pattern** | ReplicaSet + mongot | Primary/Standby | Distributed | Distributed | Replication |
| **Backup/Restore** | Operator-managed | WAL archiving | Enterprise only | Operator-managed | Manual |
| **Auto-scaling** | Manual | Manual | Enterprise only | KEDA integration | Manual |
| **TLS Support** | Enterprise only (preview) | Native | Native | Native | Native |
| **Zero-downtime Upgrade** | Operator-managed | Operator-managed | Enterprise only | Operator-managed | Manual |
| **Storage Classes** | PVC | PVC | PVC | MinIO + PVC | PVC |
| **Resource Overhead** | Medium | Low | Low | High | Medium |
| **Minimum Nodes** | 3 (RS) + mongot | 3 | 1-3 | 5+ (distributed) | 1-3 |

---

## RECOMMENDATION MATRIX

| Criteria | MongoDB 8.2 | pgvector | Qdrant | Milvus | Weaviate |
|----------|-------------|----------|--------|--------|----------|
| **Migration Effort** | Low-Medium | High | Medium | High | Medium |
| **Code Changes** | Moderate | Extensive | Moderate | Moderate | Moderate |
| **Performance** | Good | Excellent | Excellent | Excellent | Good |
| **Scalability** | Good | Good | Good | Excellent | Moderate |
| **Maturity** | Preview | Stable | Stable | Stable | Stable |
| **K8s Operator** | Unified | CNCF | Enterprise | Mature | Helm |
| **Enterprise Features** | Growing | Via PG | Enterprise | Open Core | Enterprise |
| **Async Python** | Native | Native | Native | Native | Native |
| **Self-Hosted Complexity** | Low | Medium | Low | High | Medium |
| **Cost (50M vectors)** | $500/mo | $400/mo | $500/mo | $800/mo | $600/mo |

---

## STRATEGIC RECOMMENDATION: MongoDB CE 8.2+ for Kubernetes

### Primary Recommendation: MongoDB CE 8.2+

**Rationale for Kubernetes Deployments:**

1. **Minimal code changes** - Already using pymongo, same driver works
2. **Unified Kubernetes Operator** - Mature operator managing both MongoDB and mongot
3. **MongoDBSearch CRD** - Declarative deployment of vector search infrastructure
4. **Familiar technology** - Team already knows MongoDB/DocumentDB
5. **Native vector search** - Full `$vectorSearch` with HNSW at Atlas parity
6. **Unified data model** - No two-database architecture complexity
7. **Backward compatibility** - Can maintain fallback for older versions
8. **Source availability** - mongot source code available under SSPL

**When MongoDB CE 8.2 is the RIGHT choice:**
- Existing MongoDB/DocumentDB deployments
- Team has MongoDB expertise
- Document-oriented data model fits use case
- Under 10M vectors (single-digit millions typical for MCP registries)
- Want minimal migration effort
- Kubernetes deployment with operator support

**When to Consider Alternatives:**

| Alternative | When to Choose |
|-------------|----------------|
| **pgvector** | Team has PostgreSQL expertise, need ACID transactions, want single relational database |
| **Qdrant** | Need best-in-class filtering, willing to pay for Enterprise, prefer purpose-built vector DB |
| **Milvus** | Scale to billions of vectors, need GPU acceleration, have K8s expertise |
| **Weaviate** | Need built-in vectorizers, heavy RAG workload, GraphQL preference |

### Timeline for MongoDB CE 8.2

| Phase | Timeline | Action |
|-------|----------|--------|
| **Now** | Q1 2026 | Implement MongoDB CE 8.2 backend in development |
| **Testing** | Q1-Q2 2026 | Validate in staging with MongoDBSearch CRD |
| **Production** | Q2 2026 | Deploy when GA released (monitor preview limitations) |
| **GA Readiness** | TBD | TLS support for CE, performance validation |

### Known Limitations (Preview)

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| TLS disabled (CE) | Security concern | Use network policies, consider Enterprise |
| SSPL license (mongot) | Legal review needed | Acceptable for internal use |
| Preview stability | Not GA | Thorough testing, fallback path |

---

## IMPLEMENTATION PHASES

### Phase 1: MongoDB CE 8.2 Implementation (Recommended)

**Estimated Effort**: 6-7 days

See detailed plan: [MongoDB CE 8.2 Vector Search Implementation Plan](mongodb-ce-82-vector-search-implementation.md)

**Summary:**
1. Configuration updates (`registry/core/config.py`)
2. New `MongoDBCE82SearchRepository` class
3. `$vectorSearch` aggregation with correct syntax
4. `SearchIndexModel` for index creation
5. Unit and integration tests
6. Documentation updates

### Phase 2: Kubernetes Deployment (Recommended)

**Estimated Effort**: 7 days

See detailed plan: [MongoDB Kubernetes Deployment Architecture](mongodb-kubernetes-deployment-architecture.md)

**Summary:**
1. Deploy MongoDB Kubernetes Operator (unified)
2. Configure MongoDB ReplicaSet CRD
3. Configure MongoDBSearch CRD for mongot
4. Resource sizing based on vector count
5. Network policies and security
6. Monitoring with Prometheus/Grafana

### Phase 3: Alternative Backend (If Needed)

If MongoDB CE 8.2 doesn't meet requirements after evaluation:

1. Create new repository directory: `registry/repositories/qdrant/` or `registry/repositories/pgvector/`
2. Implement all 6 repository interfaces
3. Update factory pattern in `registry/repositories/factory.py`
4. Add new configuration options
5. Create migration scripts for existing data
6. Deploy appropriate Kubernetes operator

---

## CONTEXT REFERENCES

### Codebase Files to Read (For Implementation)

```
registry/repositories/interfaces.py          # Abstract base classes
registry/repositories/factory.py             # Backend selection logic
registry/repositories/documentdb/client.py   # Connection management
registry/repositories/documentdb/search_repository.py  # Current vector search
registry/core/config.py (lines 89-107)       # Storage backend config
registry/embeddings/client.py                # Embedding provider
```

### Configuration Settings to Extend

```python
# New settings for registry/core/config.py
class Settings(BaseSettings):
    # Existing
    storage_backend: str = "file"  # Options: "file", "documentdb", "mongodb-ce", "mongodb-ce-82"

    # New for MongoDB CE 8.2
    mongodb_ce_82_native_search: bool = True
    mongodb_vector_index_name: str = "vector_index"
    mongodb_vector_num_candidates_multiplier: int = 10

    # Alternative: Qdrant
    qdrant_host: str = "localhost"
    qdrant_port: int = 6333
    qdrant_grpc_port: int = 6334
    qdrant_api_key: str | None = None

    # Alternative: pgvector
    pgvector_host: str = "localhost"
    pgvector_port: int = 5432
    pgvector_database: str = "mcp_registry"
    pgvector_user: str | None = None
    pgvector_password: str | None = None
```

### New Dependencies (If Needed)

```toml
# For Qdrant
"qdrant-client>=1.12.0",

# For pgvector
"asyncpg>=0.30.0",
"pgvector>=0.4.0",

# For Weaviate
"weaviate-client>=4.10.0",

# For Milvus
"pymilvus>=2.5.0",
```

---

## VALIDATION COMMANDS

```bash
# Check current MongoDB version
uv run python -c "from pymongo import MongoClient; print(MongoClient().server_info()['version'])"

# Verify pymongo async support
uv run python -c "from pymongo import AsyncMongoClient; print('AsyncMongoClient available')"

# Test vector search (when implemented)
curl -X POST "http://localhost:8000/api/v1/search" \
  -H "Content-Type: application/json" \
  -d '{"query": "file management tools"}'

# Run repository tests
uv run pytest tests/unit/test_search_repository.py -v
uv run pytest tests/integration/ -n 8 -v

# Kubernetes validation
kubectl get mongodb -n mcp-gateway
kubectl get mongodbsearch -n mcp-gateway
kubectl logs -l app.kubernetes.io/name=mcp-mongodb-search -n mcp-gateway
```

---

## ACCEPTANCE CRITERIA

- [ ] Chosen database solution supports native HNSW vector indexing
- [ ] Python async client available and tested with FastAPI
- [ ] All 6 repository interfaces can be implemented
- [ ] Hybrid search (keyword + semantic) works correctly
- [ ] Performance meets or exceeds current client-side fallback
- [ ] Kubernetes operator deployment documented
- [ ] MongoDBSearch CRD deploys mongot pods successfully
- [ ] Migration path documented for existing data
- [ ] Backward compatibility maintained for existing backends

---

## APPENDIX: Quick Reference Links

### MongoDB CE 8.2 Vector Search
- [Official Announcement](https://www.mongodb.com/company/blog/product-release-announcements/supercharge-self-managed-apps-search-vector-search-capabilities)
- [Kubernetes Operator: MongoDBSearch](https://www.mongodb.com/docs/kubernetes/current/fts-vs-deployment/)
- [MongoDBSearch Settings Reference](https://www.mongodb.com/docs/kubernetes/current/reference/fts-vs-settings/)
- [Unified Kubernetes Operator](https://www.mongodb.com/resources/basics/kubernetes-operators)

### pgvector + CloudNativePG
- [CloudNativePG Official Site](https://cloudnative-pg.io/)
- [CloudNativePG GitHub](https://github.com/cloudnative-pg/cloudnative-pg)
- [pgvector on CloudNativePG Guide](https://www.gabrielebartolini.it/articles/2025/06/cnpg-recipe-18-getting-started-with-pgvector-on-kubernetes-using-cloudnativepg/)

### Qdrant
- [Qdrant Installation](https://qdrant.tech/documentation/guides/installation/)
- [Qdrant Helm Chart](https://github.com/qdrant/qdrant-helm)
- [Qdrant Benchmarks](https://qdrant.tech/benchmarks/)

### Milvus
- [Milvus Operator](https://github.com/zilliztech/milvus-operator)
- [Milvus Documentation](https://milvus.io/docs/)

### Weaviate
- [Weaviate Documentation](https://docs.weaviate.io/)
- [Weaviate Python Client](https://github.com/weaviate/weaviate-python-client)

### Benchmarks & Comparisons
- [VectorDBBench](https://github.com/zilliztech/VectorDBBench)
- [Best Vector Databases 2025](https://www.firecrawl.dev/blog/best-vector-databases-2025)

---

*Research conducted: January 24, 2026*
*Updated: January 24, 2026 (MongoDB CE 8.2 deep dive, Kubernetes deployment patterns)*
*Codebase version: 2.0.13*
