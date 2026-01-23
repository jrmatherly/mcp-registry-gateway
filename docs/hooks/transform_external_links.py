"""
MkDocs Hook: Transform External Source Code Links

This hook transforms relative links pointing to source code files outside the
docs/ directory into GitHub repository URLs at build time.

This allows:
- Source markdown files to use relative paths (work in IDE for local navigation)
- Built HTML site to have GitHub URLs (work when deployed)

Example transformation:
    ../registry/core/config.py -> https://github.com/user/repo/blob/main/registry/core/config.py
    ../auth_server/scopes.yml  -> https://github.com/user/repo/blob/main/auth_server/scopes.yml
"""

import logging
import re
from typing import Any

import mkdocs.plugins

log = logging.getLogger("mkdocs.hooks.transform_external_links")

# Directories outside docs/ that contain source code
EXTERNAL_DIRS = (
    "registry",
    "auth_server",
    "agents",
    "tests",
    "terraform",
    "charts",
    "scripts",
    "cli",
    "frontend",
    "api",
    "credentials-provider",
    "docker",
    ".github",
    ".scratchpad",
)

# Root-level files that should be transformed
ROOT_FILES = (
    "README.md",
    "CLAUDE.md",
    ".env.template",
    ".env.example",
    "pyproject.toml",
    "docker-compose.yml",
    "docker-compose.yaml",
    "Makefile",
    "LICENSE",
)


def _build_file_pattern() -> re.Pattern:
    """Build regex pattern to match relative links to external files."""
    # Match href or src attributes with relative paths starting with ../
    # that point to known external directories WITH a file path
    dirs_pattern = "|".join(re.escape(d) for d in EXTERNAL_DIRS)

    # Pattern explanation:
    # (href|src)="          - Match href or src attribute
    # ((?:\.\./){1,})       - Match one or more ../ sequences
    # (dir1|dir2|...)       - Match known external directories
    # /([^"]+)              - Match the rest of the path (file)
    # "                     - Closing quote
    pattern = rf'(href|src)="((?:\.\./){{1,}})({dirs_pattern})/([^"]+)"'

    return re.compile(pattern, re.IGNORECASE)


def _build_dir_pattern() -> re.Pattern:
    """Build regex pattern to match relative links to external directories only."""
    dirs_pattern = "|".join(re.escape(d) for d in EXTERNAL_DIRS)

    # Match directory-only links like ../auth_server/ or ../agents/
    pattern = rf'(href|src)="((?:\.\./){{1,}})({dirs_pattern})/?\"'

    return re.compile(pattern, re.IGNORECASE)


def _build_root_file_pattern() -> re.Pattern:
    """Build regex pattern to match relative links to root-level files."""
    files_pattern = "|".join(re.escape(f) for f in ROOT_FILES)

    # Match root file links like ../README.md or ../CLAUDE.md
    # Also handle anchors like ../README.md#section
    pattern = rf'(href|src)="\.\./(({files_pattern})(?:#[^"]*)?)"'

    return re.compile(pattern, re.IGNORECASE)


# Compile patterns once at module load
EXTERNAL_FILE_PATTERN = _build_file_pattern()
EXTERNAL_DIR_PATTERN = _build_dir_pattern()
ROOT_FILE_PATTERN = _build_root_file_pattern()


def _get_github_blob_url(repo_url: str, branch: str, directory: str, path: str) -> str:
    """Construct GitHub blob URL for a source file."""
    # Remove trailing slash from repo_url
    repo_url = repo_url.rstrip("/")

    # Handle anchors in the path (e.g., file.py#L14-L76)
    if "#" in path:
        file_path, anchor = path.split("#", 1)
        # GitHub uses #L for line numbers, keep as-is
        return f"{repo_url}/blob/{branch}/{directory}/{file_path}#{anchor}"

    return f"{repo_url}/blob/{branch}/{directory}/{path}"


def _get_github_tree_url(repo_url: str, branch: str, directory: str) -> str:
    """Construct GitHub tree URL for a directory."""
    repo_url = repo_url.rstrip("/")
    return f"{repo_url}/tree/{branch}/{directory}"


@mkdocs.plugins.event_priority(50)
def on_page_content(html: str, page: Any, config: dict, files: Any) -> str:
    """
    Transform relative links to external source files into GitHub URLs.

    This hook runs after markdown is converted to HTML but before the page
    is written to disk.

    Args:
        html: The rendered HTML content
        page: The current page object
        config: MkDocs configuration dictionary
        files: Collection of all files in the documentation

    Returns:
        Modified HTML with transformed links
    """
    repo_url = config.get("repo_url", "")

    if not repo_url:
        log.warning("No repo_url configured in mkdocs.yml - external links will not be transformed")
        return html

    # Always use 'main' as the default branch
    # MkDocs may auto-generate edit_uri with 'master' but most repos now use 'main'
    branch = "main"

    transform_count = 0

    def replace_file_link(match: re.Match) -> str:
        """Replace a single external file link with GitHub blob URL."""
        nonlocal transform_count

        attr = match.group(1)  # href or src
        # parent_refs = match.group(2)  # ../ sequences (unused but captured)
        directory = match.group(3)  # external directory name
        path = match.group(4)  # rest of the path (file)

        github_url = _get_github_blob_url(repo_url, branch, directory, path)
        transform_count += 1

        return f'{attr}="{github_url}"'

    def replace_dir_link(match: re.Match) -> str:
        """Replace a single external directory link with GitHub tree URL."""
        nonlocal transform_count

        attr = match.group(1)  # href or src
        # parent_refs = match.group(2)  # ../ sequences (unused but captured)
        directory = match.group(3)  # external directory name

        github_url = _get_github_tree_url(repo_url, branch, directory)
        transform_count += 1

        return f'{attr}="{github_url}"'

    def replace_root_file_link(match: re.Match) -> str:
        """Replace a root-level file link with GitHub blob URL."""
        nonlocal transform_count

        attr = match.group(1)  # href or src
        full_path = match.group(2)  # filename with optional anchor

        # Handle anchors
        if "#" in full_path:
            filename, anchor = full_path.split("#", 1)
            github_url = f"{repo_url.rstrip('/')}/blob/{branch}/{filename}#{anchor}"
        else:
            github_url = f"{repo_url.rstrip('/')}/blob/{branch}/{full_path}"

        transform_count += 1
        return f'{attr}="{github_url}"'

    # Transform file links first (most specific pattern)
    transformed_html = EXTERNAL_FILE_PATTERN.sub(replace_file_link, html)
    # Then transform directory-only links
    transformed_html = EXTERNAL_DIR_PATTERN.sub(replace_dir_link, transformed_html)
    # Finally transform root-level files
    transformed_html = ROOT_FILE_PATTERN.sub(replace_root_file_link, transformed_html)

    if transform_count > 0:
        log.debug(f"Transformed {transform_count} external link(s) in {page.file.src_path}")

    return transformed_html
