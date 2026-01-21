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

## Estimated Token Savings

Well-structured sessions use ~50% fewer tokens than naive context loading:

| Metric | Naive | Optimized | Savings |
|--------|-------|-----------|---------|
| Per conversation | ~8,000 tokens | ~3,500 tokens | 56% |
| API work session | ~6,000 tokens | ~2,800 tokens | 53% |
| Quick fix | ~5,000 tokens | ~2,200 tokens | 56% |
