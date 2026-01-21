# Project Mode Command

Initialize a Claude Code session with intelligent context loading for the MCP Registry Gateway project.

## Activation Steps

1. **Activate Serena Project**
   ```
   mcp__plugin_serena_serena__activate_project with project: "mcp-registry-gateway"
   ```

2. **Check Project Status**
   ```bash
   git status --short
   docker ps --format "{{.Names}}: {{.Status}}" | grep mcp
   ```

3. **Identify Work Context** based on user's task

## Context Loading Rules

### Auto-Loaded (Always Available)
- CLAUDE.md (~2,000 tokens) - **Do NOT re-read**
- Path-specific rules - Auto-activate based on open files

### On-Demand Loading

Load specific memories when user mentions:

| Keywords | Action |
|----------|--------|
| "API", "endpoint", "route", "FastAPI" | Load `api_reference` memory |
| "test", "pytest", "coverage" | Let `python-tests.md` rule auto-activate |
| "architecture", "structure", "design" | Load `project_overview` memory |
| "command", "run", "execute" | Load `suggested_commands` memory |
| "style", "convention", "format" | Load `code_style_conventions` memory |
| "commit", "PR", "review", "checklist" | Load `task_completion_checklist` memory |
| "index", "search", "embeddings" | Load `project_index` memory |
| "workflow", "CI", "pipeline" | Load `development_workflow` memory |

## Task-Specific Context

### API Development
```
Load: api_reference memory
Auto: api-endpoints.md rule (when opening api/ files)
Agent: code-reviewer for review
```

### Test Writing
```
Auto: python-tests.md rule (when opening test files)
Agent: test-runner for execution
Skill: validate-project before commit
```

### Security Work
```
Load: (none initially)
Agent: security-auditor for scanning
Instruction: security-guidelines.md if needed
```

### Architecture Analysis
```
Load: project_overview memory
Agent: arch-analyzer for deep analysis
```

### Bug Fixing
```
Style: debugging output style
Load: Based on affected component
Agent: code-reviewer after fix
```

## Deep Context: docs/llms.txt

When Serena memories don't provide enough context, `docs/llms.txt` (~2,500 lines) has comprehensive project documentation. **Load selectively by section:**

```bash
# Repository structure overview
Read docs/llms.txt offset=40 limit=100

# API routes and endpoints
Read docs/llms.txt offset=200 limit=150

# Authentication architecture
Read docs/llms.txt offset=500 limit=150
```

**Warning:** Do not load the entire file - it will consume significant context.

## Anti-Patterns to Avoid

### Don't
- Re-read CLAUDE.md (already in context)
- Load all memories at session start
- Read entire files when symbolic tools work
- Duplicate information from auto-loaded context

### Do
- Use Serena tools (`find_symbol`, `get_symbols_overview`)
- Let rules auto-activate based on file patterns
- Load memories selectively based on task
- Reference already-loaded context

## Quick Commands

```bash
# Check status
git status && docker ps | grep mcp

# Run tests
uv run pytest tests/ -n 8

# Full validation
uv run ruff check --fix . && uv run ruff format . && uv run pytest tests/ -n 8

# Start services
docker compose up -d

# View logs
docker compose logs -f registry
```

## Session Initialization Checklist

1. [ ] Serena project activated
2. [ ] MongoDB running (if needed)
3. [ ] Understand user's task
4. [ ] Load appropriate context (selective)
5. [ ] Ready to work

## Token Efficiency

| Session Type | Expected Tokens |
|--------------|-----------------|
| Quick fix | ~2,200 (CLAUDE.md + rule) |
| API work | ~2,700 (+ api_reference) |
| Full review | ~3,500 (+ multiple memories) |
| Architecture | ~3,000 (+ project_overview) |

**Target**: Stay under 4,000 tokens for typical sessions.
