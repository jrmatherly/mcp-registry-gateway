# Feature: Python Dependency Upgrade and Security Audit

## Feature Description

A comprehensive review and upgrade of all Python dependencies in the MCP Registry Gateway project to address:
1. Outdated packages with available security patches
2. Packages approaching or past deprecation deadlines
3. Breaking changes requiring code modifications
4. Security vulnerabilities (CVEs) in current dependency versions

This is a security-critical maintenance task that will reduce the project's attack surface and ensure compliance with current best practices as of January 2026.

## User Story

As a **security-conscious development team**
I want to **upgrade all Python dependencies to their current stable versions**
So that **we minimize security vulnerabilities and maintain compatibility with the latest ecosystem**

## Feature Metadata

- **Type**: Security Maintenance / Refactor
- **Complexity**: High
- **Affected Systems**: All backend services, tests, CI/CD pipelines
- **Dependencies**: All packages in `pyproject.toml`
- **Estimated Risk**: Medium-High (multiple breaking changes identified)

---

## EXECUTIVE SUMMARY

### Critical Findings

| Priority | Package | Current | Latest | Issue |
|----------|---------|---------|--------|-------|
| CRITICAL | `langchain-core` | 1.2.4 | 1.2.6+ | CVE-2025-68664 "LangGrinch" - CVSS 9.3 serialization vulnerability |
| CRITICAL | `motor` | 3.7.1 | DEPRECATED | Deprecated May 14, 2026 - migrate to PyMongo Async |
| HIGH | `huggingface-hub` | 0.36.0 | 1.3.2 | Major v1.0 breaking changes (transitive dependency via sentence-transformers) |
| HIGH | `torch` | 2.9.1 | 2.10.0 | Now requires Python 3.10+ |
| INFO | `fastapi` | 0.127.0 | 0.127.0+ | Installed version exceeds pyproject.toml minimum (>=0.115.12) |
| INFO | `sentence-transformers` | 5.2.0 | 5.2.0 | Current (good) |
| LOW | `strands-agents` | 1.20.0 | 1.22.0 | Minor update available |
| LOW | `litellm` | 1.80.10 | 1.81.1 | Minor updates |
| LOW | `langgraph` | 1.0.5 | 1.0.6 | Minor updates |

### Deprecation Timeline

```
May 14, 2026:    Motor deprecated (use PyMongo Async)
May 14, 2027:    Motor end-of-life (no more critical fixes)
April 29, 2026:  Boto3 drops Python 3.9 support
December 2026:   LangGraph 0.4 maintenance mode ends
```

---

## DETAILED DEPENDENCY ANALYSIS

### 1. CRITICAL SECURITY VULNERABILITIES

#### LangChain "LangGrinch" Vulnerability (CVE-2025-68664)

**Severity**: CVSS 9.3 (Critical)
**Affected**: `langchain-core` < 1.2.5
**Current Version**: 1.2.4
**Required Version**: >= 1.2.6

**Description**: A serialization vulnerability allows crafted input to be interpreted as trusted LangChain objects during deserialization, enabling:
- Secret exfiltration
- Prompt manipulation
- Potential remote code execution

**Remediation**: Update immediately to `langchain-core>=1.2.6`

**Code Impact**: Review code paths in `agents/agent.py` that serialize/deserialize LLM output.

**Note**: LangChain is NOT used in the `registry/` module - only in `agents/`.

---

### 2. DEPRECATED PACKAGES

#### Motor -> PyMongo Async Migration

**Deprecation Date**: May 14, 2026
**End of Life**: May 14, 2027
**Current Version**: motor 3.7.1
**Replacement**: `pymongo[async]` with `AsyncMongoClient`

**Why Migrate**:
- Motor uses thread pool for network ops (performance overhead)
- PyMongo Async implements native asyncio
- Better performance for async workloads

**Breaking Changes**:
```python
# OLD (Motor)
from motor.motor_asyncio import AsyncIOMotorClient
client = AsyncIOMotorClient(uri)

# NEW (PyMongo Async)
from pymongo import AsyncMongoClient
client = AsyncMongoClient(uri)
```

**Method Signature Changes**:
- `to_list(length=0)` -> `to_list(length=None)` for "all results"
- No `io_loop` parameter in constructor
- `AsyncCursor.each()` does not exist
- `MotorGridOut.stream_to_handler()` does not exist
- `client.close()` is now async: `await client.close()`

**Note**: Current codebase already uses `to_list(length=None)` correctly in `search_repository.py:375`.

**Affected Files (15 total)**:

```
# Core MongoDB Client (1 file)
registry/repositories/documentdb/client.py          # Lines 5, 11-12, 94, 108

# Repository Files (6 files)
registry/repositories/documentdb/server_repository.py
registry/repositories/documentdb/agent_repository.py
registry/repositories/documentdb/scope_repository.py
registry/repositories/documentdb/search_repository.py
registry/repositories/documentdb/security_scan_repository.py
registry/repositories/documentdb/federation_config_repository.py

# Scripts (6 files)
scripts/init-mongodb-ce.py                          # Line 22
scripts/init-documentdb-indexes.py                  # Line 38
scripts/load-scopes.py                              # Line 18
scripts/debug-scopes.py                             # Line 8
scripts/manage-documentdb.py                        # Line 38
registry/scripts/inspect-documentdb.py              # Line 14

# Helm Templates (1 file)
charts/mongodb-configure/templates/configmap.yaml   # Line 421

# Test Files (1 file)
tests/integration/test_mongodb_connectivity.py      # Lines 9, 21, 39, 72
```

---

### 3. MAJOR VERSION UPGRADES WITH BREAKING CHANGES

#### huggingface-hub 0.36.0 -> 1.3.2 (Transitive Dependency)

**Important**: The codebase does NOT directly import `huggingface_hub`. It is a transitive dependency pulled by `sentence-transformers`. No code changes required.

**Breaking Changes** (handled internally by sentence-transformers):

1. **HTTP Backend Migration**: `requests` -> `httpx`
2. **CLI Renamed**: `huggingface-cli` -> `hf`
3. **Python Version**: Requires Python 3.9+
4. **Removed Features**:
   - TensorFlow integration removed
   - Keras 2.x integration removed
   - `configure_http_backend()` removed

**Action Required**: Pin version in `pyproject.toml` and run tests.

#### PyTorch 2.9.1 -> 2.10.0

**Breaking Changes**:
- Minimum Python version: 3.10 (was 3.9)
- Project `requires-python = ">=3.11,<3.14"` - Compatible

**No code changes expected** - Python version already meets requirement.

---

### 4. MINOR VERSION UPDATES

#### Packages to Update (Low Risk)

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| `pydantic` | 2.12.5 | 2.12.x | Current, minor patches only |
| `uvicorn` | 0.40.0 | 0.40.0 | Current |
| `httpx` | 0.28.1 | Latest | Check deprecations (verify/cert args) |
| `aiohttp` | 3.13.2 | 3.13.3 | Minor patch |
| `mcp` | 1.25.0 | 1.25.0 | Current (v2 expected Q1 2026) |
| `boto3` | 1.42.14 | 1.42.24 | Minor updates |
| `awscli` | 1.44.4 | 1.44.21 | Minor updates |
| `litellm` | 1.80.10 | 1.81.1 | Minor updates |
| `langgraph` | 1.0.5 | 1.0.6 | Minor updates |
| `strands-agents` | 1.20.0 | 1.22.0 | Minor updates |
| `strands-agents-tools` | 0.2.18 | 0.2.19 | Minor updates |
| `faiss-cpu` | 1.13.1 | 1.13.2 | Minor patch |
| `sentence-transformers` | 5.2.0 | 5.2.0 | Current |

---

### 5. HTTPX DEPRECATION WARNINGS

The following `httpx` features are deprecated and should be reviewed:

```python
# DEPRECATED - verify as string
httpx.Client(verify="/path/to/cert")

# NEW - use ssl context
import ssl
ctx = ssl.create_default_context()
httpx.Client(verify=ctx)

# DEPRECATED - cert argument
httpx.Client(cert="/path/to/cert")

# DEPRECATED - app shortcut
httpx.Client(app=my_app)

# NEW - explicit transport
httpx.Client(transport=httpx.ASGITransport(app=my_app))
```

---

### 6. TRANSITIVE DEPENDENCY MANAGEMENT

Some packages are not directly imported but are transitive dependencies:

| Direct Dependency | Transitive Dependency | Notes |
|-------------------|----------------------|-------|
| `sentence-transformers` | `huggingface-hub`, `transformers`, `torch` | Primary embedding library |
| `langchain-*` | `langchain-core` | Core langchain package |
| `litellm` | `openai`, `anthropic` | LLM provider SDKs |

**Strategy**: Pin transitive dependencies explicitly in `pyproject.toml` to:
1. Ensure security patches are applied (e.g., langchain-core CVE fix)
2. Control breaking change exposure
3. Maintain reproducible builds

---

## CONTEXT REFERENCES

### Codebase Files to Read (MANDATORY)

Before implementing, read these files to understand current patterns:

```
# MongoDB/Motor Usage (PRIMARY MIGRATION TARGET)
registry/repositories/documentdb/client.py      # MongoDB client singleton
registry/repositories/documentdb/server_repository.py
registry/repositories/documentdb/agent_repository.py

# Embeddings (uses sentence-transformers, NOT huggingface_hub directly)
registry/embeddings/client.py                   # SentenceTransformersClient class

# LangChain Usage (ONLY in agents/, NOT in registry/)
agents/agent.py                                 # LangGraph agent implementation

# Test Configuration
tests/conftest.py
tests/integration/test_mongodb_connectivity.py  # Motor usage in tests
```

### Files to Modify

```
# Core Configuration
pyproject.toml                                  # Dependency version updates

# Motor -> PyMongo Async Migration (15 files)
registry/repositories/documentdb/client.py      # Client singleton (close() -> await close())
registry/repositories/documentdb/*.py           # All 6 repository files
scripts/init-mongodb-ce.py
scripts/init-documentdb-indexes.py
scripts/load-scopes.py
scripts/debug-scopes.py
scripts/manage-documentdb.py
registry/scripts/inspect-documentdb.py
charts/mongodb-configure/templates/configmap.yaml
tests/integration/test_mongodb_connectivity.py

# LangChain Security Update (CVE fix)
agents/agent.py                                 # Review serialization patterns
```

### Patterns to Follow

**Repository Pattern** (from `registry/repositories/interfaces.py`):
- Abstract base classes define contracts
- DocumentDB implementations in `documentdb/` subdirectory
- Async methods throughout

**Dependency Injection** (from `registry/core/dependencies.py`):
- FastAPI `Depends()` pattern
- Service caching with `@lru_cache`
- Typed dependency annotations

---

## IMPLEMENTATION PLAN

### Phase 1: Security Patches and Tooling (IMMEDIATE - Day 1)

**Goal**: Address critical CVE and establish vulnerability scanning

**Risk Mitigation**: Create git tag before starting: `git tag pre-phase-1-upgrade`

1. Install pip-audit for vulnerability scanning
2. Run initial vulnerability scan to baseline
3. Update `langchain-core` to >=1.2.6
4. Update related LangChain packages for compatibility
5. Run tests to verify no regressions

### Phase 2: Minor Version Updates (Day 1-2)

**Goal**: Update low-risk packages

**Risk Mitigation**: `git tag pre-phase-2-upgrade`

1. Update all packages with only minor/patch version changes
2. Run full test suite
3. Verify no deprecation warnings

### Phase 3: Hugging Face Hub Dependency Update (Day 2-3)

**Goal**: Update transitive huggingface-hub dependency

**Risk Mitigation**: `git tag pre-phase-3-upgrade`

**Important**: The codebase uses `sentence-transformers` (which depends on huggingface-hub internally). There are NO direct huggingface-hub imports to migrate.

**Actual Work Required:**
1. Update `pyproject.toml` to pin huggingface-hub >=1.0.0,<2.0.0
2. Run `uv sync` to pull new version
3. Test embedding functionality (sentence-transformers handles API internally)
4. Verify no deprecation warnings from transitive dependency

**Code Changes Required:** None - only dependency version pinning

### Phase 4: Motor -> PyMongo Async Migration (Day 3-7)

**Goal**: Replace deprecated Motor with PyMongo Async

**Risk Mitigation**: `git tag pre-phase-4-upgrade`

**Scope**: 15 files requiring changes

1. Update `pyproject.toml` dependencies
2. Migrate client singleton (`registry/repositories/documentdb/client.py`)
3. Migrate all 6 repository files
4. Migrate 6 scripts
5. Update Helm template
6. Update test fixtures
7. Run integration tests with MongoDB
8. Performance testing

### Phase 5: Validation and Documentation (Day 7-8)

**Goal**: Ensure stability and document changes

1. Run full test suite
2. Run security scanning (bandit)
3. Run type checking (mypy)
4. Run pip-audit final verification
5. Update documentation
6. Create migration notes

---

## STEP-BY-STEP TASKS

### Phase 1: Security Patches and Tooling

#### Task 1.0: Install Security Scanning Tool

```bash
# Add pip-audit to dev dependencies FIRST
uv add --dev pip-audit

# Run initial vulnerability scan to establish baseline
uv run pip-audit --desc
```

This provides immediate visibility into all vulnerabilities before starting upgrades.

#### Task 1.1: Update LangChain Core (CRITICAL)

```bash
# Update pyproject.toml
# Change: implicit langchain-core version -> explicit "langchain-core>=1.2.6"

# Sync dependencies
uv sync

# Verify version
uv pip show langchain-core | grep Version
```

**Validation**:
```bash
uv run pytest tests/unit/ -n 8 -k "agent" -v
```

#### Task 1.2: Update Related LangChain Packages

```toml
# In pyproject.toml, update:
"langchain-core>=1.2.6",            # SECURITY: CVE-2025-68664 fix
"langchain-anthropic>=0.3.17",      # Check compatibility
"langchain-aws>=0.2.23",            # Check compatibility
"langchain-mcp-adapters>=0.0.11",   # Check compatibility
"langgraph>=1.0.5",                 # Update to stable 1.x
```

---

### Phase 2: Minor Version Updates

#### Task 2.1: Update pyproject.toml Dependencies

```toml
[project]
dependencies = [
    # Core Framework
    "fastapi>=0.127.0",              # Update minimum to match installed
    "pydantic>=2.12.0",              # Update minimum
    "uvicorn[standard]>=0.40.0",     # Update minimum

    # HTTP/Async
    "httpx>=0.28.0",                 # Update minimum
    "aiohttp>=3.13.0",               # Update minimum
    "httpcore[asyncio]>=1.0.9",      # Keep

    # AWS
    "boto3>=1.42.0",                 # Update minimum
    "awscli>=1.44.0",                # Update minimum

    # AI/ML
    "litellm>=1.80.0",               # Update minimum
    "strands-agents>=1.20.0",        # Update minimum
    "strands-agents-tools>=0.2.18",  # Update minimum

    # Vector Search
    "faiss-cpu>=1.13.0",             # Update minimum
    "sentence-transformers>=5.2.0",  # Update minimum
]
```

#### Task 2.2: Sync and Test

```bash
uv sync
uv run pytest tests/unit/ -n 8
```

---

### Phase 3: Hugging Face Hub Dependency Update

#### Task 3.1: Verify No Direct Imports

```bash
# Confirm no direct huggingface_hub imports in registry/
grep -r "from huggingface_hub" registry/
# Expected: no matches

grep -r "import huggingface_hub" registry/
# Expected: no matches
```

#### Task 3.2: Update pyproject.toml

```toml
# Add explicit pin for transitive dependency
"huggingface-hub>=1.0.0,<2.0.0",  # Pin to v1.x for stability
```

#### Task 3.3: Sync and Test Embeddings

```bash
uv sync
uv run pytest tests/ -n 8 -k "embedding or search" -v
```

---

### Phase 4: Motor -> PyMongo Async Migration

#### Task 4.1: Update Dependencies

```toml
# Remove motor, add pymongo async extras
# OLD:
"motor>=3.3.0",
"pymongo>=4.6.0",

# NEW:
"pymongo[async]>=4.15.0",
```

#### Task 4.2: Update Client Singleton

File: `registry/repositories/documentdb/client.py`

```python
# OLD (lines 5, 11-12)
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None

# NEW
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

_client: AsyncMongoClient | None = None
_database: AsyncDatabase | None = None
```

```python
# OLD (line 94)
_client = AsyncIOMotorClient(connection_string, **client_options, **tls_options)

# NEW
_client = AsyncMongoClient(connection_string, **client_options, **tls_options)
```

```python
# OLD (lines 104-110)
async def close_documentdb_client() -> None:
    """Close DocumentDB client."""
    global _client, _database
    if _client is not None:
        _client.close()  # Synchronous in Motor
        _client = None
        _database = None

# NEW
async def close_documentdb_client() -> None:
    """Close DocumentDB client."""
    global _client, _database
    if _client is not None:
        await _client.close()  # Async in PyMongo Async
        _client = None
        _database = None
```

#### Task 4.3: Update Repository Files

For each file in `registry/repositories/documentdb/` (6 files):

```python
# OLD
from motor.motor_asyncio import AsyncIOMotorCollection

# NEW
from pymongo.asynchronous.collection import AsyncCollection
```

Update type hints throughout:
- `AsyncIOMotorCollection` -> `AsyncCollection`

#### Task 4.4: Update Scripts (6 files)

For each script, update imports:

```python
# OLD
from motor.motor_asyncio import AsyncIOMotorClient

# NEW
from pymongo import AsyncMongoClient
```

Scripts to update:
- `scripts/init-mongodb-ce.py`
- `scripts/init-documentdb-indexes.py`
- `scripts/load-scopes.py`
- `scripts/debug-scopes.py`
- `scripts/manage-documentdb.py`
- `registry/scripts/inspect-documentdb.py`

#### Task 4.5: Update Helm Template

File: `charts/mongodb-configure/templates/configmap.yaml` (line 421)

Update the inline Python code in the ConfigMap to use PyMongo Async instead of Motor.

#### Task 4.6: Update Test Fixtures

File: `tests/integration/test_mongodb_connectivity.py`

```python
# OLD (lines 9, 21, 39, 72)
from motor.motor_asyncio import AsyncIOMotorClient
client = AsyncIOMotorClient("mongodb://localhost:27017", directConnection=True)

# NEW
from pymongo import AsyncMongoClient
client = AsyncMongoClient("mongodb://localhost:27017", directConnection=True)
```

#### Task 4.7: Run Integration Tests

```bash
# Ensure MongoDB is running
docker ps | grep mongo

# Run integration tests
uv run pytest tests/integration/ -n 4 -v
```

---

### Phase 5: Validation

#### Task 5.1: Full Test Suite

```bash
uv run pytest tests/ -n 8
```

**Expected Results**:
- All 701+ tests pass
- Coverage >= 35%

#### Task 5.2: Linting and Formatting

```bash
uv run ruff check --fix . && uv run ruff format .
```

#### Task 5.3: Type Checking

```bash
uv run mypy registry/
```

#### Task 5.4: Security Scanning

```bash
uv run bandit -r registry/ -f json -o security_scans/bandit_report.json
```

#### Task 5.5: Final Vulnerability Scan

```bash
uv run pip-audit --desc
```

Verify no critical or high vulnerabilities remain.

---

## TESTING STRATEGY

### Unit Tests

- Run all unit tests after each phase
- Focus on affected modules (embeddings, repositories, services)

```bash
uv run pytest tests/unit/ -n 8 -v
```

### Integration Tests

- Run after Motor migration
- Requires running MongoDB instance

```bash
docker compose up -d mongodb
uv run pytest tests/integration/ -n 4 -v
```

### Regression Tests

- Full test suite after all changes

```bash
uv run pytest tests/ -n 8
```

### Manual Testing

1. Start the registry service:
   ```bash
   uv run uvicorn registry.main:app --reload
   ```

2. Test endpoints:
   ```bash
   curl http://localhost:8000/health
   curl http://localhost:8000/api/v1/servers
   ```

---

## VALIDATION COMMANDS

```bash
# 1. Verify installed versions
uv pip list | grep -E "(langchain|motor|pymongo|huggingface)"

# 2. Run tests
uv run pytest tests/ -n 8

# 3. Lint and format
uv run ruff check --fix . && uv run ruff format .

# 4. Type check
uv run mypy registry/

# 5. Security scan
uv run bandit -r registry/

# 6. Vulnerability audit
uv run pip-audit

# 7. Verify no deprecation warnings
uv run python -W error::DeprecationWarning -c "import registry"
```

### Version Verification Checklist

After completing all phases, verify these specific versions:

| Package | Required Version | Verification Command |
|---------|-----------------|---------------------|
| langchain-core | >= 1.2.6 | `uv pip show langchain-core \| grep Version` |
| pymongo | >= 4.15.0 | `uv pip show pymongo \| grep Version` |
| huggingface-hub | >= 1.0.0 | `uv pip show huggingface-hub \| grep Version` |
| torch | >= 2.10.0 | `uv pip show torch \| grep Version` |
| motor | NOT INSTALLED | `uv pip show motor` (should fail) |

---

## ACCEPTANCE CRITERIA

### Security Requirements

- [ ] No critical CVEs in installed dependencies
- [ ] LangChain "LangGrinch" vulnerability patched (>=1.2.6)
- [ ] Bandit scan passes with configured skips
- [ ] pip-audit shows no actionable vulnerabilities

### Functionality Requirements

- [ ] All 701+ tests pass
- [ ] Code coverage >= 35%
- [ ] No new ruff errors
- [ ] No new mypy errors
- [ ] Health endpoint responds correctly
- [ ] API endpoints function normally

### Migration Requirements

- [ ] Motor replaced with PyMongo Async (15 files updated)
- [ ] huggingface-hub pinned to v1.x
- [ ] All deprecation warnings addressed
- [ ] No breaking changes to public API

### Documentation Requirements

- [ ] pyproject.toml updated with new versions
- [ ] CHANGELOG updated with dependency changes
- [ ] Any migration notes documented

---

## CI/CD PIPELINE IMPACTS

### GitHub Actions Workflow

- **File**: `.github/workflows/registry-test.yml`
- **Impact**: May need cache invalidation after dependency updates
- **Action**: Monitor first CI run after upgrade for unexpected failures

### Docker Builds

- **File**: `Dockerfile`, `docker/Dockerfile.*`
- **Impact**: Image size may change with new dependencies
- **Action**: Compare image sizes before/after upgrade

### Helm Chart Dependencies

- **File**: `charts/mongodb-configure/templates/configmap.yaml`
- **Impact**: Contains inline Python code using Motor
- **Action**: Update Python code in template to use PyMongo Async

---

## ROLLBACK PLAN

If issues arise during migration:

1. **Immediate**: Revert to phase tag
   ```bash
   git checkout pre-phase-X-upgrade -- pyproject.toml uv.lock
   uv sync
   ```

2. **Per-Phase Rollback**: Each phase has a git tag for targeted rollback
   - `pre-phase-1-upgrade`
   - `pre-phase-2-upgrade`
   - `pre-phase-3-upgrade`
   - `pre-phase-4-upgrade`

3. **Motor Rollback**: Can keep motor + pymongo simultaneously during transition period

---

## TIMELINE ESTIMATE

| Phase | Duration | Files | Dependencies |
|-------|----------|-------|--------------|
| Phase 1: Security Patches + Tooling | 2-4 hours | 1 | None |
| Phase 2: Minor Updates | 4-8 hours | 1 | Phase 1 |
| Phase 3: HF Hub Pin | 2-4 hours | 1 | Phase 2 |
| Phase 4: Motor Migration | 2-4 days | 15 | Phase 3 |
| Phase 5: Validation | 1 day | 0 | Phase 4 |

**Motor Migration Scope Details:**
- Repository files: 7 (client.py + 6 repositories)
- Scripts: 6
- Helm templates: 1
- Test files: 1
- **Total files requiring changes: 15**

**Total Estimated Duration**: 5-8 working days

---

## SOURCES

### Research References

- [FastAPI Release Notes](https://fastapi.tiangolo.com/release-notes/)
- [Pydantic Changelog](https://docs.pydantic.dev/latest/changelog/)
- [LangChain Changelog](https://changelog.langchain.com/)
- [PyTorch Release Announcements](https://dev-discuss.pytorch.org/c/release-announcements/27)
- [Sentence Transformers Documentation](https://sbert.net/)
- [Motor Changelog](https://motor.readthedocs.io/en/stable/changelog.html)
- [PyMongo Async Migration Guide](https://www.mongodb.com/docs/languages/python/pymongo-driver/current/reference/migration/)
- [huggingface-hub Migration Guide](https://huggingface.co/docs/huggingface_hub/en/concepts/migration)
- [LiteLLM Release Notes](https://docs.litellm.ai/release_notes)
- [Strands Agents Documentation](https://strandsagents.com/latest/)
- [pip-audit Documentation](https://github.com/pypa/pip-audit)
- [HTTPX Documentation](https://www.python-httpx.org/)
- [aiohttp Documentation](https://docs.aiohttp.org/)
- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [FAISS GitHub](https://github.com/facebookresearch/faiss)

---

*Plan created: January 22, 2026*
*Last updated: January 22, 2026 (v2 - improved accuracy)*
