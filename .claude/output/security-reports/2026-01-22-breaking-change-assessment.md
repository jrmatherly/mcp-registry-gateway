# Breaking Change Assessment Report

**Date**: 2026-01-22
**Related Document**: [Security Audit Report](2026-01-22-full-security-audit.md)
**Purpose**: Validate and confirm potential breaking changes from proposed security updates

---

## Executive Summary

| Package | Upgrade | Breaking Changes | Risk Level | Action Required |
|---------|---------|------------------|------------|-----------------|
| **MCP SDK** | 1.21.0 → 1.23.0 | **YES** (DNS rebinding) | **HIGH** | Verify client-only usage |
| **aiohttp** | 3.13.2 → 3.13.3 | No | LOW | Safe to upgrade |
| **urllib3** | 2.5.0 → 2.6.3 | Minor API change | LOW | Safe to upgrade |
| **pyasn1** | 0.6.1 → 0.6.2 | No | NONE | Safe to upgrade |

**Overall Assessment**: ✅ **SAFE TO PROCEED** - Our codebase uses MCP SDK as a CLIENT only, not as a server. The DNS rebinding protection changes in 1.23.0 only affect servers.

---

## Detailed Analysis

### 1. MCP Python SDK (1.21.0 → 1.23.0)

#### CVE-2025-66416: DNS Rebinding Protection

**Change Description**:
MCP SDK 1.23.0 enables DNS rebinding protection by default for HTTP-based MCP **servers** running on localhost. This can cause `421 Invalid Host Header` errors if:
- Running a FastMCP server
- Using proxies or gateways
- Custom domain configurations

**Our Codebase Analysis**:

| Component | Usage Type | Affected? |
|-----------|------------|-----------|
| `registry/core/mcp_client.py` | **CLIENT** (connects to servers) | ❌ No |
| `registry/health/service.py` | Uses mcp_client_service | ❌ No |
| `registry/api/server_routes.py` | Uses mcp_client_service | ❌ No |
| `agents/agent.py` | **CLIENT** (uses sse_client, streamable_http_client) | ❌ No |
| `agents/a2a/*` | Uses strands-agents (A2A protocol) | ❌ No (no direct MCP SDK) |

**Code Evidence**:
```python
# registry/core/mcp_client.py - CLIENT usage only
from mcp import ClientSession
from mcp.client.sse import sse_client
from mcp.client.streamable_http import streamablehttp_client

# We connect TO MCP servers, we don't RUN MCP servers
async with streamablehttp_client(url=mcp_url) as (read, write, get_session_id):
    async with ClientSession(read, write) as session:
        await session.initialize()
```

**Verdict**: ✅ **NO BREAKING CHANGE**

The DNS rebinding protection only affects code that creates MCP servers using `FastMCP()` or `StreamableHTTPSessionManager`. Our codebase exclusively uses the MCP SDK as a **client** to connect to external MCP servers.

**Recommendation**: Safe to upgrade. No code changes required.

---

### 2. aiohttp (3.13.2 → 3.13.3)

**Change Description**:
Patch release with security fixes. No breaking API changes.

**Changes in 3.13.3**:
- Security fixes for CVE-2025-69223 through CVE-2025-69230
- Bug fixes for RequestHandler and socket handling
- Improved WebSocket error messages
- Restored zero-copy writes for Python 3.12.9+/3.13.2+

**Our Codebase Analysis**:

| Potential Breaking Change | Our Usage | Affected? |
|---------------------------|-----------|-----------|
| `filter_cookies()` domain matching | Not used directly | ❌ No |
| `CookieJar.save()` format | Not used | ❌ No |

**Code Search Results**:
- No direct `aiohttp` imports in registry/
- No `CookieJar` usage
- aiohttp is a transitive dependency through `httpx` and other packages

**Verdict**: ✅ **NO BREAKING CHANGE**

**Recommendation**: Safe to upgrade. No code changes required.

---

### 3. urllib3 (2.5.0 → 2.6.3)

**Change Description**:
Security fixes for decompression bomb attacks. Minor API change for custom decompressors.

**Changes**:
- Limited chained Content-Encoding to 5 (security fix)
- API change: `ContentDecoder` interface modified

**Our Codebase Analysis**:

| Potential Breaking Change | Our Usage | Affected? |
|---------------------------|-----------|-----------|
| Custom `ContentDecoder` implementations | Not used | ❌ No |
| Highly compressed response handling | Standard HTTP responses | ❌ No |

**Code Search Results**:
- No direct `urllib3` imports
- No custom decompressor implementations
- urllib3 is a transitive dependency through `requests`, `httpx`

**Verdict**: ✅ **NO BREAKING CHANGE**

**Recommendation**: Safe to upgrade. No code changes required.

---

### 4. pyasn1 (0.6.1 → 0.6.2)

**Change Description**:
Minor release with security fix for CVE-2026-23490 (DoS in OID decoder).

**Changes**:
- Fixed continuation octet limits in OID/RELATIVE-OID decoder
- Added Python 3.14 support
- No API changes

**Our Codebase Analysis**:

| Aspect | Status |
|--------|--------|
| Direct usage | None (transitive via google-auth, cryptography) |
| API compatibility | Fully backward compatible |

**Verdict**: ✅ **NO BREAKING CHANGE**

**Recommendation**: Safe to upgrade. No code changes required.

---

## agents/a2a Specific Analysis

The `agents/a2a` project has the most vulnerable dependencies. Here's a specific analysis:

### Dependency Chain

```
agents/a2a/pyproject.toml dependencies:
├── strands-agents[a2a]>=0.1.6  ← A2A protocol (NOT MCP SDK)
│   └── aiohttp (transitive)
│   └── urllib3 (transitive)
├── aiohttp>=3.8.0              ← Direct dependency
├── fastapi>=0.115.12
├── uvicorn>=0.34.2
└── pydantic>=2.11.3
```

### Key Finding

**agents/a2a does NOT directly use the MCP SDK**. It uses `strands-agents` with the A2A (Agent-to-Agent) protocol, which is a different protocol from MCP.

```python
# agents/a2a/src/travel-assistant-agent/server.py
from strands.multiagent.a2a import A2AServer  # A2A protocol, NOT MCP
```

### Upgrade Safety for agents/a2a

| Package | Current | Target | Safe? |
|---------|---------|--------|-------|
| aiohttp | 3.13.2 | 3.13.3 | ✅ Yes |
| urllib3 | 2.5.0 | 2.6.3 | ✅ Yes |
| pyasn1 | 0.6.1 | 0.6.2 | ✅ Yes |
| mcp | 1.21.0 | 1.23.0 | ⚠️ N/A (not directly used) |

**Note**: The `mcp` package in agents/a2a may be a transitive dependency of strands-agents. Upgrading should be safe since we don't run MCP servers there either.

---

## metrics-service Specific Analysis

### Dependency Chain

```
metrics-service/pyproject.toml dependencies:
├── httpx>=0.25.0
│   └── urllib3 (transitive, 2.6.2)
├── fastapi>=0.115.12
└── opentelemetry-*
```

### Upgrade Safety

| Package | Current | Target | Safe? |
|---------|---------|--------|-------|
| urllib3 | 2.6.2 | 2.6.3 | ✅ Yes |

**Note**: metrics-service only needs a lock file refresh to pull urllib3 2.6.3.

---

## Recommended Upgrade Procedure

### Step 1: Update agents/a2a

```bash
cd agents/a2a

# Update pyproject.toml
# Change: "aiohttp>=3.8.0" → "aiohttp>=3.13.3"

# Regenerate lock file
uv lock --upgrade

# Verify no pip-audit issues
uv run pip-audit
```

### Step 2: Update metrics-service

```bash
cd metrics-service

# Just regenerate lock file (no pyproject.toml changes needed)
uv lock --upgrade

# Verify
grep -A1 'name = "urllib3"' uv.lock
# Should show: version = "2.6.3"
```

### Step 3: Run Integration Tests

```bash
# Test registry (main project)
uv run pytest tests/ -n 8

# Test agents/a2a (if tests exist)
cd agents/a2a && uv run pytest || echo "No tests"

# Test metrics-service
cd metrics-service && uv run pytest || echo "No tests"
```

---

## Risk Mitigation

### Low-Risk Changes (Immediate)

1. **pyasn1 0.6.2**: Pure security fix, no API changes
2. **aiohttp 3.13.3**: Patch release, backward compatible
3. **urllib3 2.6.3**: Security fix, no custom decompressors used

### Medium-Risk Changes (Review First)

1. **MCP SDK 1.23.0**: Safe for our usage (client-only), but verify strands-agents compatibility

### Rollback Plan

If issues occur after upgrade:

```bash
# Revert lock file
git checkout HEAD -- agents/a2a/uv.lock metrics-service/uv.lock

# Or pin specific versions
# In pyproject.toml:
# "aiohttp>=3.13.2,<3.13.3"
```

---

## Conclusion

**All proposed security upgrades are SAFE to proceed** with no code changes required:

| Finding | Explanation |
|---------|-------------|
| MCP SDK DNS rebinding | Only affects servers; we use client APIs only |
| aiohttp CookieJar changes | We don't use CookieJar directly |
| urllib3 ContentDecoder | We don't implement custom decompressors |
| pyasn1 | Pure security fix, fully backward compatible |

### Action Items

1. ✅ Update `agents/a2a/pyproject.toml` to pin `aiohttp>=3.13.3`
2. ✅ Run `uv lock --upgrade` in agents/a2a
3. ✅ Run `uv lock --upgrade` in metrics-service
4. ✅ Run full test suite to verify no regressions
5. ✅ Commit changes and verify Dependabot alerts close

---

## References

- [aiohttp 3.13.3 Changelog](https://docs.aiohttp.org/en/stable/changes.html)
- [urllib3 Changelog](https://urllib3.readthedocs.io/en/stable/changelog.html)
- [pyasn1 0.6.2 Release](https://github.com/pyasn1/pyasn1/releases/tag/v0.6.2)
- [MCP SDK DNS Rebinding Advisory (GHSA-9h52-p55h-vw2f)](https://github.com/modelcontextprotocol/python-sdk/security/advisories/GHSA-9h52-p55h-vw2f)
- [MCP SDK 421 Invalid Host Header Guide](https://github.com/modelcontextprotocol/python-sdk/issues/1798)

---

*Report generated: 2026-01-22*
*Cross-referenced with: Security Audit Report 2026-01-22*
