# FastMCP 3.0 Upgrade - Phase 1: Pin Dependencies

**Parent Plan**: [fastmcp-3-upgrade.md](fastmcp-3-upgrade.md)
**Created**: 2026-01-23
**Status**: Ready for Implementation
**Priority**: Immediate
**Estimated Effort**: 1-2 hours

---

## Objective

Pin FastMCP dependencies to `<3` across all affected servers to suppress deprecation warnings and ensure stability while FastMCP 3.0 is in beta.

---

## Scope

### Affected Servers

| Server | File | Current Pin | Required Change |
|--------|------|-------------|-----------------|
| mcpgw-server | `servers/mcpgw/pyproject.toml` | `>=2.0.0,<3.0.0` | **None** (already correct) |
| fininfo-server | `servers/fininfo/pyproject.toml` | `>=2.0.0` | `>=2.14.0,<3` |
| realserverfaketools-server | `servers/realserverfaketools/pyproject.toml` | `>=2.0.0` | `>=2.14.0,<3` |

### Not Affected

| Server | File | Reason |
|--------|------|--------|
| currenttime-server | `servers/currenttime/server.py` | Uses official MCP SDK (`from mcp.server.fastmcp import FastMCP`) |

---

## Why `>=2.14.0`?

FastMCP 2.14.x includes:
- Security fixes (CVE-2025-61920 - session isolation vulnerability)
- HTTP transport timeout fixes
- MCP 2025-11-25 specification support
- Removed deprecated APIs (cleaner upgrade path)

---

## Implementation Checklist

### Step 1: Update fininfo-server

**File**: `servers/fininfo/pyproject.toml`

```diff
dependencies = [
-    "fastmcp>=2.0.0",
+    "fastmcp>=2.14.0,<3",  # Pin to 2.x until 3.0 stabilizes
    "pydantic>=2.11.3",
    ...
]
```

**Validation**:
```bash
cd servers/fininfo
uv sync
uv run python -c "import fastmcp; print(fastmcp.__version__)"
```

### Step 2: Update realserverfaketools-server

**File**: `servers/realserverfaketools/pyproject.toml`

```diff
dependencies = [
-    "fastmcp>=2.0.0",
+    "fastmcp>=2.14.0,<3",  # Pin to 2.x until 3.0 stabilizes
    "pydantic>=2.11.3",
    ...
]
```

**Validation**:
```bash
cd servers/realserverfaketools
uv sync
uv run python -c "import fastmcp; print(fastmcp.__version__)"
```

### Step 3: Rebuild Containers

```bash
docker compose build fininfo-server realserverfaketools-server
docker compose up -d fininfo-server realserverfaketools-server
```

### Step 4: Verify Deprecation Warnings Suppressed

```bash
# Check logs for deprecation warnings
docker compose logs fininfo-server 2>&1 | grep -i "fastmcp\|deprecat\|warning"
docker compose logs realserverfaketools-server 2>&1 | grep -i "fastmcp\|deprecat\|warning"
```

Expected: No deprecation warnings related to FastMCP version.

### Step 5: Run Test Suite

```bash
uv run pytest tests/ -n 8
```

Expected: All existing tests pass (700+ tests, ~57 skipped).

### Step 6: Commit Changes

```bash
git add servers/fininfo/pyproject.toml servers/realserverfaketools/pyproject.toml
git commit -m "chore: pin FastMCP to <3 until 3.0 stabilizes

- Update fininfo-server: fastmcp>=2.14.0,<3
- Update realserverfaketools-server: fastmcp>=2.14.0,<3
- mcpgw-server already pinned correctly

Minimum 2.14.0 includes CVE-2025-61920 fix."
```

---

## Success Criteria

- [ ] `servers/fininfo/pyproject.toml` updated with `fastmcp>=2.14.0,<3`
- [ ] `servers/realserverfaketools/pyproject.toml` updated with `fastmcp>=2.14.0,<3`
- [ ] Both servers build successfully
- [ ] No deprecation warnings in container logs
- [ ] All existing tests pass
- [ ] Changes committed and pushed

---

## Rollback Procedure

If issues occur after pinning:

```bash
# Revert to previous versions
git checkout HEAD~1 -- servers/fininfo/pyproject.toml servers/realserverfaketools/pyproject.toml
docker compose build fininfo-server realserverfaketools-server
docker compose up -d
```

---

## Next Phase

After completing Phase 1, proceed to [Phase 2: Testing Infrastructure](fastmcp-3-upgrade-phase-2-testing-infrastructure.md) to set up comprehensive testing before the actual v3.0 upgrade.
