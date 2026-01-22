"""Keycloak OAuth authentication utilities.

This module provides token generation for MCP agents using Keycloak OAuth2.
"""

from .generate_tokens import TokenGenerator, main

__all__ = [
    "TokenGenerator",
    "main",
]
