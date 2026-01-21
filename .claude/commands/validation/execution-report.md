---
description: Generate execution report after implementing a plan
argument-hint: <plan-file> <feature-name>
---

# Execution Report Generator

Generate a comprehensive execution report documenting what was implemented, how it differed from the plan, and validation results.

## Purpose

**The execution report serves two purposes:**

1. **Immediate**: Document implementation for PR review and team communication
2. **Future**: Provide data for system-review to identify process improvements

## Inputs

**Plan File:** `$1` (first argument - the plan that was executed)

**Feature Name:** `$2` (second argument - kebab-case feature name for report filename)

## Report Generation Process

### Step 1: Review What Was Planned

Read the plan file and extract:

- All tasks that were specified
- Expected files to create/modify
- Testing strategy defined
- Validation commands listed
- Acceptance criteria

### Step 2: Document What Was Implemented

For each task in the plan:

- Was it completed? (Yes/No/Partial)
- What files were actually created/modified?
- Any changes from the specified approach?

### Step 3: Capture Divergences

Document any differences between plan and implementation:

**For each divergence:**

- What was planned
- What was actually done
- Why the change was made
- Impact of the change

### Step 4: Record Validation Results

Capture output from all validation commands:

```bash
# Level 1: Syntax & Style
uv run ruff check --fix . && uv run ruff format .

# Level 2: Type Checking
uv run mypy registry/

# Level 3: Unit Tests
uv run pytest tests/unit/ -v

# Level 4: Integration Tests
uv run pytest tests/integration/ -v

# Level 5: Full Suite
uv run pytest tests/ -n 8
```

### Step 5: Assess Completion

Review against acceptance criteria from plan.

## Output Format

Save to: `.claude/output/execution-reports/{feature-name}-report.md`

### Report Template

```markdown
# Execution Report: {Feature Name}

## Meta Information

- **Plan executed**: {path to plan}
- **Date**: {current date}
- **Executor**: Claude

## Summary

**Feature**: {Brief description}

**Outcome**: [Complete / Partial / Blocked]

**Key Changes**: {1-2 sentence summary of what was implemented}

---

## Tasks Completed

### From Plan

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | CREATE `registry/schemas/resource.py` | Done | As specified |
| 2 | CREATE `registry/services/resource_service.py` | Done | Added extra validation |
| 3 | UPDATE `registry/api/__init__.py` | Done | As specified |
| 4 | CREATE unit tests | Partial | 3 of 5 test cases |

### Additional Work (Not in Plan)

- {Any extra tasks completed that weren't in the original plan}

---

## Files Changed

### Created

| File | Purpose | Lines |
|------|---------|-------|
| `registry/schemas/resource.py` | Pydantic models | 45 |
| `registry/services/resource_service.py` | Service layer | 120 |
| `tests/unit/test_resource_service.py` | Unit tests | 85 |

### Modified

| File | Changes | Lines Changed |
|------|---------|---------------|
| `registry/api/__init__.py` | Added router import | +2 |
| `registry/api/dependencies.py` | Added dependency | +15 |

### Deleted

| File | Reason |
|------|--------|
| {None or list files} | {Reason} |

---

## Divergences from Plan

### Divergence 1: {Title}

- **Planned**: {What the plan specified}
- **Actual**: {What was implemented instead}
- **Reason**: {Why this change was necessary}
- **Impact**: {Effect on the feature/codebase}

### Divergence 2: {Title}

- **Planned**: ...
- **Actual**: ...
- **Reason**: ...
- **Impact**: ...

---

## Validation Results

### Level 1: Syntax & Style (Ruff)

```bash
$ uv run ruff check --fix . && uv run ruff format .
{Actual output}
```

**Result**: [Pass / Fail]

### Level 2: Type Checking (MyPy)

```bash
$ uv run mypy registry/
{Actual output}
```

**Result**: [Pass / Fail]

### Level 3: Unit Tests

```bash
$ uv run pytest tests/unit/test_resource*.py -v
{Actual output - summary}
```

**Result**: [X passed, Y failed, Z skipped]

### Level 4: Integration Tests

```bash
$ uv run pytest tests/integration/test_resource*.py -v
{Actual output - summary}
```

**Result**: [X passed, Y failed, Z skipped]

### Level 5: Full Test Suite

```bash
$ uv run pytest tests/ -n 8
{Actual output - summary}
```

**Result**: [X passed, Y failed, Z skipped]

---

## Acceptance Criteria

From plan:

- [x] Feature implements all specified functionality
- [x] All validation commands pass with zero errors
- [ ] Unit tests cover happy path and error cases
- [x] Integration tests verify end-to-end workflow
- [x] Code follows CLAUDE.md conventions
- [x] No regressions in existing functionality

**Overall**: X of Y criteria met

---

## Challenges Encountered

### Challenge 1: {Title}

- **Issue**: {What went wrong or was difficult}
- **Resolution**: {How it was resolved}
- **Time Impact**: {Minimal / Moderate / Significant}

---

## Recommendations

### For This Feature

- {Any follow-up work needed}
- {Technical debt introduced}
- {Documentation updates needed}

### For Future Implementations

- {Lessons learned}
- {Process improvements suggested}

---

## Ready for Review

- [x] All planned tasks completed (or documented why not)
- [x] All validation commands pass
- [x] Divergences documented with justification
- [x] No known issues remaining

**Suggested commit message:**

```text
feat(resource): add resource management endpoints

- Add Pydantic schemas for resource create/update/response
- Implement ResourceService with CRUD operations
- Add API endpoints for resource management
- Add unit and integration tests

Implements: {link to issue or requirement}
```

---

## Appendix

### Test Coverage Details

{If relevant, include coverage report}

### Performance Notes

{If relevant, include any performance observations}
```

## After Generating Report

1. Confirm report saved to `.claude/output/execution-reports/`
2. Summarize key outcomes:
   - Tasks completed: X of Y
   - Divergences: Z (justified/unjustified)
   - Tests: passing/failing
3. Recommend next steps:
   - If complete: Ready for commit and PR
   - If incomplete: What remains to be done
4. Suggest `/system-review` if there were significant divergences

## Notes

- Be thorough in documenting divergences - they're learning opportunities
- Include actual command output, not just "passed"
- If tests failed, document why and what was done
- This report feeds into system-review for process improvement
