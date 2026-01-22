# Security Remediation Guide

## Dependency Vulnerability Remediation

### Quick Fix Workflow

```bash
# 1. Identify vulnerable packages
uv run pip-audit --desc

# 2. Check available updates
uv pip list --outdated

# 3. Update specific package
uv add "package>=fixed_version"

# 4. Verify fix
uv run pip-audit | grep package_name
```

### Common Remediation Patterns

#### Direct Dependency Update
```bash
# Check current version
uv pip show vulnerable-package

# Update to fixed version
uv add "vulnerable-package>=1.2.3"

# Lock dependencies
uv lock

# Verify no regressions
uv run pytest tests/ -n 8
```

#### Transitive Dependency Pin
```toml
# pyproject.toml - when parent can't be updated
[project]
dependencies = [
    "parent-package>=1.0.0",
    "vulnerable-transitive>=2.0.0",  # Pinned for CVE-YYYY-NNNNN
]
```

#### Replace Vulnerable Package
```bash
# When no fix available, find alternative
# Example: replace pyyaml unsafe operations
# Before
import yaml
data = yaml.load(content)  # Unsafe!

# After
import yaml
data = yaml.safe_load(content)  # Safe
```

### Version Constraint Strategies

| Strategy | When to Use | Example |
|----------|-------------|---------|
| Minimum version | Security fix available | `>=1.2.3` |
| Exact version | Stability critical | `==1.2.3` |
| Range | Balance security/compatibility | `>=1.2.3,<2.0.0` |
| Exclude | Specific version has issues | `>=1.2.0,!=1.2.5` |

## Code Vulnerability Remediation

### Bandit nosec Usage

Only use `# nosec` when:
1. The flagged code is actually safe in context
2. You've documented the justification
3. There's no reasonable alternative

```python
# Good - justified nosec
# Using random for ML seed, not security - nosec B311
random.seed(config.random_seed)

# Bad - hiding real vulnerability
password = "admin123"  # nosec  # DON'T DO THIS!
```

### Common Code Fixes

#### Input Validation
```python
# Before - no validation
@router.get("/search")
async def search(q: str):
    return await db.search(q)

# After - with validation
from pydantic import Field

@router.get("/search")
async def search(
    q: str = Query(
        ...,
        min_length=1,
        max_length=100,
        regex=r"^[\w\s-]+$"
    )
):
    return await db.search(q)
```

#### Secure Password Handling
```python
# Before - plain text comparison
if user.password == provided_password:
    return True

# After - secure hashing
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"])

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)
```

#### Secure Secret Generation
```python
# Before - predictable
import random
token = ''.join(random.choices(string.ascii_letters, k=32))

# After - cryptographically secure
import secrets
token = secrets.token_urlsafe(32)
```

#### Safe File Operations
```python
# Before - path traversal vulnerable
def read_file(filename: str) -> str:
    with open(f"/data/{filename}") as f:
        return f.read()

# After - path validation
from pathlib import Path

def read_file(filename: str) -> str:
    base_path = Path("/data").resolve()
    file_path = (base_path / filename).resolve()

    if not file_path.is_relative_to(base_path):
        raise ValueError("Invalid file path")

    with open(file_path) as f:
        return f.read()
```

#### Secure Subprocess Usage
```python
# Before - shell injection vulnerable
import subprocess
subprocess.run(f"echo {user_input}", shell=True)

# After - safe subprocess
import subprocess
import shlex
subprocess.run(["echo", user_input], shell=False)
```

#### Secure XML Parsing
```python
# Before - XXE vulnerable
from xml.etree import ElementTree
tree = ElementTree.parse(xml_file)

# After - XXE safe
import defusedxml.ElementTree as ET
tree = ET.parse(xml_file)
```

#### Secure YAML Loading
```python
# Before - arbitrary code execution
import yaml
data = yaml.load(content)

# After - safe loading
import yaml
data = yaml.safe_load(content)

# Or with explicit loader
data = yaml.load(content, Loader=yaml.SafeLoader)
```

## Security Headers

### FastAPI Security Headers
```python
from fastapi import FastAPI
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        return response

app = FastAPI()
app.add_middleware(SecurityHeadersMiddleware)
```

## Logging Sanitization

### Remove Sensitive Data
```python
import logging
import re

class SensitiveDataFilter(logging.Filter):
    """Filter sensitive data from logs."""

    PATTERNS = [
        (re.compile(r'password["\']?\s*[:=]\s*["\']?[^"\'}\s]+'), 'password=***'),
        (re.compile(r'api[_-]?key["\']?\s*[:=]\s*["\']?[^"\'}\s]+'), 'api_key=***'),
        (re.compile(r'token["\']?\s*[:=]\s*["\']?[^"\'}\s]+'), 'token=***'),
        (re.compile(r'secret["\']?\s*[:=]\s*["\']?[^"\'}\s]+'), 'secret=***'),
    ]

    def filter(self, record):
        if isinstance(record.msg, str):
            for pattern, replacement in self.PATTERNS:
                record.msg = pattern.sub(replacement, record.msg)
        return True

# Apply filter
logger = logging.getLogger()
logger.addFilter(SensitiveDataFilter())
```

## Verification Commands

### Post-Remediation Checklist

```bash
# 1. Verify dependency fixes
uv run pip-audit
# Expected: "No known vulnerabilities found"

# 2. Verify code fixes
uv run bandit -r registry/ -f txt
# Expected: No high/medium issues (or justified nosec)

# 3. Run full test suite
uv run pytest tests/ -n 8
# Expected: All tests pass

# 4. Type check (catches some security issues)
uv run mypy registry/
# Expected: No errors

# 5. Lint check
uv run ruff check registry/
# Expected: No errors
```

### Continuous Monitoring

```yaml
# Add to CI/CD pipeline (.github/workflows/security.yml)
name: Security Scan
on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 6 * * 1'  # Weekly Monday 6am

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install uv
        run: pip install uv

      - name: Install dependencies
        run: uv sync

      - name: Dependency audit
        run: uv run pip-audit

      - name: Code security scan
        run: uv run bandit -r registry/ -f json -o bandit-report.json

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: security-reports
          path: bandit-report.json
```

## Documentation Requirements

### Security Fix Documentation
```markdown
## Security Fix: CVE-YYYY-NNNNN

**Date**: YYYY-MM-DD
**Severity**: HIGH/MEDIUM/LOW
**Affected Component**: package-name / module

### Summary
Brief description of the vulnerability and fix.

### Changes Made
1. Updated package-name from X.Y.Z to A.B.C
2. Modified code in registry/module.py

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Security scan clean
- [ ] Manual verification completed

### Rollback Plan
If issues arise, revert to commit HASH and pin package to previous version.
```
