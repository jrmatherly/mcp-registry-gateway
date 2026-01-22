#!/bin/bash
# Complete M2M Service Account Setup Script
# This script handles all aspects of setting up the M2M service account for Keycloak
#
# Usage:
#   ./setup-m2m-service-account.sh
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

SERVICE_ACCOUNT="service-account-mcp-gateway-m2m"
M2M_CLIENT="mcp-gateway-m2m"
TARGET_GROUP="mcp-servers-unrestricted"

# =============================================================================
# Display Configuration
# =============================================================================
print_header "Setting up M2M Service Account for Keycloak"
echo "Service Account: $SERVICE_ACCOUNT"
echo "Target Group: $TARGET_GROUP"
echo "M2M Client: $M2M_CLIENT"
echo "Keycloak URL: $ADMIN_URL"
echo ""

# =============================================================================
# Functions
# =============================================================================

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
    "serviceAccountClientId": "${M2M_CLIENT}"
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

# Get M2M client ID
get_m2m_client_id() {
    log_info "Finding M2M client..."
    CLIENT_ID=$(get_client_uuid "$TOKEN" "$M2M_CLIENT" "$REALM" "$ADMIN_URL")

    if [[ -z "$CLIENT_ID" ]] || [[ "$CLIENT_ID" == "null" ]]; then
        log_error "M2M client '$M2M_CLIENT' not found"
        exit 1
    fi

    log_success "Found M2M client with ID: $CLIENT_ID"
}

# Add groups mapper to M2M client
add_groups_mapper() {
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

    # Step 1: Ensure service account exists
    if ! check_service_account; then
        create_service_account
    fi

    # Step 2: Ensure target group exists
    ensure_target_group

    # Step 3: Assign service account to group
    assign_to_group

    # Step 4: Get M2M client ID
    get_m2m_client_id

    # Step 5: Add groups mapper
    add_groups_mapper

    # Step 6: Verify everything is set up correctly
    verify_setup

    echo ""
    log_success "M2M service account setup complete."
    echo ""

    print_next_steps \
        "Generate a new M2M token to get the group membership:" \
        "   python credentials-provider/token_refresher.py" \
        "" \
        "Test the authentication:" \
        "   ./test-keycloak-mcp.sh"

    echo ""
    echo -e "${YELLOW}Summary:${NC}"
    echo "- Service Account: $SERVICE_ACCOUNT"
    echo "- Group: $TARGET_GROUP"
    echo "- Client: $M2M_CLIENT"
    echo "- Groups Mapper: Configured"
}

# Run main function
main
