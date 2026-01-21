---
description: Root Cause Analysis for GitHub issue
argument-hint: <github-issue-number>
---

# Root Cause Analysis: GitHub Issue #$ARGUMENTS

## Objective

Investigate GitHub issue #$ARGUMENTS, identify the root cause, and document findings for implementation.

**Prerequisites:**

- Working in MCP Registry Gateway repository
- GitHub CLI installed and authenticated (`gh auth status`)
- Valid GitHub issue number from this repository

## Investigation Process

### 1. Fetch GitHub Issue Details

```bash
gh issue view $ARGUMENTS
```

This retrieves:

- Issue title and description
- Reporter and creation date
- Labels and status
- Comments and discussion

### 2. Search Codebase

**Identify relevant code using Serena tools:**

- `search_for_pattern` - Find error messages or related code
- `find_symbol` - Locate specific functions/classes
- `get_symbols_overview` - Understand file structure

**Search for:**

- Error messages mentioned in issue
- Related function/class names
- Component identifiers
- Similar patterns

### 3. Review Recent History

Check recent changes to affected areas:

```bash
git log --oneline -20 -- registry/
```

Look for:

- Recent modifications to affected code
- Related bug fixes
- Refactorings that might have introduced the issue

### 4. Investigate Root Cause

**Analyze to determine:**

- What is the actual bug or issue?
- Why is it happening?
- What was the original intent?
- Is this a logic error, edge case, or missing validation?

**Consider:**

- Input validation failures
- Edge cases not handled
- Race conditions or timing issues
- Incorrect assumptions
- Missing error handling
- Integration issues between layers

### 5. Assess Impact

**Determine:**

- How widespread is this issue?
- What features are affected?
- Are there workarounds?
- What is the severity?
- Could this cause data corruption or security issues?

### 6. Propose Fix Approach

**Design the solution:**

- What needs to be changed?
- Which files will be modified?
- What is the fix strategy?
- Are there alternative approaches?
- What testing is needed?
- Any risks or side effects?

## Output: Create RCA Document

Save to: `.claude/output/rca/issue-$ARGUMENTS.md`

### RCA Document Structure

```markdown
# Root Cause Analysis: GitHub Issue #$ARGUMENTS

## Issue Summary

- **GitHub Issue**: #$ARGUMENTS
- **Issue URL**: https://github.com/{owner}/{repo}/issues/$ARGUMENTS
- **Title**: {Issue title}
- **Reporter**: {GitHub username}
- **Severity**: [Critical / High / Medium / Low]
- **Status**: {Current status}

## Problem Description

{Clear description of the issue}

**Expected Behavior:**
{What should happen}

**Actual Behavior:**
{What actually happens}

**Symptoms:**
- {Observable symptoms}

## Reproduction

**Steps to Reproduce:**
1. {Step 1}
2. {Step 2}
3. {Observe issue}

**Reproduction Verified:** [Yes / No]

## Root Cause

### Affected Components

- **Files**: {List affected files}
- **Functions/Classes**: {Specific locations}
- **Layer**: [API / Service / Repository / Schema]

### Analysis

{Detailed explanation of the root cause}

**Why This Occurs:**
{Explanation of underlying issue}

**Code Location:**
```
{File path:line number}
{Relevant code snippet}
```

### Related Issues

- {Any related issues or patterns}

## Impact Assessment

**Scope:**
{How widespread}

**Affected Features:**
- {List features}

**Severity Justification:**
{Why this severity}

**Security/Data Concerns:**
{Any security implications}

## Proposed Fix

### Fix Strategy

{High-level approach}

### Files to Modify

1. **`registry/path/to/file.py`**
   - Changes: {What needs to change}
   - Reason: {Why this fixes it}

2. **`tests/path/to/test.py`**
   - Changes: {Test additions}
   - Reason: {Coverage for fix}

### Alternative Approaches

{Other possible solutions and why proposed is better}

### Risks and Considerations

- {Risks with this fix}
- {Side effects to watch}
- {Breaking changes if any}

### Testing Requirements

**Test Cases Needed:**
1. {Test: verify fix works}
2. {Test: verify no regression}
3. {Test: edge cases}

**Validation Commands:**
```bash
uv run pytest tests/unit/test_affected_module.py -v
uv run pytest tests/ -n 8
```

## Implementation Plan

1. {Step 1}
2. {Step 2}
3. {Step 3}

## Next Steps

1. Review this RCA document
2. Run: `/implement-fix $ARGUMENTS` to implement
3. Run validation commands
4. Create PR with `Fixes #$ARGUMENTS`
```

## After Creating RCA

1. Confirm RCA file path
2. Summarize root cause in 1-2 sentences
3. Confirm proposed fix approach
4. Note any blockers or questions
5. Suggest next command: `/implement-fix $ARGUMENTS`
