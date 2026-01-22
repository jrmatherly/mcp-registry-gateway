"""
Conftest for unit tests.

Provides fixtures specific to unit tests.
"""

import logging
from unittest.mock import AsyncMock, MagicMock

import pytest

from tests.fixtures.mocks.mock_embeddings import MockEmbeddingsClient
from tests.fixtures.mocks.mock_http import MockAsyncClient

logger = logging.getLogger(__name__)


@pytest.fixture
def mock_faiss_service() -> MagicMock:
    """
    Create a mock FAISS service for testing.

    Returns:
        Mock FAISS service with common methods
    """
    service = MagicMock()
    service.add_server = MagicMock()
    service.remove_server = MagicMock()
    service.search = MagicMock(return_value=[])
    service.get_index_size = MagicMock(return_value=0)
    return service


@pytest.fixture
def mock_embeddings_client() -> MockEmbeddingsClient:
    """
    Create a mock embeddings client for testing.

    Returns:
        Mock embeddings client
    """
    return MockEmbeddingsClient()


@pytest.fixture
def mock_http_client() -> MockAsyncClient:
    """
    Create a mock HTTP client for testing.

    Returns:
        Mock HTTP client
    """
    return MockAsyncClient()


@pytest.fixture
def mock_mcp_client() -> AsyncMock:
    """
    Create a mock MCP client for testing.

    Returns:
        Mock MCP client with common methods
    """
    client = AsyncMock()
    client.connect = AsyncMock()
    client.disconnect = AsyncMock()
    client.list_tools = AsyncMock(return_value=[])
    client.call_tool = AsyncMock(return_value={})
    return client
