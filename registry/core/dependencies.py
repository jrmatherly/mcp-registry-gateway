"""Centralized dependency injection for FastAPI.

This module provides centralized dependency injection for the MCP Registry Gateway,
following FastAPI best practices for testable, maintainable code.

Usage in routes:
    from registry.core.dependencies import (
        ServerServiceDep,
        AgentServiceDep,
        HealthServiceDep,
    )

    @router.post("/servers/register")
    async def register_server(
        request: Request,
        server_service: ServerServiceDep,
        health_service: HealthServiceDep,
    ):
        # Services are injected and testable
        ...
"""

from functools import lru_cache
from typing import TYPE_CHECKING, Annotated

from fastapi import Depends

from ..repositories.factory import (
    get_agent_repository,
    get_federation_config_repository,
    get_scope_repository,
    get_search_repository,
    get_security_scan_repository,
    get_server_repository,
)
from ..repositories.interfaces import (
    AgentRepositoryBase,
    FederationConfigRepositoryBase,
    ScopeRepositoryBase,
    SearchRepositoryBase,
    SecurityScanRepositoryBase,
    ServerRepositoryBase,
)

if TYPE_CHECKING:
    from ..health.service import HealthMonitoringService
    from ..search.service import FaissService
    from ..services.agent_service import AgentService
    from ..services.server_service import ServerService


# =============================================================================
# Repository Dependencies
# =============================================================================
# These wrap the factory functions for use with FastAPI's Depends()


def get_server_repo() -> ServerRepositoryBase:
    """Get server repository dependency."""
    return get_server_repository()


def get_agent_repo() -> AgentRepositoryBase:
    """Get agent repository dependency."""
    return get_agent_repository()


def get_search_repo() -> SearchRepositoryBase:
    """Get search repository dependency."""
    return get_search_repository()


def get_scope_repo() -> ScopeRepositoryBase:
    """Get scope repository dependency."""
    return get_scope_repository()


def get_security_scan_repo() -> SecurityScanRepositoryBase:
    """Get security scan repository dependency."""
    return get_security_scan_repository()


def get_federation_config_repo() -> FederationConfigRepositoryBase:
    """Get federation config repository dependency."""
    return get_federation_config_repository()


# Type aliases for cleaner route signatures
ServerRepoDep = Annotated[ServerRepositoryBase, Depends(get_server_repo)]
AgentRepoDep = Annotated[AgentRepositoryBase, Depends(get_agent_repo)]
SearchRepoDep = Annotated[SearchRepositoryBase, Depends(get_search_repo)]
ScopeRepoDep = Annotated[ScopeRepositoryBase, Depends(get_scope_repo)]
SecurityScanRepoDep = Annotated[SecurityScanRepositoryBase, Depends(get_security_scan_repo)]
FederationConfigRepoDep = Annotated[
    FederationConfigRepositoryBase, Depends(get_federation_config_repo)
]


# =============================================================================
# Service Dependencies
# =============================================================================
# Services are cached using lru_cache to maintain singleton behavior
# while enabling dependency injection for testing.


@lru_cache
def get_server_service() -> "ServerService":
    """Get server service singleton.

    Returns:
        ServerService instance (cached).
    """
    from ..services.server_service import ServerService

    return ServerService()


@lru_cache
def get_agent_service() -> "AgentService":
    """Get agent service singleton.

    Returns:
        AgentService instance (cached).
    """
    from ..services.agent_service import AgentService

    return AgentService()


@lru_cache
def get_health_service() -> "HealthMonitoringService":
    """Get health monitoring service singleton.

    Returns:
        HealthMonitoringService instance (cached).
    """
    from ..health.service import HealthMonitoringService

    return HealthMonitoringService()


@lru_cache
def get_search_service() -> "FaissService":
    """Get FAISS search service singleton.

    Returns:
        FaissService instance (cached).
    """
    from ..search.service import FaissService

    return FaissService()


# Type aliases for cleaner route signatures
ServerServiceDep = Annotated["ServerService", Depends(get_server_service)]
AgentServiceDep = Annotated["AgentService", Depends(get_agent_service)]
HealthServiceDep = Annotated["HealthMonitoringService", Depends(get_health_service)]
SearchServiceDep = Annotated["FaissService", Depends(get_search_service)]


# =============================================================================
# Dependency Override Helpers (for testing)
# =============================================================================


def clear_service_caches() -> None:
    """Clear all service caches.

    Use this in tests to reset singleton state between test cases.

    Example:
        @pytest.fixture(autouse=True)
        def reset_services():
            yield
            clear_service_caches()
    """
    get_server_service.cache_clear()
    get_agent_service.cache_clear()
    get_health_service.cache_clear()
    get_search_service.cache_clear()
