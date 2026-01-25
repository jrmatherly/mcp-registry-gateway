# Testing Standards

## Testing Framework
- Use `pytest` as the primary testing framework
- Maintain minimum 35% code coverage (enforced via CI)
- Use `pytest-cov` for coverage reporting
- Use `pytest-asyncio` for async tests
- Use `pytest-xdist` for parallel execution

## Test Structure
```python
import pytest
from unittest.mock import Mock, patch, AsyncMock

class TestFeatureName:
    """Tests for feature_name module"""

    def test_happy_path(self):
        """Test normal operation with valid inputs"""
        # Arrange
        input_data = {"key": "value"}

        # Act
        result = function_under_test(input_data)

        # Assert
        assert result["status"] == "success"

    def test_edge_case(self):
        """Test boundary conditions"""
        pass

    def test_error_handling(self):
        """Test error scenarios"""
        with pytest.raises(ValueError, match="Invalid input"):
            function_under_test(None)
```

## Async Test Patterns
```python
@pytest.mark.asyncio
async def test_async_operation(
    mock_repository: AsyncMock,
) -> None:
    # Arrange
    mock_repository.get.return_value = expected_value

    # Act
    result = await service.get_item(item_id)

    # Assert
    assert result == expected_value
    mock_repository.get.assert_awaited_once_with(item_id)
```

## Testing Best Practices
- Follow AAA pattern: Arrange, Act, Assert
- One assertion per test when possible
- Use descriptive test names that explain what is being tested
- Mock external dependencies
- Use fixtures for common test data
- Test both happy paths and error cases

## Running Tests

### Before Pull Requests
Always run the full test suite before submitting a pull request:

```bash
# Run all tests in parallel (using 8 workers)
uv run pytest tests/ -n 8

# Expected output:
# - ~850+ passed
# - ~20 skipped
# - Coverage: ~42%
# - Execution time: ~30 seconds
```

### Test Execution Options
```bash
# Run tests serially (slower, uses less memory)
uv run pytest tests/

# Run only unit tests
uv run pytest tests/unit/

# Run only integration tests
uv run pytest tests/integration/

# Run with verbose output
uv run pytest tests/ -n 8 -v

# Run and stop at first failure
uv run pytest tests/ -n 8 -x

# Run with coverage report
uv run pytest tests/ -n 8 --cov=registry --cov-report=term-missing
```

### Test Prerequisites
Before running tests, ensure:

1. **MongoDB is running** (for integration tests):
   ```bash
   docker ps | grep mongo
   # Should show: mcp-mongodb running on 0.0.0.0:27017
   ```

2. **Test environment configured**:
   - Tests automatically set `DOCUMENTDB_HOST=localhost`
   - Tests use `mongodb-ce` storage backend
   - Tests use `directConnection=true` for single-node MongoDB

## Acceptable Test Results
- All unit tests must pass (no failures allowed)
- Integration tests: Some may be skipped due to known issues
- Coverage: Minimum 35% required
- Warnings: Minor warnings acceptable, investigate new ones

## What to Do If Tests Fail
1. Review the test failure output carefully
2. Fix the failing test(s) before submitting PR
3. Re-run tests to verify the fix
4. Never submit a PR with failing tests
5. If unrelated to your changes, investigate and fix or document why it should be skipped
