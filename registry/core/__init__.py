"""Core infrastructure modules for the MCP Registry Gateway.

This package contains foundational components used across the registry:
- dependencies: Centralized FastAPI dependency injection
- task_manager: Background async task management
- config: Application configuration settings
- schemas: Core Pydantic schemas

NOTE: Dependencies are NOT imported here to avoid circular imports.
Import directly from registry.core.dependencies when needed:
    from registry.core.dependencies import ServerServiceDep, get_server_service
"""

from .task_manager import BackgroundTaskManager, task_manager

__all__ = [
    "BackgroundTaskManager",
    "task_manager",
]
