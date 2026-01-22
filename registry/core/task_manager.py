"""Background task management with proper lifecycle and error handling.

This module provides a centralized task manager for background async operations,
ensuring proper tracking, error logging, and graceful shutdown.

Usage:
    from registry.core.task_manager import task_manager

    # Create tracked background task
    task_manager.create_task(
        some_async_operation(),
        name="health_check_server_1"
    )

    # In application lifespan
    @asynccontextmanager
    async def lifespan(app: FastAPI):
        yield
        await task_manager.shutdown()
"""

import asyncio
import logging
from collections.abc import Coroutine
from typing import Any

logger = logging.getLogger(__name__)


class BackgroundTaskManager:
    """Manages background tasks with proper lifecycle and error handling.

    Features:
        - Tracks all running background tasks
        - Logs task failures with context
        - Provides graceful shutdown with configurable timeout
        - Enables monitoring of task count and status

    Example:
        manager = BackgroundTaskManager()

        # Create tracked task
        manager.create_task(
            fetch_data(),
            name="fetch_user_data"
        )

        # Monitor tasks
        print(f"Running tasks: {manager.task_count}")

        # Graceful shutdown
        await manager.shutdown(timeout=5.0)
    """

    def __init__(self) -> None:
        """Initialize the background task manager."""
        self._tasks: set[asyncio.Task[Any]] = set()
        self._shutdown_initiated = False

    @property
    def task_count(self) -> int:
        """Return the number of currently tracked tasks."""
        return len(self._tasks)

    @property
    def task_names(self) -> list[str]:
        """Return names of all currently tracked tasks."""
        return [task.get_name() for task in self._tasks]

    def create_task(
        self,
        coro: Coroutine[Any, Any, Any],
        name: str | None = None,
    ) -> asyncio.Task[Any]:
        """Create a tracked background task with error handling.

        Args:
            coro: The coroutine to run as a background task.
            name: Optional name for the task (useful for debugging).

        Returns:
            The created asyncio.Task instance.

        Example:
            task = task_manager.create_task(
                health_service.check_server(server_id),
                name=f"health_check_{server_id}"
            )
        """
        if self._shutdown_initiated:
            logger.warning(f"Task creation attempted after shutdown initiated: {name or 'unnamed'}")
            # Cancel the coroutine to avoid "coroutine was never awaited" warning
            coro.close()
            raise RuntimeError("Cannot create tasks after shutdown has been initiated")

        task = asyncio.create_task(coro, name=name)
        self._tasks.add(task)
        task.add_done_callback(self._on_task_done)

        logger.debug(f"Created background task: {task.get_name()}")
        return task

    def _on_task_done(self, task: asyncio.Task[Any]) -> None:
        """Handle task completion, logging any errors.

        Args:
            task: The completed task.
        """
        self._tasks.discard(task)

        task_name = task.get_name()

        if task.cancelled():
            logger.debug(f"Task cancelled: {task_name}")
            return

        exception = task.exception()
        if exception is not None:
            logger.error(
                f"Background task failed: {task_name}",
                exc_info=exception,
            )
        else:
            logger.debug(f"Task completed successfully: {task_name}")

    async def shutdown(self, timeout: float = 5.0) -> None:
        """Cancel all pending tasks and wait for completion.

        Args:
            timeout: Maximum time to wait for tasks to complete (seconds).

        Example:
            # In FastAPI lifespan
            @asynccontextmanager
            async def lifespan(app: FastAPI):
                yield
                await task_manager.shutdown(timeout=10.0)
        """
        self._shutdown_initiated = True

        if not self._tasks:
            logger.info("No background tasks to shutdown")
            return

        task_count = len(self._tasks)
        logger.info(f"Shutting down {task_count} background task(s)...")

        # Cancel all tasks
        for task in self._tasks:
            task.cancel()

        # Wait for all tasks to complete (with timeout)
        try:
            await asyncio.wait_for(
                asyncio.gather(*self._tasks, return_exceptions=True),
                timeout=timeout,
            )
            logger.info("All background tasks completed")
        except TimeoutError:
            remaining = len(self._tasks)
            logger.warning(
                f"Shutdown timeout: {remaining} task(s) did not complete within {timeout}s"
            )

    def cancel_task_by_name(self, name: str) -> bool:
        """Cancel a specific task by name.

        Args:
            name: The name of the task to cancel.

        Returns:
            True if task was found and cancelled, False otherwise.
        """
        for task in self._tasks:
            if task.get_name() == name:
                task.cancel()
                logger.info(f"Cancelled task: {name}")
                return True
        return False

    def get_stats(self) -> dict[str, Any]:
        """Get statistics about current background tasks.

        Returns:
            Dictionary containing task statistics.
        """
        return {
            "total_tasks": len(self._tasks),
            "task_names": self.task_names,
            "shutdown_initiated": self._shutdown_initiated,
        }


# Global singleton instance
task_manager = BackgroundTaskManager()
