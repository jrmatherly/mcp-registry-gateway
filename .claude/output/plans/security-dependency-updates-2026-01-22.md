# Feature: Security Dependency Updates

## Feature Description

Update vulnerable dependencies in sub-projects (`agents/a2a` and `metrics-service`) to resolve 15 open Dependabot security alerts. The main registry project (`uv.lock`) is already secure and serves as the reference for target versions.

This update addresses:
- 1 CRITICAL vulnerability (MCP SDK DNS rebinding)
- 5 HIGH severity vulnerabilities (urllib3, aiohttp, pyasn1)
- 4 MEDIUM severity vulnerabilities (aiohttp DoS)
- 5 LOW severity vulnerabilities (aiohttp parsing)

## User Story

As a **security-conscious maintainer**
I want to **update all vulnerable dependencies to their patched versions**
So that **the project is protected against known CVEs and Dependabot alerts are resolved**

## Feature Metadata

- **Type**: Security Patch
- **Complexity**: Low (lock file updates, no code changes)
- **Affected Systems**: agents/a2a, metrics-service
- **Dependencies**: aiohttp, urllib3, pyasn1, mcp (transitive)
- **Risk Level**: Low (breaking change assessment confirmed safe)

---

## CONTEXT REFERENCES

### Source Documents (MANDATORY READ)

- `.claude/output/security-reports/2026-01-22-full-security-audit.md` - Complete vulnerability list
- `.claude/output/security-reports/2026-01-22-breaking-change-assessment.md` - Breaking change analysis

### Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `agents/a2a/pyproject.toml` | Edit | Update aiohttp version constraint |
| `agents/a2a/uv.lock` | Regenerate | Pull updated transitive dependencies |
| `metrics-service/uv.lock` | Regenerate | Pull urllib3 2.6.3 |

### Files to Create (Optional Enhancement)

| File | Purpose |
|------|---------|
| `.github/workflows/security-scan.yml` | Add pip-audit to CI pipeline |

### Reference: Target Versions (from main uv.lock)

| Package | Vulnerable Version | Target Version | CVEs Resolved |
|---------|-------------------|----------------|---------------|
| aiohttp | 3.13.2 | ≥3.13.3 | CVE-2025-69223 through CVE-2025-69230 |
| urllib3 | 2.5.0, 2.6.2 | ≥2.6.3 | CVE-2026-21441, CVE-2025-66471, CVE-2025-66418 |
| pyasn1 | 0.6.1 | ≥0.6.2 | CVE-2026-23490 |
| mcp | 1.21.0 | ≥1.23.0 | CVE-2025-66416 |

### Breaking Change Assessment Summary

| Package | Breaking Changes | Safe to Upgrade |
|---------|------------------|-----------------|
| MCP SDK | DNS rebinding (servers only) | ✅ Yes (we use client APIs) |
| aiohttp | None (patch release) | ✅ Yes |
| urllib3 | Minor API (ContentDecoder) | ✅ Yes (not used) |
| pyasn1 | None | ✅ Yes |

---

## IMPLEMENTATION PLAN

### Phase 1: Update agents/a2a Dependencies (Priority 1)

**Objective**: Resolve 14 Dependabot alerts in agents/a2a

**Changes Required**:
1. Edit `agents/a2a/pyproject.toml` to pin `aiohttp>=3.13.3`
2. Regenerate `agents/a2a/uv.lock` with `uv lock --upgrade`
3. Verify all CVEs resolved with `pip-audit`

### Phase 2: Update metrics-service Dependencies (Priority 2)

**Objective**: Resolve 1 Dependabot alert in metrics-service

**Changes Required**:
1. Regenerate `metrics-service/uv.lock` with `uv lock --upgrade`
2. Verify urllib3 ≥ 2.6.3

### Phase 3: Validation and Testing

**Objective**: Ensure no regressions from dependency updates

**Validation Steps**:
1. Run pip-audit on all projects
2. Run main test suite
3. Verify Dependabot alerts auto-close after merge

### Phase 4: CI Enhancement (Optional)

**Objective**: Prevent future vulnerability accumulation

**Changes**:
1. Add pip-audit step to CI workflows
2. Configure as non-blocking (warning) initially

---

## STEP-BY-STEP TASKS

### Task 1: Update agents/a2a/pyproject.toml

**File**: `agents/a2a/pyproject.toml`

**Current**:
```toml
dependencies = [
    "fastapi>=0.115.12",
    "uvicorn[standard]>=0.34.2",
    "strands-agents[a2a]>=0.1.6",
    "pydantic>=2.11.3",
    "python-dotenv>=1.1.0",
    "aiohttp>=3.8.0",
]
```

**Target**:
```toml
dependencies = [
    "fastapi>=0.115.12",
    "uvicorn[standard]>=0.34.2",
    "strands-agents[a2a]>=0.1.6",
    "pydantic>=2.11.3",
    "python-dotenv>=1.1.0",
    "aiohttp>=3.13.3",  # Security: CVE-2025-69223 through CVE-2025-69230
]
```

**Validation**:
```bash
# Verify syntax
python -c "import tomllib; tomllib.load(open('agents/a2a/pyproject.toml', 'rb'))"
```

---

### Task 2: Regenerate agents/a2a/uv.lock

**Commands**:
```bash
cd agents/a2a

# Remove old lock file (optional but ensures clean state)
rm -f uv.lock

# Generate new lock file with upgraded dependencies
uv lock --upgrade

# Verify new versions
echo "=== Verify aiohttp ===" && grep -A1 'name = "aiohttp"' uv.lock | grep version
echo "=== Verify urllib3 ===" && grep -A1 'name = "urllib3"' uv.lock | grep version
echo "=== Verify pyasn1 ===" && grep -A1 'name = "pyasn1"' uv.lock | grep version
```

**Expected Output**:
```
=== Verify aiohttp ===
version = "3.13.3"
=== Verify urllib3 ===
version = "2.6.3"
=== Verify pyasn1 ===
version = "0.6.2"
```

**Validation**:
```bash
cd agents/a2a && uv run pip-audit
# Expected: "No known vulnerabilities found"
```

---

### Task 3: Regenerate metrics-service/uv.lock

**Commands**:
```bash
cd metrics-service

# Remove old lock file (optional but ensures clean state)
rm -f uv.lock

# Generate new lock file with upgraded dependencies
uv lock --upgrade

# Verify new urllib3 version
grep -A1 'name = "urllib3"' uv.lock | grep version
```

**Expected Output**:
```
version = "2.6.3"
```

**Validation**:
```bash
cd metrics-service && uv run pip-audit
# Expected: "No known vulnerabilities found"
```

---

### Task 4: Verify Main Registry Still Secure

**Commands**:
```bash
# From project root
uv run pip-audit
# Expected: "No known vulnerabilities found"
```

---

### Task 5: Run Full Test Suite

**Commands**:
```bash
# Main registry tests (primary validation)
uv run pytest tests/ -n 8

# Expected: 701 passed, ~57 skipped (may vary)
```

---

### Task 6: Verify Dependabot Alert Resolution

**Commands**:
```bash
# After committing and pushing changes
gh api repos/jrmatherly/mcp-registry-gateway/dependabot/alerts \
  | jq '[.[] | select(.state == "open")] | length'

# Expected: 0 (all alerts should auto-close)
```

---

### Task 7 (Optional): Add pip-audit to CI

**Create File**: `.github/workflows/security-scan.yml`

```yaml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday 6am UTC

permissions:
  contents: read

jobs:
  dependency-audit:
    name: "Dependency Audit"
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Python
      uses: actions/setup-python@v5
      with:
        python-version: '3.12'

    - name: Install uv
      uses: astral-sh/setup-uv@v4
      with:
        version: "latest"

    - name: Install dependencies
      run: uv sync --group dev

    - name: Run pip-audit (main)
      run: uv run pip-audit
      continue-on-error: true  # Non-blocking initially

    - name: Run pip-audit (agents/a2a)
      working-directory: agents/a2a
      run: |
        uv sync
        uv run pip-audit
      continue-on-error: true

    - name: Run pip-audit (metrics-service)
      working-directory: metrics-service
      run: |
        uv sync
        uv run pip-audit
      continue-on-error: true

  code-security:
    name: "Code Security (Bandit)"
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Python
      uses: actions/setup-python@v5
      with:
        python-version: '3.12'

    - name: Install uv
      uses: astral-sh/setup-uv@v4
      with:
        version: "latest"

    - name: Install dependencies
      run: uv sync --group dev

    - name: Run Bandit
      run: uv run bandit -r registry/ -f txt -ll
      continue-on-error: true  # Non-blocking initially
```

---

## TESTING STRATEGY

### Unit Tests

No new unit tests required - this is a dependency update with no code changes.

### Integration Tests

Run existing test suite to verify no regressions:

```bash
uv run pytest tests/ -n 8
```

### Dependency Verification Tests

```bash
# Verify all projects pass pip-audit
for dir in . agents/a2a metrics-service; do
    echo "=== Testing $dir ==="
    (cd "$dir" && uv run pip-audit 2>&1)
done
```

### Version Verification

```bash
# Verify specific package versions
cd agents/a2a && grep -E "aiohttp|urllib3|pyasn1" uv.lock | grep version
cd ../metrics-service && grep "urllib3" uv.lock | grep version
```

---

## VALIDATION COMMANDS

### Pre-Implementation Checks

```bash
# Verify current vulnerability state
uv run pip-audit --desc  # Main project (should be clean)
cd agents/a2a && uv run pip-audit --desc  # Should show vulnerabilities
cd ../metrics-service && uv run pip-audit --desc  # Should show urllib3 CVE
```

### Post-Implementation Checks

```bash
# 1. Verify no vulnerabilities in any project
for dir in . agents/a2a metrics-service; do
    echo "=== $dir ===" && (cd "$dir" && uv run pip-audit)
done

# 2. Verify specific versions
grep -A1 'name = "aiohttp"' agents/a2a/uv.lock | grep version  # >= 3.13.3
grep -A1 'name = "urllib3"' agents/a2a/uv.lock | grep version  # >= 2.6.3
grep -A1 'name = "pyasn1"' agents/a2a/uv.lock | grep version   # >= 0.6.2
grep -A1 'name = "urllib3"' metrics-service/uv.lock | grep version  # >= 2.6.3

# 3. Run full test suite
uv run pytest tests/ -n 8

# 4. Verify Dependabot alerts (after push)
gh api repos/jrmatherly/mcp-registry-gateway/dependabot/alerts \
  | jq '[.[] | select(.state == "open")] | length'
```

---

## ACCEPTANCE CRITERIA

### Must Have

- [ ] `agents/a2a/pyproject.toml` updated with `aiohttp>=3.13.3`
- [ ] `agents/a2a/uv.lock` regenerated with secure versions
- [ ] `metrics-service/uv.lock` regenerated with urllib3 ≥ 2.6.3
- [ ] All pip-audit scans pass with "No known vulnerabilities found"
- [ ] Main test suite passes (701 tests)
- [ ] All 15 Dependabot alerts resolved (auto-close on merge)

### Should Have

- [ ] CI workflow for security scanning added
- [ ] Security audit documentation updated

### Nice to Have

- [ ] Dependabot auto-merge configured for patch updates
- [ ] Weekly security scan schedule in CI

---

## ROLLBACK PLAN

If issues occur after deployment:

```bash
# Revert lock files to previous state
git checkout HEAD~1 -- agents/a2a/uv.lock metrics-service/uv.lock agents/a2a/pyproject.toml

# Or pin to previous working versions in pyproject.toml:
# "aiohttp>=3.13.2,<3.13.3"
```

---

## RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Test failures after update | Very Low | Medium | Full test suite run before merge |
| Runtime errors in production | Very Low | High | Breaking change assessment confirmed safe |
| Strands-agents incompatibility | Low | Medium | Lock file regeneration handles transitives |
| Dependabot alerts not auto-closing | Low | Low | Manual verification via GitHub API |

---

## COMMIT MESSAGE TEMPLATE

```
security(deps): patch CVEs in agents/a2a and metrics-service

Updates dependencies to resolve 15 Dependabot security alerts:

agents/a2a:
- aiohttp: 3.13.2 → 3.13.3 (CVE-2025-69223 through CVE-2025-69230)
- urllib3: 2.5.0 → 2.6.3 (CVE-2026-21441, CVE-2025-66471, CVE-2025-66418)
- pyasn1: 0.6.1 → 0.6.2 (CVE-2026-23490)
- mcp: updated transitively (CVE-2025-66416)

metrics-service:
- urllib3: 2.6.2 → 2.6.3 (CVE-2026-21441)

Breaking change assessment confirmed safe - no code changes required.
See: .claude/output/security-reports/2026-01-22-breaking-change-assessment.md
```

---

## REFERENCES

- Security Audit: `.claude/output/security-reports/2026-01-22-full-security-audit.md`
- Breaking Changes: `.claude/output/security-reports/2026-01-22-breaking-change-assessment.md`
- [aiohttp 3.13.3 Changelog](https://docs.aiohttp.org/en/stable/changes.html)
- [urllib3 2.6.3 Changelog](https://urllib3.readthedocs.io/en/stable/changelog.html)
- [pyasn1 0.6.2 Release](https://github.com/pyasn1/pyasn1/releases/tag/v0.6.2)
- [MCP SDK DNS Rebinding Advisory](https://github.com/modelcontextprotocol/python-sdk/security/advisories/GHSA-9h52-p55h-vw2f)

---

*Plan created: 2026-01-22*
*Estimated implementation time: 15-30 minutes*
*Risk level: Low*
