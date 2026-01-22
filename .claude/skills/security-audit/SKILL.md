# /security-audit - Dependency and Code Security Scanning

## Triggers

- Before dependency upgrade planning
- After dependency changes
- Periodic security review requests
- When user requests security scan
- When CVE advisories are announced

## Usage

```
/security-audit [--deps | --code | --full]
```

**Options:**
- `--deps` - Dependency vulnerabilities only (pip-audit)
- `--code` - Code security issues only (bandit)
- `--full` - Both dependency and code scanning (default)

## Process

### Step 1: Dependency Vulnerability Scan

```bash
# Quick scan
uv run pip-audit

# With CVE descriptions
uv run pip-audit --desc

# JSON output for reports
mkdir -p security_scans && uv run pip-audit --format json > security_scans/pip-audit-report.json
```

### Step 2: Code Security Scan

```bash
# Text output
uv run bandit -r registry/ -f txt

# JSON for detailed analysis
mkdir -p security_scans && uv run bandit -r registry/ -f json -o security_scans/bandit_report.json
```

### Step 3: Generate Summary Report

Create actionable report at `.claude/output/security-reports/{date}-security-audit.md`:

```markdown
# Security Audit Report - {date}

## Dependency Vulnerabilities

| Package | Version | CVE | Severity | Fix Version |
|---------|---------|-----|----------|-------------|
| {pkg} | {ver} | {cve} | {sev} | {fix} |

## Code Security Findings

| File | Line | Issue | Severity | CWE |
|------|------|-------|----------|-----|
| {file} | {line} | {issue} | {sev} | {cwe} |

## Recommended Actions

1. {action with priority}
```

## When to Use

| Scenario | Recommended Scan |
|----------|------------------|
| Before dependency upgrade planning | `--deps` (identify full CVE scope) |
| After updating pyproject.toml | `--deps` (verify fixes) |
| Before PR merge | `--full` |
| Weekly maintenance | `--full` |
| CVE advisory announced | `--deps` |
| Code review | `--code` |

## Integration with Dependency Upgrades

**Before creating upgrade plans:**
```bash
# Run this FIRST to identify all vulnerabilities
uv run pip-audit --desc > .scratchpad/pre-upgrade-vulnerabilities.txt
```

This ensures the plan captures ALL CVEs, not just known ones.

**After implementing upgrades:**
```bash
# Verify all vulnerabilities resolved
uv run pip-audit
# Expected: "No known vulnerabilities found"
```

## Transitive Dependency Analysis

When pip-audit identifies a vulnerable package, determine if it's direct or transitive:

```bash
# Check if package is directly imported (replace PACKAGE with actual name)
grep -r "from PACKAGE" registry/
grep -r "import PACKAGE" registry/

# If no matches: transitive dependency
# Check which package pulls it in:
uv pip show PACKAGE | grep "Required-by"
```

**For transitive dependencies:**
- Update the parent package if possible
- Pin transitive dependency explicitly only if parent can't be updated
- Document decision in upgrade plan

## Output Location

Reports saved to: `security_scans/` directory
- `pip-audit-report.json` - Dependency vulnerabilities
- `bandit_report.json` - Code security issues

## Boundaries

**Will:**
- Run comprehensive security scans
- Generate actionable reports with severity levels
- Identify both direct and transitive vulnerabilities
- Provide remediation guidance

**Will Not:**
- Automatically fix vulnerabilities without approval
- Ignore findings based on perceived low risk
- Skip scans when time-pressured
