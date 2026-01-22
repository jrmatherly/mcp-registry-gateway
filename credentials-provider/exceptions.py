"""Custom exceptions for credentials-provider package."""


class CredentialsProviderError(Exception):
    """Base exception for credentials-provider package."""

    pass


class TokenRequestError(CredentialsProviderError):
    """Error during OAuth token request.

    Raised when:
    - Token endpoint returns an error response
    - Network error occurs during token request
    - Response is missing required fields (e.g., access_token)
    """

    pass


class ConfigurationError(CredentialsProviderError):
    """Error in OAuth configuration.

    Raised when:
    - Required environment variables are missing
    - Configuration file is invalid or missing
    - Invalid provider configuration
    """

    pass


class TokenExpiredError(CredentialsProviderError):
    """Token has expired and cannot be refreshed.

    Raised when:
    - Access token has expired
    - Refresh token is unavailable or invalid
    - Token refresh attempt fails
    """

    pass


class CallbackError(CredentialsProviderError):
    """Error during OAuth callback handling.

    Raised when:
    - Callback server fails to start
    - State validation fails (CSRF protection)
    - Callback timeout occurs
    - Authorization error received from provider
    """

    pass


class ProviderNotSupportedError(CredentialsProviderError):
    """OAuth provider is not supported.

    Raised when attempting to use an unsupported OAuth provider.
    """

    pass
