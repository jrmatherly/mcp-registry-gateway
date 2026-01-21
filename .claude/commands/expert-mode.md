---
name: expert-mode
description: Initialize expert mode with optimized context loading and component-aware assistance
category: initialization
complexity: standard
mcp-servers: [serena]
personas: [arch-analyzer]
---

# /expert-mode - Expert Session Initialization

## Triggers

- Starting intensive development session
- Working on complex, multi-component features
- Performance-critical sessions requiring minimal context overhead
- Sessions requiring deep architectural understanding

## Usage

```
/expert-mode
```

## Behavioral Flow

1. **Activate**: Initialize Serena project context
2. **Assess**: Check git state and running services
3. **Identify**: Determine component focus from user task
4. **Ready**: Confirm readiness with on-demand context strategy

Key behaviors:
- Intelligent, on-demand context loading
- Component-aware assistance
- Token-efficient session management

**Context Architecture:**

- `CLAUDE.md` - Comprehensive coding standards, patterns, testing requirements (~1,150 lines)
- `CLAUDE.slim.md` - Token-optimized version (~180 lines) for context-constrained sessions
- `AGENTS.md` - Universal agent guidelines, quick commands, code patterns

Both CLAUDE.md and AGENTS.md are automatically injected by Claude Code. Use Serena memories for deep context.

## MCP Integration

- **Serena MCP**: Project activation and memory management
  - `activate_project`: Initialize project context
  - `list_memories`: View available project knowledge
  - `read_memory`: Load specific context on-demand
  - `check_onboarding_performed`: Verify project setup

## Tool Coordination

- **Bash**: Git status, docker status, service checks
- **Serena Tools**: Project activation, memory loading
- **Read**: Documentation loading (selective)
- **TodoWrite**: Session task tracking

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

## Specialized Agents

| Agent | Use Case |
|-------|----------|
| `code-reviewer` | Code review, best practices check |
| `test-runner` | Execute and validate tests |
| `security-auditor` | Security scanning, vulnerability check |
| `arch-analyzer` | Architecture analysis, design review |
| `devops-architect` | Infrastructure, CI/CD, deployment |
| `quality-engineer` | Test strategy, edge case identification |
| `performance-engineer` | Optimization, profiling, caching |
| `technical-writer` | Documentation, guides, API docs |

## Token Efficiency

| Session Type | Expected Tokens |
|--------------|-----------------|
| Quick fix | ~2,500 (CLAUDE.md + 1 rule) |
| API work | ~3,200 (+ api_reference) |
| Full review | ~4,000 (+ multiple memories) |
| Architecture | ~3,500 (+ project_overview) |

**Target**: Stay under 4,500 tokens for typical sessions.

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

## Boundaries

**Will:**
- Initialize session with intelligent context loading
- Identify component focus from user task
- Provide token-efficient assistance
- Use Serena MCP for project context

**Will Not:**
- Load all context upfront
- Re-read already-injected documentation
- Ignore component-specific context needs
- Proceed without understanding user's focus area
