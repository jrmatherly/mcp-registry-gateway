# Development Workflow

## Recommended Development Tools
- **Ruff**: For linting and formatting (replaces multiple tools like isort and many flake8 plugins)
- **Bandit**: For security vulnerability scanning
- **MyPy**: For type checking
- **Pytest**: For testing

## Pre-commit Workflow
Before committing code, run these checks in order:

```bash
# 1. Format and lint with auto-fixes
uv run ruff check --fix . && uv run ruff format .

# 2. Security scanning
uv run bandit -r registry/

# 3. Type checking
uv run mypy registry/

# 4. Run tests
uv run pytest tests/ -n 8

# Or run all checks in one command:
uv run ruff check --fix . && uv run ruff format . && uv run bandit -r registry/ && uv run mypy registry/ && uv run pytest tests/ -n 8
```

## Code Validation
- Always run `uv run python -m py_compile <filename>` after making changes to Python files
- Always run `bash -n <filename>` after making changes to bash/shell scripts to check syntax

## Git Workflow
```bash
# Check status
git status

# Stage changes
git add -p  # Interactive staging

# Commit with meaningful message
git commit -m "feat: add semantic search for MCP servers"

# Push to feature branch
git push origin feature/semantic-search
```

## Commit Message Format
Follow conventional commits:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## Local Development Setup
```bash
# Install dependencies
uv sync

# Start MongoDB
docker compose up -d mongodb

# Run the application
uv run uvicorn registry.main:app --reload --host 127.0.0.1 --port 8000

# Run tests
uv run pytest tests/ -n 8
```

## Continuous Integration
Tests run automatically via GitHub Actions when:
- Pull requests are created targeting `main` or `develop` branches
- Code is pushed to `main` or `develop` branches

See `.github/workflows/registry-test.yml` for CI configuration.

## Code Review Checklist
Before submitting a PR:
- [ ] All tests pass locally
- [ ] Code is formatted with ruff
- [ ] No security issues from bandit
- [ ] Type hints are complete
- [ ] Documentation is updated
- [ ] No hardcoded secrets or credentials
- [ ] Error handling is appropriate
- [ ] Logging is sufficient for debugging

## Debugging Tips
```bash
# Run with debug logging
LOG_LEVEL=DEBUG uv run uvicorn registry.main:app --reload

# Run specific test with verbose output
uv run pytest tests/unit/test_server_service.py -v -s

# Check MongoDB connection
docker exec -it mcp-mongodb mongosh
```
