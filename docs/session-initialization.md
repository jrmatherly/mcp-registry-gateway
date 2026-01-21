# Session Initialization Guide

This guide helps you choose the right initialization command for your Claude Code session with the MCP Registry Gateway project.

## Quick Reference

| Scenario | Command | Why |
|----------|---------|-----|
| Quick bug fix | `/project-mode` | Minimal context, fast startup |
| Small code change | `/project-mode` | Light-weight, efficient |
| Daily development (familiar area) | `/project-mode` | Auto-rules handle context |
| Complex feature development | `/expert-mode` | Component awareness needed |
| Multi-component refactor | `/expert-mode` | Deep context, service health |
| First time on project | `/prime` | Full orientation needed |
| Returning after extended break | `/prime` | Refresh understanding |
| Before major architectural change | `/prime` | Complete codebase picture |
| Code review | `/project-mode` | Focused, rule auto-activation |
| Writing tests | `/project-mode` | Test rules auto-activate |
| API endpoint work | `/expert-mode` | API keywords trigger context |
| Authentication/security work | `/expert-mode` | Auth keyword hints helpful |
| Onboarding session | `/prime` | Comprehensive orientation |

## Decision Flowchart

```
                     START
                       |
                       v
            +-------------------+
            | First time on     |
            | this project?     |
            +-------------------+
                  |         |
                 Yes        No
                  |         |
                  v         v
              /prime   +-------------------+
                       | Returning after   |
                       | >2 weeks away?    |
                       +-------------------+
                             |         |
                            Yes        No
                             |         |
                             v         v
                         /prime   +-------------------+
                                  | Task involves     |
                                  | multiple          |
                                  | components?       |
                                  +-------------------+
                                        |         |
                                       Yes        No
                                        |         |
                                        v         v
                                  /expert-mode  /project-mode
```

## Command Comparison

| Aspect | `/project-mode` | `/expert-mode` | `/prime` |
|--------|-----------------|----------------|----------|
| **Purpose** | Light-weight daily use | Complex, component-aware | Full project orientation |
| **Token Budget** | ~4,000 | ~4,500 | ~5,000+ |
| **Context Loading** | Minimal, task-driven | Moderate, component hints | Comprehensive |
| **Output** | Ready confirmation | Ready + component focus | Structured report |
| **Best For** | Familiar codebase | Multi-component tasks | Onboarding/orientation |
| **Startup Time** | Fastest | Medium | Slower |
| **Location** | `.claude/commands/` | `.claude/commands/` | `.claude/commands/piv-loop/` |

## Command Descriptions

### /project-mode

**Philosophy:** Minimal upfront loading, maximum efficiency.

Activates Serena project, checks git/docker status, and waits for your task. Context is loaded on-demand based on what you ask for. Rules auto-activate based on file patterns (e.g., opening a test file activates `python-tests.md` rule).

**Use when:**

- You know the codebase well
- Working on a focused, single-component task
- Quick fixes or small changes
- You want the fastest startup

**Command location:** `.claude/commands/project-mode.md`

### /expert-mode

**Philosophy:** Component-aware assistance with intelligent context loading.

Builds on `/project-mode` by adding component keyword detection. When you mention "API", "auth", "test", etc., it knows which Serena memories and documentation sections to load. Also monitors service health (MongoDB, Keycloak).

**Use when:**

- Working on complex, multi-file features
- Need awareness of component relationships
- Task spans API, auth, database, or other major components
- Want service health visibility

**Component Keywords:**

| Keywords | Context Loaded |
|----------|----------------|
| api, endpoint, route, fastapi | `api_reference` memory |
| auth, oauth, keycloak, jwt | Auth documentation |
| test, pytest, coverage | Test patterns |
| database, mongo, opensearch | Storage documentation |
| agent, a2a, mcp server | Agent documentation |

**Command location:** `.claude/commands/expert-mode.md`

### /prime

**Philosophy:** Full project understanding before major work.

Performs comprehensive codebase analysis including directory structure, git history, and service status. Outputs a structured markdown report with Project Overview, Architecture, Tech Stack, and Current State sections.

**Use when:**

- First time working on the project
- Returning after vacation or extended break
- Before major architectural changes
- Onboarding yourself or others
- Need to understand the "big picture"

**Output Format:**

```markdown
## Project Context: MCP Registry Gateway

### Project Overview
- Purpose and primary technologies
- Current version/state from git

### Architecture
- Layer architecture: API -> Service -> Repository
- Key patterns and directories

### Tech Stack
- Python 3.11+, FastAPI, MongoDB, etc.

### Current State
- Active branch and recent changes
- Running services status
```

**Command location:** `.claude/commands/piv-loop/prime.md`

## Token Efficiency

Each command has a different token footprint:

| Session Type | /project-mode | /expert-mode | /prime |
|--------------|---------------|--------------|--------|
| Base startup | ~2,200 | ~2,500 | ~3,500 |
| + 1 memory | ~2,700 | ~3,200 | ~4,000 |
| + multiple memories | ~3,500 | ~4,000 | ~5,000 |
| Maximum typical | ~4,000 | ~4,500 | ~5,500 |

**Recommendation:** Stay under 5,000 tokens for typical sessions to leave room for task context.

## Serena Memories

All initialization commands can load these memories on-demand:

| Memory | Purpose | Load When |
|--------|---------|-----------|
| `api_reference` | API endpoints and routes | API development |
| `project_overview` | Architecture and components | Architecture decisions |
| `project_index` | File structure reference | Finding files |
| `code_style_conventions` | Coding standards | Style questions |
| `development_workflow` | CI/CD and validation | Pipeline work |
| `task_completion_checklist` | Pre-completion checks | Before finishing |
| `suggested_commands` | Common operations | Command reference |

## Auto-Activating Rules

These rules automatically activate based on file patterns:

| Files Opened | Rule |
|--------------|------|
| `**/test_*.py`, `**/*_test.py` | `python-tests.md` |
| `**/api/**/*.py` | `api-endpoints.md` |
| `**/schemas/**/*.py` | `pydantic-models.md` |
| `**/*.tf` | `terraform.md` |
| `**/Dockerfile*` | `docker.md` |

This means `/project-mode` often provides sufficient context through auto-activation.

## Common Patterns

### Starting a New Day

```bash
# Familiar task, know what you're doing
/project-mode

# Complex task, need component awareness
/expert-mode
```

### Onboarding

```bash
# First session
/prime

# Subsequent sessions same week
/expert-mode

# After you're comfortable
/project-mode
```

### Major Feature Work

```bash
# Day 1: Understand the landscape
/prime

# Day 2+: Focused implementation
/expert-mode
```

### Quick Fixes

```bash
# Bug fix in known area
/project-mode
# (let test rules auto-activate when writing tests)
```

## Anti-Patterns

**Avoid:**

- Using `/prime` for every session (too much context, slow)
- Using `/project-mode` for unfamiliar areas (insufficient context)
- Re-reading CLAUDE.md (already injected by Claude Code)
- Loading all Serena memories upfront (defeats on-demand philosophy)

**Prefer:**

- Starting with `/project-mode`, escalating to `/expert-mode` if needed
- Using `/prime` sparingly for true orientation needs
- Letting auto-rules handle common patterns
- Loading memories based on actual task requirements

## Troubleshooting

### "I don't have enough context"

Try `/expert-mode` instead of `/project-mode`, or explicitly request memory loading:

```
Load the api_reference memory for more context
```

### "Session feels slow/bloated"

You may have too much context. For simple tasks, `/project-mode` is sufficient.

### "Which command for X?"

Refer to the Quick Reference table at the top, or use the Decision Flowchart.

### "Services show unhealthy"

The initialization commands check docker status. If MongoDB or Keycloak shows unhealthy:

```bash
docker compose up -d
docker compose logs -f [service]
```

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Coding standards (auto-loaded)
- [docs/llms.txt](llms.txt) - Comprehensive LLM-friendly documentation
- [docs/quickstart.md](quickstart.md) - Project setup guide
