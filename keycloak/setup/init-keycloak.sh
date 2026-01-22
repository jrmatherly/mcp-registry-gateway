#!/bin/bash
# Initialize Keycloak with MCP Gateway configuration
# This script sets up the initial realm, clients, groups, and users
#
# Usage:
#   ./init-keycloak.sh
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

# These will be set properly after loading .env in main()
KEYCLOAK_URL=""
REALM="mcp-gateway"
KEYCLOAK_ADMIN=""
KEYCLOAK_ADMIN_PASSWORD=""

print_header "Keycloak initialization script for MCP Gateway Registry"

# =============================================================================
# Functions
# =============================================================================

# Create realm step by step
create_realm() {
    local token=$1

    log_info "Creating MCP Gateway realm..."

    # Check if realm already exists
    if realm_exists "$token" "$REALM" "$KEYCLOAK_URL"; then
        log_warn "Realm already exists. Skipping creation..."
        return 0
    fi

    # Create basic realm
    local realm_json
    realm_json=$(cat << 'EOF'
{
    "realm": "mcp-gateway",
    "enabled": true,
    "registrationAllowed": false,
    "loginWithEmailAllowed": true,
    "duplicateEmailsAllowed": false,
    "resetPasswordAllowed": true,
    "editUsernameAllowed": false
}
EOF
)

    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "${KEYCLOAK_URL}/admin/realms" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json" \
        -d "$realm_json")

    if [[ "$response" == "201" ]]; then
        log_success "Realm created successfully!"
        return 0
    elif [[ "$response" == "409" ]]; then
        log_warn "Realm already exists. Continuing..."
        return 0
    else
        log_error "Failed to create realm. HTTP status: ${response}"
        echo "Response body:"
        curl -s -X POST "${KEYCLOAK_URL}/admin/realms" \
            -H "Authorization: Bearer ${token}" \
            -H "Content-Type: application/json" \
            -d "$realm_json"
        echo ""
        return 1
    fi
}

# Create OAuth2 clients
create_clients() {
    local token=$1

    log_info "Creating OAuth2 clients..."

    # Create web client
    local web_client_json
    web_client_json=$(cat << EOF
{
    "clientId": "mcp-gateway-web",
    "name": "MCP Gateway Web Client",
    "enabled": true,
    "clientAuthenticatorType": "client-secret",
    "redirectUris": [
        "${AUTH_SERVER_EXTERNAL_URL:-http://localhost:8888}/oauth2/callback/keycloak",
        "${REGISTRY_URL:-http://localhost:7860}/*",
        "http://localhost:7860/*",
        "http://localhost:8888/*"
    ],
    "webOrigins": [
        "${REGISTRY_URL:-http://localhost:7860}",
        "http://localhost:7860",
        "+"
    ],
    "protocol": "openid-connect",
    "standardFlowEnabled": true,
    "implicitFlowEnabled": false,
    "directAccessGrantsEnabled": true,
    "serviceAccountsEnabled": false,
    "publicClient": false
}
EOF
)

    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/clients" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json" \
        -d "$web_client_json" > /dev/null

    # Create M2M client
    local m2m_client_json
    m2m_client_json=$(cat << 'EOF'
{
    "clientId": "mcp-gateway-m2m",
    "name": "MCP Gateway M2M Client",
    "enabled": true,
    "clientAuthenticatorType": "client-secret",
    "protocol": "openid-connect",
    "standardFlowEnabled": false,
    "implicitFlowEnabled": false,
    "directAccessGrantsEnabled": false,
    "serviceAccountsEnabled": true,
    "publicClient": false
}
EOF
)

    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/clients" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json" \
        -d "$m2m_client_json" > /dev/null

    log_success "Clients created successfully!"
}

# Create user groups
create_groups() {
    local token=$1

    log_info "Creating user groups..."

    local groups=(
        "mcp-registry-admin"
        "mcp-registry-user"
        "mcp-registry-developer"
        "mcp-registry-operator"
        "mcp-servers-unrestricted"
        "mcp-servers-restricted"
        "a2a-agent-admin"
        "a2a-agent-publisher"
        "a2a-agent-user"
    )

    for group in "${groups[@]}"; do
        local group_json
        group_json=$(cat << EOF
{
    "name": "${group}",
    "attributes": {
        "description": ["${group} group for MCP Gateway access"]
    }
}
EOF
)

        curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/groups" \
            -H "Authorization: Bearer ${token}" \
            -H "Content-Type: application/json" \
            -d "$group_json" > /dev/null
    done

    log_success "Groups created successfully!"
}

# Create custom scopes
create_scopes() {
    local token=$1

    log_info "Creating custom MCP scopes..."

    local scopes=(
        "mcp-servers-unrestricted/read"
        "mcp-servers-unrestricted/execute"
        "mcp-servers-restricted/read"
        "mcp-servers-restricted/execute"
    )

    for scope in "${scopes[@]}"; do
        local scope_json
        scope_json=$(cat << EOF
{
    "name": "${scope}",
    "description": "MCP Gateway scope for ${scope} access",
    "protocol": "openid-connect"
}
EOF
)

        local response
        response=$(curl -s -o /dev/null -w "%{http_code}" \
            -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/client-scopes" \
            -H "Authorization: Bearer ${token}" \
            -H "Content-Type: application/json" \
            -d "$scope_json")

        if [[ "$response" == "201" ]]; then
            echo "  - Created scope: $scope"
        elif [[ "$response" == "409" ]]; then
            echo "  - Scope already exists: $scope"
        else
            log_error "  - Failed to create scope: $scope (HTTP $response)"
        fi
    done

    log_success "Custom scopes created successfully!"
}

# Setup M2M scopes
setup_m2m_scopes() {
    local token=$1

    log_info "Setting up M2M client scopes..."

    # Get M2M client ID
    local m2m_client_id
    m2m_client_id=$(get_client_uuid "$token" "mcp-gateway-m2m" "$REALM" "$KEYCLOAK_URL")

    if [[ -z "$m2m_client_id" ]] || [[ "$m2m_client_id" == "null" ]]; then
        log_error "Could not find mcp-gateway-m2m client"
        return 1
    fi

    # Get all available client scopes
    local scopes=(
        "mcp-servers-unrestricted/read"
        "mcp-servers-unrestricted/execute"
        "mcp-servers-restricted/read"
        "mcp-servers-restricted/execute"
    )

    for scope in "${scopes[@]}"; do
        # Get scope ID
        local scope_id
        scope_id=$(curl -s -H "Authorization: Bearer ${token}" \
            "${KEYCLOAK_URL}/admin/realms/${REALM}/client-scopes" | \
            jq -r ".[] | select(.name==\"${scope}\") | .id")

        if [[ -n "$scope_id" ]] && [[ "$scope_id" != "null" ]]; then
            # Add scope as default client scope
            local response
            response=$(curl -s -o /dev/null -w "%{http_code}" \
                -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}/clients/${m2m_client_id}/default-client-scopes/${scope_id}" \
                -H "Authorization: Bearer ${token}")

            if [[ "$response" == "204" ]]; then
                echo "  - Assigned scope: $scope"
            else
                log_warn "  - Warning: Could not assign scope $scope (HTTP $response)"
            fi
        else
            log_error "  - Error: Could not find scope: $scope"
        fi
    done

    log_success "M2M client scopes configured successfully!"
}

# Create service account user for M2M client
create_service_account_user() {
    local token=$1
    local service_account_username="service-account-mcp-gateway-m2m"

    log_info "Creating service account user: $service_account_username"

    # Check if user already exists
    local existing_user
    existing_user=$(get_user_id "$token" "$service_account_username" "$REALM" "$KEYCLOAK_URL")

    if [[ -n "$existing_user" ]]; then
        log_warn "Service account user already exists with ID: $existing_user"
        return 0
    fi

    # Create service account user
    local user_json
    user_json=$(cat << EOF
{
    "username": "${service_account_username}",
    "enabled": true,
    "emailVerified": true,
    "serviceAccountClientId": "mcp-gateway-m2m"
}
EOF
)

    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json" \
        -d "$user_json")

    if [[ "$response" == "201" ]]; then
        log_success "Service account user created successfully!"

        # Get the newly created user ID
        local user_id
        user_id=$(get_user_id "$token" "$service_account_username" "$REALM" "$KEYCLOAK_URL")
        log_debug "Created service account user with ID: $user_id"

        # Assign user to mcp-servers-unrestricted group
        local group_id
        group_id=$(get_group_id "$token" "mcp-servers-unrestricted" "$REALM" "$KEYCLOAK_URL")

        if [[ -n "$group_id" ]] && [[ "$group_id" != "null" ]]; then
            local group_response
            group_response=$(curl -s -o /dev/null -w "%{http_code}" \
                -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}/users/${user_id}/groups/${group_id}" \
                -H "Authorization: Bearer ${token}")

            if [[ "$group_response" == "204" ]]; then
                log_success "Service account assigned to mcp-servers-unrestricted group!"
            else
                log_warn "Warning: Could not assign service account to mcp-servers-unrestricted group (HTTP $group_response)"
            fi
        else
            log_error "Could not find mcp-servers-unrestricted group"
        fi

        # Assign user to a2a-agent-admin group for A2A agent access
        local a2a_group_id
        a2a_group_id=$(get_group_id "$token" "a2a-agent-admin" "$REALM" "$KEYCLOAK_URL")

        if [[ -n "$a2a_group_id" ]] && [[ "$a2a_group_id" != "null" ]]; then
            local a2a_response
            a2a_response=$(curl -s -o /dev/null -w "%{http_code}" \
                -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}/users/${user_id}/groups/${a2a_group_id}" \
                -H "Authorization: Bearer ${token}")

            if [[ "$a2a_response" == "204" ]]; then
                log_success "Service account assigned to a2a-agent-admin group!"
            else
                log_warn "Warning: Could not assign service account to a2a-agent-admin group (HTTP $a2a_response)"
            fi
        else
            log_warn "Warning: a2a-agent-admin group not found. Create it manually if A2A agent support is needed."
        fi

        return 0
    elif [[ "$response" == "409" ]]; then
        log_warn "Service account user already exists. Continuing..."
        return 0
    else
        log_error "Failed to create service account user. HTTP status: ${response}"
        return 1
    fi
}

# Create test users
create_users() {
    local token=$1

    log_info "Creating test users..."

    # Define usernames for consistency
    local admin_username="admin"
    local test_username="testuser"

    # Create admin user
    local admin_user_json
    admin_user_json=$(cat << EOF
{
    "username": "${admin_username}",
    "email": "${admin_username}@example.com",
    "enabled": true,
    "emailVerified": true,
    "firstName": "Admin",
    "lastName": "User",
    "credentials": [
        {
            "type": "password",
            "value": "${INITIAL_ADMIN_PASSWORD:-changeme}",
            "temporary": false
        }
    ]
}
EOF
)

    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json" \
        -d "$admin_user_json" > /dev/null

    # Create test user
    local test_user_json
    test_user_json=$(cat << EOF
{
    "username": "${test_username}",
    "email": "${test_username}@example.com",
    "enabled": true,
    "emailVerified": true,
    "firstName": "Test",
    "lastName": "User",
    "credentials": [
        {
            "type": "password",
            "value": "${INITIAL_USER_PASSWORD:-testpass}",
            "temporary": false
        }
    ]
}
EOF
)

    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/users" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json" \
        -d "$test_user_json" > /dev/null

    log_info "Assigning users to groups..."

    # Get user IDs
    local admin_user_id
    admin_user_id=$(get_user_id "$token" "$admin_username" "$REALM" "$KEYCLOAK_URL")

    local test_user_id
    test_user_id=$(get_user_id "$token" "$test_username" "$REALM" "$KEYCLOAK_URL")

    # Get all group IDs
    local admin_group_id
    admin_group_id=$(get_group_id "$token" "mcp-registry-admin" "$REALM" "$KEYCLOAK_URL")

    local user_group_id
    user_group_id=$(get_group_id "$token" "mcp-registry-user" "$REALM" "$KEYCLOAK_URL")

    local developer_group_id
    developer_group_id=$(get_group_id "$token" "mcp-registry-developer" "$REALM" "$KEYCLOAK_URL")

    local operator_group_id
    operator_group_id=$(get_group_id "$token" "mcp-registry-operator" "$REALM" "$KEYCLOAK_URL")

    local unrestricted_group_id
    unrestricted_group_id=$(get_group_id "$token" "mcp-servers-unrestricted" "$REALM" "$KEYCLOAK_URL")

    local restricted_group_id
    restricted_group_id=$(get_group_id "$token" "mcp-servers-restricted" "$REALM" "$KEYCLOAK_URL")

    # Assign admin user to admin group and unrestricted servers group
    if [[ -n "$admin_user_id" ]] && [[ -n "$admin_group_id" ]]; then
        curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}/users/${admin_user_id}/groups/${admin_group_id}" \
            -H "Authorization: Bearer ${token}" > /dev/null
        echo "  - ${admin_username} assigned to mcp-registry-admin group"
    fi

    # Also assign admin to unrestricted servers group for full access
    if [[ -n "$admin_user_id" ]] && [[ -n "$unrestricted_group_id" ]]; then
        curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}/users/${admin_user_id}/groups/${unrestricted_group_id}" \
            -H "Authorization: Bearer ${token}" > /dev/null
        echo "  - ${admin_username} assigned to mcp-servers-unrestricted group"
    fi

    # Assign test user to all groups except admin
    if [[ -n "$test_user_id" ]]; then
        # Arrays of group IDs and names for loop processing
        local group_ids=("$user_group_id" "$developer_group_id" "$operator_group_id" "$unrestricted_group_id" "$restricted_group_id")
        local group_names=("mcp-registry-user" "mcp-registry-developer" "mcp-registry-operator" "mcp-servers-unrestricted" "mcp-servers-restricted")

        # Loop through groups and assign test user to each
        for i in "${!group_ids[@]}"; do
            local group_id="${group_ids[$i]}"
            local group_name="${group_names[$i]}"

            if [[ -n "$group_id" ]]; then
                curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${REALM}/users/${test_user_id}/groups/${group_id}" \
                    -H "Authorization: Bearer ${token}" > /dev/null
                echo "  - ${test_username} assigned to ${group_name} group"
            fi
        done
    fi

    log_success "Users created and assigned to groups successfully!"
}

# Setup client secrets
setup_client_secrets() {
    local token=$1

    log_info "Setting up client secrets..."

    # Get web client ID
    local web_client_id
    web_client_id=$(get_client_uuid "$token" "mcp-gateway-web" "$REALM" "$KEYCLOAK_URL")

    # Generate secret for web client
    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/clients/${web_client_id}/client-secret" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json" > /dev/null

    local web_secret_response
    web_secret_response=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM}/clients/${web_client_id}/client-secret" \
        -H "Authorization: Bearer ${token}")
    web_secret=$(echo "$web_secret_response" | jq -r '.value // empty')

    # Get M2M client ID
    local m2m_client_id
    m2m_client_id=$(get_client_uuid "$token" "mcp-gateway-m2m" "$REALM" "$KEYCLOAK_URL")

    # Generate secret for M2M client
    curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/clients/${m2m_client_id}/client-secret" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json" > /dev/null

    local m2m_secret_response
    m2m_secret_response=$(curl -s "${KEYCLOAK_URL}/admin/realms/${REALM}/clients/${m2m_client_id}/client-secret" \
        -H "Authorization: Bearer ${token}")
    m2m_secret=$(echo "$m2m_secret_response" | jq -r '.value // empty')

    log_success "Client secrets generated!"
    echo ""
    echo "=============================================="
    echo -e "${YELLOW}Client credentials have been created.${NC}"
    echo "=============================================="
    echo ""
    echo -e "${GREEN}To retrieve all client credentials, run:${NC}"
    echo "  ./keycloak/setup/get-all-client-credentials.sh"
    echo ""
    echo "This will save all credentials to .oauth-tokens/"
    echo "=============================================="
}

# Setup groups mapper for OAuth2 clients
setup_groups_mapper() {
    local token=$1

    log_info "Setting up groups mapper for OAuth2 clients..."

    # Create groups mapper JSON
    local groups_mapper_json
    groups_mapper_json=$(cat << 'EOF'
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

    # Setup groups mapper for mcp-gateway-web client
    log_info "Setting up groups mapper for mcp-gateway-web client..."
    local web_client_id
    web_client_id=$(get_client_uuid "$token" "mcp-gateway-web" "$REALM" "$KEYCLOAK_URL")

    if [[ -z "$web_client_id" ]] || [[ "$web_client_id" == "null" ]]; then
        log_error "Could not find mcp-gateway-web client"
        return 1
    fi

    local response
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/clients/${web_client_id}/protocol-mappers/models" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json" \
        -d "$groups_mapper_json")

    if [[ "$response" == "201" ]]; then
        log_success "Groups mapper created for mcp-gateway-web!"
    elif [[ "$response" == "409" ]]; then
        log_warn "Groups mapper already exists for mcp-gateway-web. Continuing..."
    else
        log_error "Failed to create groups mapper for mcp-gateway-web. HTTP status: ${response}"
        return 1
    fi

    # Setup groups mapper for mcp-gateway-m2m client
    log_info "Setting up groups mapper for mcp-gateway-m2m client..."
    local m2m_client_id
    m2m_client_id=$(get_client_uuid "$token" "mcp-gateway-m2m" "$REALM" "$KEYCLOAK_URL")

    if [[ -z "$m2m_client_id" ]] || [[ "$m2m_client_id" == "null" ]]; then
        log_error "Could not find mcp-gateway-m2m client"
        return 1
    fi

    local m2m_response
    m2m_response=$(curl -s -o /dev/null -w "%{http_code}" \
        -X POST "${KEYCLOAK_URL}/admin/realms/${REALM}/clients/${m2m_client_id}/protocol-mappers/models" \
        -H "Authorization: Bearer ${token}" \
        -H "Content-Type: application/json" \
        -d "$groups_mapper_json")

    if [[ "$m2m_response" == "201" ]]; then
        log_success "Groups mapper created for mcp-gateway-m2m!"
    elif [[ "$m2m_response" == "409" ]]; then
        log_warn "Groups mapper already exists for mcp-gateway-m2m. Continuing..."
    else
        log_error "Failed to create groups mapper for mcp-gateway-m2m. HTTP status: ${m2m_response}"
        return 1
    fi
}

# =============================================================================
# Main Execution
# =============================================================================
main() {
    # Load environment variables from .env file
    load_env_file "$SCRIPT_DIR"

    # Check dependencies first
    check_dependencies || exit 1

    # Override KEYCLOAK_URL with KEYCLOAK_ADMIN_URL for API calls
    KEYCLOAK_URL="$(get_keycloak_url)"
    KEYCLOAK_ADMIN="$(get_keycloak_admin)"
    log_info "Using Keycloak API URL: $KEYCLOAK_URL"

    # Check if admin password is set
    if [[ -z "$KEYCLOAK_ADMIN_PASSWORD" ]]; then
        log_error "KEYCLOAK_ADMIN_PASSWORD environment variable is not set"
        echo "Please set it in .env file or export it before running this script"
        exit 1
    fi

    # Wait for Keycloak to be ready
    wait_for_keycloak "$KEYCLOAK_URL"

    # Get admin token
    log_info "Authenticating with Keycloak..."
    TOKEN=$(get_admin_token "$KEYCLOAK_URL" "$KEYCLOAK_ADMIN" "$KEYCLOAK_ADMIN_PASSWORD")

    if [[ -z "$TOKEN" ]]; then
        log_error "Failed to authenticate with Keycloak"
        echo "Please check your admin credentials"
        exit 1
    fi

    log_success "Authentication successful!"

    # Create realm and configure it step by step
    if create_realm "$TOKEN"; then
        create_clients "$TOKEN"
        create_scopes "$TOKEN"
        create_groups "$TOKEN"
        create_users "$TOKEN"
        create_service_account_user "$TOKEN"
        setup_client_secrets "$TOKEN"
        setup_groups_mapper "$TOKEN"
        setup_m2m_scopes "$TOKEN"
    else
        exit 1
    fi

    echo ""
    log_success "Keycloak initialization complete!"
    echo ""
    echo "You can now access Keycloak at: ${KEYCLOAK_URL}"
    echo "Admin console: ${KEYCLOAK_URL}/admin"
    echo "Realm: ${REALM}"
    echo ""
    echo "Default users created:"
    echo "  - admin/changeme (admin access)"
    echo "  - testuser/testpass (user access)"
    echo ""
    log_warn "Remember to change the default passwords!"
}

# Run main function
main
