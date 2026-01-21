---
description: Implement fix from RCA document for GitHub issue
argument-hint: <github-issue-number>
---

# Implement Fix: GitHub Issue #$ARGUMENTS

## Prerequisites

- RCA document exists at `.claude/output/rca/issue-$ARGUMENTS.md`
- If RCA doesn't exist, run `/rca $ARGUMENTS` first

## RCA Document to Reference

Read RCA: `.claude/output/rca/issue-$ARGUMENTS.md`

**Optional - View GitHub issue for context:**

```bash
gh issue view $ARGUMENTS
```

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
async def test_issue_$ARGUMENTS_fix():
    """Test that issue #$ARGUMENTS is fixed.

    Regression test for: https://github.com/{owner}/{repo}/issues/$ARGUMENTS
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

### 7. Update Documentation

If needed:

- Update code comments
- Update API documentation
- Update README if user-facing
- Add notes about the fix

## Output Report

### Fix Implementation Summary

**GitHub Issue #$ARGUMENTS**: {Brief title}

**Issue URL**: https://github.com/{owner}/{repo}/issues/$ARGUMENTS

**Root Cause** (from RCA):
{One-line summary}

### Changes Made

**Files Modified:**

1. **`registry/path/to/file.py`**
   - Change: {What was changed}
   - Lines: {Line numbers}

2. **`tests/path/to/test.py`**
   - Change: {Tests added}
   - Lines: {Line numbers}

### Tests Added

**Test Files Created/Modified:**

1. **`tests/unit/test_affected_module.py`**
   - `test_issue_$ARGUMENTS_fix` - Regression test
   - `test_edge_case` - Edge case coverage

**Test Coverage:**

- [x] Fix verification test
- [x] Edge case tests
- [x] Regression prevention

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

### Files Summary

- X files modified
- Y test files created/updated
- +Z lines added
- -W lines removed

### Ready for Commit

All changes complete and validated.

**Suggested commit message:**

```text
fix(component): resolve issue #$ARGUMENTS - {brief description}

{Summary of what was fixed and how}

Fixes #$ARGUMENTS
```

**Note:** Using `Fixes #$ARGUMENTS` will auto-close the issue when merged.

### Optional: Update GitHub Issue

**Add implementation comment:**

```bash
gh issue comment $ARGUMENTS --body "Fix implemented. PR incoming with commit that references this issue."
```

**Update labels:**

```bash
gh issue edit $ARGUMENTS --add-label "fixed" --remove-label "bug"
```

## Notes

- If RCA was incorrect, document findings and update RCA
- If additional issues found, create separate GitHub issues
- Follow project coding standards exactly
- Ensure all validation passes before declaring complete
- The commit message `Fixes #$ARGUMENTS` links to the GitHub issue
