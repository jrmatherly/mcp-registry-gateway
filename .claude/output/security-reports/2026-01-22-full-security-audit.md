# Security Audit Report - 2026-01-22

## Executive Summary

| Category | Status | Details |
|----------|--------|---------|
| **Main Registry (uv.lock)** | **SECURE** | All vulnerabilities patched |
| **agents/a2a (uv.lock)** | **15 OPEN ALERTS** | Requires lock file update |
| **metrics-service (uv.lock)** | **1 OPEN ALERT** | Requires lock file update |
| **Code Security (Bandit)** | **18 findings** | 1 Medium, 17 Low severity |

---

## Dependabot Alert Analysis

### Summary by State

| State | Count | Action Required |
|-------|-------|-----------------|
| Fixed | 12 | None - already patched in main uv.lock |
| Open | 14 | Update sub-project lock files |

### Open Vulnerabilities Requiring Action

#### Critical Priority

| # | CVE | Package | Severity | Location | Fix Version |
|---|-----|---------|----------|----------|-------------|
| 1 | CVE-2025-66416 | mcp | **HIGH** | agents/a2a/uv.lock | 1.23.0 |

**Impact**: DNS rebinding protection not enabled by default in MCP Python SDK.
**Current Version**: 1.21.0
**Risk**: Affects `registry/core/mcp_client.py` and `agents/agent.py` which use the MCP SDK.

#### High Priority

| # | CVE | Package | Severity | Location | Fix Version |
|---|-----|---------|----------|----------|-------------|
| 3 | CVE-2026-21441 | urllib3 | HIGH | agents/a2a, metrics-service | 2.6.3 |
| 4 | CVE-2025-69223 | aiohttp | HIGH | agents/a2a/uv.lock | 3.13.3 |
| 13 | CVE-2026-23490 | pyasn1 | HIGH | agents/a2a/uv.lock | 0.6.2 |
| 2,3 | CVE-2025-66471, CVE-2025-66418 | urllib3 | HIGH | agents/a2a/uv.lock | 2.6.0 |

#### Medium Priority

| # | CVE | Package | Severity | Location | Fix Version |
|---|-----|---------|----------|----------|-------------|
| 8-10 | CVE-2025-69227/28/29 | aiohttp | MEDIUM | agents/a2a/uv.lock | 3.13.3 |

#### Low Priority

| # | CVE | Package | Severity | Location | Fix Version |
|---|-----|---------|----------|----------|-------------|
| 5-7,11 | CVE-2025-69224/25/26/30 | aiohttp | LOW | agents/a2a/uv.lock | 3.13.3 |

---

## Fixed Vulnerabilities (Main uv.lock)

The main registry has been properly patched. Current secure versions:

| Package | Current Version | Required Version | Status |
|---------|-----------------|------------------|--------|
| aiohttp | 3.13.3 | >= 3.13.3 | ✅ SECURE |
| urllib3 | 2.6.3+ | >= 2.6.3 | ✅ SECURE |
| langchain-core | 1.2.7 | >= 1.2.5 | ✅ SECURE |
| filelock | 3.20.3 | >= 3.20.3 | ✅ SECURE |
| pyasn1 | 0.6.2+ | >= 0.6.2 | ✅ SECURE |

---

## Codebase Impact Analysis

### MCP SDK Usage (CVE-2025-66416 - DNS Rebinding)

**Affected Files:**
- `registry/core/mcp_client.py` - Uses `mcp.ClientSession`, `sse_client`, `streamablehttp_client`
- `registry/metrics/client.py` - Imports mcp_client_service
- `registry/health/service.py` - Uses mcp_client_service
- `registry/api/server_routes.py` - Uses mcp_client_service
- `agents/agent.py` - Uses `mcp`, `sse_client`, `streamable_http_client`

**Risk Assessment**: HIGH - The MCP SDK is actively used for server communication.

### aiohttp Usage

**Affected Files**: No direct imports in registry/ (transitive dependency)
**Risk Assessment**: Transitive through httpx/other packages - update will resolve.

### urllib3 Usage

**Affected Files**: No direct imports in registry/ (transitive dependency)
**Risk Assessment**: Transitive through requests/httpx - update will resolve.

---

## Code Security Findings (Bandit)

### Medium Severity (1 finding)

| File | Line | Issue | CWE | Recommendation |
|------|------|-------|-----|----------------|
| `registry/main.py` | 461 | B104: Binding to 0.0.0.0 | CWE-605 | Development mode only; add comment |

**Code:**
```python
uvicorn.run("registry.main:app", host="0.0.0.0", port=7860, reload=True, log_level="info")
```

**Analysis**: This is in the `if __name__ == "__main__"` block used for local development only. Production deployments use gunicorn/uvicorn with proper binding. Consider adding a nosec comment with justification.

### Low Severity (17 findings)

#### Subprocess Usage (B404, B603, B607) - 14 findings

| File | Lines | Assessment |
|------|-------|------------|
| `registry/core/nginx_service.py` | 54, 121, 377, 380, 386 | Controlled input - internal nginx management |
| `registry/services/security_scanner.py` | 14, 373 | Controlled input - runs security tools |
| `registry/services/agent_scanner.py` | 14, 206 | Controlled input - runs security tools |
| `registry/version.py` | 10, 32 | Controlled input - runs `git describe` |

**Assessment**: All subprocess calls use controlled inputs (git commands, nginx paths, security scanner tools). No user input flows into these calls. Risk is acceptable for internal tooling.

#### Try/Except/Pass (B110) - 1 finding

| File | Line | Assessment |
|------|------|------------|
| `registry/health/service.py` | 231 | Health check timeout handling - acceptable |

#### False Positive (B105) - 1 finding

| File | Line | Assessment |
|------|------|------------|
| `registry/services/federation/asor_client.py` | 110 | URL constant, not a password |

---

## Remediation Plan

### Priority 1: Update agents/a2a Lock File (15 alerts)

```bash
cd agents/a2a

# Update pyproject.toml to require secure versions
# Edit dependencies:
#   "aiohttp>=3.13.3",  # was >=3.8.0
#   "mcp>=1.23.0",      # add explicit requirement

# Regenerate lock file
uv lock --upgrade

# Verify
uv run pip-audit
```

**Expected Outcome**: Resolves 15 Dependabot alerts.

### Priority 2: Update metrics-service Lock File (1 alert)

```bash
cd metrics-service

# Regenerate lock file to pull latest urllib3
uv lock --upgrade

# Verify urllib3 >= 2.6.3
grep -A1 'name = "urllib3"' uv.lock
```

**Expected Outcome**: Resolves CVE-2026-21441.

### Priority 3: Code Security (Optional)

Add nosec comments with justifications for accepted risks:

```python
# registry/main.py:461
# Development mode only, production uses proper binding - nosec B104
uvicorn.run("registry.main:app", host="0.0.0.0", port=7860, reload=True)
```

---

## Verification Commands

After remediation, verify with:

```bash
# Check all lock files
for dir in . agents/a2a metrics-service; do
    echo "=== $dir ==="
    cd $dir && uv run pip-audit 2>&1 | head -5
    cd - > /dev/null
done

# Verify Dependabot alerts cleared
gh api repos/jrmatherly/mcp-registry-gateway/dependabot/alerts | jq '[.[] | select(.state == "open")] | length'
# Expected: 0
```

---

## Dependency Relationship Summary

### agents/a2a Dependency Chain

```
strands-agents[a2a]>=0.1.6
└── aiohttp (3.13.2 → needs 3.13.3)
└── urllib3 (2.5.0 → needs 2.6.3)

mcp (not explicitly pinned)
└── needs explicit pin to >=1.23.0

pyasn1 (transitive)
└── via google-auth/other packages (0.6.1 → needs 0.6.2)
```

### metrics-service Dependency Chain

```
httpx>=0.25.0
└── urllib3 (2.6.2 → needs 2.6.3)
```

---

## Risk Matrix

| Risk | Likelihood | Impact | Current Status |
|------|------------|--------|----------------|
| MCP DNS Rebinding | Medium | High | OPEN - agents/a2a |
| Decompression Bomb (urllib3) | Low | Medium | OPEN - agents/a2a, metrics-service |
| DoS via aiohttp | Medium | Medium | OPEN - agents/a2a |
| Code injection via subprocess | Very Low | High | MITIGATED - controlled inputs |

---

## Recommendations

1. **Immediate**: Update `agents/a2a/pyproject.toml` and regenerate lock file
2. **Immediate**: Update `metrics-service/uv.lock` with `uv lock --upgrade`
3. **Short-term**: Add CI/CD check for `pip-audit` across all sub-projects
4. **Ongoing**: Enable Dependabot auto-merge for patch updates

---

## Appendix: Full Dependabot Alert List

| # | State | CVE | Package | Severity | Location |
|---|-------|-----|---------|----------|----------|
| 1 | OPEN | CVE-2025-66416 | mcp | HIGH | agents/a2a |
| 2 | OPEN | CVE-2025-66418 | urllib3 | HIGH | agents/a2a |
| 3 | OPEN | CVE-2025-66471 | urllib3 | HIGH | agents/a2a |
| 4 | OPEN | CVE-2025-69223 | aiohttp | HIGH | agents/a2a |
| 5 | OPEN | CVE-2025-69224 | aiohttp | LOW | agents/a2a |
| 6 | OPEN | CVE-2025-69225 | aiohttp | LOW | agents/a2a |
| 7 | OPEN | CVE-2025-69226 | aiohttp | LOW | agents/a2a |
| 8 | OPEN | CVE-2025-69227 | aiohttp | MEDIUM | agents/a2a |
| 9 | OPEN | CVE-2025-69228 | aiohttp | MEDIUM | agents/a2a |
| 10 | OPEN | CVE-2025-69229 | aiohttp | MEDIUM | agents/a2a |
| 11 | OPEN | CVE-2025-69230 | aiohttp | LOW | agents/a2a |
| 12 | OPEN | CVE-2026-21441 | urllib3 | HIGH | agents/a2a |
| 13 | OPEN | CVE-2026-23490 | pyasn1 | HIGH | agents/a2a |
| 14 | OPEN | CVE-2026-21441 | urllib3 | HIGH | metrics-service |
| 15-26 | FIXED | Various | Various | Various | main uv.lock |

---

*Report generated: 2026-01-22 17:21 UTC*
*Tools: pip-audit, Bandit 1.9.3, GitHub Dependabot API*
