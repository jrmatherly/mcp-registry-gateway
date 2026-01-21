# Code Review Skill

Comprehensive code review framework for the MCP Gateway & Registry project.

## Quick Review

For a focused review of changed files:

```bash
# See what's changed
git diff --name-only HEAD~1

# Review specific file
# Use the code-reviewer agent for detailed analysis
```

## Review Process

### 1. Understand the Context
- What problem is being solved?
- Is this a new feature, bug fix, or refactor?
- What files are affected?

### 2. Review Code Quality
- [ ] Functions are modular (30-50 lines max)
- [ ] Clear type annotations
- [ ] Proper error handling
- [ ] No hardcoded values

### 3. Review Tests
- [ ] New code has tests
- [ ] Edge cases covered
- [ ] Tests are readable and maintainable

### 4. Review Security
- [ ] No hardcoded secrets
- [ ] Input validation present
- [ ] No security vulnerabilities

### 5. Provide Feedback
- Be constructive and specific
- Reference line numbers
- Suggest improvements, don't just criticize

## Review Output Format

```markdown
## Code Review: [Component Name]

### Overview
[Brief description of changes]

### Strengths
- [What's done well]

### Issues

#### Critical (Must Fix)
- **[Issue]** - file:line
  - Problem: [Description]
  - Suggestion: [How to fix]

#### Major (Should Fix)
- ...

#### Minor (Consider)
- ...

### Verdict
[APPROVE / REQUEST CHANGES]
```

## References

- [Review Checklist](references/review-checklist.md)
- [Common Issues](references/common-issues.md)

## Using the Code Reviewer Agent

For automated review, use the `code-reviewer` agent:

```
Use the code-reviewer agent to review [file/PR]
```

The agent will:
1. Analyze code patterns
2. Check for security issues
3. Verify testing coverage
4. Provide structured feedback
