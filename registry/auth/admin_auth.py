"""
Admin authentication utilities for internal endpoints.

This module provides HTTP Basic Authentication verification for admin endpoints,
eliminating code duplication across server_routes.py.
"""

import base64
import logging
import os

from fastapi import HTTPException, Request, status

logger = logging.getLogger(__name__)


class AdminAuthError(Exception):
    """Exception raised for admin authentication failures."""

    pass


async def verify_admin_credentials(request: Request) -> str:
    """
    Verify HTTP Basic Auth admin credentials from request.

    Args:
        request: FastAPI request object

    Returns:
        Username of authenticated admin

    Raises:
        HTTPException: On authentication failure (401) or server config error (500)
    """
    auth_header = request.headers.get("Authorization")

    if not auth_header or not auth_header.startswith("Basic "):
        logger.debug("Admin auth failed: No valid Basic auth header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Basic"},
        )

    try:
        encoded_credentials = auth_header.split(" ")[1]
        decoded_credentials = base64.b64decode(encoded_credentials).decode("utf-8")
        username, password = decoded_credentials.split(":", 1)
        logger.debug(f"Admin auth: Decoded credentials for user '{username}'")
    except (IndexError, ValueError, UnicodeDecodeError) as e:
        logger.debug(f"Admin auth failed: Invalid credential format - {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication format",
            headers={"WWW-Authenticate": "Basic"},
        ) from e

    admin_user = os.environ.get("ADMIN_USER", "admin")
    admin_password = os.environ.get("ADMIN_PASSWORD")

    if not admin_password:
        logger.error("ADMIN_PASSWORD environment variable not set")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server configuration error",
        )

    if username != admin_user or password != admin_password:
        logger.warning(f"Failed admin authentication attempt from user '{username}'")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials",
            headers={"WWW-Authenticate": "Basic"},
        )

    logger.debug(f"Admin auth successful for user '{username}'")
    return username
