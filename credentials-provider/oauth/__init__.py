"""OAuth authentication utilities for MCP Gateway.

This module provides OAuth 2.0 authentication flows for:
- Ingress authentication (M2M tokens for accessing MCP Gateway)
- Egress authentication (tokens for external OAuth providers)
- Generic OAuth flows for various providers
"""

from .egress_oauth import main as egress_oauth_main
from .generic_oauth_flow import OAuthConfig, run_oauth_flow
from .ingress_oauth import main as ingress_oauth_main

__all__ = [
    "OAuthConfig",
    "egress_oauth_main",
    "ingress_oauth_main",
    "run_oauth_flow",
]
