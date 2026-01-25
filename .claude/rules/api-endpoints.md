---
description: FastAPI endpoint development patterns
globs:
  - "**/api/**/*.py"
  - "**/routers/**/*.py"
  - "**/endpoints/**/*.py"
---

# FastAPI Endpoint Patterns

## Route Definition
- Use typed path parameters and query parameters
- Always specify response_model for documentation
- Use appropriate HTTP status codes
- Include operation_id for OpenAPI spec

```python
@router.get(
    "/{server_id}",
    response_model=ServerResponse,
    operation_id="get_server",
    summary="Get MCP server by ID",
    responses={
        404: {"model": ErrorResponse, "description": "Server not found"},
    },
)
async def get_server(
    server_id: str = Path(..., description="The server ID"),
    service: ServerService = Depends(get_server_service),
) -> ServerResponse:
    """Retrieve an MCP server by its unique identifier."""
    server = await service.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return ServerResponse.model_validate(server)
```

## Dependency Injection
- Use `Depends()` for service injection
- Service dependencies (get_server_service, etc.) are in `registry/core/dependencies.py`
- Auth dependencies (get_current_user, api_auth) are in `registry/auth/dependencies.py`
- Use `Annotated` for cleaner type hints

```python
from typing import Annotated
from fastapi import Depends

ServerServiceDep = Annotated[ServerService, Depends(get_server_service)]
```

## Error Handling
- Use `HTTPException` for HTTP errors
- Use custom exception handlers for domain errors
- Always include meaningful error messages

## Authentication
- Use OAuth2 dependencies for protected routes
- Check scopes with `Security(oauth2_scheme, scopes=[...])`
- Document authentication requirements

## Response Models
- Define responses in `registry/schemas/`
- Use Pydantic v2 model_validate for conversion
- Include examples in schema definitions
