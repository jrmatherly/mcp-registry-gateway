---
name: improve
description: Apply systematic improvements to code quality, performance, and maintainability
category: quality
complexity: standard
argument-hint: <target> [--focus quality|performance|security|maintainability]
mcp-servers: [serena]
personas: [code-reviewer, performance-engineer, arch-analyzer]
---

# /improve - Code Improvement

## Triggers

- Code quality enhancement requests
- Technical debt reduction initiatives
- Performance optimization needs
- Maintainability improvement projects
- Refactoring planning

## Usage

```
/improve <target> [--focus quality|performance|security|maintainability]
```

**Examples:**
- `/improve registry/services/` - General improvements
- `/improve registry/api/servers.py --focus performance` - Performance focus
- `/improve registry/repositories/ --focus maintainability` - Maintainability focus
- `/improve registry/ --focus security` - Security hardening

## Behavioral Flow

1. **Analyze**: Examine target code for improvement opportunities
2. **Categorize**: Group findings by focus area
3. **Prioritize**: Rank by impact and effort
4. **Recommend**: Provide specific improvements with examples
5. **Validate**: Ensure improvements maintain functionality

Key behaviors:
- Evidence-based recommendations with code references
- Prioritization by impact-to-effort ratio
- Concrete examples of improved code

## MCP Integration

- **Serena MCP**: Code analysis and pattern detection
  - `find_symbol`: Locate code patterns
  - `get_symbols_overview`: Understand structure
  - `search_for_pattern`: Find anti-patterns
  - `find_referencing_symbols`: Trace dependencies

## Tool Coordination

- **Serena Tools**: Symbolic analysis, pattern search
- **Read**: Detailed code examination
- **Grep/Glob**: Pattern discovery
- **Write**: Improvement documentation
- **Bash**: Validation commands

## Improvement Categories

### Quality Improvements

- Code duplication reduction
- Error handling enhancement
- Naming clarity
- Documentation completeness
- Test coverage gaps

### Performance Improvements

- N+1 query elimination
- Async pattern optimization
- Caching opportunities
- Connection pooling
- Response payload optimization

### Security Improvements

- Input validation hardening
- Authentication/authorization gaps
- Sensitive data handling
- Dependency vulnerabilities
- Logging of sensitive information

### Maintainability Improvements

- Complexity reduction
- Single responsibility adherence
- Dependency injection patterns
- Interface segregation
- Configuration externalization

## Analysis Process

### Step 1: Code Examination

Use Serena tools to analyze:

```text
get_symbols_overview: Understand file structure
find_symbol: Locate specific patterns
search_for_pattern: Find anti-patterns
```

### Step 2: Pattern Detection

Look for:

- Repeated code blocks (DRY violations)
- Long functions (>50 lines)
- Deep nesting (>3 levels)
- Missing error handling
- Hardcoded values
- Missing type hints

### Step 3: Prioritization Matrix

| Impact | Effort | Priority |
|--------|--------|----------|
| High | Low | Immediate |
| High | Medium | Short-term |
| High | High | Planned |
| Low | Low | Quick win |
| Low | High | Defer |

## Output Format

```markdown
## Improvement Analysis: {Target}

### Focus: {quality|performance|security|maintainability}

### Summary
- **Files Analyzed**: X
- **Improvements Found**: Y
- **Priority Distribution**: High: A, Medium: B, Low: C

---

## Priority 1: Immediate Improvements

### 1. {Improvement Title}

**Location**: `{file}:{line}`
**Category**: {category}
**Impact**: High
**Effort**: Low

**Current Code:**
```python
{current implementation}
```

**Improved Code:**
```python
{improved implementation}
```

**Why This Matters:**
{Explanation of benefit}

---

## Priority 2: Short-term Improvements

### 2. {Improvement Title}
...

---

## Quick Wins

### Low-effort improvements to consider
- [ ] {Quick improvement 1}
- [ ] {Quick improvement 2}

---

## Deferred Items

### Items requiring significant effort
- {Item 1}: {Reason for deferral}

---

## Validation Plan

```bash
# After implementing improvements
{validation commands}
```

## Metrics to Track
- Current: {baseline metric}
- Target: {improved metric}
```

## Common Patterns to Improve

### N+1 Query Pattern

```python
# Before: N+1 queries
for server in servers:
    server.agents = await repo.get_agents(server.id)

# After: Single query
agents_map = await repo.get_agents_for_servers([s.id for s in servers])
for server in servers:
    server.agents = agents_map.get(server.id, [])
```

### Sequential to Concurrent

```python
# Before: Sequential
data1 = await service1.get()
data2 = await service2.get()

# After: Concurrent
data1, data2 = await asyncio.gather(
    service1.get(),
    service2.get()
)
```

### Missing Error Context

```python
# Before: Generic error
raise ValueError("Invalid input")

# After: Contextual error
raise ValueError(f"Invalid server_id: {server_id!r} - must be non-empty string")
```

## Boundaries

**Will:**
- Analyze code systematically for improvement opportunities
- Provide prioritized recommendations with examples
- Show before/after code comparisons
- Include validation steps for improvements

**Will Not:**
- Implement all improvements without approval
- Recommend changes that break existing functionality
- Ignore test coverage for changed code
- Skip validation after implementing changes
