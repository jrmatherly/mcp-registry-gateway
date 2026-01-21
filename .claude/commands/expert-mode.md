---
description: Initialize expert mode for MCP Registry Gateway with optimized context loading and component-aware assistance
---

# Expert Mode - MCP Registry Gateway

Quick initialization with intelligent, on-demand context loading for the MCP Registry Gateway project.

**Context Architecture:**

- `CLAUDE.md` - Comprehensive coding standards, patterns, testing requirements (~1,150 lines)
- `CLAUDE.slim.md` - Token-optimized version (~180 lines) for context-constrained sessions
- `AGENTS.md` - Universal agent guidelines, quick commands, code patterns

Both CLAUDE.md and AGENTS.md are automatically injected by Claude Code. Use Serena memories for deep context.

## Initialization Steps

### 1. Activate Serena Project

```text
mcp__plugin_serena_serena__activate_project with project: "mcp-registry-gateway"
```

### 2. Check Current State

```bash
git status --short && git branch --show-current
docker ps --format "{{.Names}}: {{.Status}}" 2>/dev/null | grep -E "(mcp|mongo|keycloak)" || echo "No containers running"
```

**Identify:**

- Uncommitted changes
- Current branch and recent work
- Running services (MongoDB, Keycloak, Registry)

### 3. Identify Component Focus

Based on user's task, determine which component(s) to focus on.

**Component Keyword Hints:**

| Keywords | Component | On-Demand Context |
|----------|-----------|-------------------|
| api, endpoint, route, fastapi, server | Registry API | `api_reference` memory |
| auth, oauth, keycloak, entra, jwt, token | Authentication | `docs/auth.md`, `docs/keycloak-integration.md` |
| test, pytest, coverage, fixture | Testing | `testing-standards.md` instruction |
| docker, compose, container, service | Infrastructure | `docs/installation.md` |
| terraform, ecs, eks, aws, deploy | Deployment | `terraform/README.md` |
| frontend, ui, react, dashboard | Frontend | `frontend/README.md` |
| agent, a2a, mcp server, tools | Agents | `docs/a2a.md`, `agents/` directory |
| database, mongo, opensearch, index | Storage | `docs/database-design.md` |
| scope, permission, rbac, group | Authorization | `docs/scopes.md` |
| metrics, observability, logs | Monitoring | `docs/OBSERVABILITY.md` |
| setup, install, macos, quickstart | Setup | `docs/macos-setup-guide.md` |

**If unclear:** Ask "Which component are you working on?"

### 4. Ready State

Confirm readiness:

- Serena project activated
- Git state understood
- Component focus identified
- Ready to load component-specific context on-demand

**What would you like to work on?**

---

## On-Demand Context Loading

**Core Principle:** Load context only when the task requires it.

### Serena Memories (Load When Needed)

| Memory | When to Load |
|--------|--------------|
| `api_reference` | API development, endpoint work, route changes |
| `project_overview` | Architecture decisions, component relationships |
| `project_index` | Finding files, understanding structure |
| `code_style_conventions` | Code review, style questions |
| `development_workflow` | CI/CD, pre-commit, validation steps |
| `task_completion_checklist` | Before completing any task |
| `suggested_commands` | Command reference, common operations |

### Auto-Activated Rules

These rules auto-activate based on file patterns:

| Files Opened | Rule Activated |
|--------------|----------------|
| `**/test_*.py`, `**/*_test.py` | `python-tests.md` |
| `**/api/**/*.py` | `api-endpoints.md` |
| `**/schemas/**/*.py` | `pydantic-models.md` |
| `**/*.tf` | `terraform.md` |
| `**/Dockerfile*` | `docker.md` |

### Task-Specific Documentation

| Task Type | Load |
|-----------|------|
| API Development | `api_reference` memory + `api-endpoints.md` rule |
| Authentication | `docs/auth.md` or `docs/keycloak-integration.md` |
| Testing | `testing-standards.md` instruction |
| Security Audit | `security-guidelines.md` instruction |
| Architecture | `project_overview` memory |
| New Feature | `docs/configuration.md` for config patterns |
| Bug Fix | Component-specific docs based on area |

### Deep Context: docs/llms.txt

`docs/llms.txt` (~2,500 lines) contains comprehensive project documentation for LLMs. **Load selectively by section, not the entire file:**

| Section | Lines (approx) | When to Load |
|---------|----------------|--------------|
| Overview & Repository Structure | 1-150 | Understanding project layout |
| API Routes & Endpoints | 200-400 | API development, route work |
| Authentication & Authorization | 500-800 | Auth implementation |
| Database & Storage | 900-1200 | Repository/storage work |
| Deployment & Infrastructure | 1500-1800 | Terraform, Docker, deployment |
| Testing Patterns | 2000-2200 | Writing complex tests |

**Usage:** `Read docs/llms.txt with offset=X limit=Y` for specific sections.

---

## Common Operations

### Development

```bash
# Start all services
docker compose up -d

# Run tests (parallel)
uv run pytest tests/ -n 8

# Full validation
uv run ruff check --fix . && uv run ruff format . && uv run pytest tests/ -n 8

# Check test coverage
uv run pytest tests/ -n 8 --cov=registry --cov-report=term-missing
```

### Authentication Setup

```bash
# Generate tokens for agents (Keycloak must be running)
./credentials-provider/keycloak/generate_tokens.py --all-agents

# Test API with token
source .oauth-tokens/agent-test.env
curl -H "Authorization: Bearer $ACCESS_TOKEN" http://localhost:8000/api/servers
```

### Docker Operations

```bash
# View logs
docker compose logs -f registry

# Rebuild and restart
docker compose up -d --build registry

# Check service health
curl http://localhost:8000/health
```

### Database Operations

```bash
# Connect to MongoDB
docker exec -it mcp-mongodb mongosh

# Initialize indexes (if needed)
uv run python scripts/init-mongodb-ce.py
```

---

## Specialized Agents

| Agent | Use Case |
|-------|----------|
| `code-reviewer` | Code review, best practices check |
| `test-runner` | Execute and validate tests |
| `security-auditor` | Security scanning, vulnerability check |
| `arch-analyzer` | Architecture analysis, design review |

---

## Skills

| Skill | Use Case |
|-------|----------|
| `validate-project` | Pre-commit validation checklist |
| `code-review` | Comprehensive code review |
| `new-endpoint` | Create new API endpoint |
| `add-test` | Add test for component |
| `docker-services` | Docker service configuration |

---

## Usage Patterns

### Quick Fix (Minimal Context)

1. Activate Serena
2. Check git status
3. Load only affected component's context
4. Make fix, run relevant tests

### Feature Development (Full Context)

1. Activate Serena
2. Check git status
3. Load `project_overview` memory
4. Load component-specific docs
5. Use `new-endpoint` or similar skill
6. Run `validate-project` skill before commit

### Code Review

1. Activate Serena
2. Load `code_style_conventions` memory
3. Run `code-reviewer` agent
4. Load `task_completion_checklist` before approval

---

## Anti-Patterns to Avoid

### Don't

- Re-read CLAUDE.md (already in context)
- Load all memories at session start
- Read entire files when Serena symbolic tools work
- Use `cat` when `Read` tool or `find_symbol` is better

### Do

- Use Serena tools (`find_symbol`, `get_symbols_overview`, `search_for_pattern`)
- Let rules auto-activate based on file patterns
- Load memories selectively based on task
- Use `CLAUDE.slim.md` for context-constrained sessions

---

## Token Efficiency

| Session Type | Expected Tokens |
|--------------|-----------------|
| Quick fix | ~2,500 (CLAUDE.md + 1 rule) |
| API work | ~3,200 (+ api_reference) |
| Full review | ~4,000 (+ multiple memories) |
| Architecture | ~3,500 (+ project_overview) |

**Target**: Stay under 4,500 tokens for typical sessions.

---

## When Stuck

| Issue | Solution |
|-------|----------|
| Which component? | Ask user directly |
| What context to load? | Start minimal, load more as needed |
| Pre-commit steps? | Load `task_completion_checklist` memory |
| Command reference? | Load `suggested_commands` memory |
| Setup issues? | Reference `docs/macos-setup-guide.md` |

---

**Then wait for the user's specific task.**
