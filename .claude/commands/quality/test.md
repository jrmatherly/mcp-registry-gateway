---
name: test
description: Execute tests with coverage analysis and quality reporting
category: quality
complexity: standard
argument-hint: [target] [--coverage] [--verbose] [--watch]
mcp-servers: [serena]
personas: [test-runner, quality-engineer]
---

# /test - Test Execution

## Triggers

- Running test suites during development
- Pre-commit validation requirements
- Coverage analysis needs
- Continuous integration workflows

## Usage

```
/test [target] [--coverage] [--verbose] [--watch]
```

**Examples:**
- `/test` - Run full test suite
- `/test tests/unit/` - Run unit tests only
- `/test --coverage` - Run with coverage report
- `/test tests/unit/test_server_service.py --verbose` - Specific test file

## Behavioral Flow

1. **Identify**: Determine test scope from arguments
2. **Prepare**: Ensure test environment is ready
3. **Execute**: Run tests with appropriate options
4. **Report**: Generate coverage and quality metrics
5. **Analyze**: Identify failures and coverage gaps

Key behaviors:
- Smart test selection based on changed files
- Parallel execution for performance
- Coverage gap identification

## MCP Integration

- **Serena MCP**: Test file discovery and analysis
  - `search_for_pattern`: Find test files
  - `find_symbol`: Locate test functions
  - `get_symbols_overview`: Understand test structure

## Tool Coordination

- **Bash**: pytest execution, coverage commands
- **Serena Tools**: Test file analysis
- **Read**: Test file contents for debugging
- **TodoWrite**: Track test execution progress

## Test Execution Modes

### Full Suite

```bash
# Run all tests in parallel
uv run pytest tests/ -n 8
```

### Unit Tests Only

```bash
# Fast feedback loop
uv run pytest tests/unit/ -n 8
```

### Integration Tests

```bash
# Requires running services
uv run pytest tests/integration/ -v
```

### With Coverage

```bash
# Generate coverage report
uv run pytest tests/ -n 8 --cov=registry --cov-report=term-missing

# HTML report
uv run pytest tests/ -n 8 --cov=registry --cov-report=html
open htmlcov/index.html
```

### Specific Tests

```bash
# Single file
uv run pytest tests/unit/test_server_service.py -v

# Single test
uv run pytest tests/unit/test_server_service.py::TestServerService::test_create -v

# By marker
uv run pytest -m "not slow" tests/
```

## Pre-Test Checks

```bash
# Ensure services are running (for integration tests)
docker ps | grep -E "(mongo|mcp)"

# Check test environment
uv run python -c "import pytest; print('pytest ready')"
```

## Coverage Requirements

| Metric | Minimum | Target |
|--------|---------|--------|
| Line Coverage | 35% | 60% |
| Branch Coverage | 30% | 50% |
| Critical Paths | 90% | 100% |

## Output Format

```markdown
## Test Execution Report

### Configuration
- **Target**: {test path or scope}
- **Options**: {pytest flags used}
- **Environment**: {test environment status}

### Results

```bash
{pytest output}
```

### Summary
- **Passed**: X tests
- **Failed**: Y tests
- **Skipped**: Z tests
- **Duration**: N seconds

### Coverage (if --coverage)
- **Line Coverage**: X%
- **Branch Coverage**: Y%
- **Uncovered Lines**: {list of files with gaps}

### Failed Tests (if any)
1. `test_name`: {failure reason}
2. `test_name`: {failure reason}

### Recommendations
- {Action for failed tests}
- {Coverage improvement suggestions}
```

## Debugging Failed Tests

```bash
# Run with verbose output
uv run pytest tests/unit/test_failing.py -v --tb=long

# Run single test with debugging
uv run pytest tests/unit/test_failing.py::test_name -v -s

# Show local variables on failure
uv run pytest tests/unit/test_failing.py --tb=short -l
```

## Boundaries

**Will:**
- Execute tests with appropriate configuration
- Generate coverage reports when requested
- Identify and report test failures clearly
- Suggest coverage improvement areas

**Will Not:**
- Skip failed tests without reporting
- Run integration tests without verifying services
- Ignore coverage requirements
- Execute tests that modify production data
