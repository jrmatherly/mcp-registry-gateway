"""Common M2M (Machine-to-Machine) OAuth2 authentication utilities.

This module provides a unified interface for M2M authentication across
different OAuth providers (Cognito, Keycloak, Entra ID).
"""

import logging
import time
from typing import Any

import requests

from .constants import (
    DEFAULT_COGNITO_TOKEN_EXPIRY,
    DEFAULT_ENTRA_TOKEN_EXPIRY,
    DEFAULT_KEYCLOAK_TOKEN_EXPIRY,
    HTTP_REQUEST_TIMEOUT,
)
from .exceptions import TokenRequestError

__all__ = [
    "build_token_result",
    "perform_m2m_authentication",
]

logger = logging.getLogger(__name__)


def perform_m2m_authentication(
    token_url: str,
    client_id: str,
    client_secret: str,
    provider_name: str,
    additional_payload: dict[str, Any] | None = None,
    default_expiry: int | None = None,
    timeout: int = HTTP_REQUEST_TIMEOUT,
) -> dict[str, Any]:
    """Perform M2M (client credentials) OAuth 2.0 authentication.

    This is a generic function that works with Cognito, Keycloak, Entra ID,
    and other OAuth providers that support the client_credentials grant.

    Args:
        token_url: The OAuth token endpoint URL.
        client_id: The OAuth client ID.
        client_secret: The OAuth client secret.
        provider_name: Name of the provider (for logging and result metadata).
        additional_payload: Additional fields to include in the token request.
        default_expiry: Default token expiry in seconds if not in response.
        timeout: HTTP request timeout in seconds.

    Returns:
        Dictionary containing token data with standardized fields:
        - access_token: The access token string
        - refresh_token: The refresh token (if provided, usually None for M2M)
        - expires_at: Unix timestamp when token expires
        - token_type: Token type (usually "Bearer")
        - provider: The provider name

    Raises:
        TokenRequestError: If token request fails or response is invalid.
    """
    # Determine default expiry based on provider if not specified
    if default_expiry is None:
        if "cognito" in provider_name.lower():
            default_expiry = DEFAULT_COGNITO_TOKEN_EXPIRY
        elif "keycloak" in provider_name.lower():
            default_expiry = DEFAULT_KEYCLOAK_TOKEN_EXPIRY
        elif "entra" in provider_name.lower():
            default_expiry = DEFAULT_ENTRA_TOKEN_EXPIRY
        else:
            default_expiry = 3600  # 1 hour fallback

    # Build the token request payload
    payload = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
    }

    if additional_payload:
        payload.update(additional_payload)

    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
    }

    logger.info(f"Requesting M2M token from {token_url}")
    logger.debug(f"Using client_id: {client_id[:10]}..." if client_id else "No client_id")

    try:
        response = requests.post(
            token_url,
            data=payload,
            headers=headers,
            timeout=timeout,
        )

        if not response.ok:
            error_msg = f"Token request failed with status {response.status_code}"
            try:
                error_data = response.json()
                error_detail = error_data.get(
                    "error_description",
                    error_data.get("error", response.text),
                )
                error_msg = f"{error_msg}: {error_detail}"
            except Exception:
                error_msg = f"{error_msg}: {response.text}"

            logger.error(error_msg)
            raise TokenRequestError(error_msg)

        token_data = response.json()

        if "access_token" not in token_data:
            error_msg = f"Access token not found in response. Keys: {list(token_data.keys())}"
            logger.error(error_msg)
            raise TokenRequestError(error_msg)

        # Build standardized result
        result = build_token_result(
            token_data=token_data,
            provider_name=provider_name,
            default_expiry=default_expiry,
        )

        logger.info(f"M2M token obtained successfully from {provider_name}!")

        if result.get("expires_at"):
            expires_in = int(result["expires_at"] - time.time())
            logger.info(f"Token expires in: {expires_in} seconds")

        return result

    except requests.exceptions.RequestException as e:
        error_msg = f"Network error during M2M token request: {e}"
        logger.error(error_msg)
        raise TokenRequestError(error_msg) from e


def build_token_result(
    token_data: dict[str, Any],
    provider_name: str,
    default_expiry: int = 3600,
    additional_fields: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build a standardized token result dictionary.

    Args:
        token_data: Raw token response from OAuth provider.
        provider_name: Name of the provider.
        default_expiry: Default expiry in seconds if not in token_data.
        additional_fields: Additional fields to include in result.

    Returns:
        Standardized token result dictionary.
    """
    # Calculate expiry time
    expires_in = token_data.get("expires_in", default_expiry)
    expires_at = time.time() + expires_in

    if "expires_in" not in token_data:
        logger.warning(
            f"No expires_in in token response, assuming {default_expiry} seconds validity"
        )

    result = {
        "access_token": token_data["access_token"],
        "refresh_token": token_data.get("refresh_token"),
        "expires_at": expires_at,
        "expires_in": expires_in,
        "token_type": token_data.get("token_type", "Bearer"),
        "provider": provider_name,
    }

    if additional_fields:
        result.update(additional_fields)

    return result


def get_cognito_token_url(
    user_pool_id: str,
    region: str,
) -> str:
    """Generate Cognito token URL from user pool ID.

    Args:
        user_pool_id: Cognito User Pool ID.
        region: AWS region.

    Returns:
        The Cognito OAuth token endpoint URL.
    """
    # Use user pool ID without underscores as domain (standard Cognito format)
    domain = user_pool_id.replace("_", "")
    return f"https://{domain}.auth.{region}.amazoncognito.com/oauth2/token"


def get_keycloak_token_url(
    keycloak_url: str,
    realm: str,
) -> str:
    """Generate Keycloak token URL.

    Args:
        keycloak_url: Keycloak server base URL.
        realm: Keycloak realm name.

    Returns:
        The Keycloak OAuth token endpoint URL.
    """
    return f"{keycloak_url}/realms/{realm}/protocol/openid-connect/token"


def get_entra_token_url(
    tenant_id: str,
    login_base_url: str = "https://login.microsoftonline.com",
) -> str:
    """Generate Microsoft Entra ID token URL.

    Args:
        tenant_id: Azure AD Tenant ID.
        login_base_url: Entra login base URL (default: login.microsoftonline.com).

    Returns:
        The Entra ID OAuth token endpoint URL.
    """
    return f"{login_base_url}/{tenant_id}/oauth2/v2.0/token"
