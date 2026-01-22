#!/bin/bash
# Generate OAuth2 access token for MCP agents
#
# Usage:
#   ./generate-agent-token.sh [agent-name] [options]
#
# Version: 2.0.0

set -e
set -o pipefail

# =============================================================================
# Load Shared Library
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source the common library
if [[ -f "${SCRIPT_DIR}/lib/keycloak-common.sh" ]]; then
    # shellcheck source=lib/keycloak-common.sh
    source "${SCRIPT_DIR}/lib/keycloak-common.sh"
else
    echo "Error: Could not find keycloak-common.sh library" >&2
    echo "Expected at: ${SCRIPT_DIR}/lib/keycloak-common.sh" >&2
    exit 1
fi

# =============================================================================
# Configuration
# =============================================================================

# Load environment variables from .env file
load_env_file "$SCRIPT_DIR"

# Check dependencies first
check_dependencies || exit 1

# Default values
AGENT_NAME="mcp-gateway-m2m"
CLIENT_ID=""
CLIENT_SECRET=""
KEYCLOAK_URL=""
KEYCLOAK_REALM="$(get_keycloak_realm)"

# Project root for oauth tokens
PROJECT_ROOT="$(get_project_root "$SCRIPT_DIR")"
OAUTH_TOKENS_DIR="${PROJECT_ROOT}/.oauth-tokens"

# =============================================================================
# Usage
# =============================================================================
usage() {
    echo "Usage: $0 [agent-name] [options]"
    echo ""
    echo "Generate OAuth2 access token for MCP agents"
    echo ""
    echo "Arguments:"
    echo "  agent-name                Agent name (default: mcp-gateway-m2m)"
    echo ""
    echo "Options:"
    echo "  --client-id ID           OAuth2 client ID"
    echo "  --client-secret SECRET   OAuth2 client secret"
    echo "  --keycloak-url URL       Keycloak server URL"
    echo "  --realm REALM            Keycloak realm (default: mcp-gateway)"
    echo "  --oauth-dir DIR          OAuth tokens directory (default: ../../.oauth-tokens)"
    echo "  --verbose, -v            Verbose output"
    echo "  --help, -h               Show this help"
    echo ""
    echo "Examples:"
    echo "  # Use default agent (mcp-gateway-m2m) with config from .oauth-tokens/mcp-gateway-m2m.json"
    echo "  $0"
    echo ""
    echo "  # Use specific agent with config from .oauth-tokens/my-agent.json"
    echo "  $0 my-agent"
    echo ""
    echo "  # Override specific parameters"
    echo "  $0 my-agent --client-id custom-client --keycloak-url http://localhost:8080"
    echo ""
    echo "  # Specify all parameters manually"
    echo "  $0 test-agent --client-id test-client --client-secret secret123 --keycloak-url http://localhost:8080"
}

# =============================================================================
# Argument Parsing
# =============================================================================

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --client-id)
            CLIENT_ID="$2"
            shift 2
            ;;
        --client-secret)
            CLIENT_SECRET="$2"
            shift 2
            ;;
        --keycloak-url)
            KEYCLOAK_URL="$2"
            shift 2
            ;;
        --realm)
            KEYCLOAK_REALM="$2"
            shift 2
            ;;
        --oauth-dir)
            OAUTH_TOKENS_DIR="$2"
            shift 2
            ;;
        --verbose|-v)
            VERBOSE=1
            export VERBOSE
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        -*)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
        *)
            # First positional argument is agent name
            if [[ -z "$AGENT_NAME" ]] || [[ "$AGENT_NAME" == "mcp-gateway-m2m" ]]; then
                AGENT_NAME="$1"
            else
                log_error "Unexpected argument: $1"
                usage
                exit 1
            fi
            shift
            ;;
    esac
done

log_debug "Using agent name: $AGENT_NAME"
log_debug "OAuth tokens directory: $OAUTH_TOKENS_DIR"

# =============================================================================
# Functions
# =============================================================================

# Function to load config from JSON file
load_config_from_json() {
    local config_file="$OAUTH_TOKENS_DIR/${AGENT_NAME}.json"

    if [[ ! -f "$config_file" ]]; then
        log_error "Config file not found: $config_file"
        return 1
    fi

    log_debug "Loading config from: $config_file"

    # Extract values from JSON if not already provided
    if [[ -z "$CLIENT_ID" ]]; then
        CLIENT_ID=$(jq -r '.client_id // empty' "$config_file")
        log_debug "Loaded CLIENT_ID from config: $CLIENT_ID"
    fi

    if [[ -z "$CLIENT_SECRET" ]]; then
        CLIENT_SECRET=$(jq -r '.client_secret // empty' "$config_file")
        log_debug "Loaded CLIENT_SECRET from config: $(mask_string "$CLIENT_SECRET")"
    fi

    if [[ -z "$KEYCLOAK_URL" ]]; then
        KEYCLOAK_URL=$(jq -r '.keycloak_url // .gateway_url // empty' "$config_file" | sed 's|/realms/.*||')
        log_debug "Loaded KEYCLOAK_URL from config: $KEYCLOAK_URL"
    fi

    # Also try to get realm from config
    local config_realm
    config_realm=$(jq -r '.keycloak_realm // .realm // empty' "$config_file")
    if [[ -n "$config_realm" ]] && [[ "$KEYCLOAK_REALM" == "mcp-gateway" ]]; then
        KEYCLOAK_REALM="$config_realm"
        log_debug "Loaded KEYCLOAK_REALM from config: $KEYCLOAK_REALM"
    fi
}

# =============================================================================
# Main Execution
# =============================================================================
main() {
    # Load config from JSON if available
    if [[ -z "$CLIENT_ID" ]] || [[ -z "$CLIENT_SECRET" ]] || [[ -z "$KEYCLOAK_URL" ]]; then
        load_config_from_json || true
    fi

    # Validate required parameters
    if [[ -z "$CLIENT_ID" ]]; then
        log_error "CLIENT_ID is required. Provide via --client-id or in config file."
        exit 1
    fi

    if [[ -z "$CLIENT_SECRET" ]]; then
        log_error "CLIENT_SECRET is required. Provide via --client-secret or in config file."
        exit 1
    fi

    if [[ -z "$KEYCLOAK_URL" ]]; then
        log_error "KEYCLOAK_URL is required. Provide via --keycloak-url or in config file."
        exit 1
    fi

    # Construct token URL
    local token_url="$KEYCLOAK_URL/realms/$KEYCLOAK_REALM/protocol/openid-connect/token"

    log_debug "Token URL: $token_url"
    log_debug "Client ID: $CLIENT_ID"
    log_debug "Realm: $KEYCLOAK_REALM"

    # Make token request
    log_info "Requesting access token for agent: $AGENT_NAME"

    local response
    response=$(curl -s -X POST "$token_url" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=client_credentials" \
        -d "client_id=$CLIENT_ID" \
        -d "client_secret=$CLIENT_SECRET" \
        -d "scope=openid email profile")

    # Check if curl succeeded
    if [[ $? -ne 0 ]]; then
        log_error "Failed to make token request to Keycloak"
        exit 1
    fi

    # Parse response
    # Check for error in response
    local error_description
    error_description=$(echo "$response" | jq -r '.error_description // empty')
    if [[ -n "$error_description" ]]; then
        log_error "Token request failed: $error_description"
        exit 1
    fi

    # Extract access token
    local access_token
    local expires_in
    access_token=$(echo "$response" | jq -r '.access_token // empty')
    expires_in=$(echo "$response" | jq -r '.expires_in // empty')

    if [[ -z "$access_token" ]]; then
        log_error "No access token in response"
        echo "Response: $response"
        exit 1
    fi

    log_success "Access token generated successfully!"
    echo ""

    # Mask token for security - show only first and last portions
    local token_preview
    token_preview="$(mask_string "$access_token" 20 20)"
    echo "Access Token: $token_preview"
    echo ""

    if [[ -n "$expires_in" ]]; then
        echo "Expires in: $expires_in seconds"
        local expiry_time
        expiry_time=$(date -d "+$expires_in seconds" 2>/dev/null || date -r $(($(date +%s) + expires_in)) 2>/dev/null || echo "Unknown")
        echo "Expires at: $expiry_time"
        echo ""
    fi

    # Ensure OAuth tokens directory exists
    local oauth_dir
    oauth_dir=$(ensure_oauth_tokens_dir "$PROJECT_ROOT")

    # Save to .env file
    local env_file="$oauth_dir/${AGENT_NAME}.env"
    echo "Environment variables saved to: $env_file"
    echo "(Full token and credentials have been saved securely - not displayed in terminal)"
    echo ""

    cat > "$env_file" << EOF
# Generated access token for $AGENT_NAME
# Generated at: $(date)
export ACCESS_TOKEN="$access_token"
export CLIENT_ID="$CLIENT_ID"
export CLIENT_SECRET="$CLIENT_SECRET"
export KEYCLOAK_URL="$KEYCLOAK_URL"
export KEYCLOAK_REALM="$KEYCLOAK_REALM"
export AUTH_PROVIDER="keycloak"
EOF

    # Save to JSON file with metadata
    local json_file="$oauth_dir/${AGENT_NAME}-token.json"
    local generated_at
    local expires_at=""
    generated_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    if [[ -n "$expires_in" ]]; then
        expires_at=$(date -u -d "+$expires_in seconds" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -r $(($(date +%s) + expires_in)) +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "")
    fi

    cat > "$json_file" << EOF
{
  "agent_name": "$AGENT_NAME",
  "access_token": "$access_token",
  "token_type": "Bearer",
  "expires_in": ${expires_in:-null},
  "generated_at": "$generated_at",
  "expires_at": ${expires_at:+"\"$expires_at\""},
  "provider": "keycloak",
  "keycloak_url": "$KEYCLOAK_URL",
  "keycloak_realm": "$KEYCLOAK_REALM",
  "client_id": "$CLIENT_ID",
  "scope": "openid email profile",
  "metadata": {
    "generated_by": "generate-agent-token.sh",
    "script_version": "2.0",
    "token_format": "JWT",
    "auth_method": "client_credentials"
  }
}
EOF

    log_success "Token saved to: $env_file"
    log_success "Token JSON saved to: $json_file"
    echo ""
    echo "Token has been saved securely to files (not displayed in terminal for security)."
    echo ""
    echo "To use the token, reference the saved files:"
    echo "  - Token file: $json_file"
    echo "  - Env file: $env_file"
    echo ""
    echo "Use with mcp_client.py:"
    echo "  uv run python cli/mcp_client.py --token-file $json_file ..."
}

# Run main function
main
