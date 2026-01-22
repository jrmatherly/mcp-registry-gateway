"""Core infrastructure modules for the MCP Registry Gateway.

This package contains foundational components used across the registry:
- dependencies: Centralized FastAPI dependency injection
- task_manager: Background async task management
- config: Application configuration settings
- schemas: Core Pydantic schemas
"""

from .dependencies import (
    AgentRepoDep,
    AgentServiceDep,
    FederationConfigRepoDep,
    HealthServiceDep,
    ScopeRepoDep,
    SearchRepoDep,
    SearchServiceDep,
    SecurityScanRepoDep,
    ServerRepoDep,
    ServerServiceDep,
    clear_service_caches,
    get_agent_service,
    get_health_service,
    get_search_service,
    get_server_service,
)
from .task_manager import BackgroundTaskManager, task_manager

__all__ = [
    "AgentRepoDep",
    "AgentServiceDep",
    "BackgroundTaskManager",
    "FederationConfigRepoDep",
    "HealthServiceDep",
    "ScopeRepoDep",
    "SearchRepoDep",
    "SearchServiceDep",
    "SecurityScanRepoDep",
    "ServerRepoDep",
    "ServerServiceDep",
    "clear_service_caches",
    "get_agent_service",
    "get_health_service",
    "get_search_service",
    "get_server_service",
    "task_manager",
]
