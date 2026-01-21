---
name: prime
description: Prime agent with MCP Registry Gateway codebase understanding
category: initialization
complexity: standard
mcp-servers: [serena]
personas: [arch-analyzer]
---

# /prime - Load Project Context

## Triggers

- Starting a new Claude Code session
- Switching to unfamiliar area of the codebase
- Before major implementation work requiring architectural understanding
- After extended time away from the project

## Usage

```
/prime
```

## Behavioral Flow

1. **Analyze**: Examine project structure and identify key components
2. **Load**: Activate Serena project and load relevant memories
3. **Assess**: Check current git state and running services
4. **Report**: Provide concise project overview

Key behaviors:
- On-demand context loading (avoid loading everything)
- Serena MCP integration for project activation
- Component-aware context identification

## MCP Integration

- **Serena MCP**: Project activation and memory access
  - `activate_project`: Initialize project context
  - `list_memories`: View available project knowledge
  - `read_memory`: Load specific context (project_overview, api_reference)
  - `list_dir`: Understand project structure

## Tool Coordination

- **Bash**: Git status, branch info, service checks
- **Read**: Core documentation (CLAUDE.md already loaded)
- **Serena**: Project activation and memory loading

## Process

### 1. Analyze Project Structure

List all tracked files:

```bash
git ls-files | head -100
```

Show directory structure:

```bash
find . -type d -name "__pycache__" -prune -o -type d -name ".venv" -prune -o -type d -name "node_modules" -prune -o -type d -name ".git" -prune -o -type d -print | head -50
```

### 2. Read Core Documentation

Read in order of importance:

1. **CLAUDE.md** - Already in context (do NOT re-read)
2. **Serena memories** - Load relevant ones based on task:
   - `project_overview` - Architecture and component relationships
   - `api_reference` - API endpoints and patterns
   - `code_style_conventions` - Coding standards

3. **Key documentation** (read selectively):
   - `docs/llms.txt` (sections only, not full file)
   - `README.md` at project root

### 3. Identify Key Files

Based on the task, identify and read:

**Core Infrastructure:**

- `registry/main.py` - Application entry point
- `registry/config/settings.py` - Configuration management
- `registry/core/container.py` - Dependency injection

**API Layer:**

- `registry/api/` - Route definitions
- `registry/api/dependencies.py` - FastAPI dependencies

**Service Layer:**

- `registry/services/` - Business logic
- `registry/services/server_service.py` - MCP server management

**Data Layer:**

- `registry/repositories/` - Data access patterns
- `registry/schemas/` - Pydantic models

### 4. Understand Current State

Check recent activity:

```bash
git log -10 --oneline
```

Check current branch and status:

```bash
git status && git branch --show-current
```

Check running services:

```bash
docker ps --format "{{.Names}}: {{.Status}}" | grep -E "(mcp|mongo|keycloak)" || echo "No MCP services running"
```

## Output Format

```markdown
## Project Context: MCP Registry Gateway

### Project Overview
- Purpose: MCP Registry Gateway for AI coding assistants
- Primary technologies: FastAPI, MongoDB, Python 3.11+
- Current version/state from git

### Architecture
- Layer architecture: API -> Service -> Repository
- Key patterns: Dependency injection, Repository pattern
- Important directories and purposes

### Tech Stack
- Python 3.11+ with uv package manager
- FastAPI for REST API
- MongoDB/DocumentDB for storage
- pytest with pytest-xdist for testing
- ruff for linting, mypy for type checking

### Current State
- Active branch
- Recent changes or development focus
- Running services status
- Any immediate observations
```

## Quick Reference Commands

```bash
# Run tests
uv run pytest tests/ -n 8

# Lint and format
uv run ruff check --fix . && uv run ruff format .

# Type check
uv run mypy registry/

# Start services
docker compose up -d

# Check API health
curl http://localhost:8000/health
```

## Boundaries

**Will:**
- Build comprehensive understanding of codebase structure
- Load context selectively based on identified task
- Provide actionable summary of project state
- Use Serena MCP for efficient context acquisition

**Will Not:**
- Re-read CLAUDE.md (already in context)
- Load all memories upfront (on-demand only)
- Read entire files when Serena symbolic tools suffice
- Make code changes during priming phase
