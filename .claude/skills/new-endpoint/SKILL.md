# New Endpoint Skill

Create a new FastAPI endpoint following project conventions.

## Quick Start

To add a new endpoint, you need:
1. **Route** in `registry/api/`
2. **Service method** in `registry/services/`
3. **Repository method** in `registry/repositories/`
4. **Pydantic schemas** in `registry/schemas/`
5. **Tests** in `tests/`

## Endpoint Template

```python
# registry/api/your_resource.py
from fastapi import APIRouter, Depends, HTTPException, Path, Query
from typing import List, Optional

from registry.schemas.your_resource import (
    YourResourceCreate,
    YourResourceResponse,
    YourResourceUpdate,
)
from registry.services.your_resource_service import YourResourceService
from registry.core.dependencies import get_your_resource_service

router = APIRouter(prefix="/your-resources", tags=["your-resources"])


@router.get(
    "/",
    response_model=List[YourResourceResponse],
    summary="List all resources",
)
async def list_resources(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    service: YourResourceService = Depends(get_your_resource_service),
) -> List[YourResourceResponse]:
    """List all resources with pagination."""
    resources = await service.list(skip=skip, limit=limit)
    return [YourResourceResponse.model_validate(r) for r in resources]


@router.get(
    "/{resource_id}",
    response_model=YourResourceResponse,
    responses={404: {"description": "Resource not found"}},
)
async def get_resource(
    resource_id: str = Path(..., description="Resource ID"),
    service: YourResourceService = Depends(get_your_resource_service),
) -> YourResourceResponse:
    """Get a resource by ID."""
    resource = await service.get(resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return YourResourceResponse.model_validate(resource)


@router.post(
    "/",
    response_model=YourResourceResponse,
    status_code=201,
)
async def create_resource(
    data: YourResourceCreate,
    service: YourResourceService = Depends(get_your_resource_service),
) -> YourResourceResponse:
    """Create a new resource."""
    resource = await service.create(data)
    return YourResourceResponse.model_validate(resource)


@router.put(
    "/{resource_id}",
    response_model=YourResourceResponse,
    responses={404: {"description": "Resource not found"}},
)
async def update_resource(
    resource_id: str,
    data: YourResourceUpdate,
    service: YourResourceService = Depends(get_your_resource_service),
) -> YourResourceResponse:
    """Update an existing resource."""
    resource = await service.update(resource_id, data)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return YourResourceResponse.model_validate(resource)


@router.delete(
    "/{resource_id}",
    status_code=204,
    responses={404: {"description": "Resource not found"}},
)
async def delete_resource(
    resource_id: str,
    service: YourResourceService = Depends(get_your_resource_service),
) -> None:
    """Delete a resource."""
    deleted = await service.delete(resource_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Resource not found")
```

## Steps to Create

### 1. Define Schemas
Create `registry/schemas/your_resource.py` with Pydantic models.

### 2. Create Service
Create `registry/services/your_resource_service.py` with business logic.

### 3. Create Repository
Add methods to existing repository or create new one.

### 4. Create Routes
Create `registry/api/your_resource.py` with endpoints.

### 5. Register Router
Add to `registry/main.py` (after other router imports):
```python
from registry.api.your_resource import router as your_resource_router
# ...
app.include_router(your_resource_router, prefix="/api", tags=["Your Resources"])
```

### 6. Add Tests
Create `tests/unit/test_your_resource_service.py` and `tests/integration/test_your_resource_api.py`.

## References

- [Schema Templates](references/schema-templates.md)
- [Service Templates](references/service-templates.md)
