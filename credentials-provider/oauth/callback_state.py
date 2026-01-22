"""Thread-safe callback state management for OAuth flows.

This module provides a thread-safe container for OAuth callback state,
replacing global mutable variables with a proper state management pattern.
"""

import threading
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    pass

__all__ = [
    "CallbackState",
    "get_callback_state",
    "reset_callback_state",
]


@dataclass
class CallbackState:
    """Thread-safe callback state container for OAuth flows.

    This replaces the global mutable variables previously used for
    callback handling, providing better thread safety and testability.
    """

    authorization_code: str | None = None
    received_state: str | None = None
    callback_received: bool = False
    callback_error: str | None = None
    pkce_verifier: str | None = None
    oauth_config: Any = None  # Actually OAuthConfig, but avoiding circular import

    def reset(self) -> None:
        """Reset state for a new OAuth flow."""
        self.authorization_code = None
        self.received_state = None
        self.callback_received = False
        self.callback_error = None
        self.pkce_verifier = None
        self.oauth_config = None

    def set_success(
        self,
        authorization_code: str,
        state: str | None = None,
    ) -> None:
        """Set successful callback state.

        Args:
            authorization_code: The authorization code from the callback.
            state: The state parameter from the callback.
        """
        self.authorization_code = authorization_code
        self.received_state = state
        self.callback_received = True
        self.callback_error = None

    def set_error(
        self,
        error: str,
    ) -> None:
        """Set error callback state.

        Args:
            error: The error message from the callback.
        """
        self.callback_error = error
        self.callback_received = True


# Thread-local storage for callback state
_callback_state_local = threading.local()

# Lock for thread-safe access
_state_lock = threading.Lock()


def get_callback_state() -> CallbackState:
    """Get the callback state for the current thread.

    Returns:
        The CallbackState instance for the current thread.
    """
    if not hasattr(_callback_state_local, "state"):
        with _state_lock:
            if not hasattr(_callback_state_local, "state"):
                _callback_state_local.state = CallbackState()
    return _callback_state_local.state


def reset_callback_state() -> None:
    """Reset the callback state for the current thread."""
    state = get_callback_state()
    state.reset()


# Module-level singleton for backwards compatibility
# This allows existing code to continue working while providing
# a migration path to the thread-safe approach
_global_state: CallbackState | None = None


def get_global_callback_state() -> CallbackState:
    """Get the global callback state (for backwards compatibility).

    Note: Prefer using get_callback_state() for thread-safe access.

    Returns:
        The global CallbackState instance.
    """
    global _global_state
    if _global_state is None:
        _global_state = CallbackState()
    return _global_state
