# FastMCP 3.0 Upgrade Plan

**Created**: 2026-01-23
**Last Updated**: 2026-01-23
**Status**: Ready for Implementation
**Priority**: Medium (FastMCP 3.0 is currently in beta)
**Owner**: TBD
**Reviewers**: TBD

## Executive Summary

This plan outlines the migration path from FastMCP 2.x to FastMCP 3.0 for the MCP Registry Gateway project. Three servers are affected: `mcpgw-server`, `fininfo-server`, and `realserverfaketools-server`. The `currenttime-server` uses the official MCP SDK and is NOT affected.

**Key Finding**: FastMCP 3.0 is currently in beta (v3.0.0b1, released January 20, 2026). The recommended approach is:

| Phase | Action | Timeline |
|-------|--------|----------|
| 1. Immediate | Pin FastMCP to `<3` to suppress warnings | Now |
| 2. Short-term | Test upgrade in development when v3.0 stabilizes | When v3.0 GA released |
| 3. Long-term | Full production migration | After staging validation |

**Risk Level**: Low - Codebase already uses v3-compatible patterns.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Component Inventory](#component-inventory)
3. [FastMCP 3.0 Changes Overview](#fastmcp-30-changes-overview)
4. [Breaking Changes Assessment](#breaking-changes-assessment)
5. [Server-by-Server Migration Plan](#server-by-server-migration-plan)
6. [Dependency Updates](#dependency-updates)
7. [Testing Strategy](#testing-strategy)
8. [Risk Assessment](#risk-assessment)
9. [Rollback Plan](#rollback-plan)
10. [Pre-Migration Verification](#pre-migration-verification)
11. [Implementation Checklist](#implementation-checklist)
12. [Success Criteria](#success-criteria)
13. [Security Considerations](#security-considerations)
14. [Performance Considerations](#performance-considerations)
15. [Maintainability Considerations](#maintainability-considerations)
    - [Error Handling Patterns](#error-handling-patterns)
    - [Monitoring and Alerting Setup](#monitoring-and-alerting-setup)
16. [Testing Considerations](#testing-considerations)
17. [Documentation Considerations](#documentation-considerations)
18. [Communication and Coordination](#communication-and-coordination)
19. [Timeline and Effort Estimates](#timeline-and-effort-estimates)

---

## Current State Analysis

### Affected Servers

| Server | File | FastMCP Features Used | Complexity | Current Pin |
|--------|------|----------------------|------------|-------------|
| mcpgw-server | `servers/mcpgw/server.py` | FastMCP, Context, get_http_request, @tool, @resource | High | `>=2.0.0,<3.0.0` |
| fininfo-server | `servers/fininfo/server.py` | FastMCP, Context, get_http_request, @tool, @resource | Medium | `>=2.0.0` (no upper bound) |
| realserverfaketools-server | `servers/realserverfaketools/server.py` | FastMCP, @tool, @prompt, @resource | Low | `>=2.0.0` (no upper bound) |

### Not Affected

| Server | File | Reason |
|--------|------|--------|
| currenttime-server | `servers/currenttime/server.py` | Uses official MCP SDK (`from mcp.server.fastmcp import FastMCP`) |

### Current Import Patterns (Verified)

```python
# servers/mcpgw/server.py (lines 20-21)
from fastmcp import Context, FastMCP  # Updated import for FastMCP 2.0
from fastmcp.server.dependencies import get_http_request  # New dependency function for HTTP access

# servers/fininfo/server.py (lines 15-16)
from fastmcp import Context, FastMCP  # Updated import for FastMCP 2.0
from fastmcp.server.dependencies import get_http_request  # New dependency function for HTTP access

# servers/realserverfaketools/server.py (line 15)
from fastmcp import FastMCP

# servers/currenttime/server.py (NOT fastmcp package - uses official MCP SDK)
from mcp.server.fastmcp import FastMCP
```

### Current Dependencies (Verified from pyproject.toml)

```toml
# servers/mcpgw/pyproject.toml (line 8)
"fastmcp>=2.0.0,<3.0.0",  # Already pinned with upper bound

# servers/fininfo/pyproject.toml (line 8)
"fastmcp>=2.0.0",  # Missing upper bound - NEEDS UPDATE

# servers/realserverfaketools/pyproject.toml (line 8)
"fastmcp>=2.0.0",  # Missing upper bound - NEEDS UPDATE

# servers/currenttime/pyproject.toml
"mcp>=1.9.3"  # Official SDK, not affected
```

### Current Run Patterns

```python
# mcpgw and fininfo
mcp.run(transport=args.transport, host="0.0.0.0", port=int(args.port), path="/sse")

# realserverfaketools
mcp.run(transport=args.transport, host="0.0.0.0", port=int(args.port))

# currenttime (official SDK)
mcp.settings.mount_path = "/currenttime"
mcp.run(transport=args.transport)
```

---

## Component Inventory

This section provides a complete inventory of all tools, resources, prompts, and supporting functions across each FastMCP server. This inventory is essential for planning migration scope, documentation updates, and test coverage.

### mcpgw-server Components

**File**: `servers/mcpgw/server.py`

#### Tools (12 total)

| Tool Name | Parameters | Return Type | Auth Required | Migration Notes |
|-----------|------------|-------------|---------------|-----------------|
| `list_services` | `ctx: Context` | `dict` | Yes | Add timeout, session state caching |
| `toggle_service` | `ctx: Context, server_name: str, is_active: bool` | `dict` | Yes | Add destructiveHint annotation |
| `register_service` | `ctx: Context, server_url: str, server_name: str` | `dict` | Yes | Add destructiveHint annotation |
| `remove_service` | `ctx: Context, server_name: str` | `dict` | Yes | Add destructiveHint annotation |
| `refresh_service` | `ctx: Context, server_name: str` | `dict` | Yes | Add idempotentHint annotation |
| `healthcheck` | `ctx: Context` | `dict` | No | Add readOnlyHint annotation |
| `intelligent_tool_finder` | `ctx: Context, query: str` | `dict` | Yes | Add timeout (30s), cache consideration |
| `add_server_to_scopes_groups` | `ctx: Context, server_name: str, scopes: List[str], groups: List[str]` | `dict` | Yes | Add destructiveHint annotation |
| `remove_server_from_scopes_groups` | `ctx: Context, server_name: str, scopes: List[str], groups: List[str]` | `dict` | Yes | Add destructiveHint annotation |
| `create_group` | `ctx: Context, group_name: str, description: str` | `dict` | Yes | Add destructiveHint annotation |
| `delete_group` | `ctx: Context, group_name: str` | `dict` | Yes | Add destructiveHint annotation |
| `list_groups` | `ctx: Context` | `dict` | Yes | Add readOnlyHint annotation |

#### Resources (0)

No resources defined in mcpgw-server.

#### Prompts (0)

No prompts defined in mcpgw-server.

#### Supporting Functions

| Function | Purpose | Migration Impact |
|----------|---------|------------------|
| `extract_auth_context()` | Parse JWT/cookie auth from headers | Cache in session state |
| `check_tool_access()` | Verify scope-based tool access | No change needed |
| `validate_session_cookie_with_auth_server()` | Validate session cookies | No change needed |
| `load_faiss_data_for_mcpgw()` | Initialize FAISS index | Consider lazy loading |
| `_mask_sensitive_header()` | Mask sensitive log data | No change needed |

#### Pydantic Models

| Model | Purpose | Fields |
|-------|---------|--------|
| (none defined locally) | - | - |

---

### fininfo-server Components

**File**: `servers/fininfo/server.py`

#### Tools (2 total)

| Tool Name | Parameters | Return Type | Auth Required | Migration Notes |
|-----------|------------|-------------|---------------|-----------------|
| `get_stock_aggregates` | `ctx: Context, symbol: str, date: str, ...` | `dict` | Yes (API key) | Add timeout (15s), DO NOT cache |
| `print_stock_data` | `data: dict` | `str` | No | Add readOnlyHint, idempotentHint |

#### Resources (1 total)

| Resource Name | URI Pattern | Returns | Migration Notes |
|---------------|-------------|---------|-----------------|
| `get_config` | `config://server` | Server configuration | Add description |

#### Prompts (0)

No prompts defined in fininfo-server.

#### Supporting Functions

| Function | Purpose | Migration Impact |
|----------|---------|------------------|
| `get_api_key_for_request()` | Fetch API key from SecretsManager | Use dependency injection caching |

#### Pydantic Models

| Model | Purpose | Fields |
|-------|---------|--------|
| (none defined locally) | - | - |

---

### realserverfaketools-server Components

**File**: `servers/realserverfaketools/server.py`

#### Tools (6 total)

| Tool Name | Parameters | Return Type | Auth Required | Migration Notes |
|-----------|------------|-------------|---------------|-----------------|
| `quantum_flux_analyzer` | `coordinates: GeoCoordinates, intensity: float, ...` | `dict` | No | Add readOnlyHint annotation |
| `neural_pattern_synthesizer` | `seed_pattern: str, complexity: int, ...` | `dict` | No | Add idempotentHint annotation |
| `hyper_dimensional_mapper` | `dimensions: int, origin_point: List[float], ...` | `dict` | No | Add readOnlyHint annotation |
| `temporal_anomaly_detector` | `start_time: datetime, end_time: datetime, ...` | `dict` | No | Add readOnlyHint annotation |
| `user_profile_analyzer` | `profile: UserProfile, analysis_options: AnalysisOptions` | `dict` | No | Add readOnlyHint annotation |
| `synthetic_data_generator` | `schema_type: str, num_records: int, ...` | `dict` | No | Add idempotentHint annotation |

#### Resources (2 total)

| Resource Name | URI Pattern | Returns | Migration Notes |
|---------------|-------------|---------|-----------------|
| `get_config` | `config://server` | Server configuration dict | Add description |
| `get_tools_documentation` | `docs://tools` | Tool documentation string | Add description |

#### Prompts (1 total)

| Prompt Name | Arguments | Description | Migration Notes |
|-------------|-----------|-------------|-----------------|
| `system_prompt_for_agent` | None | Agent system prompt | Add argument annotations |

#### Supporting Functions

| Function | Purpose | Migration Impact |
|----------|---------|------------------|
| (none critical) | - | - |

#### Pydantic Models

| Model | Purpose | Fields |
|-------|---------|--------|
| `GeoCoordinates` | Geographic location | `latitude: float`, `longitude: float`, `altitude: Optional[float]` |
| `UserProfile` | User data for analysis | `user_id: str`, `name: str`, `email: str`, `preferences: dict` |
| `AnalysisOptions` | Analysis configuration | `depth: str`, `include_recommendations: bool`, `format: str` |

---

### Component Summary

| Server | Tools | Resources | Prompts | Pydantic Models | Auth Required |
|--------|-------|-----------|---------|-----------------|---------------|
| mcpgw-server | 12 | 0 | 0 | 0 | Yes |
| fininfo-server | 2 | 1 | 0 | 0 | Yes |
| realserverfaketools-server | 6 | 2 | 1 | 3 | No |
| **Total** | **20** | **3** | **1** | **3** | - |

### Migration Complexity by Component

| Component Type | Count | Requires Code Change | Requires Testing | Priority |
|----------------|-------|---------------------|------------------|----------|
| Tools with auth | 13 | Yes (annotations) | Yes | High |
| Tools without auth | 7 | Yes (annotations) | Yes | Medium |
| Resources | 3 | Yes (description) | Yes | Low |
| Prompts | 1 | Yes (description) | Yes | Low |
| Pydantic Models | 3 | No | Yes | Low |

### Annotation Requirements Summary

Tools requiring `readOnlyHint: True`:
- `healthcheck`, `list_services`, `list_groups`
- `quantum_flux_analyzer`, `hyper_dimensional_mapper`, `temporal_anomaly_detector`, `user_profile_analyzer`

Tools requiring `destructiveHint: True`:
- `toggle_service`, `register_service`, `remove_service`
- `add_server_to_scopes_groups`, `remove_server_from_scopes_groups`
- `create_group`, `delete_group`

Tools requiring `idempotentHint: True`:
- `refresh_service`, `healthcheck`
- `neural_pattern_synthesizer`, `synthetic_data_generator`

---

## FastMCP 3.0 Changes Overview

### New Architecture (v3.0)

FastMCP 3.0 rebuilds the framework around three primitives:

1. **Providers**: Source components dynamically
   - `FileSystemProvider` - Load tools from filesystem
   - `SkillsProvider` - Skill-based tool organization
   - `OpenAPIProvider` - Generate from OpenAPI specs
   - `ProxyProvider` - Proxy to other MCP servers

2. **Transforms**: Middleware for components
   - Namespace prefixing
   - Rename operations
   - Version filtering
   - Visibility control

3. **Components**: Tools, Resources, Prompts with versioning support

### Key New Features

| Feature | Description | Benefit |
|---------|-------------|---------|
| Provider Architecture | Unified component sourcing | Cleaner code organization |
| Component Versioning | Multiple versions of same tool | Backward compatibility |
| Session-Scoped State | Persists across requests | Auth context caching |
| `--reload` flag | Hot reload for development | Faster dev iteration |
| Tool Timeouts | Built-in timeout handling | Better reliability |
| OpenTelemetry Tracing | Native observability | Production debugging |

### Transport Changes

| v2.x | v3.0 | Status | Notes |
|------|------|--------|-------|
| `transport="sse"` | `transport="sse"` | Supported | Legacy, still works |
| `transport="http"` | `transport="http"` | Recommended | Streamable HTTP |
| `transport="streamable-http"` | `transport="streamable-http"` | Alias | Same as "http" |
| `transport="stdio"` | `transport="stdio"` | Unchanged | No changes |

---

## Breaking Changes Assessment

### Compatibility Matrix

| Pattern | Your Code | v3.0 Status | Action Required |
|---------|-----------|-------------|-----------------|
| `get_http_request()` from dependencies | Yes | Compatible | None |
| `@mcp.tool` decorator | Yes | Compatible | None |
| `@mcp.resource` decorator | Yes | Compatible | None |
| `@mcp.prompt` decorator | Yes | Compatible | None |
| `Context` class | Yes | Compatible | None |
| `mcp.run()` parameters | Yes | Compatible | None |

### Removed APIs (NOT used in this codebase)

| Removed API | Replacement | Status |
|-------------|-------------|--------|
| `Context.get_http_request()` | `get_http_request()` from dependencies | Already using correct pattern |
| `BearerAuthProvider` | `JWTVerifier` | Not used |
| `from fastmcp import Image` | `from fastmcp.utilities.types import Image` | Not used |
| `FastMCP(dependencies=[...])` | `fastmcp.json` configuration | Not used |

### Potential Concerns

1. **Path Parameter Defaults**
   - Current: `path="/sse"` explicitly set
   - v3.0: HTTP transport defaults to `/mcp`
   - **Impact**: None - explicit path overrides defaults

2. **Future SDK Changes**
   - MCP Python SDK v2 expected early 2026
   - Will require FastMCP 4.0
   - **Impact**: Plan for another migration

---

## Server-by-Server Migration Plan

### Phase 1: Immediate - Pin to v2.x (Production Safety)

**Goal**: Suppress deprecation warnings and ensure stability.

#### mcpgw-server
- **Status**: Already pinned correctly
- **Current**: `fastmcp>=2.0.0,<3.0.0`
- **Action**: No change needed

#### fininfo-server
- **Status**: Missing upper bound
- **Current**: `fastmcp>=2.0.0`
- **Action**: Update to `fastmcp>=2.14.0,<3`
- **File**: `servers/fininfo/pyproject.toml`

#### realserverfaketools-server
- **Status**: Missing upper bound
- **Current**: `fastmcp>=2.0.0`
- **Action**: Update to `fastmcp>=2.14.0,<3`
- **File**: `servers/realserverfaketools/pyproject.toml`

### Phase 2: Development Testing - Try v3.0 Beta

#### mcpgw-server (High Complexity)

**File**: `servers/mcpgw/server.py`

**Verification Checklist**:
- [ ] `get_http_request()` returns proper Starlette Request object
- [ ] Context injection works in tool functions
- [ ] Auth context extraction from headers works (`extract_auth_context`, `extract_user_scopes_from_headers`)
- [ ] All 11+ tools respond correctly
- [ ] All resources accessible
- [ ] FAISS embedding functionality works
- [ ] Scopes/permissions validation works

**High-Risk Functions to Test**:
- `extract_auth_context()` - Auth header parsing
- `validate_session_cookie_with_auth_server()` - Session validation
- `intelligent_tool_finder()` - FAISS-based search

#### fininfo-server (Medium Complexity)

**File**: `servers/fininfo/server.py`

**Verification Checklist**:
- [ ] `get_http_request()` returns proper Starlette Request object
- [ ] `get_api_key_for_request()` retrieves API key from headers
- [ ] Stock data tools function correctly (`get_stock_aggregates`, `print_stock_data`)
- [ ] SecretsManager integration works
- [ ] Resource `get_config` accessible

#### realserverfaketools-server (Low Complexity)

**File**: `servers/realserverfaketools/server.py`

**Verification Checklist**:
- [ ] All fake tools return expected mock responses
- [ ] Prompts work correctly (`system_prompt_for_agent`)
- [ ] Resources accessible (`get_config`, `get_tools_documentation`)
- [ ] Pydantic models serialize correctly (`GeoCoordinates`, `UserProfile`, `AnalysisOptions`)

### Phase 3: Production Migration

Once v3.0 is stable (GA release):

```toml
# For all affected servers
dependencies = [
    "fastmcp>=3.0,<4",  # Production pinning for v3.x
]
```

---

## Dependency Updates

### Immediate Changes Required

```diff
# servers/fininfo/pyproject.toml
dependencies = [
-    "fastmcp>=2.0.0",
+    "fastmcp>=2.14.0,<3",  # Pin to 2.x until 3.0 stabilizes
    "pydantic>=2.11.3",
    ...
]

# servers/realserverfaketools/pyproject.toml
dependencies = [
-    "fastmcp>=2.0.0",
+    "fastmcp>=2.14.0,<3",  # Pin to 2.x until 3.0 stabilizes
    "pydantic>=2.11.3",
    ...
]
```

### Why `>=2.14.0`?

FastMCP 2.14.x includes:
- Security fixes (CVE-2025-61920)
- HTTP transport timeout fixes
- MCP 2025-11-25 specification support
- Removed deprecated APIs (cleaner upgrade path)

### Future Changes (When v3.0 is Stable)

```toml
# All affected servers
dependencies = [
    "fastmcp>=3.0,<4",
]
```

---

## Testing Strategy

### Pre-Migration Testing

1. **Run existing tests** with current v2.x:
   ```bash
   uv run pytest tests/ -n 8
   ```

2. **Verify container startup** (check for deprecation warnings):
   ```bash
   docker compose logs mcpgw-server 2>&1 | grep -i "fastmcp\|deprecat\|warning"
   docker compose logs fininfo-server 2>&1 | grep -i "fastmcp\|deprecat\|warning"
   docker compose logs realserverfaketools-server 2>&1 | grep -i "fastmcp\|deprecat\|warning"
   ```

### Migration Testing (Development Only)

1. **Create test branch**:
   ```bash
   git checkout -b feature/fastmcp-3-upgrade-test
   ```

2. **Update dependencies to v3.0 beta**:
   ```toml
   dependencies = [
       "fastmcp>=3.0.0b1,<4",
   ]
   ```

3. **Rebuild containers**:
   ```bash
   docker compose build mcpgw-server fininfo-server realserverfaketools-server
   docker compose up -d mcpgw-server fininfo-server realserverfaketools-server
   ```

4. **Verify endpoints** (check docker-compose.yml for actual ports):
   ```bash
   # Health checks
   curl -s http://localhost:<mcpgw-port>/health
   curl -s http://localhost:<fininfo-port>/health
   curl -s http://localhost:<realserverfaketools-port>/health
   ```

5. **Verify MCP endpoints**:
   ```bash
   # SSE endpoints
   curl -s -N http://localhost:<mcpgw-port>/sse
   curl -s -N http://localhost:<fininfo-port>/sse
   ```

6. **Test tool execution** via MCP client or integration tests

### Smoke Test Matrix

| Server | Health Check | MCP Endpoint | Auth Test | Tool Test |
|--------|-------------|--------------|-----------|-----------|
| mcpgw | `GET /health` | `GET /sse` | Headers extraction | `list_services` |
| fininfo | `GET /health` | `GET /sse` | API key retrieval | `get_stock_aggregates` |
| realserverfaketools | `GET /health` | `GET /mcp` | N/A | `quantum_flux_analyzer` |

---

## Risk Assessment

### Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking change in v3.0 beta | Medium | High | Pin to stable v2.x, test in dev first |
| Auth context extraction fails | Low | Critical | Thorough testing of `get_http_request()` |
| Performance regression | Low | Medium | Load testing before production |
| FAISS integration breaks | Low | High | Test `intelligent_tool_finder` specifically |
| Transport behavior changes | Low | Medium | Explicit path parameter prevents issues |
| Session state isolation breach | Very Low | Critical | v3.0 uses automatic session keying; run isolation tests |
| Scope enforcement bypass | Low | Critical | Comprehensive scope-based access control tests |
| Header stripping/loss | Low | High | Verify all auth headers pass through correctly |
| CVE exposure (pre-2.14.0) | Low | High | Minimum version >=2.14.0 includes security fixes |
| Test coverage regression | Low | Medium | Capture baseline before migration; enforce in CI |
| Configuration drift between environments | Low | Medium | Use `fastmcp.json` for centralized configuration |
| Undocumented tool behavior | Medium | Low | Add inline documentation during migration |
| Snapshot tests fail after upgrade | Medium | Low | Update snapshots intentionally with `--inline-snapshot=fix` |
| Auth mock tests don't match real behavior | Low | Medium | Include integration tests with real headers |
| In-memory tests pass but HTTP fails | Low | High | Run both transport types in CI |
| LLM cannot discover tools | Low | Medium | Add server `instructions` and tool `description` arguments |
| Tools missing behavioral hints | Medium | Low | Add `annotations` with readOnlyHint, destructiveHint |
| Documentation drift from code | Low | Medium | Run documentation audit in CI pipeline |

### Mitigation Strategies

1. **Version Pinning**: Use `<3` upper bound until v3.0 is stable
2. **Staged Rollout**: Dev -> Staging -> Production
3. **Feature Flags**: Consider enabling v3 features gradually
4. **Monitoring**: Watch for errors after deployment

---

## Rollback Plan

### Trigger Conditions

Rollback if any of the following occur:
- Health checks fail after upgrade
- Auth context extraction returns incorrect data
- Tool execution errors > 1% increase
- Container restart loops

### Rollback Procedure

1. **Immediate rollback** (restore pinned version):
   ```bash
   # Revert pyproject.toml changes
   git checkout HEAD~1 -- servers/*/pyproject.toml
   ```

2. **Rebuild and deploy**:
   ```bash
   docker compose build mcpgw-server fininfo-server realserverfaketools-server
   docker compose up -d
   ```

3. **Verify recovery**:
   ```bash
   docker compose logs --tail 50 | grep -i error
   ```

4. **Document issues** for FastMCP maintainers or future retry

### Rollback Time Estimate

- Container rebuild: ~2-3 minutes per service
- Total recovery: ~10 minutes

---

## Pre-Migration Verification

Before beginning any migration work, verify all prerequisites are met:

### Environment Prerequisites

| Requirement | Verification Command | Expected Output |
|-------------|---------------------|-----------------|
| Python 3.12+ | `python --version` | Python 3.12.x |
| uv installed | `uv --version` | uv 0.x.x |
| Docker running | `docker ps` | No errors |
| MongoDB accessible | `docker compose ps mongodb` | Status: Up |
| Git clean state | `git status` | No uncommitted changes |

### Test Suite Verification

```bash
# Run full test suite and verify passing
uv run pytest tests/ -n 8

# Expected: 700+ tests passing, ~57 skipped
# Coverage: ≥35%
```

If tests fail, fix before proceeding with migration.

### Dependency Audit

```bash
# Check for security vulnerabilities
uv pip audit

# Check current FastMCP version
uv pip show fastmcp | grep Version
```

### Baseline Metrics Capture

Before migration, capture baseline metrics for comparison:

```bash
# 1. Performance baseline
hey -n 1000 -c 10 http://localhost:8001/health

# 2. Memory baseline
docker stats --no-stream mcpgw-server fininfo-server realserverfaketools-server

# 3. Test execution time
time uv run pytest tests/ -n 8
```

Save these baselines for post-migration comparison.

### Stakeholder Sign-off

| Stakeholder | Required Sign-off | Obtained |
|-------------|------------------|----------|
| Tech Lead | Migration plan approved | [ ] |
| QA Lead | Test coverage acceptable | [ ] |
| DevOps | Deployment plan reviewed | [ ] |
| Product Owner | Timeline acceptable | [ ] |

### Go/No-Go Checklist

- [ ] All environment prerequisites met
- [ ] Test suite passing with ≥35% coverage
- [ ] No critical security vulnerabilities
- [ ] Baseline metrics captured
- [ ] Stakeholder sign-offs obtained
- [ ] Rollback plan reviewed
- [ ] Communication sent to stakeholders

---

## Implementation Checklist

### Phase 1: Immediate Actions (Do Now)

- [ ] Update `servers/fininfo/pyproject.toml`: Change `fastmcp>=2.0.0` to `fastmcp>=2.14.0,<3`
- [ ] Update `servers/realserverfaketools/pyproject.toml`: Change `fastmcp>=2.0.0` to `fastmcp>=2.14.0,<3`
- [ ] Rebuild affected containers: `docker compose build fininfo-server realserverfaketools-server`
- [ ] Verify deprecation warnings are suppressed in logs
- [ ] Run existing test suite: `uv run pytest tests/ -n 8`
- [ ] Commit changes with message: `chore: pin FastMCP to <3 until 3.0 stabilizes`

### Phase 2: When FastMCP 3.0 is Stable (GA Release)

- [ ] Create feature branch: `git checkout -b feature/fastmcp-3-upgrade`
- [ ] Update all pyproject.toml files to `fastmcp>=3.0,<4`
- [ ] Run full test suite
- [ ] Test all MCP endpoints manually (see Smoke Test Matrix)
- [ ] Verify auth context extraction works (mcpgw, fininfo)
- [ ] Test FAISS-based intelligent_tool_finder (mcpgw)
- [ ] Check container logs for errors
- [ ] Deploy to staging environment
- [ ] Run integration tests in staging
- [ ] Get approval for production deployment
- [ ] Deploy to production
- [ ] Monitor for 24 hours post-deployment

### Phase 3: Testing Infrastructure

- [ ] Install test dependencies: `uv add --dev inline-snapshot dirty-equals`
- [ ] Create `tests/conftest.py` with FastMCP client fixtures for all servers
- [ ] Capture v2.x baselines: `uv run python tests/migration/capture_baselines.py`
- [ ] Add in-memory client tests for mcpgw, fininfo, realserverfaketools
- [ ] Add snapshot tests for all tool outputs
- [ ] Add parametrized tests for tool inputs (edge cases)
- [ ] Add auth context extraction tests with mocked headers
- [ ] Add HTTP transport integration tests
- [ ] Verify tests pass with v2.x: `uv run pytest tests/ -n 8`

### Phase 4: Documentation Improvements

- [ ] Add `instructions` parameter to all FastMCP server instances
- [ ] Add `description` argument to all tool decorators
- [ ] Add `annotations` (readOnlyHint, destructiveHint, etc.) to all tools
- [ ] Add `tags` for tool categorization
- [ ] Standardize docstrings for LLM consumption
- [ ] Create documentation audit script (`scripts/audit_docs.py`)
- [ ] Add documentation checks to CI pipeline

### Phase 5: Documentation Updates

- [ ] Update README.md files with new FastMCP version requirements
- [ ] Update CHANGELOG.md with migration notes
- [ ] Document any behavior changes observed
- [ ] Update this plan with lessons learned

---

## Success Criteria

### Phase 1 Success (Pinning)

- [ ] No deprecation warnings in container logs
- [ ] All existing tests pass
- [ ] All health checks pass
- [ ] No user-facing impact

### Phase 2 Success (v3.0 Migration)

- [ ] All servers start successfully with v3.0
- [ ] Auth context extraction works correctly
- [ ] All tools execute without errors
- [ ] Performance within 10% of v2.x baseline (see Performance Acceptance Criteria)
- [ ] No increase in error rates
- [ ] All integration tests pass
- [ ] Memory usage within 20% of v2.x baseline
- [ ] No timeout errors on properly-configured tools

### Maintainability Success Criteria

- [ ] `fastmcp.json` configuration files created for all servers
- [ ] Test coverage maintained or improved (current baseline: ~39.50%)
- [ ] All tools have inline documentation with examples
- [ ] No deprecation warnings in production logs
- [ ] README files updated with v3.0 requirements
- [ ] CHANGELOG updated with migration notes

### Testing Success Criteria

- [ ] All v2.x baseline tests pass with v3.0
- [ ] In-memory client fixtures created for all three servers
- [ ] Snapshot tests cover all tool outputs
- [ ] Auth context extraction tests with mocked headers pass
- [ ] HTTP transport integration tests pass
- [ ] Parametrized tool tests with edge cases pass
- [ ] No regression in existing test suite (701 passed, 57 skipped)
- [ ] Test coverage ≥80% for new testing code

### Documentation Success Criteria

- [ ] All servers have `instructions` parameter with usage documentation
- [ ] All tools have explicit `description` in decorator arguments
- [ ] All tools have `annotations` with behavioral hints
- [ ] All tools have `tags` for categorization
- [ ] All tools have complete LLM-friendly docstrings
- [ ] README files updated for each server with v3.0 requirements
- [ ] CHANGELOG entries added for v3.0 migration
- [ ] Documentation audit script passes with no warnings

---

## References

- [FastMCP 3.0 Documentation](https://gofastmcp.com/getting-started/welcome)
- [FastMCP 2.x Documentation](https://gofastmcp.com/v2/getting-started/welcome)
- [FastMCP Upgrade Guide](https://gofastmcp.com/development/upgrade-guide)
- [FastMCP Release Notes](https://gofastmcp.com/updates)
- [FastMCP GitHub Issues](https://github.com/jlowin/fastmcp/issues)

---

## Security Considerations

### Overview

This section addresses security-critical aspects of the FastMCP 3.0 migration. The codebase handles authentication, authorization, and session management through custom middleware—these are the highest-risk areas during migration.

### Security-Critical Code Paths

| File | Function | Security Role | Risk Level |
|------|----------|---------------|------------|
| `servers/mcpgw/server.py:199-350` | `extract_auth_context()` | Extracts auth headers, session cookies, masks sensitive data | **Critical** |
| `servers/mcpgw/server.py:94-120` | `extract_user_scopes_from_headers()` | Parses `x-scopes`, `x-user-scopes` headers | High |
| `servers/mcpgw/server.py:123-195` | `check_tool_access()` | Scope-based authorization checking | **Critical** |
| `servers/mcpgw/server.py:399-436` | `validate_session_cookie_with_auth_server()` | Session validation with external auth server | **Critical** |
| `servers/fininfo/server.py:133-183` | `get_api_key_for_request()` | Retrieves API key from SecretsManager via `x-client-id` header | High |

### FastMCP 3.0 Security Changes

#### 1. Session State Model Changes

**v2.x Behavior**:
- `ctx.set_state()` / `ctx.get_state()` were synchronous
- State was request-scoped

**v3.0 Behavior**:
- `ctx.set_state()` / `ctx.get_state()` are now **async**
- State persists across the **entire MCP session** (multiple requests)
- State is automatically keyed by session identifier for isolation
- State expires after 1 day to prevent unbounded memory growth

**Security Impact**: Low - Current codebase extracts auth context per-request from headers (stateless pattern). No breaking change expected.

```python
# v2.x (current pattern in mcpgw - works fine)
async def extract_auth_context(ctx: Context) -> dict[str, Any]:
    request = get_http_request()  # Per-request extraction
    headers = dict(request.headers)
    # ... process headers

# v3.0 consideration (optional optimization)
async def extract_auth_context(ctx: Context) -> dict[str, Any]:
    # Could cache auth context in session state (optional)
    cached = await ctx.get_state("auth_context")
    if cached:
        return cached

    request = get_http_request()
    auth = _build_auth_context(request.headers)
    await ctx.set_state("auth_context", auth)
    return auth
```

#### 2. Per-Session Visibility Control

FastMCP 3.0 introduces per-session visibility for tools/resources:
- `ctx.enable_components()` / `ctx.disable_components()`
- Only affects the calling session
- Other sessions see global defaults

**Security Benefit**: Enables role-based access control per session:
```python
@mcp.tool
async def unlock_admin_tools(ctx: Context) -> str:
    """Grant admin access for this session only."""
    if is_admin(await extract_auth_context(ctx)):
        await ctx.enable_components(tags={"admin"})
        return "Admin tools unlocked"
    return "Access denied"
```

#### 3. OAuth Token Security Improvements

FastMCP 3.0 OAuth proxy issues its own JWT tokens instead of forwarding upstream tokens:
- Maintains proper token audience boundaries
- Requires explicit key management for production
- On Linux, keys are ephemeral by default (tokens invalidated on restart)

**Impact on this codebase**: Not directly applicable - auth is handled externally via Keycloak/Auth Server. However, if integrating FastMCP's OAuth features in future, follow production key management:

```python
# Production OAuth configuration (NOT currently used)
auth = OAuthProvider(
    client_id=os.environ["CLIENT_ID"],
    client_secret=os.environ["CLIENT_SECRET"],
    jwt_signing_key=os.environ["JWT_SIGNING_KEY"],  # Required for production
    client_storage=FernetEncryptionWrapper(...)     # Persistent, encrypted
)
```

#### 4. CVE-2025-61920 (Fixed in v2.13.1+)

**Vulnerability**: Session isolation weakness in HTTP transport (details pending full disclosure)

**Mitigation**: The recommended minimum version `>=2.14.0` includes this fix.

**Verification**: Ensure all servers use:
```toml
dependencies = [
    "fastmcp>=2.14.0,<3",  # Includes CVE-2025-61920 fix
]
```

### Security Testing Checklist

#### Pre-Migration Security Verification

- [ ] Verify `get_http_request()` returns complete headers (no truncation)
- [ ] Verify Authorization header is accessible and not stripped
- [ ] Verify `x-scopes`, `x-user-scopes` headers pass through correctly
- [ ] Verify `x-client-id` header extraction works (fininfo)
- [ ] Verify session cookies are accessible

#### Auth Context Extraction Tests

```python
# Test: Headers are correctly extracted
@pytest.mark.asyncio
async def test_auth_context_extraction_preserves_headers():
    """Verify critical headers survive v3.0 migration."""
    headers = {
        "authorization": "Bearer test-token-12345",
        "x-scopes": "read,write,admin",
        "x-user-scopes": "read,write",
        "x-client-id": "test-client",
        "x-username": "testuser",
        "cookie": "session=abc123"
    }
    # Mock request with headers
    auth_ctx = await extract_auth_context(mock_context_with_headers(headers))

    assert auth_ctx["username"] == "testuser"
    assert "read" in auth_ctx["scopes"]
    assert auth_ctx["authorization_header"] == "Bearer test-token-12345"
```

#### Scope-Based Authorization Tests

```python
@pytest.mark.asyncio
async def test_check_tool_access_with_scopes():
    """Verify scope-based access control works after migration."""
    # User with admin scope should access admin tools
    assert check_tool_access("mcpgw", "admin_tool", ["admin"], config) == True

    # User without admin scope should be denied
    assert check_tool_access("mcpgw", "admin_tool", ["read"], config) == False
```

#### Session Isolation Tests

```python
@pytest.mark.asyncio
async def test_session_state_isolation():
    """Verify state is isolated between sessions in v3.0."""
    # Session A sets state
    async with client_session_a:
        await ctx_a.set_state("user", "alice")

    # Session B should NOT see Session A's state
    async with client_session_b:
        state = await ctx_b.get_state("user")
        assert state is None  # Isolated
```

### Sensitive Data Handling

The codebase correctly masks sensitive data in logs. Verify this continues working:

```python
# servers/mcpgw/server.py - existing pattern
def _mask_sensitive_header(key: str, value: str) -> str:
    """Mask sensitive values in headers for logging."""
    sensitive_keys = ["authorization", "x-api-key", "cookie", "x-client-secret"]
    if key.lower() in sensitive_keys:
        return f"{value[:10]}..." if len(value) > 10 else "***"
    return value
```

**Verification**: Check that sensitive data masking works with v3.0 logging integration.

### Security-Focused Migration Steps

1. **Before upgrading to v3.0**:
   - Run security test suite against v2.x baseline
   - Document all auth-related header names used
   - Capture sample auth contexts for comparison

2. **During v3.0 testing**:
   - Compare auth contexts between v2.x and v3.0
   - Verify no header loss or transformation
   - Test with malformed/missing headers (edge cases)
   - Verify scope enforcement still works

3. **Post-migration**:
   - Monitor for unauthorized access attempts
   - Watch for unexpected 401/403 responses
   - Audit session state for data leakage between sessions

### Security Recommendations

1. **Keep minimum version at >=2.14.0**: Includes CVE-2025-61920 fix
2. **Test auth context extraction thoroughly**: This is the most critical path
3. **Consider session state for auth caching**: v3.0 makes this safe with isolation
4. **Enable OpenTelemetry tracing**: Helps debug auth issues in production
5. **Review scope configurations**: Ensure all tools have appropriate scope requirements

---

## Performance Considerations

### Overview

This section addresses performance-related aspects of the FastMCP 3.0 migration. FastMCP 3.0 introduces several performance improvements and new optimization opportunities that should be evaluated during migration.

### Performance-Critical Code Paths

| Server | Function | Current Bottleneck | Optimization Opportunity |
|--------|----------|-------------------|-------------------------|
| mcpgw | `intelligent_tool_finder()` | FAISS embedding computation | Session state caching |
| mcpgw | `extract_auth_context()` | Per-request header parsing | Session state caching |
| fininfo | `get_api_key_for_request()` | SecretsManager API call | Dependency injection caching |
| fininfo | `get_stock_aggregates()` | External API call | Response caching middleware |

### FastMCP 3.0 Performance Improvements

#### 1. Transport Performance: SSE vs Streamable HTTP

**Current State**: Servers use `transport="sse"` (legacy)

**v3.0 Recommendation**: Migrate to `transport="http"` (Streamable HTTP)

| Aspect | SSE (Legacy) | Streamable HTTP |
|--------|-------------|-----------------|
| Bidirectional | Server→Client only | Full bidirectional |
| Connection efficiency | Less efficient | More efficient |
| Multiple clients | Supported | Better optimized |
| Streaming | Limited | Full support |
| Recommended | No | Yes |

**Migration**:
```python
# Before (current)
mcp.run(transport="sse", host="0.0.0.0", port=8000, path="/sse")

# After (recommended for v3.0)
mcp.run(transport="http", host="0.0.0.0", port=8000, path="/mcp")
```

**Note**: This requires client-side updates. Plan as Phase 3 optimization.

#### 2. Tool Timeouts

FastMCP 3.0 introduces built-in timeout handling to prevent hung operations:

```python
from fastmcp import FastMCP

mcp = FastMCP("mcpgw-server")

# Add timeouts to long-running tools
@mcp.tool(timeout=30.0)
async def intelligent_tool_finder(query: str) -> dict:
    """FAISS-based search with 30-second timeout."""
    # If this takes longer than 30 seconds,
    # client receives MCP error code -32000
    return await search_tools(query)

@mcp.tool(timeout=10.0)
async def list_services(ctx: Context) -> dict:
    """List services with 10-second timeout."""
    return await fetch_services()
```

**Recommended Timeouts**:

| Tool | Recommended Timeout | Rationale |
|------|---------------------|-----------|
| `intelligent_tool_finder` | 30s | FAISS computation can be slow |
| `list_services` | 10s | Network call to registry |
| `get_stock_aggregates` | 15s | External API dependency |
| `invoke_tool` | 60s | Proxies to other servers |

#### 3. Background Tasks for Long-Running Operations

FastMCP 2.14+ supports protocol-native background tasks:

```python
from fastmcp import FastMCP
from fastmcp.dependencies import Progress

mcp = FastMCP("mcpgw-server")

# Convert long-running tool to background task
@mcp.tool(task=True)
async def bulk_tool_analysis(
    queries: list[str],
    progress: Progress = Progress()
) -> dict:
    """Analyze multiple tools in background with progress tracking."""
    await progress.set_total(len(queries))
    results = []

    for i, query in enumerate(queries):
        result = await intelligent_tool_finder(query)
        results.append(result)
        await progress.increment()
        await progress.set_message(f"Analyzed {i + 1}/{len(queries)}")

    return {"results": results}
```

**Candidates for Background Tasks**:

| Tool | Reason | Priority |
|------|--------|----------|
| `intelligent_tool_finder` (bulk) | Multiple FAISS queries | Medium |
| `invoke_tool` (chained) | Cascading tool calls | Low |

#### 4. Response Caching Middleware

FastMCP provides built-in caching middleware:

```python
from fastmcp import FastMCP
from fastmcp.server.middleware.caching import (
    ResponseCachingMiddleware,
    CallToolSettings,
    ListToolsSettings,
)

mcp = FastMCP("mcpgw-server")

# Add caching for frequently-called operations
mcp.add_middleware(ResponseCachingMiddleware(
    # Cache tool listings for 60 seconds
    list_tools_settings=ListToolsSettings(ttl=60),

    # Cache specific tool results
    call_tool_settings=CallToolSettings(
        ttl=30,
        included_tools=["list_services", "get_config"],
    ),
))
```

**Caching Recommendations**:

| Operation | Cache TTL | Rationale |
|-----------|----------|-----------|
| `list_tools` | 60s | Tool list rarely changes |
| `list_resources` | 60s | Resource list rarely changes |
| `list_services` | 30s | Service registry changes infrequently |
| `get_config` | 300s | Configuration is static |
| `get_stock_aggregates` | Do NOT cache | Real-time data |

#### 5. Session State for Auth Context Caching

v3.0's session-scoped state enables per-session caching:

```python
from fastmcp import FastMCP, Context

mcp = FastMCP("mcpgw-server")

async def get_cached_auth_context(ctx: Context) -> dict:
    """Get auth context, using session cache if available."""
    # Check session cache first
    cached = await ctx.get_state("auth_context")
    if cached:
        return cached

    # Extract from headers (expensive)
    auth = await extract_auth_context(ctx)

    # Cache for session lifetime (max 1 day)
    await ctx.set_state("auth_context", auth)
    return auth

@mcp.tool
async def list_services(ctx: Context) -> dict:
    """List services using cached auth context."""
    auth = await get_cached_auth_context(ctx)  # Fast after first call
    return await fetch_services(auth)
```

**Performance Impact**:
- First request: ~5-10ms (header parsing)
- Subsequent requests: <1ms (cache hit)
- Session isolation: Automatic

#### 6. Dependency Injection Caching

Dependencies are cached per-request automatically:

```python
from fastmcp import FastMCP
from fastmcp.dependencies import Depends

mcp = FastMCP("fininfo-server")

def get_secrets_client():
    """Create SecretsManager client (expensive)."""
    print("Creating client...")  # Only printed once per request
    return boto3.client("secretsmanager")

def get_api_key(client=Depends(get_secrets_client)) -> str:
    """Get API key using shared client."""
    return client.get_secret_value(SecretId="api-key")["SecretString"]

@mcp.tool
async def get_stock_aggregates(
    symbol: str,
    api_key: str = Depends(get_api_key)
) -> dict:
    """Tool with injected, cached API key."""
    return await fetch_stock_data(symbol, api_key)
```

### Performance Testing Strategy

#### Baseline Metrics (Capture Before Migration)

```bash
# Capture v2.x baseline performance
# Tool: hey (HTTP load generator)

# 1. Health check latency
hey -n 1000 -c 10 http://localhost:8001/health

# 2. Tool listing latency
hey -n 100 -c 5 -m POST \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' \
    http://localhost:8001/sse

# 3. Tool execution latency (list_services)
hey -n 100 -c 5 -m POST \
    -H "Content-Type: application/json" \
    -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list_services"},"id":1}' \
    http://localhost:8001/sse
```

#### Performance Acceptance Criteria

| Metric | v2.x Baseline | v3.0 Target | Acceptable Regression |
|--------|--------------|-------------|----------------------|
| Health check P50 | <10ms | <10ms | None |
| Tool list P50 | <50ms | <50ms | <10% |
| Tool list P99 | <200ms | <200ms | <20% |
| `list_services` P50 | <100ms | <100ms | <10% |
| `intelligent_tool_finder` P50 | <500ms | <500ms | <10% |
| Memory usage (idle) | TBD | TBD | <20% increase |
| Memory usage (load) | TBD | TBD | <20% increase |

#### Load Testing Commands

```bash
# Install hey if not present
brew install hey  # macOS
# or: go install github.com/rakyll/hey@latest

# Sustained load test (5 minutes)
hey -z 5m -c 20 http://localhost:8001/health

# Burst test (high concurrency)
hey -n 1000 -c 100 http://localhost:8001/health

# Memory profiling
python -m memory_profiler servers/mcpgw/server.py
```

### Performance Optimization Checklist

#### Immediate (Phase 1 - v2.x)

- [ ] Capture baseline performance metrics for all servers
- [ ] Document current memory usage under load
- [ ] Identify slow tools via logging/profiling

#### Short-term (Phase 2 - v3.0 Testing)

- [ ] Add timeouts to all tools (see recommended values above)
- [ ] Implement session state caching for auth context
- [ ] Compare v2.x vs v3.0 baseline performance
- [ ] Profile memory usage with v3.0

#### Long-term (Phase 3 - Production Optimization)

- [ ] Migrate from SSE to Streamable HTTP transport
- [ ] Add response caching middleware for stable endpoints
- [ ] Convert long-running tools to background tasks
- [ ] Implement Redis-backed caching for multi-instance deployments
- [ ] Enable OpenTelemetry tracing for production observability

### OpenTelemetry Integration

FastMCP 3.0 includes native OpenTelemetry instrumentation:

```bash
# Install OpenTelemetry auto-instrumentation
pip install opentelemetry-distro opentelemetry-exporter-otlp

# Run server with tracing
opentelemetry-instrument \
    --traces_exporter otlp \
    --service_name mcpgw-server \
    python servers/mcpgw/server.py
```

**Or via environment variables**:
```bash
export OTEL_SERVICE_NAME=mcpgw-server
export OTEL_TRACES_EXPORTER=otlp
export OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317

python servers/mcpgw/server.py
```

**Traces are automatically generated for**:
- Tool calls
- Resource reads
- Prompt requests
- Provider delegation chains

### Performance Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Increased latency with v3.0 | Low | Medium | Baseline comparison before production |
| Memory growth with session state | Low | Medium | Monitor memory; session state expires after 1 day |
| Timeout killing valid requests | Medium | Medium | Set conservative timeouts; monitor timeout errors |
| Cache invalidation issues | Low | Low | TTL-based expiry; no event-based invalidation |
| Transport migration breaking clients | Medium | High | Coordinate with client teams; staged rollout |

---

## Maintainability Considerations

### Overview

This section addresses maintainability aspects of the FastMCP 3.0 migration, including code organization, configuration management, testing patterns, and long-term maintenance strategies. FastMCP 3.0 introduces patterns that improve code maintainability and make the upgrade path clearer for future versions.

### Configuration Externalization

#### Current State

The servers currently use hardcoded configuration values mixed with environment variables:

```python
# Current pattern in servers/mcpgw/server.py
mcp = FastMCP("mcpgw-mcp-server")
# Configuration scattered across the file
REGISTRY_BASE_URL = os.environ.get("REGISTRY_BASE_URL", "http://localhost:8000")
```

#### FastMCP 3.0: `fastmcp.json` Configuration

FastMCP 3.0 supports declarative configuration via `fastmcp.json`:

```json
{
  "$schema": "https://fastmcp.com/schemas/fastmcp.json",
  "name": "mcpgw-mcp-server",
  "version": "1.0.0",
  "description": "MCP Gateway Server for registry interactions",
  "env": {
    "REGISTRY_BASE_URL": {
      "default": "http://localhost:8000",
      "description": "Base URL for the MCP registry"
    },
    "LOG_LEVEL": {
      "default": "INFO",
      "description": "Logging level"
    }
  },
  "dependencies": {
    "httpx": ">=0.27.0",
    "faiss-cpu": ">=1.7.4"
  }
}
```

**Benefits**:
- Configuration documented alongside code
- Schema validation for config files
- IDE autocomplete support
- Easier environment-specific overrides

**Recommended Migration Path**:
1. Create `fastmcp.json` files for each server during v3.0 migration
2. Move environment variable definitions to JSON
3. Keep Python code focused on logic, not configuration

#### Environment Variable Patterns

FastMCP 3.0 recommends explicit environment handling:

```python
from fastmcp import FastMCP
from fastmcp.settings import Settings

# Explicit settings class (Pydantic-based)
class McpgwSettings(Settings):
    registry_base_url: str = "http://localhost:8000"
    log_level: str = "INFO"
    embedding_model: str = "all-MiniLM-L6-v2"

    class Config:
        env_prefix = "MCPGW_"

settings = McpgwSettings()
mcp = FastMCP("mcpgw-server", settings=settings)
```

### Code Organization Patterns

#### Current Structure

```
servers/
├── mcpgw/
│   ├── server.py           # All code in single file (~500+ lines)
│   ├── pyproject.toml
│   └── README.md
├── fininfo/
│   ├── server.py           # All code in single file
│   └── ...
└── realserverfaketools/
    ├── server.py           # All code in single file
    └── ...
```

#### Recommended v3.0 Structure

For larger servers like `mcpgw`, consider refactoring:

```
servers/
├── mcpgw/
│   ├── __init__.py
│   ├── server.py           # FastMCP app initialization only
│   ├── fastmcp.json        # Configuration (v3.0)
│   ├── tools/
│   │   ├── __init__.py
│   │   ├── registry.py     # list_services, invoke_tool
│   │   ├── search.py       # intelligent_tool_finder
│   │   └── admin.py        # Admin-only tools
│   ├── resources/
│   │   ├── __init__.py
│   │   └── config.py       # get_config resource
│   ├── middleware/
│   │   ├── __init__.py
│   │   └── auth.py         # extract_auth_context, check_tool_access
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py      # Pydantic models
│   └── utils/
│       ├── __init__.py
│       └── embedding.py    # FAISS utilities
├── fininfo/
│   └── ...  # Smaller, can stay single file
└── realserverfaketools/
    └── ...  # Smaller, can stay single file
```

#### Provider-Based Organization (v3.0)

FastMCP 3.0 providers enable modular loading:

```python
from fastmcp import FastMCP
from fastmcp.providers import FileSystemProvider

mcp = FastMCP("mcpgw-server")

# Load tools from directory structure
mcp.add_provider(FileSystemProvider("./tools"))
mcp.add_provider(FileSystemProvider("./resources"))
```

**When to Refactor**:
- Server has >10 tools: Consider splitting into modules
- Server has >500 lines: Consider directory structure
- Multiple contributors: Directory structure reduces merge conflicts

### Testing Patterns

#### FastMCP Testing Utilities

FastMCP provides dedicated testing utilities:

```python
import pytest
from fastmcp import FastMCP
from fastmcp.client import Client

# servers/mcpgw/server.py
mcp = FastMCP("mcpgw-server")

@mcp.tool
async def list_services() -> dict:
    return {"services": ["registry", "auth"]}

# tests/test_mcpgw.py
@pytest.fixture
def client():
    """Create test client connected to server."""
    from servers.mcpgw.server import mcp
    return Client(mcp)

@pytest.mark.asyncio
async def test_list_services(client):
    """Test list_services tool returns expected structure."""
    async with client:
        result = await client.call_tool("list_services")
        assert "services" in result
        assert isinstance(result["services"], list)

@pytest.mark.asyncio
async def test_tool_with_context(client):
    """Test tool with mocked context."""
    async with client:
        # FastMCP Client handles context injection
        result = await client.call_tool(
            "list_services",
            headers={"Authorization": "Bearer test-token"}
        )
        assert result is not None
```

#### Snapshot Testing for Tool Outputs

For tools with complex outputs, use snapshot testing:

```python
import pytest
from syrupy import SnapshotAssertion

@pytest.mark.asyncio
async def test_list_services_snapshot(client, snapshot: SnapshotAssertion):
    """Verify list_services output matches expected snapshot."""
    async with client:
        result = await client.call_tool("list_services")
        assert result == snapshot
```

#### Test Organization Recommendations

```
tests/
├── unit/
│   ├── test_auth.py              # Pure unit tests for auth functions
│   ├── test_embedding.py         # FAISS utilities
│   └── test_models.py            # Pydantic model tests
├── integration/
│   ├── test_mcpgw_tools.py       # Tool integration tests
│   ├── test_fininfo_tools.py     # fininfo integration tests
│   └── test_realserver_tools.py  # realserverfaketools tests
├── e2e/
│   └── test_mcp_protocol.py      # Full MCP protocol tests
├── fixtures/
│   ├── auth_contexts.py          # Test auth contexts
│   └── mock_responses.py         # Mock API responses
└── conftest.py                   # Shared fixtures
```

#### Testing Checklist for Migration

- [ ] Create `Client` fixtures for each server
- [ ] Add tests for all tools with sample inputs
- [ ] Add tests for auth context extraction
- [ ] Add tests for scope-based access control
- [ ] Add snapshot tests for complex tool outputs
- [ ] Add integration tests with mock external services

### Migration Workflow Patterns

#### Component Versioning for Gradual Migration

FastMCP 3.0's component versioning enables gradual migration:

```python
from fastmcp import FastMCP

mcp = FastMCP("mcpgw-server")

# Keep v1 for backward compatibility
@mcp.tool(version="1.0", deprecated=True)
async def list_services() -> dict:
    """Original implementation (deprecated)."""
    return await _list_services_v1()

# Add v2 with improvements
@mcp.tool(version="2.0")
async def list_services(
    include_health: bool = False,
    filter_scope: str | None = None
) -> dict:
    """Enhanced implementation with filtering."""
    return await _list_services_v2(include_health, filter_scope)
```

**Version Migration Strategy**:
1. Add v2 tools alongside v1 (backward compatible)
2. Mark v1 as deprecated
3. Update clients to use v2
4. Remove v1 after deprecation period

#### Feature Flags During Migration

```python
import os
from fastmcp import FastMCP

mcp = FastMCP("mcpgw-server")

# Feature flag for new functionality
USE_V3_SESSION_CACHING = os.environ.get("USE_V3_SESSION_CACHING", "false").lower() == "true"

@mcp.tool
async def list_services(ctx: Context) -> dict:
    if USE_V3_SESSION_CACHING:
        # New v3.0 pattern
        auth = await get_cached_auth_context(ctx)
    else:
        # Legacy v2.x pattern
        auth = await extract_auth_context(ctx)

    return await fetch_services(auth)
```

### Documentation Requirements

#### Inline Documentation Standards

```python
from fastmcp import FastMCP

mcp = FastMCP(
    "mcpgw-server",
    # Server-level documentation (shown in MCP discovery)
    instructions="""
    MCP Gateway Server for registry interactions.

    ## Authentication
    Requires valid JWT token in Authorization header.

    ## Available Tools
    - list_services: List all registered MCP services
    - invoke_tool: Proxy tool calls to registered services
    - intelligent_tool_finder: Semantic search for tools

    ## Rate Limits
    - 100 requests/minute per client
    """,
)

@mcp.tool(
    # Tool-level documentation
    description="List all registered MCP services with optional filtering",
    examples=[
        {"description": "List all services", "args": {}},
        {"description": "Include health status", "args": {"include_health": True}},
    ]
)
async def list_services(
    include_health: bool = False,
    filter_scope: str | None = None,
) -> dict:
    """
    List registered MCP services.

    Args:
        include_health: Include service health status in response
        filter_scope: Filter services by required scope

    Returns:
        Dictionary with 'services' key containing list of service metadata
    """
    pass
```

#### Required Documentation Updates for Migration

| Document | Updates Needed | Priority |
|----------|----------------|----------|
| `servers/*/README.md` | Add FastMCP version requirements, new features | High |
| `CHANGELOG.md` | Document v3.0 migration changes | High |
| `docker-compose.yml` | Add new environment variables | Medium |
| `charts/*/values.yaml` | Add configuration options | Medium |
| API documentation | Update tool signatures, add examples | Medium |

### Dependency Management

#### Lock File Best Practices

```toml
# pyproject.toml - pin FastMCP major version
dependencies = [
    "fastmcp>=3.0,<4",        # Major version pin
    "pydantic>=2.11.3,<3",    # Major version pin for stability
    "httpx>=0.27.0",          # Minor version flexibility
]

[tool.uv]
# Local-only project - never resolve from PyPI
package = false
```

#### Dependency Update Workflow

```bash
# Check for updates
uv pip list --outdated

# Update within constraints
uv sync

# Test after updates
uv run pytest tests/ -n 8

# Lock dependencies
uv lock
```

### Maintainability Checklist

#### Pre-Migration

- [ ] Document current configuration in `fastmcp.json` format
- [ ] Identify code sections >100 lines that should be refactored
- [ ] Create baseline test coverage report
- [ ] Document all environment variables currently used
- [ ] Create architectural decision records (ADRs) for major decisions

#### During Migration

- [ ] Use component versioning for breaking changes
- [ ] Add feature flags for new functionality
- [ ] Write migration tests comparing v2 vs v3 behavior
- [ ] Update inline documentation for all tools
- [ ] Create `fastmcp.json` for each server

#### Post-Migration

- [ ] Remove deprecated v1 tools after client migration
- [ ] Clean up feature flags
- [ ] Update README files with new version requirements
- [ ] Archive pre-migration code patterns in ADRs
- [ ] Schedule review of dependency updates

### Long-Term Maintenance Considerations

#### FastMCP Release Cadence

| Version | Expected Timeline | Action |
|---------|-------------------|--------|
| v3.0 GA | Q1 2026 | Primary migration target |
| v3.1+ | Q2-Q3 2026 | Minor updates, backward compatible |
| v4.0 | Late 2026 | MCP SDK v2 required; plan next migration |

#### Monitoring for Deprecations

```python
import warnings
import logging

# Enable deprecation warnings in development
warnings.filterwarnings("default", category=DeprecationWarning, module="fastmcp")

# Log deprecations in production
logging.getLogger("fastmcp").setLevel(logging.WARNING)
```

#### Automation Recommendations

1. **Dependabot/Renovate**: Auto-update FastMCP within version constraints
2. **CI Deprecation Checks**: Fail CI if deprecation warnings exceed threshold
3. **Scheduled Tests**: Weekly test runs against FastMCP `main` branch for early warning

### Error Handling Patterns

#### FastMCP 3.0 Error Types

FastMCP 3.0 provides structured error handling with MCP-compliant error codes:

| Error Code | Name | Description | When to Use |
|------------|------|-------------|-------------|
| -32700 | ParseError | Invalid JSON | Malformed request |
| -32600 | InvalidRequest | Invalid request object | Missing required fields |
| -32601 | MethodNotFound | Method doesn't exist | Unknown tool/resource |
| -32602 | InvalidParams | Invalid method parameters | Type/validation errors |
| -32603 | InternalError | Internal server error | Unexpected exceptions |
| -32000 | ToolTimeout | Tool execution timeout | Exceeds configured timeout |

#### Error Handling Implementation

```python
from fastmcp import FastMCP, Context
from fastmcp.exceptions import ToolError

mcp = FastMCP("mcpgw-server")

@mcp.tool(timeout=30.0)
async def list_services(ctx: Context) -> dict:
    """List registered services with proper error handling."""
    try:
        auth = await get_cached_auth_context(ctx)
        if not auth:
            raise ToolError(
                code=-32602,
                message="Authentication required",
                data={"hint": "Include Authorization header"}
            )

        services = await fetch_services(auth)
        return {"services": services, "count": len(services)}

    except httpx.TimeoutException as e:
        raise ToolError(
            code=-32603,
            message="Registry service timeout",
            data={"original_error": str(e)}
        )
    except httpx.HTTPStatusError as e:
        raise ToolError(
            code=-32603,
            message=f"Registry returned {e.response.status_code}",
            data={"status_code": e.response.status_code}
        )
```

#### Error Response Logging

```python
import logging
from fastmcp import FastMCP
from fastmcp.server.middleware.logging import ErrorLoggingMiddleware

logger = logging.getLogger(__name__)
mcp = FastMCP("mcpgw-server")

# Add error logging middleware
mcp.add_middleware(ErrorLoggingMiddleware(
    logger=logger,
    log_level=logging.ERROR,
    include_traceback=True,
))
```

#### Client-Side Error Handling

When using tools from clients, handle errors gracefully:

```python
from fastmcp import Client

async def safe_tool_call(client: Client, tool_name: str, **kwargs) -> dict:
    """Call tool with error handling."""
    try:
        result = await client.call_tool(tool_name, **kwargs)
        return {"success": True, "result": result}
    except ToolError as e:
        return {
            "success": False,
            "error_code": e.code,
            "error_message": e.message,
            "error_data": e.data,
        }
```

#### Migration Error Handling Checklist

- [ ] Replace generic `raise Exception` with `raise ToolError(code, message)`
- [ ] Add timeout handling for all external API calls
- [ ] Add error data with debugging hints
- [ ] Test error responses with client
- [ ] Verify error codes match MCP specification

### Monitoring and Alerting Setup

#### Health Check Endpoints

FastMCP 3.0 provides built-in health endpoints:

```python
from fastmcp import FastMCP

mcp = FastMCP(
    "mcpgw-server",
    # Enable health endpoints
    enable_health_check=True,
    health_path="/health",
    ready_path="/ready",
)
```

**Health Check Responses**:

| Endpoint | Purpose | Success Response | Failure Response |
|----------|---------|------------------|------------------|
| `/health` | Liveness probe | `{"status": "ok"}` 200 | `{"status": "error"}` 503 |
| `/ready` | Readiness probe | `{"status": "ready"}` 200 | `{"status": "not_ready"}` 503 |

#### Metrics Collection

FastMCP 3.0 supports Prometheus metrics:

```python
from fastmcp import FastMCP
from fastmcp.server.middleware.metrics import PrometheusMetricsMiddleware

mcp = FastMCP("mcpgw-server")

# Add Prometheus metrics
mcp.add_middleware(PrometheusMetricsMiddleware(
    prefix="mcpgw",
    enable_latency_histogram=True,
    enable_request_counter=True,
    enable_error_counter=True,
))
```

**Key Metrics**:

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `mcpgw_tool_calls_total` | Counter | Total tool invocations | N/A |
| `mcpgw_tool_latency_seconds` | Histogram | Tool execution time | P99 > 5s |
| `mcpgw_tool_errors_total` | Counter | Tool error count | > 10/min |
| `mcpgw_active_sessions` | Gauge | Current session count | > 1000 |

#### Alert Rules (Prometheus/Grafana)

```yaml
# prometheus-alerts.yml
groups:
  - name: mcpgw-alerts
    rules:
      - alert: HighToolLatency
        expr: histogram_quantile(0.99, mcpgw_tool_latency_seconds) > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High tool latency detected"
          description: "P99 latency for {{ $labels.tool }} is {{ $value }}s"

      - alert: HighErrorRate
        expr: rate(mcpgw_tool_errors_total[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: HealthCheckFailed
        expr: up{job="mcpgw-server"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "MCP server health check failed"
```

#### Structured Logging for Observability

```python
import logging
import json
from fastmcp import FastMCP

# Configure structured JSON logging
class JsonFormatter(logging.Formatter):
    def format(self, record):
        return json.dumps({
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "tool": getattr(record, "tool", None),
            "session_id": getattr(record, "session_id", None),
            "duration_ms": getattr(record, "duration_ms", None),
        })

# Apply to server
handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logging.getLogger("fastmcp").addHandler(handler)
```

#### Monitoring Dashboards

Create Grafana dashboards for:

1. **Overview Dashboard**:
   - Request rate per tool
   - Error rate over time
   - P50/P95/P99 latency
   - Active sessions

2. **Performance Dashboard**:
   - Tool latency breakdown
   - Memory usage
   - CPU usage
   - Cache hit rates

3. **Security Dashboard**:
   - Auth failures
   - Invalid token attempts
   - Rate limit hits

#### Post-Migration Monitoring Checklist

- [ ] Configure health check endpoints in Kubernetes probes
- [ ] Add Prometheus scrape configuration
- [ ] Create Grafana dashboards
- [ ] Set up alert rules
- [ ] Configure PagerDuty/Slack integration
- [ ] Test alert routing
- [ ] Document runbooks for each alert

---

## Testing Considerations

### Overview

This section provides comprehensive testing guidance for the FastMCP 3.0 migration. FastMCP provides powerful in-memory testing capabilities through its Client class, enabling fast, deterministic tests without network overhead or subprocess management.

### Current Testing Gaps

Based on the Testing Strategy section, the current plan includes basic smoke tests but lacks:

| Gap | Description | Priority |
|-----|-------------|----------|
| No in-memory client tests | Missing FastMCP `Client` fixtures for tool testing | **High** |
| No schema validation tests | Tool input/output schemas not validated | **High** |
| No regression tests | No v2 vs v3 behavior comparison tests | **High** |
| No snapshot tests | Complex tool outputs not captured | Medium |
| No transport tests | SSE vs HTTP transport behavior untested | Medium |
| No auth mocking | Auth context extraction not tested with mocks | Medium |

### FastMCP Testing Utilities

#### In-Memory Client Testing (Recommended)

FastMCP's `Client` class with `FastMCPTransport` enables in-process testing without network overhead:

```python
import pytest
from fastmcp import FastMCP, Client
from fastmcp.client.transports import FastMCPTransport

# Import the server instance
from servers.mcpgw.server import mcp

@pytest.fixture
async def mcpgw_client():
    """Create in-memory client for mcpgw server."""
    async with Client(transport=mcp) as client:
        yield client

@pytest.mark.asyncio
async def test_list_tools(mcpgw_client: Client[FastMCPTransport]):
    """Verify all expected tools are exposed."""
    tools = await mcpgw_client.list_tools()

    tool_names = {t.name for t in tools}
    expected_tools = {
        "list_services",
        "invoke_tool",
        "intelligent_tool_finder",
        "list_server_tools",
        "list_server_resources",
        # ... add all expected tools
    }
    assert expected_tools.issubset(tool_names)

@pytest.mark.asyncio
async def test_call_tool_basic(mcpgw_client: Client[FastMCPTransport]):
    """Test basic tool execution."""
    result = await mcpgw_client.call_tool(
        name="list_services",
        arguments={}
    )
    assert result.data is not None
    assert isinstance(result.data, dict)
```

#### HTTP Transport Testing

For testing actual HTTP transport behavior (needed for v3.0 migration validation):

```python
import pytest
from fastmcp import FastMCP, Client
from fastmcp.client.transports import StreamableHttpTransport
from fastmcp.utilities.tests import run_server_async

@pytest.fixture
async def mcpgw_http_server():
    """Start mcpgw server in-process on HTTP transport."""
    from servers.mcpgw.server import mcp
    async with run_server_async(mcp, transport="http") as url:
        yield f"{url}/mcp"

@pytest.mark.asyncio
@pytest.mark.integration
async def test_http_transport(mcpgw_http_server: str):
    """Test actual HTTP transport behavior."""
    async with Client(
        transport=StreamableHttpTransport(mcpgw_http_server)
    ) as client:
        result = await client.ping()
        assert result is True

        tools = await client.list_tools()
        assert len(tools) > 0
```

#### Subprocess Testing (Process Isolation)

For tests requiring complete process isolation (e.g., testing STDIO transport):

```python
import pytest
from fastmcp import Client
from fastmcp.utilities.tests import run_server_in_process

def run_mcpgw_server(host: str, port: int) -> None:
    """Function to run in subprocess."""
    from servers.mcpgw.server import mcp
    mcp.run(host=host, port=port, transport="http")

@pytest.fixture
async def mcpgw_subprocess():
    """Fixture that runs server in subprocess."""
    with run_server_in_process(run_mcpgw_server, transport="http") as url:
        yield f"{url}/mcp"

@pytest.mark.asyncio
@pytest.mark.client_process  # FastMCP marker for subprocess tests
async def test_subprocess_isolation(mcpgw_subprocess: str):
    """Test with complete process isolation."""
    async with Client(mcpgw_subprocess) as client:
        result = await client.ping()
        assert result is True
```

### Inline Snapshot Testing

FastMCP recommends `inline-snapshot` for testing complex data structures:

```python
from inline_snapshot import snapshot

@pytest.mark.asyncio
async def test_tool_schema(mcpgw_client: Client[FastMCPTransport]):
    """Verify tool schema matches expected structure."""
    tools = await mcpgw_client.list_tools()
    list_services_tool = next(t for t in tools if t.name == "list_services")

    # First run: pytest --inline-snapshot=create (auto-fills)
    # Subsequent: pytest --inline-snapshot=fix (updates)
    assert list_services_tool.inputSchema == snapshot({
        "type": "object",
        "properties": {},
        "required": []
    })

@pytest.mark.asyncio
async def test_list_services_output(mcpgw_client: Client[FastMCPTransport]):
    """Snapshot test for list_services output structure."""
    result = await mcpgw_client.call_tool("list_services", {})

    # Capture structure, ignore dynamic values
    assert result.data.keys() == snapshot({"services", "total", "timestamp"})
```

### Dynamic Value Testing with dirty-equals

For assertions on values that change between test runs:

```python
from dirty_equals import IsDatetime, IsStr, IsPositiveInt, IsDict

@pytest.mark.asyncio
async def test_list_services_with_dynamic_values(mcpgw_client):
    """Test with flexible assertions for dynamic values."""
    result = await mcpgw_client.call_tool("list_services", {})

    assert result.data == {
        "services": IsDict(),           # Any dict
        "total": IsPositiveInt(),       # Any positive integer
        "timestamp": IsDatetime(),      # Any datetime
        "request_id": IsStr(regex=r'^[a-f0-9-]+$')  # UUID pattern
    }
```

### Parametrized Testing

Test tools with multiple input combinations:

```python
import pytest

@pytest.mark.asyncio
@pytest.mark.parametrize(
    "query,expected_count_min",
    [
        ("list files", 1),
        ("search database", 2),
        ("authentication", 1),
        ("nonexistent_tool_xyz", 0),
    ],
)
async def test_intelligent_tool_finder_parametrized(
    mcpgw_client: Client[FastMCPTransport],
    query: str,
    expected_count_min: int,
):
    """Test semantic search with various queries."""
    result = await mcpgw_client.call_tool(
        "intelligent_tool_finder",
        {"query": query}
    )
    assert len(result.data.get("tools", [])) >= expected_count_min
```

### Migration Regression Testing

#### v2 vs v3 Behavior Comparison

Create tests that capture v2.x baseline and verify v3.0 compatibility:

```python
import pytest
import json
from pathlib import Path

# Save baseline during v2.x testing
BASELINE_DIR = Path("tests/baselines/v2")

@pytest.fixture
def baseline_loader():
    """Load v2.x baseline data for comparison."""
    def load(name: str) -> dict:
        return json.loads((BASELINE_DIR / f"{name}.json").read_text())
    return load

@pytest.mark.asyncio
async def test_list_services_backward_compatible(
    mcpgw_client: Client[FastMCPTransport],
    baseline_loader
):
    """Verify v3.0 output matches v2.x baseline structure."""
    result = await mcpgw_client.call_tool("list_services", {})
    baseline = baseline_loader("list_services")

    # Verify same keys exist
    assert result.data.keys() == baseline.keys()

    # Verify same structure for services list
    if result.data.get("services"):
        v3_service_keys = set(result.data["services"][0].keys())
        v2_service_keys = set(baseline["services"][0].keys())
        assert v3_service_keys == v2_service_keys, \
            f"Service structure changed: added={v3_service_keys - v2_service_keys}, removed={v2_service_keys - v3_service_keys}"
```

#### Baseline Capture Script

```python
#!/usr/bin/env python
"""Capture v2.x baselines before migration."""
import asyncio
import json
from pathlib import Path
from fastmcp import Client

BASELINE_DIR = Path("tests/baselines/v2")
BASELINE_DIR.mkdir(parents=True, exist_ok=True)

async def capture_baselines():
    from servers.mcpgw.server import mcp

    async with Client(mcp) as client:
        # Capture tool list
        tools = await client.list_tools()
        (BASELINE_DIR / "tools.json").write_text(
            json.dumps([t.model_dump() for t in tools], indent=2)
        )

        # Capture list_services output
        result = await client.call_tool("list_services", {})
        (BASELINE_DIR / "list_services.json").write_text(
            json.dumps(result.data, indent=2)
        )

        print(f"Baselines captured to {BASELINE_DIR}")

if __name__ == "__main__":
    asyncio.run(capture_baselines())
```

### Auth Context Testing

#### Mocking HTTP Request Headers

```python
import pytest
from unittest.mock import patch, MagicMock
from starlette.requests import Request

@pytest.fixture
def mock_request_with_auth():
    """Create mock request with auth headers."""
    def _create(headers: dict):
        mock_request = MagicMock(spec=Request)
        mock_request.headers = headers
        mock_request.cookies = {}
        return mock_request
    return _create

@pytest.mark.asyncio
async def test_extract_auth_context_with_headers(mock_request_with_auth):
    """Test auth context extraction with various headers."""
    from servers.mcpgw.server import extract_auth_context

    headers = {
        "authorization": "Bearer test-token-12345",
        "x-scopes": "read,write,admin",
        "x-user-scopes": "read,write",
        "x-username": "testuser",
    }

    with patch("servers.mcpgw.server.get_http_request") as mock_get_request:
        mock_get_request.return_value = mock_request_with_auth(headers)

        # Create mock context
        mock_ctx = MagicMock()
        auth_ctx = await extract_auth_context(mock_ctx)

        assert auth_ctx["username"] == "testuser"
        assert "read" in auth_ctx["scopes"]
        assert "admin" in auth_ctx["scopes"]

@pytest.mark.asyncio
async def test_extract_auth_context_missing_headers(mock_request_with_auth):
    """Test auth context extraction with missing headers."""
    from servers.mcpgw.server import extract_auth_context

    # Empty headers - should handle gracefully
    with patch("servers.mcpgw.server.get_http_request") as mock_get_request:
        mock_get_request.return_value = mock_request_with_auth({})

        mock_ctx = MagicMock()
        auth_ctx = await extract_auth_context(mock_ctx)

        # Should return default/empty context, not error
        assert auth_ctx is not None
        assert auth_ctx.get("scopes", []) == []
```

### Test Markers and Organization

#### Pytest Configuration (conftest.py)

```python
# tests/conftest.py
import pytest

def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests (deselect with '-m \"not integration\"')"
    )
    config.addinivalue_line(
        "markers", "client_process: marks tests that spawn subprocess (slower)"
    )
    config.addinivalue_line(
        "markers", "v3_migration: marks tests specific to v3.0 migration"
    )

@pytest.fixture(scope="session")
def event_loop_policy():
    """Use uvloop if available for faster async tests."""
    try:
        import uvloop
        return uvloop.EventLoopPolicy()
    except ImportError:
        return None
```

#### Test File Organization

```
tests/
├── conftest.py                    # Shared fixtures and markers
├── baselines/
│   └── v2/                        # v2.x baseline captures
│       ├── tools.json
│       ├── list_services.json
│       └── ...
├── unit/
│   ├── test_auth.py               # Auth extraction unit tests
│   ├── test_embedding.py          # FAISS utilities
│   └── test_models.py             # Pydantic model tests
├── integration/
│   ├── test_mcpgw_tools.py        # mcpgw tool tests (in-memory)
│   ├── test_fininfo_tools.py      # fininfo tool tests
│   ├── test_realserver_tools.py   # realserverfaketools tests
│   └── test_http_transport.py     # HTTP transport tests
├── migration/
│   ├── test_v3_regression.py      # v2 vs v3 comparison tests
│   ├── test_v3_new_features.py    # v3.0 specific feature tests
│   └── capture_baselines.py       # Baseline capture script
└── e2e/
    ├── test_mcp_protocol.py       # Full protocol tests
    └── test_auth_flow.py          # End-to-end auth tests
```

### Test Dependencies

Add testing dependencies to `pyproject.toml`:

```toml
[project.optional-dependencies]
test = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.23.0",
    "pytest-xdist>=3.5.0",           # Parallel test execution
    "pytest-cov>=4.1.0",             # Coverage reporting
    "inline-snapshot>=0.10.0",       # Snapshot testing
    "dirty-equals>=0.7.0",           # Flexible assertions
    "httpx>=0.27.0",                 # HTTP client for transport tests
    "respx>=0.21.0",                 # httpx mocking
]
```

### Test Commands

```bash
# Run all tests with parallel execution
uv run pytest tests/ -n 8

# Run only unit tests (fast)
uv run pytest tests/unit/ -n 8

# Run integration tests (slower)
uv run pytest tests/integration/ -m "not client_process"

# Run migration regression tests
uv run pytest tests/migration/ -v

# Skip subprocess tests (fastest)
uv run pytest -m "not integration and not client_process"

# Generate coverage report
uv run pytest tests/ -n 8 --cov=servers --cov-report=html

# Update snapshots after intentional changes
uv run pytest tests/ --inline-snapshot=fix

# Create new snapshots
uv run pytest tests/ --inline-snapshot=create

# Capture v2.x baselines before migration
uv run python tests/migration/capture_baselines.py
```

### Testing Checklist

#### Pre-Migration (v2.x Baseline)

- [ ] Install test dependencies: `uv add --dev pytest pytest-asyncio inline-snapshot dirty-equals`
- [ ] Create `tests/conftest.py` with FastMCP client fixtures
- [ ] Run baseline capture script to save v2.x outputs
- [ ] Add in-memory client tests for all three servers
- [ ] Add parametrized tests for tool inputs
- [ ] Add snapshot tests for complex outputs
- [ ] Verify current test coverage: `uv run pytest --cov=servers`

#### During Migration (v3.0 Testing)

- [ ] Run regression tests comparing v2.x baselines
- [ ] Add HTTP transport tests using `run_server_async`
- [ ] Test auth context extraction with mocked headers
- [ ] Test scope-based access control
- [ ] Test session state isolation (v3.0 specific)
- [ ] Verify all snapshots still pass or update intentionally

#### Post-Migration Validation

- [ ] Run full test suite: `uv run pytest tests/ -n 8`
- [ ] Verify coverage maintained or improved
- [ ] Update snapshots if output format changed: `pytest --inline-snapshot=fix`
- [ ] Archive v2.x baselines for reference
- [ ] Document any test changes required by v3.0

### Testing Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| Unit test coverage | ≥80% | TBD |
| Integration test coverage | ≥60% | TBD |
| Regression tests passing | 100% | N/A |
| Snapshot tests | All tools covered | 0 |
| Auth context tests | All header combinations | 0 |
| Parametrized tool tests | ≥3 inputs per tool | 0 |

---

## Documentation Considerations

### Overview

This section addresses documentation requirements for the FastMCP 3.0 migration. FastMCP relies heavily on function docstrings, type annotations, and decorator arguments to generate schemas that LLMs can understand. Proper documentation improves tool discoverability, reduces LLM errors, and enables better client experiences.

### Current Documentation Gaps

| Gap | Server | Description | Priority |
|-----|--------|-------------|----------|
| No server instructions | All | Missing `instructions` parameter on FastMCP instances | **High** |
| Incomplete tool descriptions | mcpgw | Some tools lack explicit `description` argument | **High** |
| No tool annotations | All | Missing `readOnlyHint`, `destructiveHint` metadata | Medium |
| Inconsistent docstrings | All | Docstring formats vary across tools | Medium |
| No tool examples | All | Missing `examples` in decorator arguments | Low |
| Missing tags | All | Tools not categorized with tags | Low |

### FastMCP Documentation Patterns

#### Server-Level Instructions

The `instructions` parameter provides server-level documentation that helps LLMs understand the server's purpose and available capabilities:

```python
from fastmcp import FastMCP

mcp = FastMCP(
    "mcpgw-mcp-server",
    version="1.0.0",
    instructions="""
    MCP Gateway Server for registry interactions and tool discovery.

    ## Purpose
    Provides access to registered MCP services, tool invocation proxying,
    and intelligent semantic search for finding relevant tools.

    ## Authentication
    Requires valid JWT token in `Authorization` header.
    Scopes are extracted from `x-scopes` and `x-user-scopes` headers.

    ## Available Tool Categories
    - **Discovery**: list_services, list_server_tools, list_server_resources
    - **Invocation**: invoke_tool, invoke_resource
    - **Search**: intelligent_tool_finder (semantic search using FAISS)
    - **Configuration**: get_config

    ## Rate Limits
    - 100 requests/minute per authenticated client
    - 10 requests/minute for unauthenticated clients

    ## Error Handling
    All errors return structured JSON with `error_code` and `message` fields.
    """,
)
```

**Recommended instructions for each server**:

| Server | Key Points to Document |
|--------|----------------------|
| mcpgw | Auth requirements, tool categories, FAISS search capabilities, rate limits |
| fininfo | API key requirements, data sources, supported stock symbols |
| realserverfaketools | Test/demo purpose, available mock tools, parameter types |

#### Tool Decorator Documentation

FastMCP extracts documentation from multiple sources with this priority:
1. `description` argument (overrides docstring)
2. Function docstring (used if no `description`)
3. Function name (last resort)

**Best Practice: Use Both**

```python
@mcp.tool(
    # Explicit MCP-facing description (shown to LLMs)
    description="List all registered MCP services with optional health status filtering",
    # Behavioral hints for LLM decision-making
    annotations={
        "readOnlyHint": True,      # Doesn't modify state
        "idempotentHint": True,    # Safe to retry
    },
    # Categorization for filtering
    tags={"discovery", "registry"},
)
async def list_services(
    include_health: bool = False,
    filter_scope: str | None = None,
) -> dict:
    """
    List registered MCP services from the gateway registry.

    This tool queries the registry API to retrieve all registered MCP services.
    Results can be filtered by required authentication scope.

    Args:
        include_health: If True, includes live health status for each service.
            Health checks add ~100ms latency per service.
        filter_scope: Only return services requiring this scope.
            Common scopes: 'read', 'write', 'admin'.

    Returns:
        Dictionary containing:
        - services: List of service metadata dicts
        - total: Total number of services
        - timestamp: ISO 8601 timestamp of query

    Raises:
        HTTPException: If registry API is unavailable (503)

    Example:
        >>> result = await list_services(include_health=True)
        >>> print(f"Found {result['total']} services")
    """
    pass
```

#### Tool Annotations Reference

Use annotations to help LLMs make better decisions about when to call tools:

```python
from mcp.types import ToolAnnotations

# Read-only tool (no side effects)
@mcp.tool(
    annotations=ToolAnnotations(
        title="List Services",
        readOnlyHint=True,
        idempotentHint=True,
    )
)
async def list_services() -> dict: ...

# Destructive tool (modifies state)
@mcp.tool(
    annotations=ToolAnnotations(
        title="Delete Service",
        readOnlyHint=False,
        destructiveHint=True,
        idempotentHint=False,
    )
)
async def delete_service(service_id: str) -> dict: ...

# Long-running tool (may take time)
@mcp.tool(
    annotations=ToolAnnotations(
        title="Bulk Analysis",
        readOnlyHint=True,
        openWorldHint=True,  # May access external services
    )
)
async def bulk_analysis(queries: list[str]) -> dict: ...
```

**Annotation Decision Matrix**:

| Tool | readOnlyHint | destructiveHint | idempotentHint | openWorldHint |
|------|-------------|----------------|----------------|---------------|
| `list_services` | True | False | True | True |
| `invoke_tool` | False | Depends | False | True |
| `intelligent_tool_finder` | True | False | True | False |
| `get_config` | True | False | True | False |
| `get_stock_aggregates` | True | False | True | True |

#### Resource Documentation

Resources also support documentation via decorator arguments:

```python
@mcp.resource(
    uri="config://mcpgw/settings",
    name="Server Configuration",
    description="Read-only server configuration and feature flags",
    mime_type="application/json",
    annotations={
        "readOnlyHint": True,
        "idempotentHint": True,
    },
    tags={"config", "readonly"},
)
def get_config() -> dict:
    """
    Returns current server configuration.

    Includes:
    - enabled_features: List of feature flags
    - registry_url: Base URL for registry API
    - version: Server version string

    This resource is cached for 5 minutes.
    """
    return {"version": "1.0.0", "features": ["semantic_search"]}
```

#### Prompt Documentation

Prompts benefit from clear titles and descriptions:

```python
@mcp.prompt(
    name="system_prompt_for_agent",
    title="Agent System Prompt",
    description="Generates a system prompt for AI agents using the registry",
    tags={"prompts", "agent"},
)
def system_prompt_for_agent(agent_name: str, capabilities: list[str]) -> str:
    """
    Generate a system prompt for an AI agent.

    Args:
        agent_name: Display name for the agent
        capabilities: List of enabled capability strings

    Returns:
        Formatted system prompt string ready for LLM consumption
    """
    return f"You are {agent_name}..."
```

### Docstring Standards

#### LLM-Optimized Docstrings

FastMCP extracts docstrings for tool schemas. Write them for LLM consumption:

```python
# Good: LLM-friendly docstring
@mcp.tool
async def intelligent_tool_finder(query: str, max_results: int = 5) -> dict:
    """
    Find relevant MCP tools using semantic search.

    Uses FAISS embeddings to find tools matching natural language queries.
    Returns ranked results with relevance scores.

    Examples:
        - "find files" -> file system tools
        - "send email" -> communication tools
        - "query database" -> database tools

    Args:
        query: Natural language description of desired functionality.
            More specific queries yield better results.
        max_results: Maximum tools to return (1-20). Default 5.

    Returns:
        {
            "tools": [{"name": str, "description": str, "score": float}],
            "query_embedding_time_ms": int,
            "search_time_ms": int
        }
    """
    pass

# Bad: Developer-only docstring
@mcp.tool
async def intelligent_tool_finder(query: str, max_results: int = 5) -> dict:
    """Internal FAISS search. See embedding.py for details."""  # Too terse!
    pass
```

#### Docstring Checklist

For each tool, verify:

- [ ] First line describes what the tool does (imperative mood)
- [ ] Args section documents all parameters with types
- [ ] Returns section documents output structure
- [ ] Examples show common use cases (if complex)
- [ ] Error conditions documented in Raises section

### README Templates

#### Server README Template

Each server should have a README with this structure:

```markdown
# {Server Name} MCP Server

{One-paragraph description of the server's purpose}

## Prerequisites

- Python 3.12+
- FastMCP {version}
- {Other dependencies}

## Installation

```bash
uv sync
```

## Configuration

| Environment Variable | Required | Default | Description |
|---------------------|----------|---------|-------------|
| `REGISTRY_BASE_URL` | No | `http://localhost:8000` | Registry API URL |
| `LOG_LEVEL` | No | `INFO` | Logging level |

## Available Tools

| Tool | Description | Auth Required |
|------|-------------|---------------|
| `list_services` | List registered services | Yes (read) |
| `invoke_tool` | Proxy tool calls | Yes (varies) |

## Available Resources

| URI | Description |
|-----|-------------|
| `config://server/settings` | Server configuration |

## Running

```bash
# STDIO transport (default)
uv run python -m {module_name}

# HTTP transport
uv run python -m {module_name} --transport http --port 8001

# SSE transport (legacy)
uv run python -m {module_name} --transport sse --port 8001
```

## Testing

```bash
uv run pytest tests/{server}/ -v
```

## API Documentation

See inline docstrings and tool schemas for detailed API documentation.
```

### CHANGELOG Standards

#### Migration CHANGELOG Entry Template

```markdown
## [Unreleased]

### Changed

- **BREAKING**: Upgraded FastMCP from 2.x to 3.0
  - `transport="sse"` deprecated in favor of `transport="http"`
  - Tool `enabled` parameter removed; use `mcp.enable()`/`mcp.disable()`
  - Session state now persists across requests within a session

### Added

- Tool timeouts via `@mcp.tool(timeout=30.0)`
- Session state caching for auth context
- OpenTelemetry tracing support
- Tool annotations (`readOnlyHint`, `destructiveHint`)

### Fixed

- Session isolation in multi-tenant environments
- HTTP transport timeout handling (CVE-2025-61920)

### Migration Guide

See `.claude/output/plans/fastmcp-3-upgrade.md` for detailed migration steps.
```

### Documentation Validation

#### Pre-Migration Documentation Audit

Run this script to identify documentation gaps:

```python
#!/usr/bin/env python
"""Audit tool documentation completeness."""
import inspect
from fastmcp import FastMCP

def audit_server(mcp: FastMCP) -> dict:
    """Check documentation completeness for a FastMCP server."""
    issues = []

    # Check server instructions
    if not mcp.instructions:
        issues.append("MISSING: Server instructions")

    # Check tool documentation
    for tool in mcp._tools.values():
        if not tool.description:
            issues.append(f"MISSING: Description for tool '{tool.name}'")
        if not tool.fn.__doc__:
            issues.append(f"MISSING: Docstring for tool '{tool.name}'")
        if not tool.annotations:
            issues.append(f"MISSING: Annotations for tool '{tool.name}'")
        if not tool.tags:
            issues.append(f"MISSING: Tags for tool '{tool.name}'")

    return {
        "server": mcp.name,
        "issues": issues,
        "issue_count": len(issues),
    }

if __name__ == "__main__":
    from servers.mcpgw.server import mcp
    result = audit_server(mcp)
    print(f"Found {result['issue_count']} documentation issues:")
    for issue in result["issues"]:
        print(f"  - {issue}")
```

#### Documentation CI Checks

Add to CI pipeline:

```yaml
# .github/workflows/docs-check.yml
- name: Check documentation completeness
  run: |
    uv run python scripts/audit_docs.py --fail-on-missing
```

### Documentation Checklist

#### Pre-Migration

- [ ] Audit existing docstrings for LLM-friendliness
- [ ] Document all environment variables
- [ ] Create `instructions` content for each server
- [ ] Identify tools missing descriptions

#### During Migration

- [ ] Add `instructions` parameter to all FastMCP instances
- [ ] Add `description` to all tool decorators
- [ ] Add `annotations` with behavioral hints to all tools
- [ ] Add `tags` for tool categorization
- [ ] Update README files with v3.0 requirements
- [ ] Update CHANGELOG with migration notes

#### Post-Migration

- [ ] Run documentation audit script
- [ ] Verify LLM can discover and understand all tools
- [ ] Test tool descriptions in actual LLM conversations
- [ ] Archive v2.x documentation for reference

### Documentation Success Criteria

| Metric | Target | Current |
|--------|--------|---------|
| Servers with instructions | 100% | 0% |
| Tools with explicit descriptions | 100% | ~50% |
| Tools with annotations | 100% | 0% |
| Tools with tags | 100% | 0% |
| Tools with complete docstrings | 100% | ~70% |
| README files updated | 100% | TBD |
| CHANGELOG entries added | 100% | TBD |

---

## Communication and Coordination

### Stakeholder Notification Matrix

| Stakeholder | When to Notify | Communication Channel | Information Required |
|-------------|----------------|----------------------|---------------------|
| Development Team | Phase start | Team standup/Slack | Phase objectives, timeline |
| QA Team | Before testing phases | QA channel | Test scope, environments |
| DevOps/SRE | Before deployment | Ops channel | Deployment plan, rollback procedure |
| API Consumers | Before breaking changes | Email/Docs | Migration guide, deprecation notice |
| Product Owner | Phase completion | Status meeting | Progress, blockers, risks |

### Communication Templates

#### Phase Kickoff Announcement

```markdown
**FastMCP 3.0 Migration - Phase [X] Starting**

Team,

We are beginning Phase [X] of the FastMCP 3.0 migration.

**Scope**: [Description]
**Affected Servers**: [List]
**Expected Duration**: [Timeline]
**Key Changes**: [Bullet points]

**Action Required**:
- [ ] Review migration plan: [link]
- [ ] Report any concerns by: [date]

Questions? Reach out in #fastmcp-migration
```

#### Breaking Change Notice

```markdown
**BREAKING CHANGE NOTICE: FastMCP 3.0 Migration**

**Effective Date**: [Date]
**Affected Components**: [List]

**What's Changing**:
- [Change 1]
- [Change 2]

**Migration Steps**:
1. [Step 1]
2. [Step 2]

**Deprecation Timeline**:
- [Date]: New API available
- [Date]: Old API deprecated
- [Date]: Old API removed

**Support**: Contact [team/person] for migration assistance.
```

### Coordination Checkpoints

| Checkpoint | Timing | Participants | Purpose |
|------------|--------|--------------|---------|
| Pre-Migration Review | Before Phase 1 | Tech Lead, DevOps, QA | Validate plan readiness |
| Code Review Gate | Each server migration | 2+ developers | Ensure code quality |
| QA Sign-off | Before staging deployment | QA Lead | Confirm test coverage |
| Security Review | Before production | Security team | Validate no regressions |
| Production Go/No-Go | Before production release | All stakeholders | Final approval |

### Dependency Coordination

#### External Dependencies

| Dependency | Owner | Notification Needed | Lead Time |
|------------|-------|---------------------|-----------|
| FastMCP upstream | FastMCP maintainers | Monitor releases | N/A |
| MCP SDK | Anthropic | None (separate package) | N/A |
| Client applications | Client teams | Yes - breaking changes | 2 weeks |
| CI/CD pipelines | DevOps | Yes - config changes | 1 week |

#### Internal Dependencies

```
Phase 1 (Pin Dependencies)
    ↓
Phase 2 (Development Testing)
    ↓
Phase 3 (Staging Deployment) ← Requires: QA availability
    ↓
Phase 4 (Production Rollout) ← Requires: Change approval, maintenance window
```

### Issue Escalation Path

| Issue Severity | Response Time | Escalation Path | Action |
|----------------|---------------|-----------------|--------|
| Critical (Production down) | Immediate | Dev → Tech Lead → Rollback | Execute rollback plan |
| High (Functionality broken) | 1 hour | Dev → Tech Lead | Hotfix or rollback |
| Medium (Degraded performance) | 4 hours | Dev → Team | Investigation, potential rollback |
| Low (Minor issues) | Next business day | Dev | Document and fix in next iteration |

### Meeting Cadence

| Meeting | Frequency | Duration | Attendees | Agenda |
|---------|-----------|----------|-----------|--------|
| Migration Standup | Daily during active phases | 15 min | Dev team | Progress, blockers |
| Phase Review | End of each phase | 30 min | All stakeholders | Outcomes, lessons learned |
| Incident Debrief | As needed | 1 hour | Involved parties | RCA, action items |

---

## Timeline and Effort Estimates

### Phase Overview

| Phase | Description | Dependencies | Estimated Effort | Calendar Duration |
|-------|-------------|--------------|------------------|-------------------|
| Phase 1 | Pin dependencies to <3 | None | 1-2 hours | 1 day |
| Phase 2 | Development testing | FastMCP 3.0 GA release | 2-3 days | 1 week |
| Phase 3 | Staging deployment | Phase 2 complete | 1-2 days | 1 week |
| Phase 4 | Production rollout | Phase 3 sign-off | 1 day | 1 week |

### Detailed Effort Breakdown

#### Phase 1: Pin Dependencies (Immediate)

| Task | Effort | Owner | Status |
|------|--------|-------|--------|
| Update mcpgw pyproject.toml | 15 min | TBD | Done |
| Update fininfo pyproject.toml | 15 min | TBD | Not Started |
| Update realserverfaketools pyproject.toml | 15 min | TBD | Not Started |
| Verify builds work | 30 min | TBD | Not Started |
| Create PR and merge | 30 min | TBD | Not Started |
| **Subtotal** | **1.5 hours** | | |

#### Phase 2: Development Testing (When v3.0 GA Released)

| Task | Effort | Owner | Status |
|------|--------|-------|--------|
| Update dependencies to v3.0 | 1 hour | TBD | Not Started |
| Add server `instructions` (3 servers) | 2 hours | TBD | Not Started |
| Add tool annotations (20 tools) | 3 hours | TBD | Not Started |
| Add tool descriptions (20 tools) | 2 hours | TBD | Not Started |
| Add resource descriptions (3 resources) | 30 min | TBD | Not Started |
| Add prompt descriptions (1 prompt) | 15 min | TBD | Not Started |
| Add tool timeouts | 1 hour | TBD | Not Started |
| Update imports if needed | 1 hour | TBD | Not Started |
| Run and fix test suite | 4 hours | TBD | Not Started |
| Run documentation audit | 1 hour | TBD | Not Started |
| Code review | 2 hours | TBD | Not Started |
| **Subtotal** | **~18 hours (2-3 days)** | | |

#### Phase 3: Staging Deployment

| Task | Effort | Owner | Status |
|------|--------|-------|--------|
| Deploy to staging environment | 1 hour | TBD | Not Started |
| Run integration tests | 2 hours | TBD | Not Started |
| Run performance baseline tests | 2 hours | TBD | Not Started |
| QA validation | 4 hours | TBD | Not Started |
| Security validation | 2 hours | TBD | Not Started |
| Fix issues found | 4 hours (buffer) | TBD | Not Started |
| **Subtotal** | **~15 hours (1-2 days)** | | |

#### Phase 4: Production Rollout

| Task | Effort | Owner | Status |
|------|--------|-------|--------|
| Change approval process | 1 hour | TBD | Not Started |
| Deploy to production | 1 hour | TBD | Not Started |
| Post-deployment validation | 2 hours | TBD | Not Started |
| Monitor for issues (24 hours) | (passive) | TBD | Not Started |
| Documentation updates | 2 hours | TBD | Not Started |
| Communicate completion | 30 min | TBD | Not Started |
| **Subtotal** | **~7 hours (1 day active)** | | |

### Total Effort Summary

| Category | Effort | Notes |
|----------|--------|-------|
| Development | 20 hours | Includes code changes and testing |
| QA/Validation | 10 hours | Integration, performance, security |
| DevOps | 5 hours | Deployments and monitoring |
| Communication | 3 hours | Stakeholder updates |
| Buffer | 8 hours | Unexpected issues |
| **Total** | **~46 hours** | ~1 person-week |

### Timeline Scenarios

#### Scenario 1: FastMCP 3.0 GA in Q1 2026

```
Week 1: Phase 1 (Pin dependencies) - COMPLETE NOW
...
[Wait for FastMCP 3.0 GA]
...
Week N:   Phase 2 (Development testing)
Week N+1: Phase 3 (Staging)
Week N+2: Phase 4 (Production)
```

#### Scenario 2: Urgent Migration (If v2.x Deprecated)

```
Day 1-2:  Phase 1 + 2 (Combined, parallel work)
Day 3-4:  Phase 3 (Accelerated staging)
Day 5:    Phase 4 (Production)
```
*Risk: Reduced testing time, higher chance of issues*

### Resource Requirements

| Resource | Quantity | Duration | Notes |
|----------|----------|----------|-------|
| Backend Developer | 1 | 1 week | Primary implementer |
| QA Engineer | 1 | 2 days | Testing phases |
| DevOps Engineer | 1 | 0.5 days | Deployment support |
| Tech Lead | 0.25 | 1 week | Reviews and approvals |

### Phase Dependencies Diagram

```
[Phase 1: Pin Dependencies]
         |
         v
[FastMCP 3.0 GA Released] ← External dependency
         |
         v
[Phase 2: Development Testing]
         |
         ├──→ [Code Review] ← Gate
         |
         v
[Phase 3: Staging Deployment]
         |
         ├──→ [QA Sign-off] ← Gate
         ├──→ [Security Review] ← Gate
         |
         v
[Phase 4: Production Rollout]
         |
         ├──→ [Go/No-Go Decision] ← Gate
         |
         v
[Migration Complete]
```

### Risk-Adjusted Timeline

| Risk Event | Probability | Impact | Mitigation | Added Time |
|------------|-------------|--------|------------|------------|
| FastMCP 3.0 GA delayed | Medium | Schedule slip | Phase 1 now, wait for GA | Variable |
| Breaking API changes | Low | Rework | Monitor release notes | +2 days |
| Test failures | Medium | Bug fixes | Allocate buffer time | +1-2 days |
| Performance regression | Low | Investigation | Baseline before migration | +1 day |
| Production incident | Low | Rollback, investigation | Tested rollback plan | +2 days |

**Recommended buffer**: Add 20% to estimates = **~55 hours total** or **~1.5 person-weeks**

---

## Appendix: FastMCP 3.0 New Features Worth Exploring

Once migrated, consider adopting these new v3.0 features:

### Component Versioning

Useful for backward compatibility when updating tool behavior:

```python
@mcp.tool(version="1.0")
def intelligent_tool_finder(query: str) -> dict:
    """Original implementation"""
    return {"results": basic_search(query)}

@mcp.tool(version="2.0")
def intelligent_tool_finder(query: str, include_metadata: bool = False) -> dict:
    """Enhanced implementation with metadata option"""
    results = advanced_search(query)
    if include_metadata:
        results["metadata"] = get_metadata()
    return results
```

### Session-Scoped State

Cache auth context per session to avoid repeated header parsing:

```python
from fastmcp import FastMCP, Context

mcp = FastMCP("mcpgw-server")

@mcp.tool
async def list_services(ctx: Context) -> dict:
    # Session state persists across requests
    if "auth_context" not in ctx.session:
        ctx.session["auth_context"] = await extract_auth_context()

    auth = ctx.session["auth_context"]
    # Use cached auth context
    return await fetch_services(auth)
```

### OpenTelemetry Tracing

Built-in observability for production debugging:

```python
from fastmcp import FastMCP

mcp = FastMCP(
    "mcpgw-server",
    # Enable OpenTelemetry tracing
    enable_tracing=True,
    service_name="mcpgw-mcp-server",
)
```

### Development Mode with Hot Reload

Faster development iteration:

```bash
# Development with auto-reload
fastmcp dev --reload servers/mcpgw/server.py

# Or via Python
mcp.run(transport="http", reload=True)
```

---

## Version History

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2026-01-23 | 1.0 | Claude Code | Initial plan created |
| 2026-01-23 | 1.1 | Claude Code | Quality improvements: added risk matrix, success criteria, verified dependencies |
| 2026-01-23 | 1.2 | Claude Code | Security improvements: added Security Considerations section, CVE coverage, security testing checklist |
| 2026-01-23 | 1.3 | Claude Code | Performance improvements: added Performance Considerations section, caching strategies, timeouts, OpenTelemetry, load testing |
| 2026-01-23 | 1.4 | Claude Code | Maintainability improvements: added Maintainability Considerations section covering configuration, code organization, testing patterns, migration workflows, documentation |
| 2026-01-23 | 1.5 | Claude Code | Testing improvements: added comprehensive Testing Considerations section with FastMCP Client fixtures, inline-snapshot patterns, migration regression tests, auth mocking, test organization |
| 2026-01-23 | 1.6 | Claude Code | Documentation improvements: added Documentation Considerations section covering server instructions, tool decorator documentation, annotations, docstring standards, README templates, CHANGELOG standards, documentation validation |
| 2026-01-23 | 1.7 | Claude Code | Completeness improvements: added Component Inventory section (20 tools, 3 resources, 1 prompt, 3 models), Pre-Migration Verification section (prerequisites, baselines, sign-offs), Error Handling Patterns (MCP error codes, ToolError usage, logging), Monitoring and Alerting Setup (health checks, Prometheus metrics, alert rules, dashboards), Communication and Coordination section (stakeholder matrix, templates, escalation paths), Timeline and Effort Estimates section (phase breakdown, resource requirements, dependency diagram, risk-adjusted timeline ~46 hours total) |

---

*Plan generated by Claude Code*
