# Add Test Skill

Create tests following project conventions and pytest patterns.

## Quick Start

```bash
# Run existing tests first to understand patterns
uv run pytest tests/unit/test_server_service.py -v

# Run your new test
uv run pytest tests/unit/test_your_module.py -v -s
```

## Test Types

| Type | Location | Purpose |
|------|----------|---------|
| Unit | `tests/unit/` | Test isolated components with mocks |
| Integration | `tests/integration/` | Test with real database |
| Fixtures | `tests/fixtures/` | Shared test data |

## Unit Test Template

```python
# tests/unit/test_your_service.py
import pytest
from unittest.mock import AsyncMock, MagicMock

from registry.services.your_service import YourService
from registry.schemas.your_resource import YourResourceCreate


class TestYourService:
    """Tests for YourService."""

    @pytest.fixture
    def mock_repository(self) -> AsyncMock:
        """Create a mock repository."""
        return AsyncMock()

    @pytest.fixture
    def service(self, mock_repository: AsyncMock) -> YourService:
        """Create service with mock repository."""
        return YourService(repository=mock_repository)

    @pytest.mark.asyncio
    async def test_get_returns_resource_when_exists(
        self,
        mock_repository: AsyncMock,
        service: YourService,
    ) -> None:
        # Arrange
        expected = {"id": "123", "name": "test"}
        mock_repository.get.return_value = expected

        # Act
        result = await service.get("123")

        # Assert
        assert result == expected
        mock_repository.get.assert_awaited_once_with("123")

    @pytest.mark.asyncio
    async def test_get_returns_none_when_not_exists(
        self,
        mock_repository: AsyncMock,
        service: YourService,
    ) -> None:
        # Arrange
        mock_repository.get.return_value = None

        # Act
        result = await service.get("nonexistent")

        # Assert
        assert result is None

    @pytest.mark.asyncio
    async def test_create_returns_created_resource(
        self,
        mock_repository: AsyncMock,
        service: YourService,
    ) -> None:
        # Arrange
        data = YourResourceCreate(name="test")
        expected = {"id": "123", "name": "test"}
        mock_repository.create.return_value = expected

        # Act
        result = await service.create(data)

        # Assert
        assert result == expected
        mock_repository.create.assert_awaited_once()
```

## Integration Test Template

```python
# tests/integration/test_your_api.py
import pytest
from httpx import AsyncClient

from registry.main import app


class TestYourResourceAPI:
    """Integration tests for your resource API."""

    @pytest.fixture
    def test_resource(self) -> dict:
        """Create test resource data."""
        return {
            "name": "test-resource",
            "description": "Test description",
        }

    @pytest.mark.asyncio
    async def test_create_resource(
        self,
        async_client: AsyncClient,
        test_resource: dict,
    ) -> None:
        response = await async_client.post(
            "/api/v1/your-resources/",
            json=test_resource,
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == test_resource["name"]
        assert "id" in data

    @pytest.mark.asyncio
    async def test_get_resource_not_found(
        self,
        async_client: AsyncClient,
    ) -> None:
        response = await async_client.get(
            "/api/v1/your-resources/nonexistent"
        )

        assert response.status_code == 404
```

## Running Tests

```bash
# All tests
uv run pytest tests/ -n 8

# Specific file
uv run pytest tests/unit/test_your_service.py -v

# Specific test
uv run pytest tests/unit/test_your_service.py::TestYourService::test_get -v

# With output
uv run pytest tests/unit/test_your_service.py -v -s

# With coverage
uv run pytest tests/unit/ --cov=registry.services.your_service
```

## References

- [Fixture Patterns](references/fixture-patterns.md)
- [Mock Patterns](references/mock-patterns.md)
