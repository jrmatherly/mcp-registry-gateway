"""Microsoft Entra ID (Azure AD) OAuth authentication utilities.

This module provides token generation using Microsoft Entra ID
OAuth2 client credentials flow.
"""

from .generate_tokens import generate_tokens, main

__all__ = [
    "generate_tokens",
    "main",
]
