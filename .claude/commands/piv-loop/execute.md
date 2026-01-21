---
name: execute
description: Execute an implementation plan systematically
category: development
complexity: advanced
argument-hint: <path-to-plan>
mcp-servers: [serena]
personas: [arch-analyzer, code-reviewer, test-runner]
---

# /execute - Implement from Plan

## Triggers

- After completing feature planning with `/plan-feature`
- Resuming implementation from an existing plan
- Systematic multi-file implementation requiring coordination

## Usage

```
/execute <path-to-plan>
```

**Examples:**
- `/execute .claude/output/plans/add-agent-capabilities.md`
- `/execute .claude/output/plans/server-health-monitoring.md`

If no argument provided, list available plans:

```bash
ls -la .claude/output/plans/
```

## Behavioral Flow

1. **Read**: Load and understand the entire plan
2. **Verify**: Pre-flight checks (git, tests, services)
3. **Execute**: Implement tasks in order with validation
4. **Test**: Run test suite per plan specifications
5. **Report**: Generate execution report documenting outcomes

Key behaviors:
- Task-by-task execution with immediate validation
- Serena symbolic tools for precise code modifications
- Continuous progress tracking via TodoWrite

## MCP Integration

- **Serena MCP**: Symbolic code manipulation
  - `find_symbol`: Locate code to modify
  - `get_symbols_overview`: Understand file structure before editing
  - `replace_symbol_body`: Precise function/class modifications
  - `insert_after_symbol`: Add new code after existing symbols

## Tool Coordination

- **Serena Tools**: Symbolic reading and editing
- **Write/Edit**: File creation and modification
- **Bash**: Validation commands, git operations
- **TodoWrite**: Track task completion progress
- **Read**: Load plan and reference files

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

## Output Format

```markdown
## Execution Report

### Completed Tasks
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
{Document any deviations with justification}

### Ready for Commit
**Suggested commit message:**
```text
feat(resource): add resource management endpoints

- Add Pydantic schemas for resource create/update/response
- Implement ResourceService with CRUD operations
- Add API endpoints for resource management
- Add unit and integration tests
```
```

## Boundaries

**Will:**
- Execute plan tasks in specified order with validation
- Use Serena symbolic tools for precise code modifications
- Document any divergences from plan with justification
- Generate comprehensive execution report

**Will Not:**
- Skip validation steps between tasks
- Deviate from plan without documenting reasons
- Continue past failed validations without fixing
- Ignore test requirements from the plan
