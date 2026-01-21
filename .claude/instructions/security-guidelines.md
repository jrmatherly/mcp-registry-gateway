# Security Guidelines

## Input Validation
- Always validate and sanitize user inputs
- Use Pydantic models for request/response validation
- Never trust external data

```python
from pydantic import BaseModel, Field, field_validator
import re

class ServerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    url: str = Field(..., pattern=r"^https?://")
    
    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Name must be alphanumeric with hyphens/underscores")
        return v.lower()
```

## Secrets Management
```python
import os
from typing import Optional

def get_secret(key: str, default: Optional[str] = None) -> str:
    """Retrieve secret from environment variable.
    
    Never hardcode secrets in source code.
    """
    value = os.environ.get(key, default)
    if value is None:
        raise ValueError(f"Required secret '{key}' not found in environment")
    return value
```

## Security Best Practices
- Never log sensitive information (passwords, tokens, PII)
- Use environment variables for configuration
- Validate all inputs, especially from external sources
- Use parameterized queries for database operations
- Keep dependencies updated for security patches

## Security Scanning with Bandit
Run Bandit regularly as part of the development workflow:

```bash
uv run bandit -r registry/
```

Handle false positives with `# nosec` comments and clear justification:

```python
# When using random for non-cryptographic purposes
# This is for generating random sample data, not security - nosec B311
random.seed(random_seed)
samples = random.sample(dataset, size)  # nosec B311
```

## Server Binding Security
When starting a server, never bind to `0.0.0.0` unless absolutely necessary:

```python
# Bad - exposes to all interfaces
app.run(host="0.0.0.0", port=8000)

# Good - local only
app.run(host="127.0.0.1", port=8000)

# Good - specific private IP
import socket
private_ip = socket.gethostbyname(socket.gethostname())
app.run(host=private_ip, port=8000)
```

## Authentication and Authorization
```python
from fastapi import Depends, Security
from fastapi.security import OAuth2PasswordBearer, SecurityScopes

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="token",
    scopes={
        "servers:read": "Read MCP servers",
        "servers:write": "Create/update MCP servers",
        "admin": "Administrative access",
    },
)

async def get_current_user(
    security_scopes: SecurityScopes,
    token: str = Depends(oauth2_scheme),
) -> User:
    """Validate token and check scopes"""
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        # Validate scopes
        token_scopes = payload.get("scopes", [])
        for scope in security_scopes.scopes:
            if scope not in token_scopes:
                raise HTTPException(status_code=403, detail="Insufficient permissions")
        return User(**payload)
    except JWTError:
        raise credentials_exception
```

## OWASP Top 10 Considerations
1. **Injection**: Use parameterized queries, validate inputs
2. **Broken Authentication**: Use secure token handling, MFA
3. **Sensitive Data Exposure**: Encrypt data at rest and in transit
4. **XXE**: Disable external entity processing
5. **Broken Access Control**: Implement proper authorization checks
6. **Security Misconfiguration**: Review default settings
7. **XSS**: Sanitize outputs, use CSP headers
8. **Insecure Deserialization**: Validate serialized data
9. **Known Vulnerabilities**: Keep dependencies updated
10. **Insufficient Logging**: Log security events
