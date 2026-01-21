# Error Handling and Exceptions

## Exception Handling Principles
- Use specific exception types, avoid bare `except:` clauses
- Always log exceptions with proper context
- Fail fast and fail clearly - don't suppress errors silently
- Use custom exceptions for domain-specific errors

## Exception Pattern
```python
import logging

logger = logging.getLogger(__name__)

class DomainSpecificError(Exception):
    """Base exception for our application"""
    pass

class ServerNotFoundError(DomainSpecificError):
    """Raised when an MCP server is not found"""
    def __init__(self, server_id: str):
        self.server_id = server_id
        super().__init__(f"Server not found: {server_id}")

class ValidationError(DomainSpecificError):
    """Raised when validation fails"""
    pass

def process_data(data: dict) -> dict:
    try:
        result = _validate_and_transform(data)
        return result
    except ValidationError as e:
        logger.error(f"Validation failed for data: {e}")
        raise DomainSpecificError(f"Invalid input data: {e}") from e
    except Exception as e:
        logger.exception("Unexpected error in process_data")
        raise
```

## FastAPI Exception Handlers
```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()

@app.exception_handler(ServerNotFoundError)
async def server_not_found_handler(
    request: Request,
    exc: ServerNotFoundError,
) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={
            "error": "not_found",
            "message": str(exc),
            "server_id": exc.server_id,
        },
    )

@app.exception_handler(ValidationError)
async def validation_error_handler(
    request: Request,
    exc: ValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": "validation_error",
            "message": str(exc),
        },
    )
```

## Error Messages
- Write clear, actionable error messages
- Include context about what was being attempted
- Suggest possible solutions when appropriate

```python
# Bad
raise ValueError("Invalid input")

# Good
raise ValueError(
    f"Invalid server name '{name}': must be alphanumeric with hyphens. "
    f"Example: 'weather-server' or 'my_mcp_tool'"
)
```

## Logging Exceptions
```python
# Log with full traceback
logger.exception("Failed to process request")

# Log with context
logger.error(
    "Failed to fetch server",
    extra={
        "server_id": server_id,
        "user_id": user_id,
        "error": str(e),
    },
)
```

## HTTP Error Responses
```python
from fastapi import HTTPException

# Use appropriate status codes
raise HTTPException(status_code=400, detail="Invalid request body")
raise HTTPException(status_code=401, detail="Authentication required")
raise HTTPException(status_code=403, detail="Insufficient permissions")
raise HTTPException(status_code=404, detail="Resource not found")
raise HTTPException(status_code=409, detail="Resource already exists")
raise HTTPException(status_code=422, detail="Validation failed")
raise HTTPException(status_code=500, detail="Internal server error")
```

## Error Recovery Patterns
```python
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=1, max=10),
)
async def fetch_with_retry(url: str) -> dict:
    """Fetch with exponential backoff retry"""
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            response.raise_for_status()
            return await response.json()
```
