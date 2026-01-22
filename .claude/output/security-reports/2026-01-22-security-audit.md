# Security Audit Report - 2026-01-22

## Summary

| Category | Status | Count |
|----------|--------|-------|
| Dependency Vulnerabilities | Clean | 0 |
| Code Security (High) | Clean | 0 |
| Code Security (Medium) | Review | 1 |
| Code Security (Low) | Acceptable | 17 |

**Overall Status**: Healthy - No critical issues

---

## Dependency Vulnerabilities

**Result**: No known vulnerabilities found

All Python dependencies are currently free of known CVEs. The recent security patches (commit `5245662`) successfully addressed:
- CVE-2025-68664 (langchain-core)
- CVE-2025-69223 through CVE-2025-69230 (aiohttp)
- CVE-2026-21441 (urllib3)
- CVE-2026-22701 (filelock)
- CVE-2026-23490 (pyasn1)

---

## Code Security Findings

### Medium Severity (1)

| File | Line | Issue | CWE | Notes |
|------|------|-------|-----|-------|
| `registry/main.py` | 461 | B104: Possible binding to all interfaces | - | Review: May be intentional for container deployment |

### Low Severity (17)

| Category | Count | Files | Assessment |
|----------|-------|-------|------------|
| B404: subprocess import | 4 | nginx_service.py, agent_scanner.py, version.py | Acceptable - required for system operations |
| B603: subprocess call | 6 | nginx_service.py, agent_scanner.py, version.py | Acceptable - hardcoded commands, no user input |
| B607: partial path | 4 | nginx_service.py, version.py | Acceptable - standard executables (nginx, git) |
| B110: try/except pass | 1 | health/service.py:231 | Review - may swallow errors |
| B105: hardcoded password string | 1 | asor_client.py:110 | False positive - this is a URL, not a password |

---

## Detailed Findings

### B104: Binding to All Interfaces (Medium)

**Location**: `registry/main.py:461`

**Context**: Server startup binding configuration

**Assessment**: This is likely intentional for containerized deployments where the service needs to accept connections from the container network. However, should be reviewed to ensure:
- Not exposed directly to internet without load balancer/proxy
- Appropriate in the deployment context

**Recommendation**: Add `# nosec B104` comment with justification if intentional.

### B110: Try/Except/Pass (Low)

**Location**: `registry/health/service.py:231`

**Context**: Health check error handling

**Assessment**: Silent exception swallowing may hide issues. Review whether logging should be added.

### B105: False Positive - URL Detected as Password

**Location**: `registry/services/federation/asor_client.py:110`

**Content**: OAuth token endpoint URL (`https://...myworkday.com/.../token`)

**Assessment**: False positive - Bandit detected "token" in URL as potential password string. No action needed.

---

## Recommended Actions

### Immediate (None Required)

No critical or high severity issues found.

### Short-term (Optional)

1. **Review** `registry/main.py:461` binding configuration for production appropriateness
2. **Consider** adding logging to `registry/health/service.py:231` try/except block
3. **Add** `# nosec` comments to intentional subprocess calls to suppress future warnings

### Tracking

These low-severity findings are acceptable for this codebase:
- Subprocess usage is controlled with hardcoded commands
- No user input flows into subprocess calls
- Standard system executables (nginx, git) are used

---

## Report Files

- `security_scans/pip-audit-report.json` - Dependency scan (empty - no vulnerabilities)
- `security_scans/bandit_report.json` - Code security scan (18 findings)

---

*Generated: January 22, 2026*
*Scan Type: Full (--full)*
