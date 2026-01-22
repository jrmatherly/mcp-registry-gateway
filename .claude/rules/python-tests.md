---
description: Python test file patterns and conventions
globs:
  - "**/test_*.py"
  - "**/*_test.py"
  - "**/tests/**/*.py"
  - "**/conftest.py"
---

# Python Test Patterns

## Test Structure
- Follow AAA pattern: Arrange, Act, Assert
- Use descriptive test names: `test_<function>_<scenario>_<expected_result>`
- One logical assertion per test when possible

## pytest Conventions
- Use `pytest.mark.asyncio` for async tests
- Use fixtures from `conftest.py` for shared setup
- Use `pytest.raises` for exception testing
- Use `pytest.mark.parametrize` for data-driven tests

## Project-Specific Patterns
```python
# Async test example
@pytest.mark.asyncio
async def test_get_server_returns_server_when_exists(
    mock_repository: AsyncMock,
    service: ServerService,
) -> None:
    # Arrange
    expected = ServerFactory.build()
    mock_repository.get.return_value = expected

    # Act
    result = await service.get_server(expected.id)

    # Assert
    assert result == expected
    mock_repository.get.assert_called_once_with(expected.id)
```

## Running Tests
```bash
# Run all tests in parallel
uv run pytest tests/ -n 8

# Run specific test file
uv run pytest tests/unit/test_server_service.py -v

# Run with coverage
uv run pytest tests/ -n 8 --cov=registry --cov-report=term-missing
```

## Common Fixtures (from conftest.py)
- `mock_repository` - Mocked repository for unit tests
- `test_client` - FastAPI TestClient for integration tests
- `mongodb_client` - Real MongoDB client for integration tests

## Test File Organization
- `tests/unit/` - Unit tests (no external dependencies)
- `tests/integration/` - Integration tests (require MongoDB)
- `tests/fixtures/` - Test data and factories
