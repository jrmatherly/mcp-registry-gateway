# FastMCP 3.0 Upgrade - Phase 2: Testing Infrastructure

**Parent Plan**: [fastmcp-3-upgrade.md](fastmcp-3-upgrade.md)
**Created**: 2026-01-23
**Status**: Ready for Implementation
**Priority**: High
**Estimated Effort**: 2-3 days
**Prerequisites**: [Phase 1: Pin Dependencies](fastmcp-3-upgrade-phase-1-pin-dependencies.md) completed

---

## Objective

Establish comprehensive testing infrastructure for FastMCP servers to enable confident migration from v2.x to v3.0. This includes creating in-memory client fixtures, capturing v2.x baselines, and implementing regression tests.

---

## Current Testing Gaps

| Gap | Description | Priority |
|-----|-------------|----------|
| No in-memory client tests | Missing FastMCP `Client` fixtures for tool testing | **High** |
| No schema validation tests | Tool input/output schemas not validated | **High** |
| No regression tests | No v2 vs v3 behavior comparison tests | **High** |
| No snapshot tests | Complex tool outputs not captured | Medium |
| No transport tests | SSE vs HTTP transport behavior untested | Medium |
| No auth mocking | Auth context extraction not tested with mocks | Medium |

---

## Implementation Checklist

### Step 1: Install Test Dependencies

Add testing dependencies to root `pyproject.toml` or each server's `pyproject.toml`:

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

**Commands**:
```bash
uv add --dev inline-snapshot dirty-equals respx
uv sync
```

**Validation**:
```bash
uv run python -c "from inline_snapshot import snapshot; print('OK')"
```

---

### Step 2: Create Test Configuration

**File**: `tests/conftest.py` (update existing)

```python
# tests/conftest.py
import pytest
from typing import AsyncGenerator


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

**Validation**:
```bash
uv run pytest --markers | grep -E "(integration|client_process|v3_migration)"
```

---

### Step 3: Create In-Memory Client Fixtures

**File**: `tests/fixtures/fastmcp_clients.py` (create new)

```python
"""FastMCP in-memory client fixtures for testing."""
import pytest
from fastmcp import Client
from fastmcp.client.transports import FastMCPTransport


@pytest.fixture
async def mcpgw_client() -> AsyncGenerator[Client, None]:
    """Create in-memory client for mcpgw server."""
    from servers.mcpgw.server import mcp
    async with Client(transport=mcp) as client:
        yield client


@pytest.fixture
async def fininfo_client() -> AsyncGenerator[Client, None]:
    """Create in-memory client for fininfo server."""
    from servers.fininfo.server import mcp
    async with Client(transport=mcp) as client:
        yield client


@pytest.fixture
async def realserver_client() -> AsyncGenerator[Client, None]:
    """Create in-memory client for realserverfaketools server."""
    from servers.realserverfaketools.server import mcp
    async with Client(transport=mcp) as client:
        yield client
```

Add to `tests/conftest.py`:
```python
pytest_plugins = ["tests.fixtures.fastmcp_clients"]
```

**Validation**:
```bash
uv run pytest tests/ -k "test_" --collect-only | grep "fastmcp"
```

---

### Step 4: Create Baseline Capture Script

**File**: `tests/migration/capture_baselines.py` (create new)

```python
#!/usr/bin/env python
"""Capture v2.x baselines before migration."""
import asyncio
import json
from pathlib import Path
from datetime import datetime

BASELINE_DIR = Path("tests/baselines/v2")


async def capture_mcpgw_baselines():
    """Capture mcpgw server baselines."""
    from fastmcp import Client
    from servers.mcpgw.server import mcp

    output_dir = BASELINE_DIR / "mcpgw"
    output_dir.mkdir(parents=True, exist_ok=True)

    async with Client(transport=mcp) as client:
        # Capture tool list
        tools = await client.list_tools()
        (output_dir / "tools.json").write_text(
            json.dumps([t.model_dump() for t in tools], indent=2)
        )
        print(f"  - Captured {len(tools)} tools")

        # Capture resource list
        resources = await client.list_resources()
        (output_dir / "resources.json").write_text(
            json.dumps([r.model_dump() for r in resources], indent=2)
        )
        print(f"  - Captured {len(resources)} resources")


async def capture_fininfo_baselines():
    """Capture fininfo server baselines."""
    from fastmcp import Client
    from servers.fininfo.server import mcp

    output_dir = BASELINE_DIR / "fininfo"
    output_dir.mkdir(parents=True, exist_ok=True)

    async with Client(transport=mcp) as client:
        tools = await client.list_tools()
        (output_dir / "tools.json").write_text(
            json.dumps([t.model_dump() for t in tools], indent=2)
        )
        print(f"  - Captured {len(tools)} tools")

        resources = await client.list_resources()
        (output_dir / "resources.json").write_text(
            json.dumps([r.model_dump() for r in resources], indent=2)
        )
        print(f"  - Captured {len(resources)} resources")


async def capture_realserver_baselines():
    """Capture realserverfaketools server baselines."""
    from fastmcp import Client
    from servers.realserverfaketools.server import mcp

    output_dir = BASELINE_DIR / "realserverfaketools"
    output_dir.mkdir(parents=True, exist_ok=True)

    async with Client(transport=mcp) as client:
        tools = await client.list_tools()
        (output_dir / "tools.json").write_text(
            json.dumps([t.model_dump() for t in tools], indent=2)
        )
        print(f"  - Captured {len(tools)} tools")

        resources = await client.list_resources()
        (output_dir / "resources.json").write_text(
            json.dumps([r.model_dump() for r in resources], indent=2)
        )
        print(f"  - Captured {len(resources)} resources")

        prompts = await client.list_prompts()
        (output_dir / "prompts.json").write_text(
            json.dumps([p.model_dump() for p in prompts], indent=2)
        )
        print(f"  - Captured {len(prompts)} prompts")


async def main():
    BASELINE_DIR.mkdir(parents=True, exist_ok=True)

    # Write metadata
    metadata = {
        "captured_at": datetime.utcnow().isoformat(),
        "fastmcp_version": "2.x",  # Will be filled by script
    }
    try:
        import fastmcp
        metadata["fastmcp_version"] = fastmcp.__version__
    except Exception:
        pass

    (BASELINE_DIR / "metadata.json").write_text(json.dumps(metadata, indent=2))

    print("Capturing v2.x baselines...")

    print("\nmcpgw-server:")
    await capture_mcpgw_baselines()

    print("\nfininfo-server:")
    await capture_fininfo_baselines()

    print("\nrealserverfaketools-server:")
    await capture_realserver_baselines()

    print(f"\nBaselines captured to {BASELINE_DIR}")


if __name__ == "__main__":
    asyncio.run(main())
```

**Validation**:
```bash
uv run python tests/migration/capture_baselines.py
ls -la tests/baselines/v2/
```

---

### Step 5: Create Regression Tests

**File**: `tests/migration/test_v3_regression.py` (create new)

```python
"""v2 vs v3 regression tests."""
import pytest
import json
from pathlib import Path

BASELINE_DIR = Path("tests/baselines/v2")


@pytest.fixture
def baseline_loader():
    """Load v2.x baseline data for comparison."""
    def load(server: str, filename: str) -> dict | list:
        path = BASELINE_DIR / server / filename
        if not path.exists():
            pytest.skip(f"Baseline not captured: {path}")
        return json.loads(path.read_text())
    return load


@pytest.mark.asyncio
@pytest.mark.v3_migration
async def test_mcpgw_tools_backward_compatible(mcpgw_client, baseline_loader):
    """Verify v3.0 tool list matches v2.x baseline structure."""
    tools = await mcpgw_client.list_tools()
    baseline = baseline_loader("mcpgw", "tools.json")

    # Verify same number of tools
    assert len(tools) >= len(baseline), \
        f"Tool count decreased: {len(tools)} < {len(baseline)}"

    # Verify all baseline tools still exist
    v3_tool_names = {t.name for t in tools}
    v2_tool_names = {t["name"] for t in baseline}

    missing_tools = v2_tool_names - v3_tool_names
    assert not missing_tools, f"Tools removed in v3: {missing_tools}"


@pytest.mark.asyncio
@pytest.mark.v3_migration
async def test_fininfo_tools_backward_compatible(fininfo_client, baseline_loader):
    """Verify fininfo tools match v2.x baseline."""
    tools = await fininfo_client.list_tools()
    baseline = baseline_loader("fininfo", "tools.json")

    v3_tool_names = {t.name for t in tools}
    v2_tool_names = {t["name"] for t in baseline}

    missing_tools = v2_tool_names - v3_tool_names
    assert not missing_tools, f"Tools removed in v3: {missing_tools}"


@pytest.mark.asyncio
@pytest.mark.v3_migration
async def test_realserver_tools_backward_compatible(realserver_client, baseline_loader):
    """Verify realserverfaketools tools match v2.x baseline."""
    tools = await realserver_client.list_tools()
    baseline = baseline_loader("realserverfaketools", "tools.json")

    v3_tool_names = {t.name for t in tools}
    v2_tool_names = {t["name"] for t in baseline}

    missing_tools = v2_tool_names - v3_tool_names
    assert not missing_tools, f"Tools removed in v3: {missing_tools}"
```

**Validation**:
```bash
uv run pytest tests/migration/test_v3_regression.py -v
```

---

### Step 6: Create Auth Context Tests

**File**: `tests/unit/test_auth_context.py` (create new)

```python
"""Auth context extraction tests."""
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

        mock_ctx = MagicMock()
        auth_ctx = await extract_auth_context(mock_ctx)

        assert auth_ctx["username"] == "testuser"
        assert "read" in auth_ctx["scopes"]
        assert "admin" in auth_ctx["scopes"]


@pytest.mark.asyncio
async def test_extract_auth_context_missing_headers(mock_request_with_auth):
    """Test auth context extraction with missing headers."""
    from servers.mcpgw.server import extract_auth_context

    with patch("servers.mcpgw.server.get_http_request") as mock_get_request:
        mock_get_request.return_value = mock_request_with_auth({})

        mock_ctx = MagicMock()
        auth_ctx = await extract_auth_context(mock_ctx)

        # Should return default/empty context, not error
        assert auth_ctx is not None
        assert auth_ctx.get("scopes", []) == []
```

**Validation**:
```bash
uv run pytest tests/unit/test_auth_context.py -v
```

---

### Step 7: Create Snapshot Tests

**File**: `tests/integration/test_tool_snapshots.py` (create new)

```python
"""Snapshot tests for tool outputs."""
import pytest
from inline_snapshot import snapshot


@pytest.mark.asyncio
async def test_mcpgw_list_tools_schema(mcpgw_client):
    """Verify mcpgw tool schemas match expected structure."""
    tools = await mcpgw_client.list_tools()

    # Find list_services tool
    list_services = next((t for t in tools if t.name == "list_services"), None)
    assert list_services is not None

    # Snapshot test for schema structure
    assert list_services.inputSchema["type"] == "object"


@pytest.mark.asyncio
async def test_realserver_tool_output_structure(realserver_client):
    """Verify realserverfaketools tool output structure."""
    from dirty_equals import IsDict, IsStr, IsDatetime

    result = await realserver_client.call_tool(
        "quantum_flux_analyzer",
        {
            "coordinates": {"latitude": 0.0, "longitude": 0.0},
            "intensity": 1.0
        }
    )

    # Flexible assertion for dynamic values
    assert isinstance(result.content, list)
```

**Validation**:
```bash
uv run pytest tests/integration/test_tool_snapshots.py -v
```

---

## Test File Organization

After completing this phase, the test directory structure should be:

```
tests/
├── conftest.py                    # Shared fixtures and markers
├── baselines/
│   └── v2/                        # v2.x baseline captures
│       ├── metadata.json
│       ├── mcpgw/
│       │   ├── tools.json
│       │   └── resources.json
│       ├── fininfo/
│       │   ├── tools.json
│       │   └── resources.json
│       └── realserverfaketools/
│           ├── tools.json
│           ├── resources.json
│           └── prompts.json
├── fixtures/
│   └── fastmcp_clients.py         # FastMCP client fixtures
├── unit/
│   ├── test_auth_context.py       # Auth extraction unit tests
│   └── ...
├── integration/
│   ├── test_tool_snapshots.py     # Snapshot tests
│   └── ...
├── migration/
│   ├── capture_baselines.py       # Baseline capture script
│   └── test_v3_regression.py      # v2 vs v3 comparison tests
└── ...
```

---

## Test Commands Reference

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

---

## Success Criteria

- [ ] Test dependencies installed (`inline-snapshot`, `dirty-equals`, `respx`)
- [ ] Test configuration updated with custom markers
- [ ] In-memory client fixtures created for all 3 servers
- [ ] Baseline capture script created and executed
- [ ] Baselines captured for all servers (tools, resources, prompts)
- [ ] Regression tests created and passing with v2.x
- [ ] Auth context tests created
- [ ] Snapshot tests created
- [ ] All existing tests still pass
- [ ] Test coverage report shows >=35% coverage

---

## Rollback Procedure

If testing infrastructure causes issues:

```bash
# Remove new test files
rm -rf tests/baselines tests/fixtures/fastmcp_clients.py tests/migration
git checkout -- tests/conftest.py

# Reinstall original dependencies
uv sync
```

---

## Next Phase

After completing Phase 2, proceed to [Phase 3: Documentation Improvements](fastmcp-3-upgrade-phase-3-documentation-improvements.md) to add server instructions, tool annotations, and descriptions before the actual v3.0 upgrade.
