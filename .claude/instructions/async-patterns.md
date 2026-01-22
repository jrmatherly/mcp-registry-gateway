# Async/Await Best Practices

## Async Code Structure
```python
import asyncio
from typing import List

async def fetch_data(url: str) -> dict:
    """Fetch data from URL asynchronously"""
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.json()

async def process_urls(urls: List[str]) -> List[dict]:
    """Process multiple URLs concurrently"""
    tasks = [fetch_data(url) for url in urls]
    return await asyncio.gather(*tasks, return_exceptions=True)
```

## Async Guidelines
- Use `async with` for async context managers
- Use `asyncio.gather()` for concurrent operations
- Handle exceptions in async code properly
- Don't mix blocking and async code
- Use `asyncio.run()` to run async functions from sync code

## FastAPI Async Patterns
```python
from fastapi import FastAPI, Depends
from motor.motor_asyncio import AsyncIOMotorClient

app = FastAPI()

async def get_database() -> AsyncIOMotorClient:
    """Dependency for database connection"""
    client = AsyncIOMotorClient(settings.mongodb_url)
    try:
        yield client[settings.database_name]
    finally:
        client.close()

@app.get("/items/{item_id}")
async def get_item(
    item_id: str,
    db = Depends(get_database),
) -> dict:
    """Async endpoint with database dependency"""
    item = await db.items.find_one({"_id": item_id})
    if not item:
        raise HTTPException(status_code=404)
    return item
```

## Concurrent Database Operations
```python
async def get_multiple_items(ids: List[str]) -> List[dict]:
    """Fetch multiple items concurrently"""
    tasks = [repository.get(id) for id in ids]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Filter out exceptions and None values
    return [r for r in results if r is not None and not isinstance(r, Exception)]
```

## Async Context Managers
```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def managed_transaction():
    """Async context manager for database transactions"""
    session = await get_session()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()

# Usage
async with managed_transaction() as session:
    await session.execute(query)
```

## Error Handling in Async Code
```python
async def safe_fetch(url: str) -> Optional[dict]:
    """Fetch with error handling"""
    try:
        async with asyncio.timeout(10):
            return await fetch_data(url)
    except asyncio.TimeoutError:
        logger.warning(f"Timeout fetching {url}")
        return None
    except aiohttp.ClientError as e:
        logger.error(f"Client error for {url}: {e}")
        return None
```

## Background Tasks
```python
from fastapi import BackgroundTasks

@app.post("/items/")
async def create_item(
    item: ItemCreate,
    background_tasks: BackgroundTasks,
) -> ItemResponse:
    """Create item with background processing"""
    created = await service.create(item)

    # Schedule background task
    background_tasks.add_task(
        send_notification,
        item_id=created.id,
    )

    return ItemResponse.model_validate(created)
```
