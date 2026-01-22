# Mock Patterns

## AsyncMock Basics

```python
from unittest.mock import AsyncMock, MagicMock, patch


# Create async mock
mock_repo = AsyncMock()

# Configure return value
mock_repo.get.return_value = {"id": "123", "name": "test"}

# Configure side effect (exception)
mock_repo.delete.side_effect = Exception("Database error")

# Configure multiple return values
mock_repo.list.side_effect = [
    [{"id": "1"}],
    [{"id": "2"}],
    [],
]
```

## Asserting Mock Calls

```python
@pytest.mark.asyncio
async def test_with_assertions(mock_repository, service):
    await service.get("123")

    # Assert called
    mock_repository.get.assert_awaited()

    # Assert called once
    mock_repository.get.assert_awaited_once()

    # Assert called with specific args
    mock_repository.get.assert_awaited_once_with("123")

    # Assert call count
    assert mock_repository.get.await_count == 1

    # Assert not called
    mock_repository.delete.assert_not_awaited()
```

## Patching

```python
from unittest.mock import patch, AsyncMock


# Patch as decorator
@pytest.mark.asyncio
@patch("registry.services.server_service.logger")
async def test_with_patch(mock_logger, service):
    await service.create(data)
    mock_logger.info.assert_called()


# Patch as context manager
@pytest.mark.asyncio
async def test_with_context_patch(service):
    with patch("registry.services.server_service.send_notification") as mock_notify:
        mock_notify.return_value = None
        await service.create(data)
        mock_notify.assert_called_once()


# Patch async function
@pytest.mark.asyncio
async def test_patch_async():
    with patch(
        "registry.services.external_api.fetch_data",
        new_callable=AsyncMock,
        return_value={"data": "value"},
    ) as mock_fetch:
        result = await some_function()
        mock_fetch.assert_awaited_once()
```

## Mocking HTTP Clients

```python
import pytest
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture
def mock_http_response():
    """Mock HTTP response."""
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {"result": "success"}
    return response


@pytest.fixture
def mock_http_client(mock_http_response):
    """Mock async HTTP client."""
    client = AsyncMock()
    client.get.return_value = mock_http_response
    client.post.return_value = mock_http_response
    return client


@pytest.mark.asyncio
async def test_external_api(mock_http_client):
    with patch("registry.services.api_client.client", mock_http_client):
        result = await fetch_external_data()
        mock_http_client.get.assert_awaited_once()
```

## Mocking Database

```python
@pytest.fixture
def mock_collection():
    """Mock MongoDB collection."""
    collection = AsyncMock()
    collection.find_one.return_value = {"_id": "123", "name": "test"}
    collection.insert_one.return_value = MagicMock(inserted_id="123")
    collection.update_one.return_value = MagicMock(modified_count=1)
    collection.delete_one.return_value = MagicMock(deleted_count=1)
    return collection


@pytest.fixture
def mock_database(mock_collection):
    """Mock MongoDB database."""
    db = MagicMock()
    db.servers = mock_collection
    db.__getitem__ = MagicMock(return_value=mock_collection)
    return db
```

## Property Mocking

```python
from unittest.mock import PropertyMock


@pytest.mark.asyncio
async def test_property_mock():
    with patch.object(
        MyClass,
        "my_property",
        new_callable=PropertyMock,
        return_value="mocked_value",
    ):
        instance = MyClass()
        assert instance.my_property == "mocked_value"
```

## Spy Pattern

```python
from unittest.mock import patch


@pytest.mark.asyncio
async def test_spy_on_method(service):
    """Test that calls original but allows assertions."""
    with patch.object(
        service._repository,
        "get",
        wraps=service._repository.get,
    ) as spy:
        result = await service.get("123")
        spy.assert_awaited_once_with("123")
        # result contains actual return value
```
