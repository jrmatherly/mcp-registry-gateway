# Task Completion Checklist

## Before Committing Code

### 1. Code Quality Checks (Required)
```bash
# Run all quality checks
uv run ruff check --fix . && uv run ruff format .
```

### 2. Security Scanning
```bash
# Run bandit for security vulnerabilities
uv run bandit -r registry/
```

### 3. Type Checking
```bash
# Run mypy type checker
uv run mypy registry/
```

### 4. Syntax Validation
```bash
# Python files
uv run python -m py_compile <filename>

# Shell scripts
bash -n <filename>
```

### 5. Run Tests (Required)
```bash
# Run full test suite with parallel execution
uv run pytest tests/ -n 8

# Expected: ~870 tests collected
# - Most unit tests pass
# - Some integration tests may require MongoDB
# - Coverage: Varies by environment (minimum threshold: 35%)
# Execution time: ~2-5 minutes with parallel execution
```

### 6. Prerequisites for Tests
- MongoDB must be running for integration tests:
```bash
docker ps | grep mongo
# Should show: mcp-mongodb running on 0.0.0.0:27017
```

## Before Creating Pull Request

### Full Pre-PR Check
```bash
# Complete workflow
uv run ruff check --fix . && uv run ruff format . && \
uv run bandit -r registry/ && \
uv run mypy registry/ && \
uv run pytest tests/ -n 8
```

### PR Requirements
- All unit tests must pass (no failures)
- Minimum 35% coverage required
- No new security vulnerabilities
- Type checking passes
- Code follows project conventions (CLAUDE.md)

### Test Execution Options
```bash
# Verbose output for debugging
uv run pytest tests/ -n 8 -v

# Stop at first failure
uv run pytest tests/ -n 8 -x

# Run specific test categories
uv run pytest tests/unit/
uv run pytest tests/integration/
uv run pytest -m "not slow"
```

## What to Do If Tests Fail
1. Review test failure output carefully
2. Fix failing test(s) before submitting PR
3. Re-run tests to verify the fix
4. Never submit a PR with failing tests
5. If failure is unrelated to your changes, investigate and document

## Commit Guidelines
- Never include auto-generated messages like "Generated with [Claude Code]"
- Never include "Co-Authored-By: Claude" lines
- Keep commit messages clean and professional
- Use conventional commit format:
  - `feat:` for new features
  - `fix:` for bug fixes
  - `docs:` for documentation
  - `refactor:` for code refactoring
  - `test:` for test additions/changes
