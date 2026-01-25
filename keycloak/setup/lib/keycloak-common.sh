#!/bin/bash
# Keycloak Common Library
# Shared functions for Keycloak setup scripts
#
# Usage: source "$(dirname "${BASH_SOURCE[0]}")/lib/keycloak-common.sh"
#
# Version: 1.0.0

# Prevent multiple sourcing
if [[ -n "${_KEYCLOAK_COMMON_LOADED:-}" ]]; then
    return 0
fi
_KEYCLOAK_COMMON_LOADED=1

# =============================================================================
# Color Definitions
# =============================================================================
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export NC='\033[0m' # No Color

# =============================================================================
# Logging Functions
# =============================================================================

# Standard logging - always shown
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Debug logging - only shown when VERBOSE=1 or DEBUG=1
log_debug() {
    if [[ "${VERBOSE:-0}" == "1" ]] || [[ "${DEBUG:-0}" == "1" ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $1"
    fi
}

log_trace() {
    if [[ "${VERBOSE:-0}" == "1" ]] || [[ "${DEBUG:-0}" == "1" ]]; then
        echo -e "${BLUE}[TRACE]${NC} $1"
    fi
}

# Legacy logging function names for backward compatibility
print_success() { log_success "$1"; }
print_error() { log_error "$1"; }
print_info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

# =============================================================================
# Dependency Checks
# =============================================================================

# Check if required commands are available
check_dependencies() {
    local missing=()

    if ! command -v jq &>/dev/null; then
        missing+=("jq")
    fi

    if ! command -v curl &>/dev/null; then
        missing+=("curl")
    fi

    if [[ ${#missing[@]} -gt 0 ]]; then
        log_error "Missing required dependencies: ${missing[*]}"
        echo "Please install the missing dependencies and try again." >&2
        return 1
    fi

    return 0
}

# =============================================================================
# Environment Loading
# =============================================================================

# Load .env file from project root
# Arguments:
#   $1 - Script directory (optional, defaults to current directory)
# Returns:
#   0 if .env was loaded, 1 if not found
load_env_file() {
    local script_dir="${1:-.}"
    local project_root
    local env_file

    # Navigate up to find project root (where .env should be)
    if [[ "$script_dir" == "." ]]; then
        project_root="$(pwd)"
    else
        project_root="$(cd "${script_dir}/../.." 2>/dev/null && pwd)" || project_root="$(pwd)"
    fi

    env_file="${project_root}/.env"

    if [[ -f "$env_file" ]]; then
        log_debug "Loading environment variables from $env_file"
        set -a  # Automatically export all variables
        # shellcheck source=/dev/null
        source "$env_file"
        set +a  # Turn off automatic export
        log_debug "Environment variables loaded successfully"
        return 0
    else
        log_debug "No .env file found at $env_file"
        return 1
    fi
}

# Get project root directory
# Arguments:
#   $1 - Script directory
get_project_root() {
    local script_dir="$1"
    cd "${script_dir}/../.." 2>/dev/null && pwd
}

# =============================================================================
# Keycloak Configuration
# =============================================================================

# Get Keycloak URL with fallback defaults
# Uses KEYCLOAK_ADMIN_URL -> KEYCLOAK_URL -> default
get_keycloak_url() {
    echo "${KEYCLOAK_ADMIN_URL:-${KEYCLOAK_URL:-http://localhost:8080}}"
}

# Get Keycloak admin username
get_keycloak_admin() {
    echo "${KEYCLOAK_ADMIN:-admin}"
}

# Get Keycloak realm name
get_keycloak_realm() {
    echo "${KEYCLOAK_REALM:-mcp-gateway}"
}

# =============================================================================
# Input Validation
# =============================================================================

# Validate agent ID format
# Arguments:
#   $1 - Agent ID to validate
# Returns:
#   0 if valid, 1 if invalid
validate_agent_id() {
    local agent_id="$1"

    if [[ -z "$agent_id" ]]; then
        log_error "Agent ID cannot be empty"
        return 1
    fi

    # Must start with alphanumeric, contain only alphanumeric, hyphen, or underscore
    if [[ ! "$agent_id" =~ ^[a-zA-Z0-9][a-zA-Z0-9_-]*$ ]]; then
        log_error "Invalid agent ID '${agent_id}'"
        echo "Agent ID must start with alphanumeric and contain only alphanumeric, hyphen, or underscore" >&2
        return 1
    fi

    # Maximum length check (Keycloak limitation)
    if [[ ${#agent_id} -gt 63 ]]; then
        log_error "Agent ID too long (max 63 characters)"
        return 1
    fi

    return 0
}

# Validate required environment variable
# Arguments:
#   $1 - Variable name
#   $2 - Variable value
#   $3 - Optional: hint message
validate_required_env() {
    local var_name="$1"
    local var_value="$2"
    local hint="${3:-}"

    if [[ -z "$var_value" ]]; then
        log_error "${var_name} environment variable is required"
        if [[ -n "$hint" ]]; then
            echo "$hint" >&2
        fi
        return 1
    fi
    return 0
}

# =============================================================================
# Keycloak API Functions
# =============================================================================

# Get admin token from Keycloak
# Arguments:
#   $1 - Keycloak URL (optional, uses get_keycloak_url if not provided)
#   $2 - Admin username (optional, uses get_keycloak_admin if not provided)
#   $3 - Admin password (optional, uses KEYCLOAK_ADMIN_PASSWORD if not provided)
# Returns:
#   Access token on stdout, empty string on failure
get_admin_token() {
    local url="${1:-$(get_keycloak_url)}"
    local user="${2:-$(get_keycloak_admin)}"
    local pass="${3:-$KEYCLOAK_ADMIN_PASSWORD}"
    local response
    local token

    log_debug "Getting admin token from ${url}"

    response=$(curl -s -X POST "${url}/realms/master/protocol/openid-connect/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=${user}" \
        -d "password=${pass}" \
        -d "grant_type=password" \
        -d "client_id=admin-cli" 2>/dev/null)

    token=$(echo "$response" | jq -r '.access_token // empty')

    if [[ -z "$token" ]]; then
        log_debug "Failed to get admin token"
        log_debug "Response: $response"
        echo ""
        return 1
    fi

    log_debug "Admin token obtained successfully"
    echo "$token"
    return 0
}

# Check if Keycloak is accessible
# Arguments:
#   $1 - Keycloak URL (optional)
# Returns:
#   0 if accessible, 1 if not
check_keycloak_accessible() {
    local url="${1:-$(get_keycloak_url)}"

    if curl -f -s "${url}/admin/" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Wait for Keycloak to be ready
# Arguments:
#   $1 - Keycloak URL (optional)
#   $2 - Max attempts (optional, default 60)
#   $3 - Sleep interval in seconds (optional, default 5)
# Returns:
#   0 if ready, 1 if timeout
wait_for_keycloak() {
    local url="${1:-$(get_keycloak_url)}"
    local max_attempts="${2:-60}"
    local sleep_interval="${3:-5}"
    local attempt=0

    echo -n "Waiting for Keycloak to be ready..."

    while [[ $attempt -lt $max_attempts ]]; do
        if check_keycloak_accessible "$url"; then
            echo -e " ${GREEN}Ready!${NC}"
            return 0
        fi
        echo -n "."
        sleep "$sleep_interval"
        attempt=$((attempt + 1))
    done

    echo -e " ${RED}Timeout!${NC}"
    log_error "Keycloak did not become ready within $((max_attempts * sleep_interval)) seconds"
    return 1
}

# Check if realm exists
# Arguments:
#   $1 - Admin token
#   $2 - Realm name (optional, uses get_keycloak_realm if not provided)
#   $3 - Keycloak URL (optional)
# Returns:
#   0 if exists, 1 if not
realm_exists() {
    local token="$1"
    local realm="${2:-$(get_keycloak_realm)}"
    local url="${3:-$(get_keycloak_url)}"
    local response

    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer ${token}" \
        "${url}/admin/realms/${realm}")

    [[ "$response" == "200" ]]
}

# Get group ID by name
# Arguments:
#   $1 - Admin token
#   $2 - Group name
#   $3 - Realm name (optional)
#   $4 - Keycloak URL (optional)
# Returns:
#   Group ID on stdout, empty string if not found
get_group_id() {
    local token="$1"
    local group_name="$2"
    local realm="${3:-$(get_keycloak_realm)}"
    local url="${4:-$(get_keycloak_url)}"

    curl -s -H "Authorization: Bearer ${token}" \
        "${url}/admin/realms/${realm}/groups" | \
        jq -r ".[] | select(.name==\"${group_name}\") | .id"
}

# Get client UUID by client ID
# Arguments:
#   $1 - Admin token
#   $2 - Client ID (e.g., "mcp-gateway-m2m")
#   $3 - Realm name (optional)
#   $4 - Keycloak URL (optional)
# Returns:
#   Client UUID on stdout, empty string if not found
get_client_uuid() {
    local token="$1"
    local client_id="$2"
    local realm="${3:-$(get_keycloak_realm)}"
    local url="${4:-$(get_keycloak_url)}"

    curl -s -H "Authorization: Bearer ${token}" \
        "${url}/admin/realms/${realm}/clients?clientId=${client_id}" | \
        jq -r '.[0].id // empty'
}

# Get user ID by username
# Arguments:
#   $1 - Admin token
#   $2 - Username
#   $3 - Realm name (optional)
#   $4 - Keycloak URL (optional)
# Returns:
#   User ID on stdout, empty string if not found
get_user_id() {
    local token="$1"
    local username="$2"
    local realm="${3:-$(get_keycloak_realm)}"
    local url="${4:-$(get_keycloak_url)}"

    curl -s -H "Authorization: Bearer ${token}" \
        "${url}/admin/realms/${realm}/users?username=${username}" | \
        jq -r '.[0].id // empty'
}

# =============================================================================
# Error Handling
# =============================================================================

# Setup error trap for cleanup on script failure
# Usage: setup_error_trap [cleanup_function]
setup_error_trap() {
    local cleanup_fn="${1:-}"

    _cleanup_on_error() {
        local exit_code=$?
        if [[ $exit_code -ne 0 ]]; then
            log_error "Script failed with exit code $exit_code"
            if [[ -n "$cleanup_fn" ]] && declare -f "$cleanup_fn" > /dev/null; then
                "$cleanup_fn"
            fi
        fi
    }

    trap _cleanup_on_error EXIT
}

# =============================================================================
# Utility Functions
# =============================================================================

# Create OAuth tokens directory
# Arguments:
#   $1 - Project root (optional)
# Returns:
#   Path to .oauth-tokens directory
ensure_oauth_tokens_dir() {
    local project_root="${1:-$(pwd)}"
    local oauth_dir="${project_root}/.oauth-tokens"

    mkdir -p "$oauth_dir"
    chmod 700 "$oauth_dir"
    echo "$oauth_dir"
}

# Mask sensitive string for display
# Arguments:
#   $1 - String to mask
#   $2 - Number of characters to show at start (default 4)
#   $3 - Number of characters to show at end (default 4)
# Returns:
#   Masked string
mask_string() {
    local str="$1"
    local show_start="${2:-4}"
    local show_end="${3:-4}"
    local len=${#str}

    if [[ $len -le $((show_start + show_end + 4)) ]]; then
        echo "****"
    else
        echo "${str:0:$show_start}****${str: -$show_end}"
    fi
}

# Print script header
# Arguments:
#   $1 - Title
print_header() {
    local title="$1"
    local line
    line=$(printf '=%.0s' {1..50})

    echo -e "${YELLOW}${title}${NC}"
    echo "$line"
}

# Print script footer with next steps
# Arguments:
#   $@ - Next step messages
print_next_steps() {
    echo ""
    echo -e "${YELLOW}Next steps:${NC}"
    local i=1
    for step in "$@"; do
        echo "$i. $step"
        i=$((i + 1))
    done
}
