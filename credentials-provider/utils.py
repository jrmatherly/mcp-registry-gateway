"""Utility functions for credential providers."""

import logging
import re
import secrets

from .constants import LOGGING_FORMAT

__all__ = [
    "generate_api_key",
    "generate_request_id",
    "redact_credentials_in_text",
    "redact_sensitive_value",
    "setup_logging",
]


def setup_logging(
    verbose: bool = False,
    logger_name: str | None = None,
) -> logging.Logger:
    """Configure logging with consistent format.

    Args:
        verbose: If True, set logging level to DEBUG, otherwise INFO.
        logger_name: Name for the logger. If None, uses root logger.

    Returns:
        Configured logger instance.
    """
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(level=level, format=LOGGING_FORMAT)

    if logger_name:
        logger = logging.getLogger(logger_name)
    else:
        logger = logging.getLogger()

    logger.setLevel(level)
    return logger


def redact_sensitive_value(
    value: str,
    show_chars: int = 8,
) -> str:
    """Redact sensitive values like tokens, secrets, and passwords.

    Args:
        value: The sensitive value to redact.
        show_chars: Number of characters to show before redacting (default: 8).

    Returns:
        Redacted string showing only first N characters followed by asterisks.

    Example:
        >>> redact_sensitive_value("abc123xyz789", 8)
        'abc123xy****'
    """
    if not value or len(value) <= show_chars:
        return "*" * len(value) if value else ""

    return value[:show_chars] + "*" * (len(value) - show_chars)


def redact_credentials_in_text(
    text: str,
    show_chars: int = 8,
) -> str:
    """Redact common credential patterns in text output.

    Args:
        text: Text that may contain credentials.
        show_chars: Number of characters to show before redacting.

    Returns:
        Text with credentials redacted.
    """
    # Patterns to redact (case insensitive)
    patterns = [
        r'(access_token["\s]*[:=]["\s]*)([^"\s]+)',
        r'(client_secret["\s]*[:=]["\s]*)([^"\s]+)',
        r'(secret["\s]*[:=]["\s]*)([^"\s]+)',
        r'(password["\s]*[:=]["\s]*)([^"\s]+)',
        r'(token["\s]*[:=]["\s]*)([^"\s]+)',
    ]

    result = text
    for pattern in patterns:

        def replace_match(match: re.Match) -> str:
            prefix = match.group(1)
            value = match.group(2)
            redacted = redact_sensitive_value(value, show_chars)
            return f"{prefix}{redacted}"

        result = re.sub(pattern, replace_match, result, flags=re.IGNORECASE)

    return result


def generate_api_key() -> str:
    """Generate a new API key.

    Returns:
        A securely generated API key with mcp_creds_ prefix.
    """
    return f"mcp_creds_{secrets.token_urlsafe(32)}"


def generate_request_id() -> str:
    """Generate a unique request ID.

    Returns:
        A unique request ID with req_ prefix.
    """
    return f"req_{secrets.token_hex(8)}"
