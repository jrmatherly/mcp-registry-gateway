---
name: debugging
description: Structured problem-solving for errors and issues
---

# Debugging Output Style

Systematic approach to identifying and resolving issues.

## Debugging Framework

### 1. Reproduce
- Confirm the exact error
- Identify the minimal reproduction steps
- Note the environment (Python version, dependencies)

### 2. Diagnose
- Read the full stack trace
- Identify the failing line
- Understand what the code expected vs. what happened

### 3. Hypothesize
- List possible causes
- Rank by likelihood
- Test hypotheses systematically

### 4. Fix
- Make the minimal change to fix the issue
- Verify the fix works
- Check for regressions

### 5. Prevent
- Add tests for the fixed case
- Consider similar issues elsewhere
- Update documentation if needed

## Response Format

### For Error Analysis
```
## Error Analysis

### Error Message
[Exact error text]

### Stack Trace Summary
- Origin: file:line
- Call path: A -> B -> C -> failure

### Diagnosis
**What failed**: [specific operation]
**Why it failed**: [root cause]
**Evidence**: [how we know this]

### Hypotheses
1. [Most likely] - [evidence]
2. [Less likely] - [evidence]

### Recommended Fix
```python
# file:line
fixed code
```

### Verification
```bash
command to verify fix
```
```

### For Investigation
```
## Investigation: [Issue]

### Current Behavior
[What's happening]

### Expected Behavior
[What should happen]

### Debugging Steps Taken
1. [Step] -> [Result]
2. [Step] -> [Result]

### Findings
[What we discovered]

### Next Steps
- [ ] [Action item]
```

## Common Debugging Commands

### Check Logs
```bash
docker compose logs -f registry | grep -i error
```

### Test Specific Case
```bash
uv run pytest tests/unit/test_file.py::test_function -v -s
```

### Debug Mode
```bash
LOG_LEVEL=DEBUG uv run uvicorn registry.main:app --reload
```

### Check Database
```bash
docker exec -it mcp-mongodb mongosh
> use mcp_registry
> db.servers.find().limit(5)
```

### Check Environment
```bash
env | grep -E "(DOCUMENTDB|MONGO|SECRET)"
```

## Example Debugging Session

```
## Error Analysis

### Error Message
`TypeError: 'NoneType' object is not subscriptable`

### Stack Trace Summary
- Origin: registry/services/server_service.py:87
- Call path: API -> Service -> Repository.get() -> None['id']

### Diagnosis
**What failed**: Accessing `['id']` on the result of `repository.get()`
**Why it failed**: `get()` returned `None` (server not found), then code tried to access `['id']`
**Evidence**: Line 87 does `server['id']` without checking if server exists

### Recommended Fix
```python
# registry/services/server_service.py:87
server = await self.repository.get(server_id)
if not server:
    raise ServerNotFoundError(server_id)
return server['id']
```

### Verification
```bash
uv run pytest tests/unit/test_server_service.py::test_get_nonexistent_server -v
```
```
