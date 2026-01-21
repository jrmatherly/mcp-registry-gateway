---
name: troubleshoot
description: Diagnose and resolve issues in code, builds, deployments, and system behavior
category: analysis
complexity: standard
argument-hint: <issue-description> [--type bug|build|performance|deployment] [--trace] [--fix]
mcp-servers: [serena]
personas: [test-runner, arch-analyzer]
---

# /troubleshoot - Issue Diagnosis and Resolution

## Triggers

- Code defects and runtime error investigation requests
- Build failure analysis and resolution needs
- Performance issue diagnosis and optimization requirements
- Deployment problem analysis and system behavior debugging
- Test failure investigation and root cause analysis

## Usage

```
/troubleshoot <issue-description> [--type bug|build|performance|deployment] [--trace] [--fix]
```

**Examples:**
- `/troubleshoot "tests failing with connection error"` - General investigation
- `/troubleshoot "TypeError in server_service" --type bug --trace` - Bug with stack trace
- `/troubleshoot "slow API response" --type performance` - Performance issue
- `/troubleshoot "docker build failing" --type build --fix` - Build issue with auto-fix

## Behavioral Flow

1. **Analyze**: Examine issue description and gather relevant system state
2. **Investigate**: Identify potential root causes through systematic analysis
3. **Debug**: Execute structured debugging procedures with log/state examination
4. **Propose**: Validate solution approaches with impact assessment
5. **Resolve**: Apply appropriate fixes and verify resolution (if --fix)

Key behaviors:
- Systematic root cause analysis with hypothesis testing
- Multi-domain troubleshooting (code, build, performance, deployment)
- Structured debugging with comprehensive problem analysis
- Safe fix application with verification

## MCP Integration

- **Serena MCP**: Symbolic code navigation and pattern analysis
  - `find_symbol`: Locate error sources in code
  - `search_for_pattern`: Find error patterns and related code
  - `find_referencing_symbols`: Trace call chains

## Tool Coordination

- **Read**: Log analysis and system state examination
- **Bash**: Diagnostic command execution and system investigation
- **Grep**: Error pattern detection and log analysis
- **Glob**: File discovery for affected components

## Diagnostic Commands

### Bug Investigation
```bash
# Check recent changes
git log --oneline -10

# Run specific test with verbose output
uv run pytest tests/unit/test_affected.py -v --tb=long

# Check for syntax errors
uv run python -m py_compile registry/affected_file.py
```

### Build Troubleshooting
```bash
# Check Python/dependency versions
uv run python --version
uv pip list | grep -E "(fastapi|pydantic|motor)"

# Verify dependencies
uv sync

# Run lint check
uv run ruff check registry/
```

### Performance Diagnosis
```bash
# Profile specific test
uv run python -m cProfile -s cumulative registry/services/slow_service.py

# Check database queries
# Look for N+1 patterns, missing indexes
```

### Deployment Issues
```bash
# Check container logs
docker compose logs registry --tail=100

# Verify services running
docker ps --format "{{.Names}}: {{.Status}}"

# Check environment
docker compose config
```

## Investigation Patterns

### Bug Investigation Flow
```
Error reported
    ↓
Reproduce issue (run failing test/scenario)
    ↓
Locate error source (stack trace, logs)
    ↓
Identify root cause (code inspection)
    ↓
Propose fix with verification steps
```

### Build Troubleshooting Flow
```
Build failure
    ↓
Read error message carefully
    ↓
Check dependency versions
    ↓
Verify configuration files
    ↓
Apply fix and rebuild
```

### Performance Diagnosis Flow
```
Performance issue reported
    ↓
Establish baseline metrics
    ↓
Profile suspected areas
    ↓
Identify bottlenecks
    ↓
Propose optimizations
```

## Key Patterns

- **Bug Investigation**: Error analysis → stack trace → code inspection → fix validation
- **Build Troubleshooting**: Log analysis → dependency checking → configuration validation
- **Performance Diagnosis**: Metrics analysis → bottleneck identification → optimization
- **Deployment Issues**: Environment analysis → configuration verification → service validation

## Output Format

```markdown
## Troubleshooting Report

### Issue Summary
- **Reported Issue**: [Original description]
- **Type**: [bug|build|performance|deployment]
- **Severity**: [Critical|High|Medium|Low]
- **Status**: [Investigating|Root Cause Found|Resolved]

### Investigation

#### Symptoms Observed
- [Observable symptom 1]
- [Observable symptom 2]

#### Evidence Collected
```
[Relevant logs, error messages, stack traces]
```

#### Hypotheses Tested
1. **Hypothesis**: [Theory]
   - **Test**: [How tested]
   - **Result**: [Confirmed/Rejected]

### Root Cause

**Identified Cause**: [Clear explanation]

**Location**: `file:line`

**Why This Occurred**: [Explanation of underlying issue]

### Resolution

#### Recommended Fix
[Description of fix]

```python
# Before
[problematic code]

# After
[fixed code]
```

#### Verification Steps
1. [Step to verify fix]
2. [Step to verify no regression]

#### Prevention
- [How to prevent recurrence]

### Applied Fix
[If --fix flag used]
- Files modified: [list]
- Verification: [Pass/Fail]
```

## Examples

### Code Bug Investigation
```
/troubleshoot "Null pointer exception in user service" --type bug --trace
# Systematic analysis of error context and stack traces
# Identifies root cause and provides targeted fix recommendations
```

### Build Failure Analysis
```
/troubleshoot "TypeScript compilation errors" --type build --fix
# Analyzes build logs and configuration
# Automatically applies safe fixes for common issues
```

### Performance Issue Diagnosis
```
/troubleshoot "API response times degraded" --type performance
# Performance metrics analysis and bottleneck identification
# Provides optimization recommendations with expected impact
```

### Deployment Problem Resolution
```
/troubleshoot "Service not starting in production" --type deployment --trace
# Environment and configuration analysis
# Systematic verification of deployment requirements
```

## Common Issues Reference

### MongoDB Connection
```
Error: Connection refused
Fix: docker compose up -d mongodb
Verify: docker ps | grep mongo
```

### Import Errors
```
Error: ModuleNotFoundError
Fix: uv sync
Verify: uv run python -c "import registry"
```

### Test Failures
```
Error: Fixture not found
Fix: Check conftest.py exists and fixture is defined
Verify: uv run pytest --fixtures | grep fixture_name
```

## Boundaries

**Will:**
- Execute systematic issue diagnosis using structured debugging methodologies
- Provide validated solution approaches with comprehensive problem analysis
- Apply safe fixes with verification when --fix flag is used
- Document investigation process and findings for future reference

**Will Not:**
- Apply risky fixes without proper analysis and user confirmation
- Modify production systems without explicit permission
- Make architectural changes without understanding full system impact
- Skip verification steps even under time pressure
