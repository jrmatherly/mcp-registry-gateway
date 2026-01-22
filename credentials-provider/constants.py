"""Constants for credentials-provider package."""

# Token expiry defaults (in seconds)
DEFAULT_COGNITO_TOKEN_EXPIRY: int = 10800  # 3 hours
DEFAULT_ENTRA_TOKEN_EXPIRY: int = 3599  # ~1 hour (Entra default)
DEFAULT_KEYCLOAK_TOKEN_EXPIRY: int = 300  # 5 minutes (Keycloak default)
DEFAULT_AGENTCORE_TOKEN_EXPIRY: int = 10800  # 3 hours

# Token refresh margin (refresh token before expiry)
TOKEN_EXPIRY_MARGIN: int = 300  # 5 minutes

# OAuth callback server
DEFAULT_REDIRECT_PORT: int = 8080
DEFAULT_CALLBACK_TIMEOUT: int = 300  # 5 minutes

# HTTP request timeout
HTTP_REQUEST_TIMEOUT: int = 30  # seconds

# Logging format (consistent across all modules)
LOGGING_FORMAT: str = "%(asctime)s,p%(process)s,{%(filename)s:%(lineno)d},%(levelname)s,%(message)s"

# OAuth endpoints
ENTRA_LOGIN_BASE_URL: str = "https://login.microsoftonline.com"

# Default scopes
DEFAULT_KEYCLOAK_SCOPES: str = "openid email profile"
