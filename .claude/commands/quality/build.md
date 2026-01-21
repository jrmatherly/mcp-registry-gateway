---
name: build
description: Build, compile, and validate project with intelligent error handling
category: quality
complexity: standard
argument-hint: [--docker] [--check] [--fix]
mcp-servers: [serena]
personas: [devops-architect, code-reviewer]
---

# /build - Project Build & Validation

## Triggers

- Pre-commit validation workflows
- CI/CD pipeline preparation
- Docker image building
- Dependency and syntax verification

## Usage

```
/build [--docker] [--check] [--fix]
```

**Examples:**
- `/build` - Full validation suite
- `/build --check` - Check only, no fixes
- `/build --fix` - Auto-fix issues
- `/build --docker` - Build Docker images

## Behavioral Flow

1. **Validate**: Run syntax and lint checks
2. **Type Check**: Execute mypy for type safety
3. **Test**: Run test suite
4. **Build**: Create Docker images if requested
5. **Report**: Summarize build status

Key behaviors:
- Fail-fast on critical errors
- Auto-fix when possible (with --fix)
- Clear error reporting with line references

## MCP Integration

- **Serena MCP**: Code analysis for error context
  - `find_symbol`: Locate error sources
  - `get_symbols_overview`: Understand file structure
  - `search_for_pattern`: Find related issues

## Tool Coordination

- **Bash**: Build commands, docker operations
- **Serena Tools**: Error analysis
- **Read**: Configuration files
- **TodoWrite**: Track build phases

## Build Phases

### Phase 1: Syntax & Style

```bash
# Check only
uv run ruff check .

# Check and fix
uv run ruff check --fix . && uv run ruff format .
```

### Phase 2: Type Checking

```bash
# Run mypy
uv run mypy registry/
```

### Phase 3: Tests

```bash
# Run test suite
uv run pytest tests/ -n 8
```

### Phase 4: Docker Build (if --docker)

```bash
# Build main image
docker compose build registry

# Build all services
docker compose build

# Verify images
docker images | grep mcp
```

## Full Build Command

```bash
# Complete validation pipeline
uv run ruff check --fix . && \
uv run ruff format . && \
uv run mypy registry/ && \
uv run pytest tests/ -n 8
```

## Error Handling

### Ruff Errors

```bash
# Show detailed error context
uv run ruff check . --show-source

# Fix specific rule
uv run ruff check . --fix --select E501
```

### MyPy Errors

```bash
# Show error codes
uv run mypy registry/ --show-error-codes

# Ignore specific errors (temporary)
# Add: # type: ignore[error-code]
```

### Test Failures

```bash
# Re-run failed tests
uv run pytest tests/ --lf -v

# Debug specific test
uv run pytest tests/unit/test_file.py::test_name -v -s
```

## Output Format

```markdown
## Build Report

### Build Configuration
- **Mode**: {check/fix/docker}
- **Date**: {timestamp}

### Phase Results

#### Syntax & Style (Ruff)
- **Status**: {Pass/Fail}
- **Issues Found**: X
- **Issues Fixed**: Y (if --fix)

```bash
{ruff output if errors}
```

#### Type Checking (MyPy)
- **Status**: {Pass/Fail}
- **Errors**: X
- **Warnings**: Y

```bash
{mypy output if errors}
```

#### Tests (Pytest)
- **Status**: {Pass/Fail}
- **Passed**: X
- **Failed**: Y
- **Skipped**: Z

```bash
{test summary}
```

#### Docker Build (if --docker)
- **Status**: {Pass/Fail}
- **Images Built**: {list}

### Overall Status: {SUCCESS/FAILURE}

### Next Steps
{Recommendations based on results}
```

## Pre-Commit Integration

```bash
# Run pre-commit hooks
uv run pre-commit run --all-files

# Install pre-commit hooks
uv run pre-commit install
```

## Docker Build Options

```bash
# Build with no cache
docker compose build --no-cache registry

# Build for production
docker compose -f docker-compose.prebuilt.yml build

# Multi-platform build
docker buildx build --platform linux/amd64,linux/arm64 -t registry .
```

## Boundaries

**Will:**
- Run comprehensive validation pipeline
- Provide clear error reporting with context
- Auto-fix when possible and requested
- Build Docker images when needed

**Will Not:**
- Push images without explicit request
- Skip any validation phase
- Ignore type errors or lint issues
- Deploy to any environment
