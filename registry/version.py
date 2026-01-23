"""
Version management for MCP Gateway Registry.

Version priority order:
1. BUILD_VERSION environment variable (set at Docker build/run time)
2. VERSION file at repository root (updated by release workflow)
3. Git tags (for local development)
4. DEFAULT_VERSION fallback
"""

import logging
import os
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)

# Fallback version if all other methods fail
DEFAULT_VERSION = "2.0.0"


def _get_version_file() -> str | None:
    """
    Read version from VERSION file at repository root.

    The VERSION file is the single source of truth for release versions,
    automatically updated by the GitHub Actions release workflow.

    Returns:
        Version string from VERSION file, or None if not found/readable
    """
    try:
        # Look for VERSION file in repository root (parent of registry/)
        repo_root = Path(__file__).parent.parent
        version_file = repo_root / "VERSION"

        if version_file.exists():
            version_str = version_file.read_text().strip()
            if version_str:
                logger.debug(f"Version from VERSION file: {version_str}")
                return version_str

        logger.debug("VERSION file not found or empty")
        return None

    except Exception as e:
        logger.debug(f"Error reading VERSION file: {e}")
        return None


def _get_git_version() -> str | None:
    """
    Get version from git describe.

    Returns version in format: 2.0.3 or 2.0.3-5-g1234abc (if commits after tag)

    Returns:
        Version string from git, or None if not in a git repository
    """
    try:
        # Get the repository root
        repo_root = Path(__file__).parent.parent

        # Run git describe to get version
        result = subprocess.run(
            ["git", "describe", "--tags", "--always"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )

        if result.returncode == 0:
            version_str = result.stdout.strip()

            # Remove 'v' prefix if present
            if version_str.startswith("v"):
                version_str = version_str[1:]

            logger.debug(f"Version from git: {version_str}")
            return version_str
        else:
            logger.debug(f"Git describe failed: {result.stderr.strip()}")
            return None

    except FileNotFoundError:
        logger.debug("Git command not found")
        return None
    except subprocess.TimeoutExpired:
        logger.debug("Git describe timed out")
        return None
    except Exception as e:
        logger.debug(f"Error getting git version: {e}")
        return None


def get_version() -> str:
    """
    Get application version.

    Priority order:
    1. BUILD_VERSION environment variable (set at Docker build/run time)
    2. VERSION file at repository root (single source of truth for releases)
    3. Git tags (for local development with uncommitted changes)
    4. DEFAULT_VERSION fallback

    Returns:
        Version string (e.g., "2.0.3" or "2.0.3-5-gabcdef")
    """
    # First check for build-time/runtime version override
    build_version = os.getenv("BUILD_VERSION")
    if build_version:
        logger.debug(f"Using BUILD_VERSION: {build_version}")
        return build_version

    # Check VERSION file (single source of truth for releases)
    file_version = _get_version_file()
    if file_version:
        logger.debug(f"Using VERSION file: {file_version}")
        return file_version

    # Try git for local development
    git_version = _get_git_version()
    if git_version:
        logger.debug(f"Using git version: {git_version}")
        return git_version

    # Fall back to default
    logger.debug(f"Using DEFAULT_VERSION: {DEFAULT_VERSION}")
    return DEFAULT_VERSION


# Module-level version constant
__version__ = get_version()
