"""
Conftest for integration tests.

Provides fixtures specific to integration tests that involve multiple
components working together.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncGenerator, Generator
from typing import TYPE_CHECKING
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

if TYPE_CHECKING:
    from httpx import AsyncClient

logger = logging.getLogger(__name__)


@pytest.fixture(scope="function", autouse=True)
def reset_mongodb_client() -> Generator[None, None, None]:
    """Reset MongoDB client singleton before each test to pick up correct settings."""
    from registry.repositories.documentdb import client

    # Clear the global client cache so next test creates a new one with correct settings
    client._client = None
    client._database = None

    yield

    # Cleanup is handled by TestClient teardown


@pytest.fixture(autouse=True)
def mock_security_scanner() -> Generator[MagicMock, None, None]:
    """Mock security scanner for integration tests to avoid mcp-scanner dependency."""
    from registry.schemas.security import SecurityScanConfig, SecurityScanResult

    mock_service = MagicMock()

    # Return config with scanning disabled to avoid scan during registration
    mock_service.get_scan_config.return_value = SecurityScanConfig(
        enabled=False, scan_on_registration=False, block_unsafe_servers=False
    )

    # If scan is called anyway, return a passing result
    mock_service.scan_server = AsyncMock(
        return_value=SecurityScanResult(
            server_url="http://localhost:9000/mcp",
            server_path="/test-server",
            scan_timestamp="2025-01-01T00:00:00Z",
            is_safe=True,
            critical_issues=0,
            high_severity=0,
            medium_severity=0,
            low_severity=0,
            analyzers_used=["yara"],
            raw_output={},
            scan_failed=False,
        )
    )

    with patch("registry.api.server_routes.security_scanner_service", mock_service):
        yield mock_service


@pytest.fixture
def stateful_server_repository():
    """
    Create a stateful mock server repository that maintains data across operations.

    This fixture overrides the auto-mocked repository from root conftest
    to provide a repository that actually tracks server data for integration tests.

    Yields:
        StatefulServerRepository mock that maintains state
    """
    from datetime import UTC, datetime
    from typing import Any

    from registry.services.server_service import server_service

    # In-memory storage for servers
    _servers: dict[str, dict[str, Any]] = {}
    _server_states: dict[str, bool] = {}

    mock = AsyncMock()

    async def mock_create(server_info: dict[str, Any]) -> bool:
        path = server_info.get("path", "")
        if path in _servers:
            return False  # Already exists
        _servers[path] = server_info.copy()
        _servers[path]["registered_at"] = datetime.now(UTC).isoformat()
        _servers[path]["updated_at"] = datetime.now(UTC).isoformat()
        _servers[path].setdefault("is_enabled", False)
        _server_states[path] = False
        return True

    async def mock_get(path: str) -> dict[str, Any] | None:
        return _servers.get(path)

    async def mock_list_all() -> dict[str, dict[str, Any]]:
        return _servers.copy()

    async def mock_update(path: str, server_info: dict[str, Any]) -> bool:
        if path not in _servers:
            return False
        _servers[path].update(server_info)
        _servers[path]["updated_at"] = datetime.now(UTC).isoformat()
        return True

    async def mock_delete(path: str) -> bool:
        if path not in _servers:
            return False
        del _servers[path]
        _server_states.pop(path, None)
        return True

    async def mock_get_state(path: str) -> bool:
        return _server_states.get(path, False)

    async def mock_set_state(path: str, enabled: bool) -> bool:
        if path not in _servers:
            return False
        _server_states[path] = enabled
        _servers[path]["is_enabled"] = enabled
        return True

    mock.create = AsyncMock(side_effect=mock_create)
    mock.get = AsyncMock(side_effect=mock_get)
    mock.list_all = AsyncMock(side_effect=mock_list_all)
    mock.update = AsyncMock(side_effect=mock_update)
    mock.delete = AsyncMock(side_effect=mock_delete)
    mock.get_state = AsyncMock(side_effect=mock_get_state)
    mock.set_state = AsyncMock(side_effect=mock_set_state)
    mock.load_all = AsyncMock()

    # Patch both the factory function AND the existing server_service's repository
    # to ensure all code paths use the stateful mock
    original_repo = server_service._repo
    server_service._repo = mock

    with patch("registry.repositories.factory.get_server_repository", return_value=mock):
        yield mock

    # Restore original repository
    server_service._repo = original_repo


@pytest.fixture
def stateful_agent_repository():
    """
    Create a stateful mock agent repository that maintains data across operations.

    This fixture overrides the auto-mocked repository from root conftest
    to provide a repository that actually tracks agent data for integration tests.

    Yields:
        StatefulAgentRepository mock that maintains state
    """
    from datetime import UTC, datetime
    from typing import Any

    from registry.schemas.agent_models import AgentCard
    from registry.services.agent_service import agent_service

    # In-memory storage for agents
    _agents: dict[str, AgentCard] = {}
    _agent_states: dict[str, bool] = {}

    mock = AsyncMock()

    async def mock_create(agent: AgentCard) -> AgentCard:
        path = agent.path
        if path in _agents:
            raise ValueError(f"Agent path '{path}' already exists")
        if not agent.registered_at:
            agent.registered_at = datetime.now(UTC)
        if not agent.updated_at:
            agent.updated_at = datetime.now(UTC)
        _agents[path] = agent
        _agent_states[path] = False
        return agent

    async def mock_get(path: str) -> AgentCard | None:
        return _agents.get(path)

    async def mock_list_all() -> list[AgentCard]:
        return list(_agents.values())

    async def mock_update(path: str, updates: dict[str, Any]) -> AgentCard:
        if path not in _agents:
            raise ValueError(f"Agent not found at path: {path}")
        agent = _agents[path]
        agent_dict = agent.model_dump()
        agent_dict.update(updates)
        agent_dict["updated_at"] = datetime.now(UTC)
        updated_agent = AgentCard(**agent_dict)
        _agents[path] = updated_agent
        return updated_agent

    async def mock_delete(path: str) -> bool:
        if path not in _agents:
            return False
        del _agents[path]
        _agent_states.pop(path, None)
        return True

    async def mock_get_state(path: str = None) -> dict[str, list[str]] | bool:
        if path is None:
            state: dict[str, list[str]] = {"enabled": [], "disabled": []}
            for agent_path, enabled in _agent_states.items():
                if enabled:
                    state["enabled"].append(agent_path)
                else:
                    state["disabled"].append(agent_path)
            return state
        return _agent_states.get(path, False)

    async def mock_set_state(path: str, enabled: bool) -> bool:
        if path not in _agents:
            return False
        _agent_states[path] = enabled
        return True

    mock.create = AsyncMock(side_effect=mock_create)
    mock.get = AsyncMock(side_effect=mock_get)
    mock.list_all = AsyncMock(side_effect=mock_list_all)
    mock.update = AsyncMock(side_effect=mock_update)
    mock.delete = AsyncMock(side_effect=mock_delete)
    mock.get_state = AsyncMock(side_effect=mock_get_state)
    mock.set_state = AsyncMock(side_effect=mock_set_state)
    mock.load_all = AsyncMock()
    mock.save_state = AsyncMock()

    # Patch both the factory function AND the existing agent_service's repository
    # to ensure all code paths use the stateful mock
    original_repo = agent_service._repo
    agent_service._repo = mock

    # Also reset the agent_service cache
    original_registered = agent_service.registered_agents.copy()
    original_state = agent_service.agent_state.copy()
    agent_service.registered_agents.clear()
    agent_service.agent_state = {"enabled": [], "disabled": []}

    with patch("registry.repositories.factory.get_agent_repository", return_value=mock):
        yield mock

    # Restore original repository and state
    agent_service._repo = original_repo
    agent_service.registered_agents = original_registered
    agent_service.agent_state = original_state


@pytest.fixture
def test_client(mock_settings) -> Generator[TestClient, None, None]:
    """
    Create a FastAPI test client for integration tests.

    Args:
        mock_settings: Test settings fixture

    Yields:
        FastAPI TestClient instance
    """
    from registry.main import app

    with TestClient(app) as client:
        logger.debug("Created FastAPI test client")
        yield client


@pytest.fixture
async def async_test_client(mock_settings) -> AsyncGenerator[AsyncClient, None]:
    """
    Create an async FastAPI test client for integration tests.

    Args:
        mock_settings: Test settings fixture

    Yields:
        Async test client
    """
    from httpx import AsyncClient

    from registry.main import app

    async with AsyncClient(app=app, base_url="http://test") as client:
        logger.debug("Created async FastAPI test client")
        yield client
