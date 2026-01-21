# CI Pipeline Details

## GitHub Actions Workflow

The CI pipeline runs automatically on:
- Pull requests to `main` or `develop` branches
- Pushes to `main` or `develop` branches

### Workflow File
`.github/workflows/registry-test.yml`

### Pipeline Stages

#### 1. Setup
- Checkout code
- Set up Python 3.11
- Install uv package manager
- Install dependencies with `uv sync`

#### 2. Linting
```yaml
- name: Lint with ruff
  run: uv run ruff check .
```

#### 3. Formatting Check
```yaml
- name: Check formatting
  run: uv run ruff format --check .
```

#### 4. Type Checking
```yaml
- name: Type check with mypy
  run: uv run mypy registry/
```

#### 5. Security Scanning
```yaml
- name: Security scan with bandit
  run: uv run bandit -r registry/
```

#### 6. Test Execution
```yaml
- name: Run tests
  run: uv run pytest tests/ -n 8 --cov=registry
  env:
    DOCUMENTDB_HOST: localhost
```

### Required Services
The CI pipeline starts MongoDB as a service:
```yaml
services:
  mongodb:
    image: mongo:7
    ports:
      - 27017:27017
```

## Coverage Requirements

- Minimum coverage: 35%
- Coverage report uploaded to Codecov
- PR comments show coverage changes

## Failure Handling

### If Linting Fails
```bash
uv run ruff check --fix .
uv run ruff format .
git add -p && git commit --amend
```

### If Type Check Fails
1. Review the mypy output
2. Add missing type annotations
3. Fix type mismatches
4. Consider `# type: ignore` for false positives (with comment)

### If Security Scan Fails
1. Review bandit output
2. Fix actual vulnerabilities
3. Add `# nosec` with justification for false positives

### If Tests Fail
1. Run failing test locally with `-v -s`
2. Check if it's flaky (run multiple times)
3. Fix the issue or skip with `pytest.mark.skip(reason="...")`
