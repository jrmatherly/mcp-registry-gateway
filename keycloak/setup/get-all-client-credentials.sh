#!/bin/bash
# Script to retrieve and save ALL client credentials from Keycloak
#
# Usage: ./get-all-client-credentials.sh
#
# This will fetch credentials for all clients in the mcp-gateway realm
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
KEYCLOAK_URL="$(get_keycloak_url)"
KEYCLOAK_REALM="$(get_keycloak_realm)"
ADMIN_USER="$(get_keycloak_admin)"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-}"

# Output directory
PROJECT_ROOT="$(get_project_root "$SCRIPT_DIR")"
OUTPUT_DIR="${PROJECT_ROOT}/.oauth-tokens"

# Validate required environment variable
if ! validate_required_env "KEYCLOAK_ADMIN_PASSWORD" "$ADMIN_PASS" \
    "Please export it or add it to .env file"; then
    exit 1
fi

# =============================================================================
# Display Configuration
# =============================================================================
print_header "Keycloak Client Credentials Retrieval"
log_info "Retrieving all client credentials from realm: $KEYCLOAK_REALM"
log_debug "Keycloak URL: $KEYCLOAK_URL"

# =============================================================================
# Main Execution
# =============================================================================
main() {
    # Get admin access token
    log_info "Getting admin token..."
    local admin_token
    admin_token=$(get_admin_token "$KEYCLOAK_URL" "$ADMIN_USER" "$ADMIN_PASS")

    if [[ -z "$admin_token" ]]; then
        log_error "Failed to get admin token. Check your admin credentials."
        exit 1
    fi
    log_success "Admin token obtained"

    # Create output directory if it doesn't exist
    mkdir -p "$OUTPUT_DIR"

    # Create the main credentials file
    local output_file="$OUTPUT_DIR/keycloak-client-secrets.txt"
    cat > "$output_file" << EOF
# Keycloak Client Credentials - Generated $(date)
# Realm: $KEYCLOAK_REALM
# Keycloak URL: $KEYCLOAK_URL
#
# Add these to your .env file or use them in your applications

EOF

    # Get all clients in the realm
    log_info "Fetching all clients in realm..."
    local clients_response
    clients_response=$(curl -s -X GET \
        "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients" \
        -H "Authorization: Bearer ${admin_token}" \
        -H "Content-Type: application/json")

    # Parse client IDs and filter out system clients
    local credential_count=0

    # First, specifically look for and process the main clients
    log_info "Processing main clients..."
    for main_client in "mcp-gateway-web" "mcp-gateway-m2m"; do
        log_debug "Looking for main client: $main_client"

        # Get specific client by clientId
        local client_data
        client_data=$(echo "$clients_response" | jq -r ".[] | select(.clientId == \"$main_client\")")

        if [[ -n "$client_data" ]] && [[ "$client_data" != "null" ]]; then
            local client_uuid
            client_uuid=$(echo "$client_data" | jq -r '.id')

            # Get client secret
            local secret_response
            secret_response=$(curl -s -X GET \
                "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients/${client_uuid}/client-secret" \
                -H "Authorization: Bearer ${admin_token}" \
                -H "Content-Type: application/json")

            local client_secret
            client_secret=$(echo "$secret_response" | jq -r '.value // "N/A"')

            if [[ "$client_secret" != "N/A" ]] && [[ "$client_secret" != "null" ]]; then
                if [[ "$main_client" == "mcp-gateway-web" ]]; then
                    echo "KEYCLOAK_CLIENT_ID=${main_client}" >> "$output_file"
                    echo "KEYCLOAK_CLIENT_SECRET=${client_secret}" >> "$output_file"
                    echo "" >> "$output_file"
                    log_success "  Found and saved: $main_client"
                elif [[ "$main_client" == "mcp-gateway-m2m" ]]; then
                    echo "KEYCLOAK_M2M_CLIENT_ID=${main_client}" >> "$output_file"
                    echo "KEYCLOAK_M2M_CLIENT_SECRET=${client_secret}" >> "$output_file"
                    echo "" >> "$output_file"
                    log_success "  Found and saved: $main_client"
                fi

                # Also create individual files for these
                local client_json_file="$OUTPUT_DIR/${main_client}.json"
                cat > "$client_json_file" <<EOF
{
  "client_id": "${main_client}",
  "client_secret": "${client_secret}",
  "gateway_url": "http://localhost:8000",
  "keycloak_url": "${KEYCLOAK_URL}",
  "keycloak_realm": "${KEYCLOAK_REALM}",
  "auth_provider": "keycloak"
}
EOF
                credential_count=$((credential_count + 1))
            fi
        else
            log_debug "  Client $main_client not found"
        fi
    done

    log_info "Processing agent clients..."
    # Process all other clients (agents, etc.)
    # Use process substitution instead of pipe to preserve variables
    while IFS= read -r client; do
        local client_id
        local client_uuid
        local public_client

        client_id=$(echo "$client" | jq -r '.clientId')
        client_uuid=$(echo "$client" | jq -r '.id')
        public_client=$(echo "$client" | jq -r '.publicClient // false')

        # Skip system clients, public clients, and the main clients we already processed
        if [[ "$client_id" == "realm-management" ]] || \
           [[ "$client_id" == "security-admin-console" ]] || \
           [[ "$client_id" == "admin-cli" ]] || \
           [[ "$client_id" == "account-console" ]] || \
           [[ "$client_id" == "broker" ]] || \
           [[ "$client_id" == "account" ]] || \
           [[ "$client_id" == "mcp-gateway-web" ]] || \
           [[ "$client_id" == "mcp-gateway-m2m" ]] || \
           [[ "$public_client" == "true" ]]; then
            continue
        fi

        log_debug "Processing agent client: $client_id"

        # Get client secret
        local secret_response
        secret_response=$(curl -s -X GET \
            "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients/${client_uuid}/client-secret" \
            -H "Authorization: Bearer ${admin_token}" \
            -H "Content-Type: application/json")

        local client_secret
        client_secret=$(echo "$secret_response" | jq -r '.value // "N/A"')

        if [[ "$client_secret" != "N/A" ]] && [[ "$client_secret" != "null" ]]; then
            # For agent clients, use a different format
            echo "# Agent: $client_id" >> "$output_file"
            local client_var_name
            client_var_name=$(echo "$client_id" | tr '[:lower:]' '[:upper:]' | tr '-' '_')
            echo "${client_var_name}_CLIENT_ID=${client_id}" >> "$output_file"
            echo "${client_var_name}_CLIENT_SECRET=${client_secret}" >> "$output_file"
            echo "" >> "$output_file"

            # Create individual JSON file for each client
            local client_json_file="$OUTPUT_DIR/${client_id}.json"
            cat > "$client_json_file" <<EOF
{
  "client_id": "${client_id}",
  "client_secret": "${client_secret}",
  "gateway_url": "http://localhost:8000",
  "keycloak_url": "${KEYCLOAK_URL}",
  "keycloak_realm": "${KEYCLOAK_REALM}",
  "auth_provider": "keycloak"
}
EOF

            log_success "  Saved credentials for: $client_id"
            credential_count=$((credential_count + 1))
        fi
    done < <(echo "$clients_response" | jq -c '.[] | select(.clientId != null)')

    # Add summary to the main file
    echo "" >> "$output_file"
    echo "# Summary" >> "$output_file"
    echo "# Total clients with credentials: $credential_count" >> "$output_file"
    echo "# Generated on: $(date)" >> "$output_file"

    # Set secure permissions
    chmod 600 "$output_file"
    chmod 600 "$OUTPUT_DIR"/*.json 2>/dev/null || true

    log_success "All client credentials retrieved and saved"
    echo ""
    echo "==================== Summary ===================="
    echo "Main credentials file: $output_file"
    echo "Individual JSON files: $OUTPUT_DIR/<client-id>.json"
    echo ""
    echo "Files created in: $OUTPUT_DIR/"
    ls -la "$OUTPUT_DIR/" | grep -E "\.(txt|json)$"
    echo "=================================================="
    echo ""
    log_warn "Note: These files contain sensitive credentials. Keep them secure!"
}

# Run main function
main
