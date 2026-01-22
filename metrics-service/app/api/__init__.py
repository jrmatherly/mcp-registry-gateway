"""API layer for the metrics service."""

from .auth import get_rate_limit_status, verify_api_key
from .routes import router

__all__ = [
    "get_rate_limit_status",
    "router",
    "verify_api_key",
]
