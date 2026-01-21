---
name: rca
description: Root Cause Analysis for GitHub issue
category: analysis
complexity: standard
argument-hint: <github-issue-number>
mcp-servers: [serena]
personas: [arch-analyzer, security-auditor]
---

# /rca - Root Cause Analysis

## Triggers

- GitHub issue requiring investigation
- Bug reports needing systematic analysis
- Production incidents requiring root cause identification
- Unclear issues needing reproduction and analysis

## Usage

```
/rca <github-issue-number>
```

**Examples:**
- `/rca 123` - Analyze GitHub issue #123
- `/rca 456` - Investigate bug report #456

## Behavioral Flow

1. **Fetch**: Retrieve GitHub issue details via CLI
2. **Search**: Use Serena to find related code
3. **Analyze**: Trace issue through codebase
4. **Assess**: Determine impact and severity
5. **Document**: Create comprehensive RCA document

Key behaviors:
- Evidence-based analysis with code references
- Systematic investigation using symbolic tools
- Impact assessment with security considerations

## MCP Integration

- **Serena MCP**: Codebase analysis and pattern search
  - `search_for_pattern`: Find error messages or related code
  - `find_symbol`: Locate specific functions/classes
  - `get_symbols_overview`: Understand file structure
  - `find_referencing_symbols`: Trace call chains

## Tool Coordination

- **Bash**: GitHub CLI (`gh issue view`), git history
- **Serena Tools**: Symbol search, pattern matching
- **Read**: Detailed code analysis
- **Write**: RCA document creation
- **Grep/Glob**: File and pattern discovery

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

## Output Format

Save to: `.claude/output/rca/issue-{number}.md`

```markdown
# Root Cause Analysis: GitHub Issue #{number}

## Issue Summary

- **GitHub Issue**: #{number}
- **Issue URL**: https://github.com/{owner}/{repo}/issues/{number}
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

## Impact Assessment

**Scope:**
{How widespread}

**Affected Features:**
- {List features}

**Security/Data Concerns:**
{Any security implications}

## Proposed Fix

### Fix Strategy
{High-level approach}

### Files to Modify
1. **`registry/path/to/file.py`**
   - Changes: {What needs to change}
   - Reason: {Why this fixes it}

### Testing Requirements

**Test Cases Needed:**
1. {Test: verify fix works}
2. {Test: verify no regression}
3. {Test: edge cases}

## Next Steps

1. Review this RCA document
2. Run: `/implement-fix {number}` to implement
3. Run validation commands
4. Create PR with `Fixes #{number}`
```

## Boundaries

**Will:**
- Perform systematic investigation with evidence
- Use Serena symbolic tools for precise code analysis
- Assess security and data integrity implications
- Document findings comprehensively

**Will Not:**
- Implement fixes during RCA phase
- Make assumptions without code evidence
- Skip impact assessment
- Ignore security implications of issues
