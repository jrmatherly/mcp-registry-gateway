# FastMCP 3.0 Upgrade - Phase 4: Development Testing with v3.0

**Parent Plan**: [fastmcp-3-upgrade.md](fastmcp-3-upgrade.md)
**Created**: 2026-01-23
**Status**: Waiting (for FastMCP 3.0 GA release)
**Priority**: High
**Estimated Effort**: 2-3 days
**Prerequisites**:
- [Phase 1: Pin Dependencies](fastmcp-3-upgrade-phase-1-pin-dependencies.md) completed
- [Phase 2: Testing Infrastructure](fastmcp-3-upgrade-phase-2-testing-infrastructure.md) completed
- [Phase 3: Documentation Improvements](fastmcp-3-upgrade-phase-3-documentation-improvements.md) completed
- **FastMCP 3.0 GA released** (currently in beta v3.0.0b1)

---

## Objective

Test the FastMCP 3.0 upgrade in a development environment to validate compatibility, identify breaking changes, and ensure all tools function correctly before staging deployment.

---

## Trigger Conditions

Begin this phase when:
- FastMCP 3.0 reaches GA (stable) release
- All prerequisite phases are complete
- v2.x baseline tests are captured and passing

---

## Scope

### Affected Servers

| Server | File | Current Pin | Target Pin |
|--------|------|-------------|------------|
| mcpgw-server | `servers/mcpgw/pyproject.toml` | `>=2.14.0,<3` | `>=3.0,<4` |
| fininfo-server | `servers/fininfo/pyproject.toml` | `>=2.14.0,<3` | `>=3.0,<4` |
| realserverfaketools-server | `servers/realserverfaketools/pyproject.toml` | `>=2.14.0,<3` | `>=3.0,<4` |

---

## Implementation Checklist

### Step 1: Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/fastmcp-3-upgrade
```

---

### Step 2: Update Dependencies to v3.0

**File**: `servers/mcpgw/pyproject.toml`

```diff
dependencies = [
-    "fastmcp>=2.14.0,<3",
+    "fastmcp>=3.0,<4",  # FastMCP 3.0 upgrade
    ...
]
```

**File**: `servers/fininfo/pyproject.toml`

```diff
dependencies = [
-    "fastmcp>=2.14.0,<3",
+    "fastmcp>=3.0,<4",  # FastMCP 3.0 upgrade
    ...
]
```

**File**: `servers/realserverfaketools/pyproject.toml`

```diff
dependencies = [
-    "fastmcp>=2.14.0,<3",
+    "fastmcp>=3.0,<4",  # FastMCP 3.0 upgrade
    ...
]
```

**Sync dependencies**:
```bash
cd servers/mcpgw && uv sync
cd ../fininfo && uv sync
cd ../realserverfaketools && uv sync
```

**Verification**:
```bash
uv run python -c "import fastmcp; print(f'FastMCP version: {fastmcp.__version__}')"
# Expected: FastMCP version: 3.0.x
```

---

### Step 3: Update Import Statements (if needed)

Check FastMCP 3.0 upgrade guide for any import changes. Based on current analysis, no changes expected for:

```python
# These imports should remain compatible
from fastmcp import Context, FastMCP
from fastmcp.server.dependencies import get_http_request
```

**If changes are needed**, update each server file accordingly.

---

### Step 4: Add Tool Timeouts

FastMCP 3.0 introduces built-in timeout handling. Add timeouts to long-running tools:

**File**: `servers/mcpgw/server.py`

```python
@mcp.tool(
    description="...",
    timeout=30.0,  # 30-second timeout
)
async def intelligent_tool_finder(ctx: Context, query: str) -> dict:
    pass

@mcp.tool(
    description="...",
    timeout=10.0,  # 10-second timeout
)
async def list_services(ctx: Context) -> dict:
    pass
```

**Recommended Timeouts**:

| Tool | Timeout | Rationale |
|------|---------|-----------|
| `intelligent_tool_finder` | 30s | FAISS computation can be slow |
| `list_services` | 10s | Network call to registry |
| `invoke_tool` | 60s | Proxies to other servers |
| `get_stock_aggregates` | 15s | External API dependency |

---

### Step 5: Run Unit Tests

```bash
uv run pytest tests/unit/ -n 8 -v
```

**Expected**: All unit tests pass.

**If failures occur**:
1. Document the failure in `.scratchpad/fastmcp-3-issues.md`
2. Check FastMCP 3.0 changelog for breaking changes
3. Update code to match v3.0 API

---

### Step 6: Run Migration Regression Tests

```bash
uv run pytest tests/migration/test_v3_regression.py -v
```

**Expected**: All regression tests pass, confirming:
- Same tools exposed
- Same resources available
- Same prompts available
- Output structures match baselines

**If failures occur**:
- Check if tool list changed (acceptable if documented)
- Check if schemas changed (may need snapshot updates)
- Update baselines if changes are intentional

---

### Step 7: Run Integration Tests

```bash
uv run pytest tests/integration/ -n 4 -v
```

**Expected**: All integration tests pass.

---

### Step 8: Test Container Builds

```bash
# Build all affected containers
docker compose build mcpgw-server fininfo-server realserverfaketools-server

# Start containers
docker compose up -d mcpgw-server fininfo-server realserverfaketools-server

# Wait for startup
sleep 10
```

**Verification**:
```bash
# Check container status
docker compose ps | grep -E "(mcpgw|fininfo|realserverfaketools)"
# Expected: All containers "Up"

# Check for startup errors
docker compose logs mcpgw-server 2>&1 | tail -50 | grep -i "error\|exception\|traceback"
docker compose logs fininfo-server 2>&1 | tail -50 | grep -i "error\|exception\|traceback"
docker compose logs realserverfaketools-server 2>&1 | tail -50 | grep -i "error\|exception\|traceback"
# Expected: No errors
```

---

### Step 9: Health Check Verification

```bash
# Health checks (adjust ports based on docker-compose.yml)
curl -s http://localhost:8001/health | jq
curl -s http://localhost:8002/health | jq
curl -s http://localhost:8003/health | jq
```

**Expected**: `{"status": "ok"}` or similar healthy response.

---

### Step 10: MCP Endpoint Verification

```bash
# SSE endpoints (current)
curl -s -N http://localhost:8001/sse &
sleep 2
kill %1

# HTTP endpoints (v3.0 recommended)
curl -s http://localhost:8001/mcp
```

**Expected**: Connection established without errors.

---

### Step 11: Auth Context Extraction Test

Test that auth headers are still correctly extracted:

```bash
# Test with auth headers
curl -s -X POST http://localhost:8001/sse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -H "x-scopes: read,write" \
  -H "x-username: testuser" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

**Expected**: Tool list returned, no auth errors.

---

### Step 12: Tool Execution Tests

Test representative tools from each server:

**mcpgw-server**:
```bash
# List services tool
curl -s -X POST http://localhost:8001/sse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"healthcheck"},"id":1}'
```

**realserverfaketools-server**:
```bash
# Quantum flux analyzer (no auth needed)
curl -s -X POST http://localhost:8003/sse \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"quantum_flux_analyzer","arguments":{"coordinates":{"latitude":0,"longitude":0},"intensity":1.0}},"id":1}'
```

---

### Step 13: Performance Baseline Comparison

Compare v3.0 performance against v2.x baseline captured in Phase 2:

```bash
# Install hey if not present
# brew install hey

# Health check latency
hey -n 1000 -c 10 http://localhost:8001/health

# Compare against baseline (captured in Phase 2)
# P50 should be within 10% of baseline
# P99 should be within 20% of baseline
```

---

### Step 14: Run Full Test Suite

```bash
uv run pytest tests/ -n 8 --cov=servers --cov-report=term-missing
```

**Expected**:
- All tests pass (701+ passed, ~57 skipped is acceptable)
- Coverage ≥35%

---

### Step 15: Run Documentation Audit

```bash
uv run python scripts/audit_docs.py --fail-on-missing
```

**Expected**: 0 documentation issues.

---

### Step 16: Code Review

Create PR for code review:

```bash
git add -A
git commit -m "feat: upgrade FastMCP from 2.x to 3.0

- Update dependency pins to fastmcp>=3.0,<4
- Add tool timeouts for long-running operations
- All tests passing
- No breaking changes identified

Tested:
- Unit tests: PASS
- Integration tests: PASS
- Regression tests: PASS
- Container builds: PASS
- Health checks: PASS
- Tool execution: PASS"

git push -u origin feature/fastmcp-3-upgrade
```

Request review from:
- Tech Lead
- Second developer familiar with FastMCP

---

## Verification Checklist by Server

### mcpgw-server (High Complexity)

- [ ] `get_http_request()` returns proper Starlette Request object
- [ ] Context injection works in tool functions
- [ ] Auth context extraction from headers works
- [ ] All 12 tools respond correctly
- [ ] FAISS embedding functionality works
- [ ] Scopes/permissions validation works
- [ ] No deprecation warnings in logs

### fininfo-server (Medium Complexity)

- [ ] `get_http_request()` returns proper Starlette Request object
- [ ] `get_api_key_for_request()` retrieves API key from headers
- [ ] Stock data tools function correctly
- [ ] SecretsManager integration works
- [ ] Resource `get_config` accessible
- [ ] No deprecation warnings in logs

### realserverfaketools-server (Low Complexity)

- [ ] All 6 fake tools return expected mock responses
- [ ] Prompts work correctly
- [ ] Resources accessible
- [ ] Pydantic models serialize correctly
- [ ] No deprecation warnings in logs

---

## Success Criteria

- [ ] All dependencies updated to v3.0
- [ ] All containers build successfully
- [ ] All containers start without errors
- [ ] All health checks pass
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All regression tests pass
- [ ] Auth context extraction verified
- [ ] Tool timeouts configured
- [ ] Performance within 10% of v2.x baseline
- [ ] No deprecation warnings in logs
- [ ] Code review approved

---

## Troubleshooting

### Common Issues

| Issue | Possible Cause | Resolution |
|-------|---------------|------------|
| Import errors | API changes in v3.0 | Check upgrade guide, update imports |
| Auth failures | Header extraction changed | Verify `get_http_request()` behavior |
| Timeout errors | Missing timeout configuration | Add `timeout` parameter to tools |
| Test failures | Schema changes | Update snapshots with `--inline-snapshot=fix` |
| Container crashes | Missing dependencies | Check build logs, update requirements |

### Debug Commands

```bash
# Check FastMCP version in container
docker compose exec mcpgw-server python -c "import fastmcp; print(fastmcp.__version__)"

# Interactive shell in container
docker compose exec mcpgw-server bash

# Full container logs
docker compose logs mcpgw-server 2>&1 | less
```

---

## Rollback Procedure

If critical issues are discovered:

```bash
# Revert dependency changes
git checkout main -- servers/*/pyproject.toml

# Rebuild with v2.x
docker compose build mcpgw-server fininfo-server realserverfaketools-server
docker compose up -d

# Verify rollback
uv run pytest tests/ -n 8
```

---

## Next Phase

After completing Phase 4 and code review approval, proceed to [Phase 5: Production Migration](fastmcp-3-upgrade-phase-5-production-migration.md) for staging and production deployment.
