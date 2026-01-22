#!/bin/bash
# Agent-Specific M2M Service Account Setup Script
# This script creates individual service accounts for AI agents with proper audit trails
#
# Usage:
#   ./setup-agent-service-account.sh --agent-id <id> [--group <group>] [--client <client>]
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

# Configuration with environment variable fallbacks
ADMIN_URL="$(get_keycloak_url)"
REALM="$(get_keycloak_realm)"
ADMIN_USER="$(get_keycloak_admin)"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-}"

# Validate required environment variable
if ! validate_required_env "KEYCLOAK_ADMIN_PASSWORD" "$ADMIN_PASS" \
    "Please set it before running this script: export KEYCLOAK_ADMIN_PASSWORD=\"your-secure-password\""; then
    exit 1
fi

M2M_CLIENT="mcp-gateway-m2m"

# =============================================================================
# Usage
# =============================================================================
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Create a Keycloak service account for an AI agent with proper audit trails

Options:
  -a, --agent-id AGENT_ID     Agent identifier (required)
  -g, --group GROUP           Group assignment (default: mcp-servers-restricted)
  -c, --client CLIENT         M2M client name (default: mcp-gateway-m2m)
  -h, --help                  Show this help message

Examples:
  $0 --agent-id claude-001
  $0 --agent-id bedrock-claude --group mcp-servers-unrestricted
  $0 -a gpt4-turbo -g mcp-servers-restricted
  $0 -a finance-agent -g mcp-servers-finance/read

Service Account Naming: agent-{agent-id}-m2m

Common Groups:
  - mcp-servers-restricted         (limited access)
  - mcp-servers-unrestricted       (full access)
  - mcp-servers-finance/read       (finance read access)
  - mcp-servers-finance/execute    (finance execute access)

Note: Group must exist in Keycloak. Script will validate and show available groups if invalid.
EOF
}

# =============================================================================
# Parse Arguments
# =============================================================================
AGENT_ID=""
TARGET_GROUP="mcp-servers-restricted"

while [[ $# -gt 0 ]]; do
    case $1 in
        -a|--agent-id)
            AGENT_ID="$2"
            shift 2
            ;;
        -g|--group)
            TARGET_GROUP="$2"
            shift 2
            ;;
        -c|--client)
            M2M_CLIENT="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "$AGENT_ID" ]]; then
    log_error "Agent ID is required"
    usage
    exit 1
fi

# Validate agent ID format
if ! validate_agent_id "$AGENT_ID"; then
    exit 1
fi

# Generate service account name and client ID
SERVICE_ACCOUNT="agent-${AGENT_ID}-m2m"
AGENT_CLIENT_ID="agent-${AGENT_ID}-m2m"

# =============================================================================
# Display Configuration
# =============================================================================
print_header "Setting up Agent-Specific M2M Client and Service Account"
echo "Agent ID: $AGENT_ID"
echo "Agent Client ID: $AGENT_CLIENT_ID"
echo "Service Account: $SERVICE_ACCOUNT"
echo "Target Group: $TARGET_GROUP"
echo "Keycloak URL: $ADMIN_URL"
echo ""

# =============================================================================
# Functions
# =============================================================================

# Validate group exists in Keycloak
validate_group_exists() {
    log_info "Validating group exists: $TARGET_GROUP..."

    GROUP_ID=$(get_group_id "$TOKEN" "$TARGET_GROUP" "$REALM" "$ADMIN_URL")

    if [[ -z "$GROUP_ID" ]] || [[ "$GROUP_ID" == "null" ]]; then
        log_error "Group '$TARGET_GROUP' does not exist in Keycloak"
        echo -e "${YELLOW}Available groups:${NC}"
        curl -s -H "Authorization: Bearer $TOKEN" \
            "${ADMIN_URL}/admin/realms/${REALM}/groups" | \
            jq -r '.[].name' | sed 's/^/  - /'
        exit 1
    fi

    log_success "Group '$TARGET_GROUP' exists"
}

# Create agent-specific M2M client
create_agent_m2m_client() {
    log_info "Creating agent-specific M2M client..."

    # Check if client already exists
    EXISTING_CLIENT=$(get_client_uuid "$TOKEN" "$AGENT_CLIENT_ID" "$REALM" "$ADMIN_URL")

    if [[ -n "$EXISTING_CLIENT" ]] && [[ "$EXISTING_CLIENT" != "null" ]]; then
        log_warn "Agent M2M client already exists with ID: $EXISTING_CLIENT"
        CLIENT_ID="$EXISTING_CLIENT"
        return 0
    fi

    # Create the M2M client
    local client_json
    client_json=$(cat << EOF
{
    "clientId": "${AGENT_CLIENT_ID}",
    "name": "Agent M2M Client for ${AGENT_ID}",
    "description": "Machine-to-Machine client for AI agent ${AGENT_ID} with individual audit trails",
    "enabled": true,
    "clientAuthenticatorType": "client-secret",
    "serviceAccountsEnabled": true,
    "standardFlowEnabled": false,
    "implicitFlowEnabled": false,
    "directAccessGrantsEnabled": false,
    "publicClient": false,
    "protocol": "openid-connect",
    "attributes": {
        "agent_id": "${AGENT_ID}",
        "client_type": "agent_m2m",
        "created_by": "keycloak_setup_script"
    },
    "defaultClientScopes": [
        "web-origins",
        "acr",
        "profile",
        "roles",
        "email"
    ]
}
EOF
)

    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "${ADMIN_URL}/admin/realms/${REALM}/clients" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$client_json")

    if [[ "$response" == "201" ]]; then
        log_success "Agent M2M client created successfully"

        # Get the client ID
        CLIENT_ID=$(get_client_uuid "$TOKEN" "$AGENT_CLIENT_ID" "$REALM" "$ADMIN_URL")
        log_debug "Client UUID: $CLIENT_ID"
    else
        log_error "Failed to create agent M2M client. HTTP: $response"
        exit 1
    fi
}

# Check if service account user exists
check_service_account() {
    log_info "Checking if service account exists..."
    USER_ID=$(get_user_id "$TOKEN" "$SERVICE_ACCOUNT" "$REALM" "$ADMIN_URL")

    if [[ -n "$USER_ID" ]] && [[ "$USER_ID" != "null" ]]; then
        log_success "Service account already exists with ID: $USER_ID"
        return 0
    else
        log_debug "Service account does not exist"
        return 1
    fi
}

# Create service account user
create_service_account() {
    log_info "Creating service account user..."

    local user_json
    user_json=$(cat << EOF
{
    "username": "${SERVICE_ACCOUNT}",
    "enabled": true,
    "emailVerified": true,
    "serviceAccountClientId": "${AGENT_CLIENT_ID}",
    "attributes": {
        "agent_id": ["${AGENT_ID}"],
        "agent_client_id": ["${AGENT_CLIENT_ID}"],
        "account_type": ["agent_service_account"],
        "created_by": ["keycloak_setup_script"]
    }
}
EOF
)

    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "${ADMIN_URL}/admin/realms/${REALM}/users" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$user_json")

    if [[ "$response" == "201" ]]; then
        log_success "Service account user created successfully"

        # Get the user ID
        USER_ID=$(get_user_id "$TOKEN" "$SERVICE_ACCOUNT" "$REALM" "$ADMIN_URL")
        log_debug "User ID: $USER_ID"
    else
        log_error "Failed to create user. HTTP: $response"
        exit 1
    fi
}

# Ensure target group exists (create if needed)
ensure_target_group() {
    log_info "Checking if target group exists..."
    GROUP_ID=$(get_group_id "$TOKEN" "$TARGET_GROUP" "$REALM" "$ADMIN_URL")

    if [[ -n "$GROUP_ID" ]] && [[ "$GROUP_ID" != "null" ]]; then
        log_success "Target group '$TARGET_GROUP' exists with ID: $GROUP_ID"
    else
        log_info "Creating target group '$TARGET_GROUP'..."

        local group_json
        group_json=$(cat << EOF
{
    "name": "${TARGET_GROUP}",
    "path": "/${TARGET_GROUP}"
}
EOF
)

        local response
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST "${ADMIN_URL}/admin/realms/${REALM}/groups" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$group_json")

        if [[ "$response" == "201" ]]; then
            log_success "Target group created successfully"

            # Get the group ID
            GROUP_ID=$(get_group_id "$TOKEN" "$TARGET_GROUP" "$REALM" "$ADMIN_URL")
            log_debug "Group ID: $GROUP_ID"
        else
            log_error "Failed to create group. HTTP: $response"
            exit 1
        fi
    fi
}

# Assign service account to group
assign_to_group() {
    log_info "Assigning service account to target group..."

    # Check if already assigned
    local current_groups
    current_groups=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "${ADMIN_URL}/admin/realms/${REALM}/users/${USER_ID}/groups" | \
        jq -r ".[].name")

    if echo "$current_groups" | grep -q "^${TARGET_GROUP}$"; then
        log_success "Service account already assigned to '$TARGET_GROUP' group"
        return 0
    fi

    # Assign to group
    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X PUT "${ADMIN_URL}/admin/realms/${REALM}/users/${USER_ID}/groups/${GROUP_ID}" \
        -H "Authorization: Bearer $TOKEN")

    if [[ "$response" == "204" ]]; then
        log_success "Service account assigned to '$TARGET_GROUP' group"
    else
        log_error "Failed to assign to group. HTTP: $response"
        exit 1
    fi
}

# Get agent M2M client secret
get_agent_client_secret() {
    log_info "Retrieving agent M2M client secret..."

    if [[ -z "$CLIENT_ID" ]]; then
        log_error "CLIENT_ID not set"
        exit 1
    fi

    # Get the client secret
    local secret_response
    secret_response=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "${ADMIN_URL}/admin/realms/${REALM}/clients/${CLIENT_ID}/client-secret")

    AGENT_CLIENT_SECRET=$(echo "$secret_response" | jq -r '.value // empty')

    if [[ -z "$AGENT_CLIENT_SECRET" ]]; then
        log_error "Failed to retrieve agent client secret"
        exit 1
    fi

    log_success "Agent client secret retrieved"
}

# Ensure groups mapper exists on client
ensure_groups_mapper() {
    log_info "Checking for groups mapper on M2M client..."

    # Check if groups mapper already exists
    local existing_mapper
    existing_mapper=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "${ADMIN_URL}/admin/realms/${REALM}/clients/${CLIENT_ID}/protocol-mappers/models" | \
        jq -r '.[] | select(.name=="groups") | .id')

    if [[ -n "$existing_mapper" ]] && [[ "$existing_mapper" != "null" ]]; then
        log_success "Groups mapper already exists"
        return 0
    fi

    log_info "Adding groups mapper to M2M client..."

    local groups_mapper
    groups_mapper=$(cat << 'EOF'
{
    "name": "groups",
    "protocol": "openid-connect",
    "protocolMapper": "oidc-group-membership-mapper",
    "consentRequired": false,
    "config": {
        "full.path": "false",
        "id.token.claim": "true",
        "access.token.claim": "true",
        "claim.name": "groups",
        "userinfo.token.claim": "true"
    }
}
EOF
)

    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "${ADMIN_URL}/admin/realms/${REALM}/clients/${CLIENT_ID}/protocol-mappers/models" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$groups_mapper")

    if [[ "$response" == "201" ]]; then
        log_success "Groups mapper added successfully"
    elif [[ "$response" == "409" ]]; then
        log_success "Groups mapper already exists"
    else
        log_error "Failed to add groups mapper. HTTP: $response"
        exit 1
    fi
}

# Verify setup
verify_setup() {
    echo ""
    log_info "Verifying setup..."

    # Check service account exists and is in the right group
    local groups
    groups=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "${ADMIN_URL}/admin/realms/${REALM}/users/${USER_ID}/groups" | \
        jq -r '.[].name')

    log_debug "Service account groups: $groups"

    if echo "$groups" | grep -q "^${TARGET_GROUP}$"; then
        log_success "Service account is in '$TARGET_GROUP' group"
    else
        log_error "Service account is NOT in '$TARGET_GROUP' group"
        exit 1
    fi

    # Check groups mapper exists
    local mapper_exists
    mapper_exists=$(curl -s -H "Authorization: Bearer $TOKEN" \
        "${ADMIN_URL}/admin/realms/${REALM}/clients/${CLIENT_ID}/protocol-mappers/models" | \
        jq -r '.[] | select(.name=="groups") | .name')

    if [[ "$mapper_exists" == "groups" ]]; then
        log_success "Groups mapper is configured"
    else
        log_error "Groups mapper is NOT configured"
        exit 1
    fi
}

# Generate agent-specific token configuration
generate_agent_token() {
    echo ""
    log_info "Generating agent-specific token configuration..."

    # Get project root for token storage
    local project_root
    project_root="$(get_project_root "$SCRIPT_DIR")"
    local agent_token_dir
    agent_token_dir="$(ensure_oauth_tokens_dir "$project_root")"
    local agent_token_file="${agent_token_dir}/agent-${AGENT_ID}.json"

    # Use configured Keycloak URL (not hardcoded)
    local keycloak_url="${KEYCLOAK_EXTERNAL_URL:-${ADMIN_URL}}"

    cat > "$agent_token_file" << EOF
{
  "provider": "keycloak_m2m",
  "agent_id": "${AGENT_ID}",
  "service_account": "${SERVICE_ACCOUNT}",
  "group": "${TARGET_GROUP}",
  "client_id": "${AGENT_CLIENT_ID}",
  "client_secret": "${AGENT_CLIENT_SECRET}",
  "keycloak_url": "${keycloak_url}",
  "realm": "${REALM}",
  "saved_at": "$(date -u '+%Y-%m-%d %H:%M:%S UTC')",
  "usage_notes": "Individual M2M client credentials for agent ${AGENT_ID} with complete audit trails"
}
EOF

    chmod 600 "$agent_token_file"
    log_success "Agent token configuration created: $agent_token_file"
}

# =============================================================================
# Main Execution
# =============================================================================
main() {
    # Get admin token
    log_info "Getting admin token..."
    TOKEN=$(get_admin_token "$ADMIN_URL" "$ADMIN_USER" "$ADMIN_PASS")

    if [[ -z "$TOKEN" ]]; then
        log_error "Failed to get admin token"
        exit 1
    fi
    log_success "Admin token obtained"

    # Step 0: Validate group exists in Keycloak
    validate_group_exists

    # Step 1: Create agent-specific M2M client
    create_agent_m2m_client

    # Step 2: Get agent client secret
    get_agent_client_secret

    # Step 3: Create service account linked to agent client
    if ! check_service_account; then
        create_service_account
    fi

    # Step 4: Ensure target group exists
    ensure_target_group

    # Step 5: Assign service account to group
    assign_to_group

    # Step 6: Ensure groups mapper exists on agent client
    ensure_groups_mapper

    # Step 7: Verify everything is set up correctly
    verify_setup

    # Step 8: Generate agent-specific token configuration
    generate_agent_token

    echo ""
    log_success "Agent service account setup complete."
    echo ""
    echo -e "${YELLOW}Agent Details:${NC}"
    echo "- Agent ID: $AGENT_ID"
    echo "- Agent Client ID: $AGENT_CLIENT_ID"
    echo "- Agent Client Secret: $(mask_string "$AGENT_CLIENT_SECRET")"
    echo "- Service Account: $SERVICE_ACCOUNT"
    echo "- Group: $TARGET_GROUP"
    echo "- Token Config: .oauth-tokens/agent-${AGENT_ID}.json"
    echo ""

    print_next_steps \
        "Generate agent-specific M2M token:" \
        "   cd keycloak/setup && ./generate-agent-token.sh --agent-id $AGENT_ID --save" \
        "" \
        "Test the authentication:" \
        "   ./test-keycloak-mcp.sh --agent-id $AGENT_ID"

    echo ""
    echo -e "${BLUE}Audit Trail Features:${NC}"
    echo "- All actions by this agent will be logged with agent ID: $AGENT_ID"
    echo "- Individual M2M client: $AGENT_CLIENT_ID"
    echo "- Service account username: $SERVICE_ACCOUNT"
    echo "- Group-based authorization: $TARGET_GROUP"
}

# Run main function
main
