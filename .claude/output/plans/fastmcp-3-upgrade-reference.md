# FastMCP 3.0 Upgrade - Technical Reference

**Parent Plan**: [fastmcp-3-upgrade.md](fastmcp-3-upgrade.md)
**Created**: 2026-01-23
**Type**: Reference Document
**Purpose**: Consolidated technical reference for security, performance, maintainability, and other considerations.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Component Inventory](#component-inventory)
3. [FastMCP 3.0 Changes Overview](#fastmcp-30-changes-overview)
4. [Breaking Changes Assessment](#breaking-changes-assessment)
5. [Security Considerations](#security-considerations)
6. [Performance Considerations](#performance-considerations)
7. [Maintainability Considerations](#maintainability-considerations)
8. [Risk Assessment](#risk-assessment)
9. [External References](#external-references)

---

## Current State Analysis

### Affected Servers

| Server | File | FastMCP Features Used | Complexity |
|--------|------|----------------------|------------|
| mcpgw-server | `servers/mcpgw/server.py` | FastMCP, Context, get_http_request, @tool, @resource | High |
| fininfo-server | `servers/fininfo/server.py` | FastMCP, Context, get_http_request, @tool, @resource | Medium |
| realserverfaketools-server | `servers/realserverfaketools/server.py` | FastMCP, @tool, @prompt, @resource | Low |

### Not Affected

| Server | File | Reason |
|--------|------|--------|
| currenttime-server | `servers/currenttime/server.py` | Uses official MCP SDK (`from mcp.server.fastmcp import FastMCP`) |

### Current Import Patterns

```python
# servers/mcpgw/server.py
from fastmcp import Context, FastMCP
from fastmcp.server.dependencies import get_http_request

# servers/fininfo/server.py
from fastmcp import Context, FastMCP
from fastmcp.server.dependencies import get_http_request

# servers/realserverfaketools/server.py
from fastmcp import FastMCP
```

### Current Run Patterns

```python
# mcpgw and fininfo
mcp.run(transport=args.transport, host="0.0.0.0", port=int(args.port), path="/sse")

# realserverfaketools
mcp.run(transport=args.transport, host="0.0.0.0", port=int(args.port))
```

---

## Component Inventory

### Summary

| Server | Tools | Resources | Prompts | Pydantic Models | Auth Required |
|--------|-------|-----------|---------|-----------------|---------------|
| mcpgw-server | 12 | 0 | 0 | 0 | Yes |
| fininfo-server | 2 | 1 | 0 | 0 | Yes |
| realserverfaketools-server | 6 | 2 | 1 | 3 | No |
| **Total** | **20** | **3** | **1** | **3** | - |

### mcpgw-server Tools

| Tool Name | Parameters | Auth Required | Migration Notes |
|-----------|------------|---------------|-----------------|
| `list_services` | `ctx: Context` | Yes | Add timeout, session state caching |
| `toggle_service` | `ctx, server_name, is_active` | Yes | Add destructiveHint |
| `register_service` | `ctx, server_url, server_name` | Yes | Add destructiveHint |
| `remove_service` | `ctx, server_name` | Yes | Add destructiveHint |
| `refresh_service` | `ctx, server_name` | Yes | Add idempotentHint |
| `healthcheck` | `ctx` | No | Add readOnlyHint |
| `intelligent_tool_finder` | `ctx, query` | Yes | Add timeout (30s) |
| `add_server_to_scopes_groups` | `ctx, server_name, scopes, groups` | Yes | Add destructiveHint |
| `remove_server_from_scopes_groups` | `ctx, server_name, scopes, groups` | Yes | Add destructiveHint |
| `create_group` | `ctx, group_name, description` | Yes | Add destructiveHint |
| `delete_group` | `ctx, group_name` | Yes | Add destructiveHint |
| `list_groups` | `ctx` | Yes | Add readOnlyHint |

### fininfo-server Tools

| Tool Name | Parameters | Auth Required | Migration Notes |
|-----------|------------|---------------|-----------------|
| `get_stock_aggregates` | `ctx, symbol, date, ...` | Yes (API key) | Add timeout (15s), openWorldHint |
| `print_stock_data` | `data: dict` | No | Add readOnlyHint, idempotentHint |

### realserverfaketools-server Tools

| Tool Name | Parameters | Migration Notes |
|-----------|------------|-----------------|
| `quantum_flux_analyzer` | `coordinates, intensity, ...` | Add readOnlyHint |
| `neural_pattern_synthesizer` | `seed_pattern, complexity, ...` | Add idempotentHint |
| `hyper_dimensional_mapper` | `dimensions, origin_point, ...` | Add readOnlyHint |
| `temporal_anomaly_detector` | `start_time, end_time, ...` | Add readOnlyHint |
| `user_profile_analyzer` | `profile, analysis_options` | Add readOnlyHint |
| `synthetic_data_generator` | `schema_type, num_records, ...` | Add idempotentHint |

### Pydantic Models (realserverfaketools)

| Model | Purpose | Fields |
|-------|---------|--------|
| `GeoCoordinates` | Geographic location | `latitude`, `longitude`, `altitude` |
| `UserProfile` | User data for analysis | `user_id`, `name`, `email`, `preferences` |
| `AnalysisOptions` | Analysis configuration | `depth`, `include_recommendations`, `format` |

---

## FastMCP 3.0 Changes Overview

### New Architecture

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

| Pattern | Current Code | v3.0 Status | Action Required |
|---------|-------------|-------------|-----------------|
| `get_http_request()` from dependencies | Yes | Compatible | None |
| `@mcp.tool` decorator | Yes | Compatible | None |
| `@mcp.resource` decorator | Yes | Compatible | None |
| `@mcp.prompt` decorator | Yes | Compatible | None |
| `Context` class | Yes | Compatible | None |
| `mcp.run()` parameters | Yes | Compatible | None |

### Removed APIs (NOT used in codebase)

| Removed API | Replacement | Status |
|-------------|-------------|--------|
| `Context.get_http_request()` | `get_http_request()` from dependencies | Already using correct pattern |
| `BearerAuthProvider` | `JWTVerifier` | Not used |
| `from fastmcp import Image` | `from fastmcp.utilities.types import Image` | Not used |
| `FastMCP(dependencies=[...])` | `fastmcp.json` configuration | Not used |

---

## Security Considerations

### Security-Critical Code Paths

| File | Function | Security Role | Risk Level |
|------|----------|---------------|------------|
| `servers/mcpgw/server.py:199-350` | `extract_auth_context()` | Extracts auth headers, masks sensitive data | **Critical** |
| `servers/mcpgw/server.py:94-120` | `extract_user_scopes_from_headers()` | Parses scope headers | High |
| `servers/mcpgw/server.py:123-195` | `check_tool_access()` | Scope-based authorization | **Critical** |
| `servers/mcpgw/server.py:399-436` | `validate_session_cookie_with_auth_server()` | Session validation | **Critical** |
| `servers/fininfo/server.py:133-183` | `get_api_key_for_request()` | API key retrieval | High |

### v3.0 Session State Changes

**v2.x Behavior**:
- `ctx.set_state()` / `ctx.get_state()` were synchronous
- State was request-scoped

**v3.0 Behavior**:
- `ctx.set_state()` / `ctx.get_state()` are now **async**
- State persists across the **entire MCP session**
- State is automatically keyed by session identifier
- State expires after 1 day

**Security Impact**: Low - Current codebase extracts auth context per-request from headers (stateless pattern).

### CVE-2025-61920 (Fixed in v2.13.1+)

**Vulnerability**: Session isolation weakness in HTTP transport
**Mitigation**: Minimum version `>=2.14.0` includes this fix.

### Security Testing Checklist

- [ ] Verify `get_http_request()` returns complete headers
- [ ] Verify Authorization header is accessible and not stripped
- [ ] Verify `x-scopes`, `x-user-scopes` headers pass through
- [ ] Verify `x-client-id` header extraction works (fininfo)
- [ ] Verify session cookies are accessible
- [ ] Test session isolation between users

---

## Performance Considerations

### Performance-Critical Code Paths

| Server | Function | Current Bottleneck | Optimization Opportunity |
|--------|----------|-------------------|-------------------------|
| mcpgw | `intelligent_tool_finder()` | FAISS embedding | Session state caching |
| mcpgw | `extract_auth_context()` | Per-request parsing | Session state caching |
| fininfo | `get_api_key_for_request()` | SecretsManager API | Dependency injection caching |
| fininfo | `get_stock_aggregates()` | External API | Response caching middleware |

### Recommended Tool Timeouts

| Tool | Recommended Timeout | Rationale |
|------|---------------------|-----------|
| `intelligent_tool_finder` | 30s | FAISS computation can be slow |
| `list_services` | 10s | Network call to registry |
| `get_stock_aggregates` | 15s | External API dependency |
| `invoke_tool` | 60s | Proxies to other servers |

### Transport Performance

| Aspect | SSE (Legacy) | Streamable HTTP |
|--------|-------------|-----------------|
| Bidirectional | Server→Client only | Full bidirectional |
| Connection efficiency | Less efficient | More efficient |
| Streaming | Limited | Full support |
| Recommended | No | Yes |

### Performance Acceptance Criteria

| Metric | v2.x Baseline | v3.0 Target | Acceptable Regression |
|--------|--------------|-------------|----------------------|
| Health check P50 | <10ms | <10ms | None |
| Tool list P50 | <50ms | <50ms | <10% |
| Tool list P99 | <200ms | <200ms | <20% |
| Memory usage | TBD | TBD | <20% increase |

---

## Maintainability Considerations

### Recommended Code Organization (v3.0)

For larger servers like mcpgw, consider refactoring:

```
servers/mcpgw/
├── __init__.py
├── server.py           # FastMCP app initialization only
├── fastmcp.json        # Configuration (v3.0)
├── tools/
│   ├── __init__.py
│   ├── registry.py     # list_services, invoke_tool
│   ├── search.py       # intelligent_tool_finder
│   └── admin.py        # Admin-only tools
├── middleware/
│   ├── __init__.py
│   └── auth.py         # extract_auth_context, check_tool_access
└── utils/
    └── embedding.py    # FAISS utilities
```

### Configuration: fastmcp.json

FastMCP 3.0 supports declarative configuration:

```json
{
  "$schema": "https://fastmcp.com/schemas/fastmcp.json",
  "name": "mcpgw-mcp-server",
  "version": "1.0.0",
  "env": {
    "REGISTRY_BASE_URL": {
      "default": "http://localhost:8000",
      "description": "Base URL for the MCP registry"
    }
  }
}
```

### Component Versioning

For gradual migration, use component versioning:

```python
@mcp.tool(version="1.0", deprecated=True)
async def list_services() -> dict:
    """Original implementation (deprecated)."""
    pass

@mcp.tool(version="2.0")
async def list_services(include_health: bool = False) -> dict:
    """Enhanced implementation."""
    pass
```

---

## Risk Assessment

### Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking change in v3.0 beta | Medium | High | Pin to stable v2.x, test first |
| Auth context extraction fails | Low | Critical | Thorough testing |
| Performance regression | Low | Medium | Load testing before production |
| FAISS integration breaks | Low | High | Test `intelligent_tool_finder` |
| Session state isolation breach | Very Low | Critical | Run isolation tests |
| Scope enforcement bypass | Low | Critical | Comprehensive access control tests |

### Mitigation Strategies

1. **Version Pinning**: Use `<3` upper bound until v3.0 is stable
2. **Staged Rollout**: Dev -> Staging -> Production
3. **Feature Flags**: Enable v3 features gradually
4. **Monitoring**: Watch for errors after deployment

---

## External References

- [FastMCP 3.0 Documentation](https://gofastmcp.com/getting-started/welcome)
- [FastMCP 2.x Documentation](https://gofastmcp.com/v2/getting-started/welcome)
- [FastMCP Upgrade Guide](https://gofastmcp.com/development/upgrade-guide)
- [FastMCP Release Notes](https://gofastmcp.com/updates)
- [FastMCP GitHub Issues](https://github.com/jlowin/fastmcp/issues)
- [MCP Specification](https://modelcontextprotocol.io/docs/specification)

---

## Error Handling Reference

### FastMCP 3.0 Error Types

| Error Code | Name | Description | When to Use |
|------------|------|-------------|-------------|
| -32700 | ParseError | Invalid JSON | Malformed request |
| -32600 | InvalidRequest | Invalid request object | Missing required fields |
| -32601 | MethodNotFound | Method doesn't exist | Unknown tool/resource |
| -32602 | InvalidParams | Invalid method parameters | Type/validation errors |
| -32603 | InternalError | Internal server error | Unexpected exceptions |
| -32000 | ToolTimeout | Tool execution timeout | Exceeds configured timeout |

### Error Handling Pattern

```python
from fastmcp.exceptions import ToolError

@mcp.tool(timeout=30.0)
async def list_services(ctx: Context) -> dict:
    try:
        auth = await get_cached_auth_context(ctx)
        if not auth:
            raise ToolError(
                code=-32602,
                message="Authentication required",
                data={"hint": "Include Authorization header"}
            )
        return await fetch_services(auth)
    except httpx.TimeoutException as e:
        raise ToolError(
            code=-32603,
            message="Registry service timeout",
            data={"original_error": str(e)}
        )
```

---

## Monitoring Reference

### Key Metrics

| Metric | Type | Description | Alert Threshold |
|--------|------|-------------|-----------------|
| `mcpgw_tool_calls_total` | Counter | Total tool invocations | N/A |
| `mcpgw_tool_latency_seconds` | Histogram | Tool execution time | P99 > 5s |
| `mcpgw_tool_errors_total` | Counter | Tool error count | > 10/min |
| `mcpgw_active_sessions` | Gauge | Current session count | > 1000 |

### Health Endpoints

| Endpoint | Purpose | Success | Failure |
|----------|---------|---------|---------|
| `/health` | Liveness probe | `{"status": "ok"}` 200 | 503 |
| `/ready` | Readiness probe | `{"status": "ready"}` 200 | 503 |

---

## Appendix: Annotation Decision Matrix

| Tool Characteristic | readOnlyHint | destructiveHint | idempotentHint | openWorldHint |
|--------------------|-------------|----------------|----------------|---------------|
| Reads data only | True | False | True | - |
| Modifies state | False | True | False | - |
| Safe to retry | - | - | True | - |
| Deletes data | False | True | False | - |
| Calls external APIs | - | - | - | True |
