"""Credentials provider utilities for MCP Gateway authentication.

This package provides OAuth authentication utilities for multiple identity providers:
- Cognito (AWS)
- Keycloak
- Microsoft Entra ID (Azure AD)
- Generic OAuth 2.0 providers

Submodules:
- oauth: OAuth flow implementations for ingress/egress authentication
- keycloak: Keycloak-specific token generation
- entra: Microsoft Entra ID token generation
- agentcore-auth: AgentCore Gateway authentication
"""

from .constants import (
    DEFAULT_COGNITO_TOKEN_EXPIRY,
    DEFAULT_ENTRA_TOKEN_EXPIRY,
    DEFAULT_KEYCLOAK_TOKEN_EXPIRY,
    DEFAULT_REDIRECT_PORT,
    LOGGING_FORMAT,
    TOKEN_EXPIRY_MARGIN,
)
from .exceptions import (
    ConfigurationError,
    CredentialsProviderError,
    TokenExpiredError,
    TokenRequestError,
)
from .utils import (
    generate_api_key,
    generate_request_id,
    redact_sensitive_value,
    setup_logging,
)

__all__ = [
    # Constants
    "DEFAULT_COGNITO_TOKEN_EXPIRY",
    "DEFAULT_ENTRA_TOKEN_EXPIRY",
    "DEFAULT_KEYCLOAK_TOKEN_EXPIRY",
    "DEFAULT_REDIRECT_PORT",
    "LOGGING_FORMAT",
    "TOKEN_EXPIRY_MARGIN",
    # Exceptions
    "ConfigurationError",
    "CredentialsProviderError",
    "TokenExpiredError",
    "TokenRequestError",
    # Utilities
    "generate_api_key",
    "generate_request_id",
    "redact_sensitive_value",
    "setup_logging",
]
