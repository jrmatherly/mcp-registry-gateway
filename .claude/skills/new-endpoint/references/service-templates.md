# Service Templates

## Basic Service Pattern

```python
# registry/services/your_resource_service.py
from typing import List, Optional
import logging

from registry.repositories.your_resource_repository import YourResourceRepository
from registry.schemas.your_resource import (
    YourResourceCreate,
    YourResourceUpdate,
    YourResourceInDB,
)

logger = logging.getLogger(__name__)


class YourResourceService:
    """Service for managing your resources."""

    def __init__(self, repository: YourResourceRepository) -> None:
        self._repository = repository

    async def get(self, resource_id: str) -> Optional[YourResourceInDB]:
        """Get a resource by ID."""
        logger.debug(f"Getting resource: {resource_id}")
        return await self._repository.get(resource_id)

    async def list(
        self,
        skip: int = 0,
        limit: int = 100,
    ) -> List[YourResourceInDB]:
        """List resources with pagination."""
        logger.debug(f"Listing resources: skip={skip}, limit={limit}")
        return await self._repository.list(skip=skip, limit=limit)

    async def create(self, data: YourResourceCreate) -> YourResourceInDB:
        """Create a new resource."""
        logger.info(f"Creating resource: {data.name}")
        return await self._repository.create(data)

    async def update(
        self,
        resource_id: str,
        data: YourResourceUpdate,
    ) -> Optional[YourResourceInDB]:
        """Update an existing resource."""
        logger.info(f"Updating resource: {resource_id}")
        return await self._repository.update(resource_id, data)

    async def delete(self, resource_id: str) -> bool:
        """Delete a resource."""
        logger.info(f"Deleting resource: {resource_id}")
        return await self._repository.delete(resource_id)
```

## Service with Business Logic

```python
class ServerService:
    """Service with business logic."""

    def __init__(
        self,
        repository: ServerRepository,
        search_service: SearchService,
    ) -> None:
        self._repository = repository
        self._search_service = search_service

    async def create(self, data: ServerCreate) -> ServerInDB:
        """Create server with validation and indexing."""
        # Check for duplicates
        existing = await self._repository.get_by_name(data.name)
        if existing:
            raise ServerAlreadyExistsError(data.name)

        # Create server
        server = await self._repository.create(data)

        # Index for search
        await self._search_service.index_server(server)

        logger.info(f"Created server: {server.id}")
        return server

    async def search(
        self,
        query: str,
        limit: int = 10,
    ) -> List[ServerInDB]:
        """Search servers using semantic search."""
        # Get IDs from search service
        server_ids = await self._search_service.search(query, limit=limit)

        # Fetch full documents
        servers = await self._repository.get_many(server_ids)
        return servers
```

## Dependency Injection

```python
# registry/api/dependencies.py
from functools import lru_cache
from fastapi import Depends

from registry.repositories.your_resource_repository import YourResourceRepository
from registry.services.your_resource_service import YourResourceService
from registry.core.database import get_database


def get_your_resource_repository(
    db = Depends(get_database),
) -> YourResourceRepository:
    return YourResourceRepository(db)


def get_your_resource_service(
    repository: YourResourceRepository = Depends(get_your_resource_repository),
) -> YourResourceService:
    return YourResourceService(repository)
```

## Error Handling in Services

```python
class ResourceNotFoundError(Exception):
    """Raised when a resource is not found."""

    def __init__(self, resource_id: str):
        self.resource_id = resource_id
        super().__init__(f"Resource not found: {resource_id}")


class ResourceAlreadyExistsError(Exception):
    """Raised when a resource already exists."""

    def __init__(self, name: str):
        self.name = name
        super().__init__(f"Resource already exists: {name}")


# In service
async def create(self, data: ResourceCreate) -> ResourceInDB:
    existing = await self._repository.get_by_name(data.name)
    if existing:
        raise ResourceAlreadyExistsError(data.name)
    return await self._repository.create(data)
```
