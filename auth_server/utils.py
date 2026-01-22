"""
Utility functions for the authentication server.

This module contains helper functions for privacy compliance, masking,
and request handling utilities.
"""

import hashlib
from typing import Any


def is_request_https(request: Any) -> bool:
    """
    Detect if the original request was HTTPS.

    Priority order:
    1. X-Cloudfront-Forwarded-Proto header (CloudFront deployments)
    2. x-forwarded-proto header (ALB/custom domain deployments)
    3. Request URL scheme (direct access)

    Args:
        request: FastAPI Request object

    Returns:
        True if the original request was HTTPS
    """
    # Check CloudFront header first (ALB won't overwrite this)
    cloudfront_proto = request.headers.get("x-cloudfront-forwarded-proto", "")
    if cloudfront_proto.lower() == "https":
        return True

    # Fall back to standard x-forwarded-proto
    x_forwarded_proto = request.headers.get("x-forwarded-proto", "")
    if x_forwarded_proto.lower() == "https":
        return True

    # Finally check request scheme
    return request.url.scheme == "https"


def mask_sensitive_id(value: str) -> str:
    """Mask sensitive IDs showing only first and last 4 characters."""
    if not value or len(value) <= 8:
        return "***MASKED***"
    return f"{value[:4]}...{value[-4:]}"


def hash_username(username: str) -> str:
    """Hash username for privacy compliance."""
    if not username:
        return "anonymous"
    return f"user_{hashlib.sha256(username.encode()).hexdigest()[:8]}"


def anonymize_ip(ip_address: str) -> str:
    """Anonymize IP address by masking last octet for IPv4."""
    if not ip_address or ip_address == "unknown":
        return ip_address
    if "." in ip_address:  # IPv4
        parts = ip_address.split(".")
        if len(parts) == 4:
            return f"{'.'.join(parts[:3])}.xxx"
    elif ":" in ip_address:  # IPv6
        # Mask last segment
        parts = ip_address.split(":")
        if len(parts) > 1:
            parts[-1] = "xxxx"
            return ":".join(parts)
    return ip_address


def mask_token(token: str) -> str:
    """Mask JWT token showing only last 4 characters."""
    if not token:
        return "***EMPTY***"
    if len(token) > 20:
        return f"...{token[-4:]}"
    return "***MASKED***"


def mask_headers(headers: dict) -> dict:
    """Mask sensitive headers for logging compliance."""
    masked = {}
    for key, value in headers.items():
        key_lower = key.lower()
        if key_lower in ["x-authorization", "authorization", "cookie"]:
            if "bearer" in str(value).lower():
                # Extract token part and mask it
                parts = str(value).split(" ", 1)
                if len(parts) == 2:
                    masked[key] = f"Bearer {mask_token(parts[1])}"
                else:
                    masked[key] = mask_token(value)
            else:
                masked[key] = "***MASKED***"
        elif key_lower in ["x-user-pool-id", "x-client-id"]:
            masked[key] = mask_sensitive_id(value)
        else:
            masked[key] = value
    return masked
