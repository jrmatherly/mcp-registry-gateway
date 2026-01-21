---
name: implement-fix
description: Implement fix from RCA document for GitHub issue
category: development
complexity: standard
argument-hint: <github-issue-number>
mcp-servers: [serena]
personas: [arch-analyzer, code-reviewer, test-runner]
---

# /implement-fix - Bug Fix Implementation

## Triggers

- After completing RCA with `/rca`
- Bug fixes with documented root cause
- GitHub issue resolution requiring code changes

## Usage

```
/implement-fix <github-issue-number>
```

**Examples:**
- `/implement-fix 123` - Implement fix for issue #123
- `/implement-fix 456` - Fix bug documented in RCA for #456

**Prerequisites:**
- RCA document exists at `.claude/output/rca/issue-{number}.md`
- If RCA doesn't exist, run `/rca {number}` first

## Behavioral Flow

1. **Read**: Load RCA document and understand root cause
2. **Verify**: Confirm issue still exists (reproduction)
3. **Implement**: Make code changes per RCA recommendations
4. **Test**: Add regression tests and run validation
5. **Document**: Generate fix report and commit message

Key behaviors:
- Follow RCA recommendations precisely
- Add regression tests for the specific issue
- Validate fix resolves the reported problem

## MCP Integration

- **Serena MCP**: Precise code modifications
  - `find_symbol`: Locate code to modify
  - `replace_symbol_body`: Modify affected functions/classes
  - `insert_after_symbol`: Add new validation or handling

## Tool Coordination

- **Serena Tools**: Symbolic reading and editing
- **Write/Edit**: Code modifications
- **Bash**: Validation commands, git operations, gh CLI
- **Read**: RCA document, affected files
- **TodoWrite**: Track fix implementation steps

## Implementation Instructions

### 1. Read and Understand RCA

- Read the ENTIRE RCA document
- Review the GitHub issue details
- Understand the root cause
- Review the proposed fix strategy
- Note all files to modify
- Review testing requirements

### 2. Verify Current State

Before making changes:

```bash
# Ensure clean state
git status

# Verify issue still exists (if reproducible)
# Run relevant tests to confirm failure
uv run pytest tests/unit/test_affected_module.py -v
```

### 3. Implement the Fix

Following "Proposed Fix" from RCA:

**For each file to modify:**

#### a. Read existing file

- Use Serena tools to understand current implementation
- Locate the specific code mentioned in RCA

#### b. Make the fix

- Implement the change as described
- Follow fix strategy exactly
- Maintain code style and conventions
- Add comments if fix is non-obvious

#### c. Handle related changes

- Update any related code affected
- Ensure consistency across codebase
- Update imports if needed

### 4. Add/Update Tests

Following "Testing Requirements" from RCA:

**Create test cases for:**

1. Verify the fix resolves the issue
2. Test edge cases related to the bug
3. Ensure no regression in related functionality

**Test implementation:**

```python
@pytest.mark.asyncio
async def test_issue_{number}_fix():
    """Test that issue #{number} is fixed.

    Regression test for: https://github.com/{owner}/{repo}/issues/{number}
    """
    # Arrange - set up scenario that caused bug

    # Act - execute code that previously failed

    # Assert - verify it now works correctly
```

### 5. Run Validation

Execute validation commands from RCA:

```bash
# Lint and format
uv run ruff check --fix . && uv run ruff format .

# Type check
uv run mypy registry/

# Run affected tests
uv run pytest tests/unit/test_affected_module.py -v

# Run full test suite
uv run pytest tests/ -n 8
```

**If validation fails:**

- Fix the issues
- Re-run validation
- Don't proceed until all pass

### 6. Verify Fix

**Manual verification:**

- Follow reproduction steps from RCA
- Confirm issue no longer occurs
- Test edge cases
- Check for unintended side effects

## Output Format

```markdown
## Fix Implementation Summary

**GitHub Issue #{number}**: {Brief title}

**Issue URL**: https://github.com/{owner}/{repo}/issues/{number}

**Root Cause** (from RCA):
{One-line summary}

### Changes Made

**Files Modified:**

1. **`registry/path/to/file.py`**
   - Change: {What was changed}
   - Lines: {Line numbers}

### Tests Added

**Test Files Created/Modified:**

1. **`tests/unit/test_affected_module.py`**
   - `test_issue_{number}_fix` - Regression test
   - `test_edge_case` - Edge case coverage

### Validation Results

```bash
# Ruff check
All checks passed!

# MyPy
Success: no issues found

# Pytest
=== X passed in Y.YYs ===
```

### Verification

**Manual Testing:**

- [x] Followed reproduction steps - issue resolved
- [x] Tested edge cases - all pass
- [x] No new issues introduced
- [x] Original functionality preserved

### Ready for Commit

**Suggested commit message:**

```text
fix(component): resolve issue #{number} - {brief description}

{Summary of what was fixed and how}

Fixes #{number}
```
```

## GitHub Integration

**Add implementation comment:**

```bash
gh issue comment {number} --body "Fix implemented. PR incoming with commit that references this issue."
```

**Update labels:**

```bash
gh issue edit {number} --add-label "fixed" --remove-label "bug"
```

## Boundaries

**Will:**
- Follow RCA recommendations for fix implementation
- Add regression tests for the specific issue
- Run full validation before declaring complete
- Link commit to GitHub issue with `Fixes #{number}`

**Will Not:**
- Implement fixes without RCA documentation
- Skip regression test creation
- Ignore edge cases identified in RCA
- Proceed with failing validation
