# Validate Project Skill

Run comprehensive validation checks before committing or submitting a PR.

## Quick Validation

```bash
# Format and lint
uv run ruff check --fix . && uv run ruff format .

# Run tests
uv run pytest tests/ -n 8
```

## Full Validation

```bash
# Complete pre-commit workflow
uv run ruff check --fix . && \
uv run ruff format . && \
uv run bandit -r registry/ && \
uv run mypy registry/ && \
uv run pytest tests/ -n 8
```

## Validation Steps

### 1. Code Formatting
```bash
uv run ruff format .
```
Formats all Python files using ruff.

### 2. Linting with Auto-fix
```bash
uv run ruff check --fix .
```
Fixes automatically correctable issues.

### 3. Security Scanning
```bash
uv run bandit -r registry/
```
Scans for security vulnerabilities.

### 4. Type Checking
```bash
uv run mypy registry/
```
Validates type annotations.

### 5. Run Tests
```bash
uv run pytest tests/ -n 8
```
Runs full test suite in parallel.

## Expected Results

| Check | Expected |
|-------|----------|
| Ruff format | No changes needed |
| Ruff check | No errors |
| Bandit | No high/critical issues |
| MyPy | No errors |
| Pytest | ~850+ passed, ~20 skipped |

## References

For detailed information:
- [CI Pipeline Details](references/ci-pipeline.md)
- [Pre-commit Checklist](references/pre-commit-checklist.md)

## Scripts

- [Full validation script](scripts/validate.sh)
