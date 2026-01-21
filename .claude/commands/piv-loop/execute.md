---
description: Execute an implementation plan systematically
argument-hint: <path-to-plan>
---

# Execute: Implement from Plan

## Plan to Execute

Read plan file: `$ARGUMENTS`

If no argument provided, list available plans:

```bash
ls -la .claude/output/plans/
```

## Execution Instructions

### 1. Read and Understand

- Read the ENTIRE plan carefully
- Understand all tasks and their dependencies
- Note the validation commands to run
- Review the testing strategy
- Identify the patterns to follow

### 2. Pre-Flight Checks

Before starting implementation:

```bash
# Ensure clean working state
git status

# Ensure tests pass before changes
uv run pytest tests/ -n 8

# Check services if needed
docker ps | grep -E "(mongo|mcp)"
```

### 3. Execute Tasks in Order

For EACH task in "Step by Step Tasks":

#### a. Navigate to the task

- Identify the file and action required
- Read existing related files if modifying
- Understand the pattern to follow

#### b. Implement the task

- Follow the detailed specifications exactly
- Use Serena symbolic tools for precise edits
- Maintain consistency with existing code patterns
- Include proper type hints and documentation
- Add logging where appropriate

#### c. Verify as you go

After each file change:

```bash
# Check syntax
uv run python -m py_compile <filename>

# Check imports
uv run ruff check <filename>
```

### 4. Implement Testing Strategy

After completing implementation tasks:

- Create all test files specified in the plan
- Implement all test cases mentioned
- Follow the AAA pattern (Arrange, Act, Assert)
- Ensure tests cover edge cases

### 5. Run Validation Commands

Execute ALL validation commands from the plan in order:

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

**If any command fails:**

1. Fix the issue
2. Re-run the command
3. Continue only when it passes

### 6. Final Verification

Before completing:

- [ ] All tasks from plan completed
- [ ] All tests created and passing
- [ ] All validation commands pass
- [ ] Code follows project conventions
- [ ] No new linting warnings
- [ ] Documentation updated as needed

## Output Report

After execution, provide summary:

### Completed Tasks

List all tasks completed with status:

- [x] Task 1: Created `registry/schemas/resource.py`
- [x] Task 2: Created `registry/services/resource_service.py`
- ...

### Files Changed

**Created:**

- `registry/schemas/resource.py`
- `registry/services/resource_service.py`
- `tests/unit/test_resource_service.py`

**Modified:**

- `registry/api/__init__.py` (added router)
- `registry/api/dependencies.py` (added dependency)

### Tests Added

- `tests/unit/test_resource_service.py`
  - `test_create_resource`
  - `test_get_resource`
  - `test_get_resource_not_found`

### Validation Results

```bash
# Ruff check
All checks passed!

# MyPy
Success: no issues found in X source files

# Pytest
=== X passed, Y skipped in Zs ===
```

### Divergences from Plan

If any divergences occurred, document:

**Divergence: {title}**

- **Planned**: What the plan specified
- **Actual**: What was implemented
- **Reason**: Why this change was necessary

### Ready for Commit

- [ ] All changes complete
- [ ] All validations pass
- [ ] Ready for `/commit` command

**Suggested commit message:**

```text
feat(resource): add resource management endpoints

- Add Pydantic schemas for resource create/update/response
- Implement ResourceService with CRUD operations
- Add API endpoints for resource management
- Add unit and integration tests
```

## Notes

- If you encounter issues not addressed in the plan, document them
- If you need to deviate from the plan, explain why in the report
- If tests fail, fix implementation until they pass
- Don't skip validation steps
- Generate execution report for system review
