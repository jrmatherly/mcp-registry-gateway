#!/bin/bash
# Clean Keycloak configuration and data
# This script removes all Keycloak configuration and database data for a fresh start
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
REALM="$(get_keycloak_realm)"
ADMIN_USER="$(get_keycloak_admin)"
ADMIN_PASS="${KEYCLOAK_ADMIN_PASSWORD:-}"

# Project root for docker-compose operations
PROJECT_ROOT="$(get_project_root "$SCRIPT_DIR")"
ENV_FILE="${PROJECT_ROOT}/.env"

# =============================================================================
# Display Configuration
# =============================================================================
print_header "Keycloak Cleanup Script for MCP Gateway Registry"
echo "Keycloak URL: $KEYCLOAK_URL"
echo "Realm: $REALM"
echo "Project Root: $PROJECT_ROOT"
echo ""

# =============================================================================
# Functions
# =============================================================================

# Function to delete realm via API
delete_realm_via_api() {
    log_info "Attempting to delete realm via Keycloak Admin API..."

    if ! check_keycloak_accessible "$KEYCLOAK_URL"; then
        log_warn "Keycloak is not accessible. Skipping API cleanup."
        return 1
    fi

    # Check if admin password is set
    if [[ -z "$ADMIN_PASS" ]]; then
        log_warn "KEYCLOAK_ADMIN_PASSWORD not set. Skipping API cleanup."
        return 1
    fi

    # Get admin token
    log_info "Getting admin token..."
    local token
    token=$(get_admin_token "$KEYCLOAK_URL" "$ADMIN_USER" "$ADMIN_PASS")

    if [[ -z "$token" ]]; then
        log_warn "Failed to get admin token. Skipping API cleanup."
        return 1
    fi
    log_success "Admin token obtained"

    # Check if realm exists
    if realm_exists "$token" "$REALM" "$KEYCLOAK_URL"; then
        log_info "Deleting ${REALM} realm..."
        local delete_response
        delete_response=$(curl -s -o /dev/null -w "%{http_code}" \
            -X DELETE "${KEYCLOAK_URL}/admin/realms/${REALM}" \
            -H "Authorization: Bearer ${token}")

        if [[ "$delete_response" == "204" ]]; then
            log_success "Realm '${REALM}' deleted successfully via API!"
            return 0
        else
            log_warn "Failed to delete realm via API (HTTP ${delete_response})"
            return 1
        fi
    else
        log_warn "Realm '${REALM}' does not exist or is not accessible"
        return 0
    fi
}

# Function to stop and remove containers
stop_containers() {
    log_info "Stopping Keycloak containers..."

    cd "$PROJECT_ROOT"

    # Stop Keycloak and database containers specifically
    if docker-compose ps | grep -q keycloak; then
        log_debug "Stopping keycloak container..."
        docker-compose stop keycloak || log_debug "Keycloak container was not running"
    fi

    if docker-compose ps | grep -q keycloak-db; then
        log_debug "Stopping keycloak-db container..."
        docker-compose stop keycloak-db || log_debug "Keycloak-db container was not running"
    fi

    # Remove the containers (but keep volumes for now)
    log_debug "Removing keycloak containers..."
    docker-compose rm -f keycloak keycloak-db 2>/dev/null || log_debug "Containers already removed"

    log_success "Containers stopped and removed"
}

# Function to remove database volume
remove_database_volume() {
    log_info "Removing Keycloak database volume..."

    cd "$PROJECT_ROOT"

    # Get the volume name (it will be prefixed with the project name)
    local volume_name
    volume_name=$(docker volume ls | grep keycloak_db_data | awk '{print $2}')

    if [[ -n "$volume_name" ]]; then
        log_debug "Removing volume: $volume_name"
        docker volume rm "$volume_name" 2>/dev/null || {
            log_warn "Volume might be in use. Forcing removal..."
            docker volume rm -f "$volume_name" 2>/dev/null || log_warn "Could not remove volume $volume_name"
        }
        log_success "Database volume removed"
    else
        log_warn "Keycloak database volume not found"
    fi
}

# Function to clean environment variables from .env
clean_env_secrets() {
    log_info "Cleaning Keycloak secrets from .env file..."

    if [[ -f "$ENV_FILE" ]]; then
        # Reset client secrets to placeholder values
        sed -i 's/^KEYCLOAK_CLIENT_SECRET=.*/KEYCLOAK_CLIENT_SECRET=your-keycloak-client-secret/' "$ENV_FILE" 2>/dev/null || true
        sed -i 's/^KEYCLOAK_M2M_CLIENT_SECRET=.*/KEYCLOAK_M2M_CLIENT_SECRET=your-keycloak-m2m-secret/' "$ENV_FILE" 2>/dev/null || true

        log_success "Client secrets reset to placeholder values in .env"
    else
        log_warn ".env file not found, skipping secret cleanup"
    fi
}

# =============================================================================
# Main Execution
# =============================================================================
main() {
    echo -e "${RED}WARNING: This will completely remove all Keycloak configuration and data!${NC}"
    echo "This includes:"
    echo "  - All realms, clients, and users"
    echo "  - All groups and group assignments"
    echo "  - All client secrets and configuration"
    echo "  - Database volume with all persistent data"
    echo ""

    read -p "Are you sure you want to proceed? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Cleanup cancelled"
        exit 0
    fi

    echo ""
    log_info "Starting Keycloak cleanup..."

    # Step 1: Try to delete realm via API (graceful cleanup)
    delete_realm_via_api || log_warn "API cleanup failed or skipped"

    # Step 2: Stop and remove containers
    stop_containers

    # Step 3: Remove database volume (nuclear option)
    remove_database_volume

    # Step 4: Clean environment secrets
    clean_env_secrets

    echo ""
    log_success "Keycloak cleanup completed!"

    print_next_steps \
        "Run 'docker-compose up -d keycloak keycloak-db' to start fresh containers" \
        "Wait for Keycloak to initialize (check with 'docker-compose logs keycloak')" \
        "Run './keycloak/setup/init-keycloak.sh' to set up fresh configuration"

    echo ""
    log_warn "Note: You'll need to update your .env file with new client secrets after running init-keycloak.sh"
}

# Run main function
main
