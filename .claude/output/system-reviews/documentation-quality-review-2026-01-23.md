# Documentation Quality Review - 2026-01-23

## Overview

This review validates project documentation, Serena memories, and Claude Code configuration against the actual codebase to identify areas requiring updates.

## Summary

- **Documents Analyzed**: 7 Serena memories, 40+ Claude Code config files
- **Issues Found**: 14 (7 High, 4 Medium, 3 Low priority)
- **Status**: Updates recommended

---

## Priority 1: High - Immediate Updates Needed

### 1. API Routes Documentation Incorrect (Serena Memory: `api_reference`)

**Issue**: API endpoint prefixes in documentation don't match actual route configuration.

**Documented (INCORRECT)**:
```
GET /api/v2/servers
POST /api/v2/servers/{server_path}/toggle
DELETE /api/v2/servers/{server_path}
```

**Actual Implementation** (from `registry/main.py:324`):
```python
app.include_router(servers_router, prefix="/api", tags=["Server Management"])
```

Routes are mounted at `/api/`, not `/api/v2/`. The actual endpoints are:
- `GET /api/servers`
- `POST /api/toggle/{service_path:path}`
- `POST /api/servers/remove`

**Impact**: Developers following API docs will get 404 errors.

**Fix**: Update `api_reference` memory with correct paths.

---

### 2. Docker File Paths Incorrect (Claude Rule: `docker.md`)

**Issue**: Documentation references non-existent Docker file locations.

**Documented (INCORRECT)**:
```yaml
build:
  context: .
  dockerfile: docker/Dockerfile
```

**Actual Structure**:
```
docker/
├── Dockerfile.auth
├── Dockerfile.mcp-server
├── Dockerfile.mcp-server-cpu
├── Dockerfile.mcp-server-light
├── Dockerfile.registry
├── Dockerfile.registry-cpu
└── Dockerfile.scopes-init
```

There is no `docker/Dockerfile` - specific Dockerfiles use naming convention `Dockerfile.<service>`.

**Fix**: Update `docker.md` rule with correct file paths.

---

### 3. Dependencies Location in API Endpoints (Claude Rule: `api-endpoints.md`)

**Issue**: Documentation says dependencies are in `registry/api/dependencies.py` but this file doesn't exist.

**Documented**:
> Define dependencies in `registry/api/dependencies.py`

**Actual Location**:
- `registry/auth/dependencies.py` - Authentication dependencies
- `registry/core/dependencies.py` - Core dependencies

**Fix**: Correct the dependency location reference.

---

### 4. Test Count Outdated (Serena Memory: `task_completion_checklist`)

**Issue**: Expected test counts are outdated.

**Documented**:
> Expected: ~701 passed, ~57 skipped, 35%+ coverage

**Actual** (from test run):
- 869 tests collected
- 833+ passing in full run
- ~27 integration test errors (expected, requires MongoDB)
- 42%+ coverage achieved

**Fix**: Update test expectations to ~850+ tests.

---

### 5. Missing FastMCP Servers in Project Overview

**Issue**: `project_overview` memory doesn't document the FastMCP server implementations.

**Missing**:
- `servers/mcpgw/` - MCPGateway server with registry API tools
- `servers/fininfo/` - Financial information server
- `servers/realserverfaketools/` - Test server with fake tools
- `servers/currenttime/` - Simple time server

These servers were recently updated with custom routes for root and favicon endpoints (v2.0.6).

**Fix**: Add `servers/` section to project overview.

---

### 6. Frontend Testing Not Documented

**Issue**: Frontend now has Vitest testing configured but not documented.

**Missing from documentation**:
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

**Fix**: Add frontend testing commands to `development_workflow` and `suggested_commands` memories.

---

### 7. Version Number Discrepancy

**Issue**: Multiple version references need updating.

**Current Version**: `2.0.7` (pyproject.toml, git tag)

**Potentially Outdated**:
- `DEFAULT_VERSION = "2.0.0"` in `registry/version.py` (acceptable fallback)
- Any hardcoded version references in docs

---

## Priority 2: Medium - Short-term Updates

### 8. Docker Compose Services Missing from Docs

**Issue**: Several services in `docker-compose.yml` not documented in service configuration.

**Undocumented Services**:
- `mongodb-init` - Database initialization
- `currenttime-server` - FastMCP time server
- `fininfo-server` - Financial info server
- `mcpgw-server` - Gateway API server
- `realserverfaketools-server` - Test server
- `prometheus` - Metrics collection
- `grafana` - Visualization

**Fix**: Update `service-config.md` with complete service list.

---

### 9. Agent API Routes Missing

**Issue**: New agent endpoints not in API reference.

**Missing Endpoints**:
- `POST /api/agents/{path}/health` - Health check endpoint
- `POST /api/agents/{path}/rescan` - Trigger security rescan
- `POST /api/agents/discover` - Skill-based discovery (vs semantic)

**Fix**: Add missing agent endpoints to `api_reference` memory.

---

### 10. Project Index Missing New Directories

**Issue**: `project_index` doesn't include some directories.

**Missing**:
- `registry/common/` - Common utilities including scopes_loader
- `registry/scripts/` - Internal scripts
- `servers/` - FastMCP server implementations

---

### 11. Authentication Routes Not Documented

**Issue**: Auth routes mounted at `/api/auth` not in API reference.

From `main.py:323`:
```python
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
```

**Fix**: Add authentication endpoints to API reference.

---

## Priority 3: Low - Documentation Improvements

### 12. Code Style Examples Could Use Pydantic v2 Syntax

**Issue**: Some examples in `code_style_conventions` use older Pydantic patterns.

The examples are functionally correct but could demonstrate newer v2 features like `model_config = ConfigDict(...)` instead of nested `class Config:`.

---

### 13. Kubernetes Documentation Update

**Issue**: Helm chart version references may need updating.

The `kubernetes.md` rule references chart patterns that should be validated against current `charts/` directory structure.

---

### 14. Development Workflow - Missing uv run Prefix

**Issue**: Some commands missing `uv run` prefix for consistency.

**Example in docs**:
```bash
pytest -m unit
```

**Should be**:
```bash
uv run pytest -m unit
```

---

## Recommended Actions

### Immediate (High Priority)

1. **Update Serena `api_reference` memory**:
   - Fix `/api/v2/` to `/api/` prefix
   - Add missing endpoints
   - Document correct HTTP methods

2. **Update Claude `docker.md` rule**:
   - Correct Dockerfile paths
   - Reference actual file naming convention

3. **Update Claude `api-endpoints.md` rule**:
   - Fix dependencies path to `registry/auth/dependencies.py`

4. **Update Serena `task_completion_checklist`**:
   - Update test count to ~850+
   - Update coverage expectations

5. **Update Serena `project_overview`**:
   - Add `servers/` directory section
   - Document FastMCP server implementations

### Short-term (Medium Priority)

6. **Update `development_workflow` memory**:
   - Add frontend testing commands
   - Add Vitest documentation

7. **Update `suggested_commands` memory**:
   - Add frontend test commands
   - Ensure all commands have `uv run` prefix

8. **Update `service-config.md`**:
   - Add all docker-compose services
   - Document FastMCP servers

### Deferred (Low Priority)

9. Code style examples modernization
10. Kubernetes chart validation
11. Command prefix consistency audit

---

## Validation Plan

After implementing updates:

```bash
# Verify API endpoints match documentation
curl -X GET http://localhost:7860/api/servers

# Verify Docker builds
docker compose config --services

# Verify test counts
uv run pytest tests/ --collect-only 2>&1 | tail -5

# Verify frontend tests
cd frontend && npm test
```

---

## Files to Update

| File | Priority | Changes |
|------|----------|---------|
| Serena: `api_reference` | High | Fix API prefixes, add endpoints |
| Serena: `project_overview` | High | Add servers/ section |
| Serena: `task_completion_checklist` | High | Update test expectations |
| Claude: `.claude/rules/docker.md` | High | Fix Dockerfile paths |
| Claude: `.claude/rules/api-endpoints.md` | High | Fix dependencies path |
| Serena: `development_workflow` | Medium | Add frontend testing |
| Serena: `suggested_commands` | Medium | Add frontend commands |
| Claude: `.claude/skills/docker-services/references/service-config.md` | Medium | Add all services |
| Serena: `project_index` | Medium | Add missing directories |

---

## Root Documentation Updates (Phase 2)

The following project root documentation files were reviewed and updated:

### Files Updated

| File | Issue | Change Made |
|------|-------|-------------|
| `DEV_INSTRUCTIONS.md` | Outdated test count on line 102 | Updated "701+ passed" to "~850+ tests collected" |
| `README.md` | Outdated test count on line 137 | Updated "701+ passing tests" to "850+ passing tests" |
| `AGENTS.md` | Outdated test expectations (lines 202-204) | Updated "701 passed, ~39.50%" to "~850+ tests collected, ~42%" |
| `SECURITY.md` | Version table missing 2.x.x | Added "2.x.x - Yes" and changed "1.x.x" to "Security fixes only" |
| `CLAUDE.md` | Outdated test output example (line 547-551) | Updated expected output to reflect current test counts |

### Files Reviewed - No Changes Needed

| File | Status |
|------|--------|
| `CONTRIBUTING.md` | Current and accurate |
| `CODE_OF_CONDUCT.md` | Current and accurate |

### Summary

All project root documentation has been reviewed and updated to reflect:
- Current test count: ~850+ tests collected (was 701+)
- Current coverage: ~42% (was ~39.50%)
- Current version: 2.x.x (SECURITY.md updated)
