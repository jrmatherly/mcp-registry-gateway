"""
Constants for the authentication server.

This module contains all configuration constants used throughout the auth server.
"""

import os

# JWT Configuration
JWT_ISSUER = os.environ.get("JWT_ISSUER", "mcp-gateway-auth-server")
JWT_AUDIENCE = "mcp-registry"

# Token Lifetime Configuration
MAX_TOKEN_LIFETIME_HOURS = 24
DEFAULT_TOKEN_LIFETIME_HOURS = 8

# Rate Limiting Configuration
MAX_TOKENS_PER_USER_PER_HOUR = int(os.environ.get("MAX_TOKENS_PER_USER_PER_HOUR", "100"))

# Secret Key for JWT Signing
# In production, this should be set via environment variable
SECRET_KEY = os.environ.get(
    "JWT_SECRET_KEY",
    os.environ.get("SECRET_KEY", "your-secret-key-change-in-production"),
)
