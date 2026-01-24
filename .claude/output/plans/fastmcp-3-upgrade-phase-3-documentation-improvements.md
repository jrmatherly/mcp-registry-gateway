# FastMCP 3.0 Upgrade - Phase 3: Documentation Improvements

**Parent Plan**: [fastmcp-3-upgrade.md](fastmcp-3-upgrade.md)
**Created**: 2026-01-23
**Status**: Ready for Implementation
**Priority**: Medium
**Estimated Effort**: 3-4 hours
**Prerequisites**: [Phase 2: Testing Infrastructure](fastmcp-3-upgrade-phase-2-testing-infrastructure.md) completed

---

## Objective

Add comprehensive documentation to all FastMCP servers to improve LLM tool discoverability and usage. This includes server instructions, tool descriptions, tool annotations, tags, and standardized docstrings.

---

## Current Documentation Gaps

| Gap | Server | Description | Priority |
|-----|--------|-------------|----------|
| No server instructions | All | Missing `instructions` parameter on FastMCP instances | **High** |
| Incomplete tool descriptions | mcpgw | Some tools lack explicit `description` argument | **High** |
| No tool annotations | All | Missing `readOnlyHint`, `destructiveHint` metadata | Medium |
| Inconsistent docstrings | All | Docstring formats vary across tools | Medium |
| No tool examples | All | Missing `examples` in decorator arguments | Low |
| Missing tags | All | Tools not categorized with tags | Low |

---

## Component Inventory

### mcpgw-server (12 tools)

| Tool Name | readOnlyHint | destructiveHint | idempotentHint | Priority |
|-----------|-------------|----------------|----------------|----------|
| `list_services` | True | False | True | High |
| `toggle_service` | False | **True** | False | High |
| `register_service` | False | **True** | False | High |
| `remove_service` | False | **True** | False | High |
| `refresh_service` | False | False | **True** | Medium |
| `healthcheck` | **True** | False | True | Medium |
| `intelligent_tool_finder` | **True** | False | True | Medium |
| `add_server_to_scopes_groups` | False | **True** | False | Medium |
| `remove_server_from_scopes_groups` | False | **True** | False | Medium |
| `create_group` | False | **True** | False | Medium |
| `delete_group` | False | **True** | False | Medium |
| `list_groups` | **True** | False | True | Medium |

### fininfo-server (2 tools, 1 resource)

| Component | Type | readOnlyHint | destructiveHint | idempotentHint |
|-----------|------|-------------|----------------|----------------|
| `get_stock_aggregates` | Tool | **True** | False | True |
| `print_stock_data` | Tool | **True** | False | **True** |
| `get_config` | Resource | True | False | True |

### realserverfaketools-server (6 tools, 2 resources, 1 prompt)

| Component | Type | readOnlyHint | destructiveHint | idempotentHint |
|-----------|------|-------------|----------------|----------------|
| `quantum_flux_analyzer` | Tool | **True** | False | True |
| `neural_pattern_synthesizer` | Tool | True | False | **True** |
| `hyper_dimensional_mapper` | Tool | **True** | False | True |
| `temporal_anomaly_detector` | Tool | **True** | False | True |
| `user_profile_analyzer` | Tool | **True** | False | True |
| `synthetic_data_generator` | Tool | True | False | **True** |
| `get_config` | Resource | True | False | True |
| `get_tools_documentation` | Resource | True | False | True |
| `system_prompt_for_agent` | Prompt | N/A | N/A | N/A |

---

## Implementation Checklist

### Step 1: Add Server Instructions to mcpgw-server

**File**: `servers/mcpgw/server.py`

**Change**:
```python
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
    - **Admin**: toggle_service, register_service, remove_service

    ## Rate Limits
    - 100 requests/minute per authenticated client
    """,
)
```

**Validation**:
```bash
uv run python -c "from servers.mcpgw.server import mcp; print(mcp.settings.instructions[:100])"
```

---

### Step 2: Add Server Instructions to fininfo-server

**File**: `servers/fininfo/server.py`

**Change**:
```python
mcp = FastMCP(
    "fininfo-mcp-server",
    version="1.0.0",
    instructions="""
    Financial Information MCP Server for stock market data.

    ## Purpose
    Provides real-time and historical stock market data from Polygon.io API.

    ## Authentication
    Requires valid API key via `x-client-id` header or AWS SecretsManager.

    ## Available Tools
    - **get_stock_aggregates**: Retrieve OHLCV data for a stock symbol
    - **print_stock_data**: Format stock data for display

    ## Data Sources
    - Polygon.io API for market data

    ## Limitations
    - Real-time data subject to API rate limits
    - Historical data availability varies by subscription tier
    """,
)
```

---

### Step 3: Add Server Instructions to realserverfaketools-server

**File**: `servers/realserverfaketools/server.py`

**Change**:
```python
mcp = FastMCP(
    "realserverfaketools-mcp-server",
    version="1.0.0",
    instructions="""
    Demo/Test MCP Server with fictional tools for testing and development.

    ## Purpose
    Provides mock tools for testing MCP client implementations and
    demonstrating tool patterns. All tools return simulated/fake data.

    ## Available Tool Categories
    - **Analysis**: quantum_flux_analyzer, temporal_anomaly_detector, user_profile_analyzer
    - **Generation**: neural_pattern_synthesizer, hyper_dimensional_mapper, synthetic_data_generator

    ## Note
    This server is for testing only. All data returned is simulated.
    """,
)
```

---

### Step 4: Add Tool Annotations to mcpgw-server

**File**: `servers/mcpgw/server.py`

Add annotations to each tool decorator. Example for `list_services`:

```python
from mcp.types import ToolAnnotations

@mcp.tool(
    description="List all registered MCP services with optional health status filtering",
    annotations=ToolAnnotations(
        title="List Services",
        readOnlyHint=True,
        idempotentHint=True,
    ),
    tags={"discovery", "registry"},
)
async def list_services(ctx: Context) -> dict:
    """
    List registered MCP services from the gateway registry.

    Returns:
        Dictionary containing:
        - services: List of service metadata dicts
        - total: Total number of services
    """
    pass
```

**Full annotation mapping for mcpgw tools**:

```python
# Destructive tools (modify state)
DESTRUCTIVE_TOOLS = {
    "toggle_service", "register_service", "remove_service",
    "add_server_to_scopes_groups", "remove_server_from_scopes_groups",
    "create_group", "delete_group"
}

# Read-only tools
READONLY_TOOLS = {
    "list_services", "list_groups", "healthcheck", "intelligent_tool_finder"
}

# Idempotent tools (safe to retry)
IDEMPOTENT_TOOLS = {
    "refresh_service", "healthcheck", "list_services", "list_groups",
    "intelligent_tool_finder"
}
```

---

### Step 5: Add Tool Annotations to fininfo-server

**File**: `servers/fininfo/server.py`

```python
@mcp.tool(
    description="Retrieve stock price aggregates (OHLCV) for a given symbol and date",
    annotations=ToolAnnotations(
        title="Get Stock Aggregates",
        readOnlyHint=True,
        idempotentHint=True,
        openWorldHint=True,  # Accesses external API
    ),
    tags={"finance", "market-data"},
)
async def get_stock_aggregates(
    ctx: Context,
    symbol: str,
    date: str,
) -> dict:
    """Retrieve stock aggregates from Polygon.io."""
    pass

@mcp.tool(
    description="Format stock data for human-readable display",
    annotations=ToolAnnotations(
        title="Print Stock Data",
        readOnlyHint=True,
        idempotentHint=True,
    ),
    tags={"finance", "formatting"},
)
def print_stock_data(data: dict) -> str:
    """Format stock data as a string."""
    pass
```

---

### Step 6: Add Tool Annotations to realserverfaketools-server

**File**: `servers/realserverfaketools/server.py`

All tools in this server are read-only and idempotent (they return mock data):

```python
@mcp.tool(
    description="Analyze quantum flux patterns at specified coordinates (simulated)",
    annotations=ToolAnnotations(
        title="Quantum Flux Analyzer",
        readOnlyHint=True,
        idempotentHint=True,
    ),
    tags={"demo", "analysis"},
)
async def quantum_flux_analyzer(
    coordinates: GeoCoordinates,
    intensity: float,
) -> dict:
    """Simulated quantum flux analysis."""
    pass
```

---

### Step 7: Add Resource Descriptions

**All servers with resources**:

```python
@mcp.resource(
    uri="config://server",
    name="Server Configuration",
    description="Read-only server configuration and feature flags",
    mime_type="application/json",
)
def get_config() -> dict:
    """Returns current server configuration."""
    pass
```

---

### Step 8: Add Prompt Descriptions (realserverfaketools)

**File**: `servers/realserverfaketools/server.py`

```python
@mcp.prompt(
    name="system_prompt_for_agent",
    title="Agent System Prompt",
    description="Generates a system prompt for AI agents using this server",
)
def system_prompt_for_agent() -> str:
    """Generate system prompt for AI agents."""
    pass
```

---

### Step 9: Create Documentation Audit Script

**File**: `scripts/audit_docs.py` (create new)

```python
#!/usr/bin/env python
"""Audit tool documentation completeness."""
import sys
from dataclasses import dataclass


@dataclass
class AuditResult:
    server: str
    issues: list[str]

    @property
    def issue_count(self) -> int:
        return len(self.issues)


def audit_server(mcp) -> AuditResult:
    """Check documentation completeness for a FastMCP server."""
    issues = []

    # Check server instructions
    if not getattr(mcp, "instructions", None):
        issues.append("MISSING: Server instructions")

    # Check tool documentation
    for tool in mcp._tools.values():
        if not getattr(tool, "description", None):
            issues.append(f"MISSING: Description for tool '{tool.name}'")
        if not getattr(tool.fn, "__doc__", None):
            issues.append(f"MISSING: Docstring for tool '{tool.name}'")
        if not getattr(tool, "annotations", None):
            issues.append(f"MISSING: Annotations for tool '{tool.name}'")
        if not getattr(tool, "tags", None):
            issues.append(f"MISSING: Tags for tool '{tool.name}'")

    return AuditResult(server=mcp.name, issues=issues)


def main():
    fail_on_missing = "--fail-on-missing" in sys.argv

    print("Documentation Audit Report")
    print("=" * 50)

    total_issues = 0

    # Audit mcpgw
    try:
        from servers.mcpgw.server import mcp as mcpgw
        result = audit_server(mcpgw)
        print(f"\nmcpgw-server: {result.issue_count} issues")
        for issue in result.issues:
            print(f"  - {issue}")
        total_issues += result.issue_count
    except ImportError as e:
        print(f"\nmcpgw-server: Could not import - {e}")

    # Audit fininfo
    try:
        from servers.fininfo.server import mcp as fininfo
        result = audit_server(fininfo)
        print(f"\nfininfo-server: {result.issue_count} issues")
        for issue in result.issues:
            print(f"  - {issue}")
        total_issues += result.issue_count
    except ImportError as e:
        print(f"\nfininfo-server: Could not import - {e}")

    # Audit realserverfaketools
    try:
        from servers.realserverfaketools.server import mcp as realserver
        result = audit_server(realserver)
        print(f"\nrealserverfaketools-server: {result.issue_count} issues")
        for issue in result.issues:
            print(f"  - {issue}")
        total_issues += result.issue_count
    except ImportError as e:
        print(f"\nrealserverfaketools-server: Could not import - {e}")

    print("\n" + "=" * 50)
    print(f"Total issues: {total_issues}")

    if fail_on_missing and total_issues > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
```

**Validation**:
```bash
uv run python scripts/audit_docs.py
```

---

### Step 10: Run Documentation Audit and Fix Issues

```bash
# Run audit
uv run python scripts/audit_docs.py

# Review issues and fix each one
# Re-run audit until 0 issues
uv run python scripts/audit_docs.py --fail-on-missing
```

---

## Success Criteria

- [ ] All 3 servers have `instructions` parameter set
- [ ] All 20 tools have explicit `description` in decorator
- [ ] All 20 tools have `annotations` with behavioral hints
- [ ] All 20 tools have `tags` for categorization
- [ ] All 3 resources have `description` parameter
- [ ] The 1 prompt has `description` parameter
- [ ] Documentation audit script created
- [ ] Audit script reports 0 issues
- [ ] All existing tests still pass

---

## Documentation Standards Reference

### Tool Docstring Format

```python
@mcp.tool(
    description="Short MCP-facing description",
    annotations=ToolAnnotations(
        title="Human Title",
        readOnlyHint=True,
        idempotentHint=True,
    ),
    tags={"category1", "category2"},
)
async def tool_name(param: str) -> dict:
    """
    First line: what the tool does (imperative mood).

    More details about the tool's behavior and use cases.

    Args:
        param: Description of the parameter

    Returns:
        Dictionary containing:
        - key1: Description
        - key2: Description

    Raises:
        ValueError: When param is invalid

    Example:
        >>> result = await tool_name("value")
        >>> print(result["key1"])
    """
    pass
```

### Annotation Decision Matrix

| Tool Characteristic | readOnlyHint | destructiveHint | idempotentHint |
|--------------------|-------------|----------------|----------------|
| Reads data only | True | False | True |
| Modifies state | False | True | False |
| Safe to retry | - | - | True |
| Has side effects | False | - | False |
| Deletes data | False | True | False |

---

## Rollback Procedure

If documentation changes cause issues:

```bash
# Revert server file changes
git checkout HEAD~1 -- servers/mcpgw/server.py servers/fininfo/server.py servers/realserverfaketools/server.py

# Remove audit script
rm scripts/audit_docs.py

# Reinstall dependencies
uv sync
```

---

## Next Phase

After completing Phase 3, proceed to [Phase 4: Development Testing with v3.0](fastmcp-3-upgrade-phase-4-development-testing.md) when FastMCP 3.0 reaches GA (stable) release.
