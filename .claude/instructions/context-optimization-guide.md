# Context Optimization Guide

This guide explains how to minimize token usage while maintaining comprehensive guidance accessibility.

## Auto-Loaded Context

Two files are **automatically injected** into every conversation:

| File | Purpose | Action |
|------|---------|--------|
| CLAUDE.md | Project instructions, coding standards | **Do NOT re-read** - already in context |
| Relevant rules | Path-specific patterns | Auto-loaded when opening matching files |

**Critical**: Never reload CLAUDE.md - it's already in your context at ~2,000 tokens.

## On-Demand Memory Loading

Load Serena memories **only when the task requires them**:

| Task Type | Load Context |
|-----------|--------------|
| API development | `api_reference` memory |
| Understanding architecture | `project_overview` memory |
| Running commands | `suggested_commands` memory |
| Code style questions | `code_style_conventions` memory |
| Before committing | `task_completion_checklist` memory |

**Anti-Pattern**: Loading all 7 memories upfront wastes ~3,500 tokens.

## Rule Auto-Activation

Rules auto-load when you open files matching their glob patterns:

| Rule | Pattern | Triggers When |
|------|---------|---------------|
| `python-tests.md` | `**/*_test.py` | Opening test files |
| `api-endpoints.md` | `**/api/**/*.py` | Working on API routes |
| `pydantic-models.md` | `**/schemas/**/*.py` | Editing Pydantic models |
| `terraform.md` | `**/*.tf` | Infrastructure changes |
| `docker.md` | `**/Dockerfile*` | Container work |

**Benefit**: ~50-100 tokens loaded contextually, not preemptively.

## Progressive Skill Loading

Skills load in stages:

1. **SKILL.md** (~150 tokens): Basic instructions
2. **references/** (~300 tokens): Detailed guides (on-demand)
3. **scripts/** (~200 tokens): Executable resources (on-demand)

**Example**: validate-project skill
- Simple validation: Load SKILL.md only (150 tokens)
- Need CI details: Add references/ci-pipeline.md (300 more)
- Total: 450 tokens only if needed

## Token Usage Examples

| Scenario | Naive Approach | Optimized Approach |
|----------|----------------|-------------------|
| Quick bug fix | Load all context (~8,000 tokens) | Use only CLAUDE.md (~2,000 tokens) |
| API development | Load all memories | Load `api_reference` only (~500 tokens) |
| Test writing | Read entire test guide | Auto-rule loads ~100 tokens |
| Pre-commit check | Manual checklist review | Skill loads ~150 tokens |

## Best Practices

### Do
- Use Serena symbolic tools (`find_symbol`, `get_symbols_overview`) instead of reading entire files
- Let rules auto-activate based on file patterns
- Load memories selectively based on task
- Reference already-loaded information from CLAUDE.md

### Don't
- Re-read CLAUDE.md (already in context)
- Load all memories at session start
- Read entire files when symbolic tools suffice
- Duplicate information from auto-loaded context

## Memory Loading Triggers

Load specific memories when user mentions:

| Keywords | Memory to Load |
|----------|----------------|
| "API", "endpoint", "route" | `api_reference` |
| "test", "pytest", "coverage" | (use auto-rule instead) |
| "command", "run", "execute" | `suggested_commands` |
| "style", "convention", "format" | `code_style_conventions` |
| "commit", "PR", "review" | `task_completion_checklist` |
| "architecture", "structure" | `project_overview` |

## Context Window Monitoring

Watch for context usage indicators during your session:

| Usage Level | Indicator | Action |
|-------------|-----------|--------|
| 0-50% | Healthy | Plenty of room for additional context |
| 50-75% | Moderate | Be selective with additional loads |
| 75-100% | High | Avoid loading more context |

**Tip**: Monitor the impact of each context load. If approaching high usage, prioritize essential information only.

## Context Refresh Patterns

### When to Reload Context

- Task scope changes significantly (e.g., switching from API work to infrastructure)
- Switching between major components
- User provides new requirements that change direction
- Starting work on a completely different feature

### When NOT to Reload Context

- Making iterative changes on the same component
- Following up on the same task or issue
- Debugging code you just worked on
- Continuing a refactoring session
- Adding tests for code you just wrote

**Key insight**: Reloading context you already have wastes tokens and breaks continuity.

## Pre-Task Checklist

Before loading any context, ask these four questions:

1. **What do I need to know?** - Load only this specific information
2. **Where can I find it?** - Use the lightest source available
3. **Do I already have it?** - Don't reload what's already in context
4. **Can I defer it?** - Load when needed, not preemptively

## Pre-Completion Checklist

Before finishing work on any task:

1. Load `task_completion_checklist` memory
2. Verify understanding with user before deep dives
3. Check validation requirements for the specific task type
4. Run appropriate validation commands

## Efficiency Tips by Task Type

### Quick Fixes / Simple Tasks

| Load | Skip |
|------|------|
| CLAUDE.md (auto-loaded) | All memories |
| Relevant auto-rule | Architecture docs |

### API Development

| Load | Skip |
|------|------|
| `api_reference` memory | Full project overview |
| `api-endpoints.md` auto-rule | Testing standards (until needed) |

### Feature Development

| Load | Skip |
|------|------|
| Component-specific memory | All other memories |
| `task_completion_checklist` (before completing) | Architecture docs (unless designing) |

### Architecture / Design Work

| Load | Skip |
|------|------|
| `project_overview` memory | Command references |
| Relevant sections of `docs/llms.txt` | Testing details |

### Testing Work

| Load | Skip |
|------|------|
| `python-tests.md` auto-rule | API references |
| `add-test` skill if needed | Architecture docs |

### Pre-Commit / PR Review

| Load | Skip |
|------|------|
| `task_completion_checklist` memory | Everything else |
| `validate-project` skill | Deep documentation |

## Estimated Token Savings

Well-structured sessions use ~50% fewer tokens than naive context loading:

| Metric | Naive | Optimized | Savings |
|--------|-------|-----------|---------|
| Per conversation | ~8,000 tokens | ~3,500 tokens | 56% |
| API work session | ~6,000 tokens | ~2,800 tokens | 53% |
| Quick fix | ~5,000 tokens | ~2,200 tokens | 56% |

## Anti-Patterns to Avoid

| Anti-Pattern | Better Approach |
|--------------|-----------------|
| Loading all memories "just in case" | Load based on actual task requirements |
| Reading entire files when you need one function | Use Serena symbolic tools (`find_symbol`) |
| Reloading context you already have | Reference already-loaded information |
| Loading architecture docs for simple bug fixes | Load only component-specific context |
| Preemptively loading documentation | Load when you encounter unknowns |
| Re-reading CLAUDE.md | Already auto-injected - reference directly |
| Loading memories that duplicate CLAUDE.md | Use CLAUDE.md for basics, memories for deep-dives |
| Reading full `docs/llms.txt` | Load specific sections by line offset |

## Deep Context: docs/llms.txt

When Serena memories don't provide enough context, `docs/llms.txt` (~2,500 lines) has comprehensive project documentation. **Load selectively by section:**

| Section | Read Command | Use Case |
|---------|--------------|----------|
| Overview & Structure | `Read docs/llms.txt offset=1 limit=150` | Understanding project layout |
| API Routes | `Read docs/llms.txt offset=200 limit=150` | API development |
| Authentication | `Read docs/llms.txt offset=500 limit=150` | Auth implementation |
| Database & Storage | `Read docs/llms.txt offset=900 limit=150` | Repository work |
| Deployment | `Read docs/llms.txt offset=1500 limit=150` | Infrastructure changes |
| Testing Patterns | `Read docs/llms.txt offset=2000 limit=150` | Writing complex tests |

**Warning**: Never load the entire file - it will consume significant context (~5,000+ tokens).
