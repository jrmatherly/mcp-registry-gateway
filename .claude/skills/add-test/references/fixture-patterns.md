# Fixture Patterns

## Conftest.py Organization

```python
# tests/conftest.py
import pytest
import pytest_asyncio
from unittest.mock import AsyncMock
from httpx import AsyncClient

from registry.main import app


# ============================================================
# Client Fixtures
# ============================================================

@pytest_asyncio.fixture
async def async_client() -> AsyncClient:
    """Create async HTTP client for testing."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


# ============================================================
# Repository Fixtures
# ============================================================

@pytest.fixture
def mock_server_repository() -> AsyncMock:
    """Mock server repository."""
    return AsyncMock()


@pytest.fixture
def mock_agent_repository() -> AsyncMock:
    """Mock agent repository."""
    return AsyncMock()


# ============================================================
# Service Fixtures
# ============================================================

@pytest.fixture
def server_service(mock_server_repository: AsyncMock) -> ServerService:
    """Create server service with mock repository."""
    return ServerService(repository=mock_server_repository)


# ============================================================
# Data Fixtures
# ============================================================

@pytest.fixture
def sample_server() -> dict:
    """Sample server data."""
    return {
        "id": "server-123",
        "name": "test-server",
        "description": "Test server",
        "url": "https://example.com/mcp",
    }


@pytest.fixture
def sample_servers() -> list:
    """Multiple sample servers."""
    return [
        {"id": f"server-{i}", "name": f"server-{i}"}
        for i in range(5)
    ]
```

## Fixture Scopes

```python
# Function scope (default) - new instance per test
@pytest.fixture
def my_fixture():
    return SomeObject()


# Class scope - shared within test class
@pytest.fixture(scope="class")
def shared_fixture():
    return ExpensiveObject()


# Module scope - shared within module
@pytest.fixture(scope="module")
def module_fixture():
    return DatabaseConnection()


# Session scope - shared across all tests
@pytest.fixture(scope="session")
def session_fixture():
    return GlobalConfig()
```

## Async Fixtures

```python
import pytest_asyncio


@pytest_asyncio.fixture
async def async_resource():
    """Async fixture with cleanup."""
    resource = await create_resource()
    yield resource
    await cleanup_resource(resource)


@pytest_asyncio.fixture
async def database_with_data(mongodb_client):
    """Setup database with test data."""
    db = mongodb_client["test_db"]
    await db.servers.insert_many([
        {"name": "server-1"},
        {"name": "server-2"},
    ])
    yield db
    await db.servers.delete_many({})
```

## Parameterized Fixtures

```python
@pytest.fixture(params=["active", "inactive", "pending"])
def status(request) -> str:
    """Parameterized status fixture."""
    return request.param


@pytest.fixture(params=[
    {"name": "valid", "expected": True},
    {"name": "", "expected": False},
    {"name": "a" * 101, "expected": False},
])
def name_validation_case(request) -> dict:
    """Test cases for name validation."""
    return request.param
```

## Factory Fixtures

```python
@pytest.fixture
def server_factory():
    """Factory for creating server test data."""
    def _factory(
        name: str = "test-server",
        description: str = None,
        **kwargs,
    ) -> dict:
        return {
            "id": f"server-{name}",
            "name": name,
            "description": description or f"Description for {name}",
            **kwargs,
        }
    return _factory


# Usage in test
def test_with_factory(server_factory):
    server1 = server_factory(name="server-1")
    server2 = server_factory(name="server-2", status="active")
```
