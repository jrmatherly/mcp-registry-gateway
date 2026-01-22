# Claude Coding Rules

<!-- This is a condensed version of CLAUDE.md optimized for token efficiency -->
<!-- For comprehensive guidelines, refer to the full CLAUDE.md file -->

## Overview

This document contains coding standards for the MCP Gateway & Registry project. Detailed guidance is available in `.claude/instructions/` - load on-demand based on your task.

## Core Principles

- Write code with minimal complexity for maximum maintainability and clarity
- Choose simple, readable solutions over clever or complex implementations
- Prioritize code that any team member can confidently understand, modify, and debug

## Modular Instructions

Detailed guidance is organized in `.claude/instructions/` for on-demand loading:

| Task | Instruction File |
|------|------------------|
| Testing | `.claude/instructions/testing-standards.md` |
| Async code | `.claude/instructions/async-patterns.md` |
| Error handling | `.claude/instructions/error-handling.md` |
| Security | `.claude/instructions/security-guidelines.md` |
| Documentation | `.claude/instructions/documentation-standards.md` |
| Dev workflow | `.claude/instructions/development-workflow.md` |
| Token optimization | `.claude/instructions/context-optimization-guide.md` |

**Auto-Activated Rules** (load when opening matching files):

- `python-tests.md` - `**/*_test.py`
- `api-endpoints.md` - `**/api/**/*.py`
- `pydantic-models.md` - `**/schemas/**/*.py`
- `terraform.md` - `**/*.tf`
- `docker.md` - `**/Dockerfile*`

## Technology Stack

### Package Management

- Always use `uv` and `pyproject.toml` for package management
- Never use `pip` directly

### Modern Python Libraries

- **Web APIs**: FastAPI (not Flask)
- **Data Processing**: Polars (not Pandas)
- **Code Quality**: Ruff for linting and formatting
- **Type Checking**: MyPy
- **Testing**: pytest with pytest-asyncio, pytest-xdist

### Project Dependencies

- **Database**: MongoDB CE (local) / Amazon DocumentDB (prod)
- **Auth**: Keycloak, Amazon Cognito, Microsoft Entra ID
- **Search**: FAISS, sentence-transformers, LiteLLM
- **Container**: Docker/Podman

## Code Style Essentials

### Function Structure

- Private functions prefixed with `_`, placed at top of file
- Functions: 30-50 lines max, modular
- One parameter per line with type annotations

```python
def process_data(
    input_file: str,
    output_format: str,
    validate: bool = True,
) -> dict:
    """Process input file to specified format."""
    pass
```

### Constants

- No hardcoded values in functions
- Declare at module level or in `constants.py`

### Logging

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s,p%(process)s,{%(filename)s:%(lineno)d},%(levelname)s,%(message)s",
)
```

## Quick Reference

### Pre-Commit Workflow

```bash
uv run ruff check --fix . && uv run ruff format . && uv run pytest tests/ -n 8
```

### Full Validation

```bash
uv run ruff check --fix . && \
uv run ruff format . && \
uv run bandit -r registry/ && \
uv run mypy registry/ && \
uv run pytest tests/ -n 8
```

### Run Tests

```bash
# All tests (parallel)
uv run pytest tests/ -n 8

# With coverage
uv run pytest tests/ -n 8 --cov=registry --cov-report=term-missing

# Specific file
uv run pytest tests/unit/test_server_service.py -v
```

### Docker Services

```bash
# Start all
docker compose up -d

# Start specific
docker compose up -d mongodb keycloak

# View logs
docker compose logs -f registry
```

## Project Structure

```
mcp-registry-gateway/
├── registry/             # Main application
│   ├── api/              # FastAPI routes
│   ├── services/         # Business logic
│   ├── repositories/     # Data access (MongoDB)
│   ├── schemas/          # Pydantic models
│   ├── config/           # Configuration
│   └── core/             # Infrastructure
├── tests/                # Test suite
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── agents/               # A2A agent implementations
├── docker/               # Dockerfiles
├── terraform/            # Infrastructure as Code
└── .claude/              # Claude Code configuration
    ├── agents/           # Specialized sub-agents
    ├── commands/         # Custom commands
    ├── instructions/     # Detailed guidance
    ├── rules/            # Auto-activated rules
    ├── output-styles/    # Response formatting
    └── skills/           # Progressive workflows
```

## Specialized Agents

Use agents for focused tasks:

| Agent | Model | Use For |
|-------|-------|---------|
| `code-reviewer` | Sonnet | Code review, patterns |
| `test-runner` | Haiku | pytest execution |
| `security-auditor` | Sonnet | Bandit/OWASP checks |
| `arch-analyzer` | Opus | Architecture analysis |

## Skills

Progressive disclosure skills in `.claude/skills/`:

| Skill | Purpose |
|-------|---------|
| `validate-project` | Pre-commit validation workflow |
| `code-review` | Structured code review |

## Pull Request Guidelines

- Never include auto-generated messages or Claude attribution
- All tests must pass before merge
- Follow conventional commit format
- Keep commit messages clean and professional

## Platform Naming

- Always refer to "Amazon Bedrock" (never "AWS Bedrock")

## Key Don'ts

- Never hardcode secrets or credentials
- Never use `pip` directly (use `uv`)
- Never bind servers to `0.0.0.0` unless required
- Use emojis sparingly - OK for README.md and status output, avoid in code/commits
- Never skip tests before submitting PRs
