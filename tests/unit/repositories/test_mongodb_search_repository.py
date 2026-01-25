"""
Unit tests for MongoDBSearchRepository.

Tests the MongoDB CE 8.2+ native vector search repository implementation.
"""

import logging
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

logger = logging.getLogger(__name__)


# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def mock_mongodb_settings():
    """Mock settings for MongoDB CE 8.2+ vector search."""
    with patch("registry.repositories.mongodb.search_repository.settings") as mock_settings:
        mock_settings.embeddings_model_dimensions = 384
        mock_settings.embeddings_provider = "sentence-transformers"
        mock_settings.embeddings_model_name = "all-MiniLM-L6-v2"
        mock_settings.embeddings_model_dir = "/tmp/models"
        mock_settings.effective_embeddings_api_key = None
        mock_settings.effective_embeddings_api_base = None
        mock_settings.embeddings_aws_region = None
        mock_settings.documentdb_namespace = "default"
        mock_settings.mongodb_vector_index_name = "vector_index"
        mock_settings.mongodb_vector_similarity_metric = "cosine"
        mock_settings.mongodb_vector_num_candidates_multiplier = 10
        yield mock_settings


@pytest.fixture
def mock_embedding_config():
    """Mock embedding config."""
    with patch("registry.repositories.mongodb.search_repository.embedding_config") as mock_config:
        mock_config.get_embedding_metadata.return_value = {
            "provider": "sentence-transformers",
            "model": "all-MiniLM-L6-v2",
            "dimensions": 384,
        }
        yield mock_config


@pytest.fixture
def mock_collection():
    """Mock MongoDB collection."""
    collection = AsyncMock()
    collection.list_search_indexes = MagicMock(return_value=AsyncMock())
    collection.list_indexes = AsyncMock()
    collection.create_search_index = AsyncMock()
    collection.create_index = AsyncMock()
    collection.replace_one = AsyncMock()
    collection.delete_one = AsyncMock()
    collection.find = MagicMock(return_value=AsyncMock())
    collection.aggregate = MagicMock(return_value=AsyncMock())
    return collection


@pytest.fixture
def mock_db_client(mock_collection):
    """Mock DocumentDB client."""
    with patch(
        "registry.repositories.mongodb.search_repository.get_documentdb_client"
    ) as mock_get_client:
        mock_db = AsyncMock()
        mock_db.__getitem__ = MagicMock(return_value=mock_collection)
        mock_get_client.return_value = mock_db
        yield mock_get_client


@pytest.fixture
def mock_get_collection_name():
    """Mock get_collection_name function."""
    with patch("registry.repositories.mongodb.search_repository.get_collection_name") as mock_func:
        mock_func.return_value = "mcp_embeddings_384_default"
        yield mock_func


@pytest.fixture
def mock_embedding_model():
    """Mock embedding model."""
    mock_model = MagicMock()
    # Return a mock numpy array with tolist() method
    mock_array = MagicMock()
    mock_array.tolist.return_value = [0.1] * 384
    mock_model.encode.return_value = [mock_array]
    return mock_model


@pytest.fixture
def mongodb_search_repository(
    mock_mongodb_settings,
    mock_embedding_config,
    mock_db_client,
    mock_get_collection_name,
):
    """Create a MongoDBSearchRepository instance for testing."""
    from registry.repositories.mongodb.search_repository import MongoDBSearchRepository

    return MongoDBSearchRepository()


@pytest.fixture
def sample_server_info() -> dict[str, Any]:
    """Sample server data for testing."""
    return {
        "path": "/test-server",
        "server_name": "Test Server",
        "description": "A test server for vector search",
        "tags": ["test", "vector"],
        "tool_list": [
            {
                "name": "get_data",
                "description": "Get data from source",
                "inputSchema": {"type": "object"},
            }
        ],
        "registered_at": "2024-01-01T00:00:00Z",
    }


# =============================================================================
# TEST: Tokenizer Helper Functions
# =============================================================================


@pytest.mark.unit
@pytest.mark.repositories
class TestTokenizerFunctions:
    """Tests for tokenizer helper functions."""

    def test_tokenize_query_basic(self):
        """Test basic query tokenization."""
        from registry.repositories.mongodb.search_repository import _tokenize_query

        result = _tokenize_query("weather data API")
        assert "weather" in result
        assert "data" in result
        # "API" should be included (3 chars)
        assert "api" in result

    def test_tokenize_query_filters_stopwords(self):
        """Test that stopwords are filtered out."""
        from registry.repositories.mongodb.search_repository import _tokenize_query

        result = _tokenize_query("get the data from server")
        # "get", "the", "from" are stopwords
        assert "get" not in result
        assert "the" not in result
        assert "from" not in result
        # "data", "server" should remain
        assert "data" in result
        assert "server" in result

    def test_tokenize_query_filters_short_tokens(self):
        """Test that short tokens are filtered out."""
        from registry.repositories.mongodb.search_repository import _tokenize_query

        result = _tokenize_query("a b cd API test")
        # "a", "b", "cd" (2 chars or less) should be filtered
        assert "a" not in result
        assert "b" not in result
        assert "cd" not in result
        # "api", "test" should remain
        assert "api" in result
        assert "test" in result

    def test_tokens_match_text_basic(self):
        """Test basic token matching."""
        from registry.repositories.mongodb.search_repository import _tokens_match_text

        tokens = ["weather", "api"]
        assert _tokens_match_text(tokens, "Weather API for developers") is True
        assert _tokens_match_text(tokens, "No match here") is False

    def test_tokens_match_text_case_insensitive(self):
        """Test that token matching is case insensitive."""
        from registry.repositories.mongodb.search_repository import _tokens_match_text

        tokens = ["weather"]
        assert _tokens_match_text(tokens, "WEATHER API") is True
        assert _tokens_match_text(tokens, "Weather") is True

    def test_tokens_match_text_empty_inputs(self):
        """Test token matching with empty inputs."""
        from registry.repositories.mongodb.search_repository import _tokens_match_text

        assert _tokens_match_text([], "some text") is False
        assert _tokens_match_text(["token"], "") is False
        assert _tokens_match_text([], "") is False


# =============================================================================
# TEST: Initialize Method
# =============================================================================


@pytest.mark.unit
@pytest.mark.repositories
class TestInitialize:
    """Tests for the initialize method."""

    @pytest.mark.asyncio
    async def test_initialize_creates_vector_index(
        self,
        mongodb_search_repository,
        mock_collection,
    ):
        """Test that initialize creates a vector search index."""
        # Arrange
        mock_list_search_indexes = AsyncMock()
        mock_list_search_indexes.__aiter__ = AsyncMock(return_value=iter([]))
        mock_collection.list_search_indexes.return_value = mock_list_search_indexes

        mock_list_indexes = AsyncMock()
        mock_list_indexes.to_list = AsyncMock(return_value=[])
        mock_collection.list_indexes.return_value = mock_list_indexes

        mock_collection.create_search_index.return_value = "vector_index"

        # Act
        await mongodb_search_repository.initialize()

        # Assert
        mock_collection.create_search_index.assert_called_once()

    @pytest.mark.asyncio
    async def test_initialize_skips_existing_index(
        self,
        mongodb_search_repository,
        mock_collection,
    ):
        """Test that initialize skips creating index if it exists."""
        # Arrange - index already exists with the correct name
        existing_index = {"name": "vector_index", "type": "vectorSearch"}

        # Create async iterator properly for list_search_indexes
        async def async_index_gen():
            yield existing_index

        mock_collection.list_search_indexes.return_value = async_index_gen()

        mock_list_indexes = AsyncMock()
        mock_list_indexes.to_list = AsyncMock(
            return_value=[{"name": "path_idx"}, {"name": "entity_type_idx"}]
        )
        mock_collection.list_indexes.return_value = mock_list_indexes

        # Reset any previous call counts
        mock_collection.create_search_index.reset_mock()

        # Act
        await mongodb_search_repository.initialize()

        # Assert - should not create a new index since it already exists
        mock_collection.create_search_index.assert_not_called()


# =============================================================================
# TEST: Index Server Method
# =============================================================================


@pytest.mark.unit
@pytest.mark.repositories
class TestIndexServer:
    """Tests for the index_server method."""

    @pytest.mark.asyncio
    async def test_index_server_success(
        self,
        mongodb_search_repository,
        mock_collection,
        mock_embedding_model,
        sample_server_info,
    ):
        """Test successful server indexing."""
        # Arrange
        with patch.object(
            mongodb_search_repository,
            "_get_embedding_model",
            return_value=mock_embedding_model,
        ):
            mock_collection.replace_one.return_value = AsyncMock(upserted_id="/test-server")

            # Act
            await mongodb_search_repository.index_server(
                path="/test-server",
                server_info=sample_server_info,
                is_enabled=True,
            )

            # Assert
            mock_embedding_model.encode.assert_called_once()
            mock_collection.replace_one.assert_called_once()
            call_args = mock_collection.replace_one.call_args
            assert call_args[0][0] == {"_id": "/test-server"}
            doc = call_args[0][1]
            assert doc["entity_type"] == "mcp_server"
            assert doc["name"] == "Test Server"
            assert doc["is_enabled"] is True

    @pytest.mark.asyncio
    async def test_index_server_handles_errors(
        self,
        mongodb_search_repository,
        mock_collection,
        mock_embedding_model,
        sample_server_info,
    ):
        """Test error handling during server indexing."""
        # Arrange
        with patch.object(
            mongodb_search_repository,
            "_get_embedding_model",
            return_value=mock_embedding_model,
        ):
            mock_collection.replace_one.side_effect = Exception("Database error")

            # Act - should not raise exception
            await mongodb_search_repository.index_server(
                path="/test-server",
                server_info=sample_server_info,
                is_enabled=True,
            )

            # Assert - error was logged, not raised


# =============================================================================
# TEST: Remove Entity Method
# =============================================================================


@pytest.mark.unit
@pytest.mark.repositories
class TestRemoveEntity:
    """Tests for the remove_entity method."""

    @pytest.mark.asyncio
    async def test_remove_entity_success(
        self,
        mongodb_search_repository,
        mock_collection,
    ):
        """Test successful entity removal."""
        # Arrange
        mock_result = MagicMock()
        mock_result.deleted_count = 1
        mock_collection.delete_one.return_value = mock_result

        # Act
        await mongodb_search_repository.remove_entity("/test-server")

        # Assert
        mock_collection.delete_one.assert_called_once_with({"_id": "/test-server"})

    @pytest.mark.asyncio
    async def test_remove_entity_not_found(
        self,
        mongodb_search_repository,
        mock_collection,
    ):
        """Test removal of non-existent entity."""
        # Arrange
        mock_result = MagicMock()
        mock_result.deleted_count = 0
        mock_collection.delete_one.return_value = mock_result

        # Act - should not raise exception
        await mongodb_search_repository.remove_entity("/nonexistent")

        # Assert
        mock_collection.delete_one.assert_called_once()


# =============================================================================
# TEST: Cosine Similarity Calculation
# =============================================================================


@pytest.mark.unit
@pytest.mark.repositories
class TestCosineSimilarity:
    """Tests for cosine similarity calculation."""

    def test_calculate_cosine_similarity_identical(self, mongodb_search_repository):
        """Test cosine similarity of identical vectors."""
        vec = [1.0, 0.0, 0.0]
        result = mongodb_search_repository._calculate_cosine_similarity(vec, vec)
        assert abs(result - 1.0) < 0.0001

    def test_calculate_cosine_similarity_orthogonal(self, mongodb_search_repository):
        """Test cosine similarity of orthogonal vectors."""
        vec1 = [1.0, 0.0, 0.0]
        vec2 = [0.0, 1.0, 0.0]
        result = mongodb_search_repository._calculate_cosine_similarity(vec1, vec2)
        assert abs(result - 0.0) < 0.0001

    def test_calculate_cosine_similarity_empty_vectors(self, mongodb_search_repository):
        """Test cosine similarity with empty vectors."""
        result = mongodb_search_repository._calculate_cosine_similarity([], [])
        assert result == 0.0

    def test_calculate_cosine_similarity_different_lengths(self, mongodb_search_repository):
        """Test cosine similarity with vectors of different lengths."""
        result = mongodb_search_repository._calculate_cosine_similarity([1.0, 0.0], [1.0])
        assert result == 0.0


# =============================================================================
# TEST: Search Method
# =============================================================================


@pytest.mark.unit
@pytest.mark.repositories
class TestSearch:
    """Tests for the search method."""

    @pytest.mark.asyncio
    async def test_search_returns_grouped_results(
        self,
        mongodb_search_repository,
        mock_collection,
        mock_embedding_model,
    ):
        """Test that search returns properly grouped results."""
        # Arrange
        with patch.object(
            mongodb_search_repository,
            "_get_embedding_model",
            return_value=mock_embedding_model,
        ):
            mock_cursor = AsyncMock()
            mock_cursor.to_list = AsyncMock(return_value=[])
            mock_collection.aggregate.return_value = mock_cursor

            # Act
            result = await mongodb_search_repository.search("weather data", max_results=10)

            # Assert
            assert "servers" in result
            assert "tools" in result
            assert "agents" in result
            assert isinstance(result["servers"], list)
            assert isinstance(result["tools"], list)
            assert isinstance(result["agents"], list)

    @pytest.mark.asyncio
    async def test_search_falls_back_on_error(
        self,
        mongodb_search_repository,
        mock_collection,
        mock_embedding_model,
    ):
        """Test that search falls back to client-side on vector search error."""
        # Arrange
        from pymongo.errors import OperationFailure

        with patch.object(
            mongodb_search_repository,
            "_get_embedding_model",
            return_value=mock_embedding_model,
        ):
            # Simulate mongot not available error
            mock_collection.aggregate.side_effect = OperationFailure(
                "vectorSearch requires mongot", code=31082
            )

            # Mock client-side search fallback
            mock_cursor = AsyncMock()
            mock_cursor.to_list = AsyncMock(return_value=[])
            mock_collection.find.return_value = mock_cursor

            # Act
            result = await mongodb_search_repository.search("weather data")

            # Assert - should return empty results without raising error
            assert "servers" in result
            assert "tools" in result
            assert "agents" in result


# =============================================================================
# TEST: Format Search Results
# =============================================================================


@pytest.mark.unit
@pytest.mark.repositories
class TestFormatSearchResults:
    """Tests for the _format_search_results method."""

    def test_format_search_results_limits_per_type(self, mongodb_search_repository):
        """Test that results are limited to 3 per entity type."""
        # Arrange
        scored_docs = [
            {
                "doc": {
                    "entity_type": "mcp_server",
                    "path": f"/server{i}",
                    "name": f"Server {i}",
                    "description": f"Description {i}",
                    "tags": [],
                    "tools": [],
                    "metadata": {},
                    "is_enabled": True,
                },
                "relevance_score": 0.9 - i * 0.1,
                "vector_score": 0.9 - i * 0.1,
                "text_boost": 0.0,
            }
            for i in range(5)
        ]

        # Act
        result = mongodb_search_repository._format_search_results(scored_docs)

        # Assert - should only have 3 servers
        assert len(result["servers"]) == 3
        # Verify highest scores are first
        assert result["servers"][0]["path"] == "/server0"

    def test_format_search_results_includes_matching_tools(self, mongodb_search_repository):
        """Test that matching tools are included in results."""
        # Arrange
        scored_docs = [
            {
                "doc": {
                    "entity_type": "mcp_server",
                    "path": "/server1",
                    "name": "Server 1",
                    "description": "Description",
                    "tags": [],
                    "tools": [{"name": "get_data", "inputSchema": {}}],
                    "metadata": {},
                    "is_enabled": True,
                    "_matching_tools": [
                        {
                            "tool_name": "get_data",
                            "description": "Get data",
                            "relevance_score": 1.0,
                            "match_context": "Get data",
                        }
                    ],
                },
                "relevance_score": 0.9,
                "vector_score": 0.9,
                "text_boost": 1.0,
            }
        ]

        # Act
        result = mongodb_search_repository._format_search_results(scored_docs)

        # Assert
        assert len(result["servers"]) == 1
        assert len(result["servers"][0]["matching_tools"]) == 1
        assert result["servers"][0]["matching_tools"][0]["tool_name"] == "get_data"
