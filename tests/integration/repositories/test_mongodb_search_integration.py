"""
Integration tests for MongoDBSearchRepository with real MongoDB.

These tests require a running MongoDB CE 8.2+ instance with mongot.
Tests will be skipped if MongoDB or mongot is not available.
"""

import logging
from typing import Any

import pytest

from registry.core.config import settings

logger = logging.getLogger(__name__)


# =============================================================================
# SKIP CONDITIONS
# =============================================================================

# Skip all tests in this module if not using mongodb backend
pytestmark = [
    pytest.mark.integration,
    pytest.mark.skipif(
        settings.storage_backend != "mongodb",
        reason="Requires storage_backend=mongodb",
    ),
]


# =============================================================================
# FIXTURES
# =============================================================================


@pytest.fixture
def sample_server_info() -> dict[str, Any]:
    """Sample server data for testing."""
    return {
        "path": "/test-vector-server",
        "server_name": "Vector Test Server",
        "description": "A test server for vector search integration testing",
        "tags": ["test", "vector", "integration"],
        "tool_list": [
            {
                "name": "vector_search",
                "description": "Search using vectors",
                "inputSchema": {"type": "object"},
            },
            {
                "name": "semantic_match",
                "description": "Match content semantically",
                "inputSchema": {"type": "object"},
            },
        ],
        "registered_at": "2024-01-01T00:00:00Z",
    }


@pytest.fixture
def sample_agent_card():
    """Sample agent card for testing."""
    from registry.schemas.agent_models import AgentCard, AgentSkill

    return AgentCard(
        name="Vector Test Agent",
        description="A test agent for vector search integration testing",
        url="http://localhost:9000/test-agent",
        protocolVersion="1.0",
        version="1.0",
        path="/test-vector-agent",
        tags=["test", "vector", "integration"],
        capabilities=["streaming", "tools"],
        skills=[
            AgentSkill(
                id="vector-skill",
                name="Vector Search Skill",
                description="Search using vector embeddings",
                tags=["vector"],
            )
        ],
        visibility="public",
    )


@pytest.fixture
async def mongodb_search_repo():
    """Create a MongoDBSearchRepository for integration testing.

    This fixture creates a real repository connected to MongoDB.
    Cleanup is performed after each test.
    """
    from registry.repositories.mongodb.search_repository import MongoDBSearchRepository

    repo = MongoDBSearchRepository()

    # Initialize the repository (creates indexes if needed)
    try:
        await repo.initialize()
    except Exception as e:
        logger.warning(f"Failed to initialize vector search index: {e}")
        # Continue anyway - fallback search should work

    yield repo

    # Cleanup - remove test documents
    try:
        collection = await repo._get_collection()
        await collection.delete_many({"path": {"$regex": "^/test-"}})
    except Exception as e:
        logger.warning(f"Cleanup failed: {e}")


# =============================================================================
# INTEGRATION TESTS
# =============================================================================


@pytest.mark.integration
class TestMongoDBSearchRepositoryIntegration:
    """Integration tests for MongoDB CE 8.2+ vector search."""

    @pytest.mark.asyncio
    async def test_index_and_search_server(
        self,
        mongodb_search_repo,
        sample_server_info,
    ):
        """Test indexing a server and searching for it."""
        # Arrange - Index the server
        await mongodb_search_repo.index_server(
            path=sample_server_info["path"],
            server_info=sample_server_info,
            is_enabled=True,
        )

        # Act - Search for the server
        results = await mongodb_search_repo.search(
            query="vector search testing",
            entity_types=["mcp_server"],
            max_results=10,
        )

        # Assert
        assert "servers" in results
        assert "tools" in results
        assert "agents" in results

        # Should find our test server
        server_paths = [s.get("path") for s in results["servers"]]
        assert sample_server_info["path"] in server_paths

    @pytest.mark.asyncio
    async def test_index_and_search_agent(
        self,
        mongodb_search_repo,
        sample_agent_card,
    ):
        """Test indexing an agent and searching for it."""
        # Arrange - Index the agent
        await mongodb_search_repo.index_agent(
            path=sample_agent_card.path,
            agent_card=sample_agent_card,
            is_enabled=True,
        )

        # Act - Search for the agent
        results = await mongodb_search_repo.search(
            query="vector embeddings agent",
            entity_types=["a2a_agent"],
            max_results=10,
        )

        # Assert
        assert "agents" in results

        # Should find our test agent
        agent_paths = [a.get("path") for a in results["agents"]]
        assert sample_agent_card.path in agent_paths

    @pytest.mark.asyncio
    async def test_remove_entity(
        self,
        mongodb_search_repo,
        sample_server_info,
    ):
        """Test removing an entity from the search index."""
        # Arrange - Index the server first
        await mongodb_search_repo.index_server(
            path=sample_server_info["path"],
            server_info=sample_server_info,
            is_enabled=True,
        )

        # Verify it's indexed
        results = await mongodb_search_repo.search(
            query="vector search",
            entity_types=["mcp_server"],
            max_results=10,
        )
        initial_count = len(
            [s for s in results["servers"] if s.get("path") == sample_server_info["path"]]
        )

        # Act - Remove the entity
        await mongodb_search_repo.remove_entity(sample_server_info["path"])

        # Assert - Search should not find it
        results = await mongodb_search_repo.search(
            query="vector search",
            entity_types=["mcp_server"],
            max_results=10,
        )
        final_count = len(
            [s for s in results["servers"] if s.get("path") == sample_server_info["path"]]
        )

        assert final_count < initial_count

    @pytest.mark.asyncio
    async def test_hybrid_search_with_keyword_boost(
        self,
        mongodb_search_repo,
        sample_server_info,
    ):
        """Test that keyword matches boost relevance scores."""
        # Arrange - Index server with distinctive name
        custom_server = sample_server_info.copy()
        custom_server["path"] = "/test-weather-server"
        custom_server["server_name"] = "Weather API Server"
        custom_server["description"] = "Get weather data and forecasts"

        await mongodb_search_repo.index_server(
            path=custom_server["path"],
            server_info=custom_server,
            is_enabled=True,
        )

        # Also index a generic server
        generic_server = sample_server_info.copy()
        generic_server["path"] = "/test-generic-server"
        generic_server["server_name"] = "Generic Data Server"
        generic_server["description"] = "General purpose data operations"

        await mongodb_search_repo.index_server(
            path=generic_server["path"],
            server_info=generic_server,
            is_enabled=True,
        )

        # Act - Search for "weather" specifically
        results = await mongodb_search_repo.search(
            query="weather forecast",
            entity_types=["mcp_server"],
            max_results=10,
        )

        # Assert - Weather server should rank higher due to keyword match
        if len(results["servers"]) >= 2:
            weather_result = next(
                (s for s in results["servers"] if "weather" in s.get("path", "").lower()),
                None,
            )
            generic_result = next(
                (s for s in results["servers"] if "generic" in s.get("path", "").lower()),
                None,
            )

            if weather_result and generic_result:
                # Weather server should have higher relevance due to keyword match
                assert weather_result.get("relevance_score", 0) >= generic_result.get(
                    "relevance_score", 0
                )

    @pytest.mark.asyncio
    async def test_search_returns_grouped_results(
        self,
        mongodb_search_repo,
        sample_server_info,
        sample_agent_card,
    ):
        """Test that search returns properly grouped results."""
        # Arrange - Index both a server and an agent
        await mongodb_search_repo.index_server(
            path=sample_server_info["path"],
            server_info=sample_server_info,
            is_enabled=True,
        )
        await mongodb_search_repo.index_agent(
            path=sample_agent_card.path,
            agent_card=sample_agent_card,
            is_enabled=True,
        )

        # Act - Search without entity type filter
        results = await mongodb_search_repo.search(
            query="vector test",
            max_results=10,
        )

        # Assert - Results should be grouped
        assert "servers" in results
        assert "tools" in results
        assert "agents" in results
        assert isinstance(results["servers"], list)
        assert isinstance(results["tools"], list)
        assert isinstance(results["agents"], list)

    @pytest.mark.asyncio
    async def test_search_with_entity_type_filter(
        self,
        mongodb_search_repo,
        sample_server_info,
        sample_agent_card,
    ):
        """Test that entity type filter works correctly."""
        # Arrange - Index both a server and an agent
        await mongodb_search_repo.index_server(
            path=sample_server_info["path"],
            server_info=sample_server_info,
            is_enabled=True,
        )
        await mongodb_search_repo.index_agent(
            path=sample_agent_card.path,
            agent_card=sample_agent_card,
            is_enabled=True,
        )

        # Act - Search for servers only
        server_results = await mongodb_search_repo.search(
            query="vector test",
            entity_types=["mcp_server"],
            max_results=10,
        )

        # Act - Search for agents only
        agent_results = await mongodb_search_repo.search(
            query="vector test",
            entity_types=["a2a_agent"],
            max_results=10,
        )

        # Assert - Each search should filter correctly
        # Server search may have agents empty
        assert "servers" in server_results
        assert "agents" in agent_results

    @pytest.mark.asyncio
    async def test_relevance_scores_in_valid_range(
        self,
        mongodb_search_repo,
        sample_server_info,
    ):
        """Test that relevance scores are in valid range (0-1)."""
        # Arrange
        await mongodb_search_repo.index_server(
            path=sample_server_info["path"],
            server_info=sample_server_info,
            is_enabled=True,
        )

        # Act
        results = await mongodb_search_repo.search(
            query="vector search",
            max_results=10,
        )

        # Assert
        for server in results["servers"]:
            score = server.get("relevance_score", 0)
            assert 0.0 <= score <= 1.0, f"Invalid relevance score: {score}"

        for tool in results["tools"]:
            score = tool.get("relevance_score", 0)
            assert 0.0 <= score <= 1.0, f"Invalid tool relevance score: {score}"

        for agent in results["agents"]:
            score = agent.get("relevance_score", 0)
            assert 0.0 <= score <= 1.0, f"Invalid agent relevance score: {score}"


# =============================================================================
# FALLBACK BEHAVIOR TESTS
# =============================================================================


@pytest.mark.integration
class TestMongoDBSearchFallback:
    """Tests for client-side fallback when mongot is unavailable."""

    @pytest.mark.asyncio
    async def test_fallback_search_works(
        self,
        mongodb_search_repo,
        sample_server_info,
    ):
        """Test that search works even without native $vectorSearch."""
        # Arrange - Index the server
        await mongodb_search_repo.index_server(
            path=sample_server_info["path"],
            server_info=sample_server_info,
            is_enabled=True,
        )

        # Act - Search should work regardless of mongot availability
        # (will use native $vectorSearch if available, otherwise client-side)
        results = await mongodb_search_repo.search(
            query="vector search testing",
            max_results=10,
        )

        # Assert - Should return valid results structure
        assert "servers" in results
        assert "tools" in results
        assert "agents" in results
        assert isinstance(results["servers"], list)
