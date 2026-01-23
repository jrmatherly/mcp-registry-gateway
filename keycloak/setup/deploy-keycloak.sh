#!/bin/bash
# =============================================================================
# Keycloak Full Deployment Script
# =============================================================================
# Streamlined deployment script that automates all Keycloak setup steps
# from the macOS Setup Guide (lines 279-508)
#
# This script encapsulates:
#   1. Starting Keycloak services (database + keycloak)
#   2. Waiting for Keycloak readiness
#   3. Disabling SSL requirements (macOS Docker compatibility)
#   4. Running init-keycloak.sh (realm, clients, groups, users)
#   5. Disabling SSL for mcp-gateway realm
#   6. Retrieving all client credentials
#   7. Creating optional test agents
#   8. Updating .env file with client secrets
#
# Usage:
#   ./deploy-keycloak.sh [OPTIONS]
#
# Options:
#   -a, --agents AGENTS     Comma-separated list of agent IDs to create
#                           (default: none)
#   -g, --group GROUP       Default group for agents (default: mcp-servers-unrestricted)
#   -p, --podman            Use Podman instead of Docker
#   -u, --update-env        Auto-update .env with retrieved secrets
#   -s, --skip-services     Skip starting services (assume already running)
#   -f, --force             Force re-initialization (skip existing checks)
#   -v, --verbose           Enable verbose logging
#   -h, --help              Show this help message
#
# Examples:
#   ./deploy-keycloak.sh                          # Basic deployment
#   ./deploy-keycloak.sh --update-env             # Deploy and update .env
#   ./deploy-keycloak.sh -a "test-agent,ai-coder" # Deploy with agents
#   ./deploy-keycloak.sh --podman                 # Use Podman
#
# Prerequisites:
#   - Docker or Podman installed and running
#   - .env file configured with KEYCLOAK_ADMIN_PASSWORD and KEYCLOAK_DB_PASSWORD
#   - jq installed for JSON processing
#
# Version: 1.0.0
# =============================================================================

set -e
set -o pipefail

# =============================================================================
# Load Shared Library
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

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

# Default values
CONTAINER_RUNTIME="docker"
COMPOSE_CMD="docker compose"
KEYCLOAK_CONTAINER="mcp-registry-gateway-keycloak-1"
AGENTS_TO_CREATE=""
DEFAULT_AGENT_GROUP="mcp-servers-unrestricted"
UPDATE_ENV_FILE=false
SKIP_SERVICES=false
FORCE_INIT=false
VERBOSE_MODE=false

# Keycloak readiness settings
MAX_WAIT_ATTEMPTS=60
WAIT_INTERVAL=5

# =============================================================================
# Usage
# =============================================================================
usage() {
    cat << 'EOF'
Usage: deploy-keycloak.sh [OPTIONS]

Streamlined Keycloak deployment script that automates all setup steps.

Options:
  -a, --agents AGENTS     Comma-separated list of agent IDs to create
                          Example: -a "test-agent,ai-coder,my-assistant"
  -g, --group GROUP       Default group for agents (default: mcp-servers-unrestricted)
  -p, --podman            Use Podman instead of Docker
  -u, --update-env        Auto-update .env file with retrieved client secrets
  -s, --skip-services     Skip starting services (assume already running)
  -f, --force             Force re-initialization (skip existing checks)
  -v, --verbose           Enable verbose logging
  -h, --help              Show this help message

Examples:
  # Basic deployment (services + initialization)
  ./deploy-keycloak.sh

  # Deploy and auto-update .env file
  ./deploy-keycloak.sh --update-env

  # Deploy with test agents
  ./deploy-keycloak.sh -a "test-agent,ai-coder" --update-env

  # Podman deployment
  ./deploy-keycloak.sh --podman --update-env

  # Re-initialize without restarting services
  ./deploy-keycloak.sh --skip-services --force

Environment Variables Required in .env:
  KEYCLOAK_ADMIN_PASSWORD    Admin password for Keycloak
  KEYCLOAK_DB_PASSWORD       Database password for PostgreSQL

Files Created:
  .oauth-tokens/keycloak-client-secrets.txt    Main credentials file
  .oauth-tokens/<client-id>.json               Individual client files
  .oauth-tokens/agent-<agent-id>.json          Agent credential files

EOF
}

# =============================================================================
# Parse Arguments
# =============================================================================
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -a|--agents)
                AGENTS_TO_CREATE="$2"
                shift 2
                ;;
            -g|--group)
                DEFAULT_AGENT_GROUP="$2"
                shift 2
                ;;
            -p|--podman)
                CONTAINER_RUNTIME="podman"
                COMPOSE_CMD="podman compose"
                shift
                ;;
            -u|--update-env)
                UPDATE_ENV_FILE=true
                shift
                ;;
            -s|--skip-services)
                SKIP_SERVICES=true
                shift
                ;;
            -f|--force)
                FORCE_INIT=true
                shift
                ;;
            -v|--verbose)
                VERBOSE_MODE=true
                export VERBOSE=1
                export DEBUG=1
                shift
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
}

# =============================================================================
# Validation Functions
# =============================================================================

# Check if container runtime is available
check_container_runtime() {
    log_info "Checking container runtime: $CONTAINER_RUNTIME"

    if ! command -v "$CONTAINER_RUNTIME" &>/dev/null; then
        log_error "$CONTAINER_RUNTIME is not installed or not in PATH"
        exit 1
    fi

    # Check if runtime is running
    if [[ "$CONTAINER_RUNTIME" == "docker" ]]; then
        if ! docker info &>/dev/null; then
            log_error "Docker daemon is not running. Please start Docker Desktop."
            exit 1
        fi
    elif [[ "$CONTAINER_RUNTIME" == "podman" ]]; then
        if ! podman machine list 2>/dev/null | grep -q "Currently running"; then
            log_warn "Podman machine may not be running. Attempting to start..."
            podman machine start 2>/dev/null || true
        fi
    fi

    log_success "Container runtime '$CONTAINER_RUNTIME' is available"
}

# Validate required passwords
validate_passwords() {
    log_info "Validating required passwords..."

    if [[ -z "${KEYCLOAK_ADMIN_PASSWORD:-}" ]]; then
        log_error "KEYCLOAK_ADMIN_PASSWORD is not set"
        echo ""
        echo "Please set it in your .env file or export it:"
        echo "  export KEYCLOAK_ADMIN_PASSWORD='your-secure-password'"
        exit 1
    fi

    if [[ -z "${KEYCLOAK_DB_PASSWORD:-}" ]]; then
        log_error "KEYCLOAK_DB_PASSWORD is not set"
        echo ""
        echo "Please set it in your .env file or export it:"
        echo "  export KEYCLOAK_DB_PASSWORD='your-secure-password'"
        exit 1
    fi

    log_success "Required passwords are configured"
}

# =============================================================================
# Service Management Functions
# =============================================================================

# Detect container name based on runtime and project
detect_container_name() {
    local container_name

    # Try common naming patterns
    local patterns=(
        "mcp-registry-gateway-keycloak-1"
        "mcp-registry-gateway_keycloak_1"
        "keycloak"
    )

    for pattern in "${patterns[@]}"; do
        if $CONTAINER_RUNTIME ps --format '{{.Names}}' 2>/dev/null | grep -q "^${pattern}$"; then
            container_name="$pattern"
            break
        fi
    done

    if [[ -z "$container_name" ]]; then
        # Fallback: search for any container with 'keycloak' in the name
        container_name=$($CONTAINER_RUNTIME ps --format '{{.Names}}' 2>/dev/null | grep -i keycloak | head -1 || true)
    fi

    if [[ -n "$container_name" ]]; then
        KEYCLOAK_CONTAINER="$container_name"
        log_debug "Detected Keycloak container: $KEYCLOAK_CONTAINER"
    fi
}

# Start Keycloak services
start_services() {
    if [[ "$SKIP_SERVICES" == true ]]; then
        log_info "Skipping service startup (--skip-services flag)"
        return 0
    fi

    log_info "Starting Keycloak services..."

    cd "$PROJECT_ROOT"

    # Start only keycloak and its database
    if ! $COMPOSE_CMD up -d keycloak-db keycloak; then
        log_error "Failed to start Keycloak services"
        echo ""
        echo "Troubleshooting steps:"
        echo "  1. Check if ports 8080 and 5432 are available"
        echo "  2. Review logs: $COMPOSE_CMD logs keycloak"
        echo "  3. Ensure Docker/Podman is running"
        exit 1
    fi

    log_success "Keycloak services started"

    # Give services a moment to initialize
    log_info "Waiting for services to initialize..."
    sleep 5
}

# Wait for Keycloak to be ready
wait_for_keycloak_ready() {
    local keycloak_url
    keycloak_url="$(get_keycloak_url)"

    log_info "Waiting for Keycloak to be ready at $keycloak_url..."
    log_info "This may take 2-3 minutes on first startup..."

    local attempt=0
    local ready=false

    while [[ $attempt -lt $MAX_WAIT_ATTEMPTS ]]; do
        # Check if we can reach the master realm
        if curl -sf "${keycloak_url}/realms/master" >/dev/null 2>&1; then
            ready=true
            break
        fi

        attempt=$((attempt + 1))
        local remaining=$((MAX_WAIT_ATTEMPTS - attempt))
        echo -ne "\r  Attempt $attempt/$MAX_WAIT_ATTEMPTS (${remaining} remaining)...   "
        sleep $WAIT_INTERVAL
    done

    echo ""

    if [[ "$ready" == true ]]; then
        log_success "Keycloak is ready!"
        return 0
    else
        log_error "Keycloak did not become ready within $((MAX_WAIT_ATTEMPTS * WAIT_INTERVAL)) seconds"
        echo ""
        echo "Check Keycloak logs:"
        echo "  $COMPOSE_CMD logs keycloak"
        exit 1
    fi
}

# =============================================================================
# SSL Configuration Functions
# =============================================================================

# Disable SSL for a realm using kcadm.sh
disable_ssl_for_realm() {
    local realm="$1"

    log_info "Disabling SSL requirement for realm: $realm"

    # Configure kcadm credentials
    if ! $CONTAINER_RUNTIME exec "$KEYCLOAK_CONTAINER" /opt/keycloak/bin/kcadm.sh config credentials \
        --server http://localhost:8080 \
        --realm master \
        --user admin \
        --password "${KEYCLOAK_ADMIN_PASSWORD}" 2>/dev/null; then
        log_error "Failed to configure Keycloak admin CLI"
        return 1
    fi

    # Disable SSL
    if ! $CONTAINER_RUNTIME exec "$KEYCLOAK_CONTAINER" /opt/keycloak/bin/kcadm.sh update "realms/$realm" \
        -s sslRequired=NONE 2>/dev/null; then
        log_warn "Failed to disable SSL for realm '$realm' (may not exist yet)"
        return 1
    fi

    log_success "SSL disabled for realm: $realm"
    return 0
}

# Verify SSL is disabled
verify_ssl_disabled() {
    local realm="$1"
    local keycloak_url
    keycloak_url="$(get_keycloak_url)"

    # Get realm info and check sslRequired
    local ssl_status
    ssl_status=$(curl -sf "${keycloak_url}/realms/${realm}" 2>/dev/null | jq -r '.sslRequired // "unknown"')

    if [[ "$ssl_status" == "none" ]]; then
        log_success "Verified: SSL is disabled for realm '$realm'"
        return 0
    else
        log_warn "SSL status for realm '$realm': $ssl_status"
        return 1
    fi
}

# =============================================================================
# Keycloak Initialization Functions
# =============================================================================

# Check if realm already exists
check_realm_exists() {
    local keycloak_url
    keycloak_url="$(get_keycloak_url)"

    if curl -sf "${keycloak_url}/realms/mcp-gateway" >/dev/null 2>&1; then
        return 0  # Realm exists
    else
        return 1  # Realm does not exist
    fi
}

# Run the main Keycloak initialization script
run_init_keycloak() {
    log_info "Running Keycloak initialization..."

    # Check if realm already exists
    if check_realm_exists && [[ "$FORCE_INIT" != true ]]; then
        log_warn "mcp-gateway realm already exists"
        echo "  Use --force to re-initialize"
        return 0
    fi

    # Make script executable and run
    chmod +x "${SCRIPT_DIR}/init-keycloak.sh"

    if ! "${SCRIPT_DIR}/init-keycloak.sh"; then
        log_error "Keycloak initialization failed"
        exit 1
    fi

    log_success "Keycloak initialization complete"
}

# Retrieve all client credentials
retrieve_credentials() {
    log_info "Retrieving client credentials..."

    chmod +x "${SCRIPT_DIR}/get-all-client-credentials.sh"

    if ! "${SCRIPT_DIR}/get-all-client-credentials.sh"; then
        log_error "Failed to retrieve client credentials"
        exit 1
    fi

    log_success "Client credentials retrieved"
}

# =============================================================================
# Agent Creation Functions
# =============================================================================

# Create agent service accounts
create_agents() {
    if [[ -z "$AGENTS_TO_CREATE" ]]; then
        log_debug "No agents to create"
        return 0
    fi

    log_info "Creating agent service accounts..."

    chmod +x "${SCRIPT_DIR}/setup-agent-service-account.sh"

    # Split comma-separated list into array
    IFS=',' read -ra AGENT_ARRAY <<< "$AGENTS_TO_CREATE"

    for agent_id in "${AGENT_ARRAY[@]}"; do
        # Trim whitespace
        agent_id=$(echo "$agent_id" | xargs)

        if [[ -z "$agent_id" ]]; then
            continue
        fi

        log_info "Creating agent: $agent_id (group: $DEFAULT_AGENT_GROUP)"

        if ! "${SCRIPT_DIR}/setup-agent-service-account.sh" \
            --agent-id "$agent_id" \
            --group "$DEFAULT_AGENT_GROUP"; then
            log_warn "Failed to create agent: $agent_id"
            continue
        fi

        log_success "Agent created: $agent_id"
    done

    # Refresh credentials after creating agents
    log_info "Refreshing credentials after agent creation..."
    retrieve_credentials
}

# =============================================================================
# Environment File Functions
# =============================================================================

# Update .env file with client secrets
update_env_file() {
    if [[ "$UPDATE_ENV_FILE" != true ]]; then
        log_debug "Skipping .env update (--update-env not specified)"
        return 0
    fi

    log_info "Updating .env file with client secrets..."

    local secrets_file="${PROJECT_ROOT}/.oauth-tokens/keycloak-client-secrets.txt"
    local env_file="${PROJECT_ROOT}/.env"

    if [[ ! -f "$secrets_file" ]]; then
        log_error "Secrets file not found: $secrets_file"
        return 1
    fi

    if [[ ! -f "$env_file" ]]; then
        log_error ".env file not found: $env_file"
        return 1
    fi

    # Extract secrets from the generated file
    local web_client_secret
    local m2m_client_secret

    web_client_secret=$(grep "^KEYCLOAK_CLIENT_SECRET=" "$secrets_file" | cut -d= -f2 || true)
    m2m_client_secret=$(grep "^KEYCLOAK_M2M_CLIENT_SECRET=" "$secrets_file" | cut -d= -f2 || true)

    if [[ -z "$web_client_secret" ]] || [[ -z "$m2m_client_secret" ]]; then
        log_warn "Could not extract all secrets from $secrets_file"
        echo "Please manually update .env with values from:"
        echo "  $secrets_file"
        return 1
    fi

    # Create backup of .env
    cp "$env_file" "${env_file}.backup.$(date +%Y%m%d_%H%M%S)"

    # Update KEYCLOAK_CLIENT_SECRET
    if grep -q "^KEYCLOAK_CLIENT_SECRET=" "$env_file"; then
        # macOS-compatible sed with backup
        if [[ "$(uname)" == "Darwin" ]]; then
            sed -i '' "s|^KEYCLOAK_CLIENT_SECRET=.*|KEYCLOAK_CLIENT_SECRET=${web_client_secret}|" "$env_file"
        else
            sed -i "s|^KEYCLOAK_CLIENT_SECRET=.*|KEYCLOAK_CLIENT_SECRET=${web_client_secret}|" "$env_file"
        fi
        log_success "Updated KEYCLOAK_CLIENT_SECRET"
    else
        echo "KEYCLOAK_CLIENT_SECRET=${web_client_secret}" >> "$env_file"
        log_success "Added KEYCLOAK_CLIENT_SECRET"
    fi

    # Update KEYCLOAK_M2M_CLIENT_SECRET
    if grep -q "^KEYCLOAK_M2M_CLIENT_SECRET=" "$env_file"; then
        if [[ "$(uname)" == "Darwin" ]]; then
            sed -i '' "s|^KEYCLOAK_M2M_CLIENT_SECRET=.*|KEYCLOAK_M2M_CLIENT_SECRET=${m2m_client_secret}|" "$env_file"
        else
            sed -i "s|^KEYCLOAK_M2M_CLIENT_SECRET=.*|KEYCLOAK_M2M_CLIENT_SECRET=${m2m_client_secret}|" "$env_file"
        fi
        log_success "Updated KEYCLOAK_M2M_CLIENT_SECRET"
    else
        echo "KEYCLOAK_M2M_CLIENT_SECRET=${m2m_client_secret}" >> "$env_file"
        log_success "Added KEYCLOAK_M2M_CLIENT_SECRET"
    fi

    log_success ".env file updated with client secrets"
    log_info "Backup created at: ${env_file}.backup.*"
}

# =============================================================================
# Summary Functions
# =============================================================================

# Print deployment summary
print_summary() {
    local keycloak_url
    keycloak_url="$(get_keycloak_url)"

    echo ""
    echo "============================================================"
    echo -e "${GREEN}Keycloak Deployment Complete!${NC}"
    echo "============================================================"
    echo ""
    echo "Services:"
    echo "  Keycloak Admin Console: ${keycloak_url}/admin"
    echo "  Keycloak Realm:         mcp-gateway"
    echo ""
    echo "Credentials Location:"
    echo "  Main file:    ${PROJECT_ROOT}/.oauth-tokens/keycloak-client-secrets.txt"
    echo "  Client files: ${PROJECT_ROOT}/.oauth-tokens/<client-id>.json"
    echo ""
    echo "Default Users Created:"
    echo "  admin/changeme    - Admin access"
    echo "  testuser/testpass - User access"
    echo ""

    if [[ -n "$AGENTS_TO_CREATE" ]]; then
        echo "Agents Created:"
        IFS=',' read -ra AGENT_ARRAY <<< "$AGENTS_TO_CREATE"
        for agent_id in "${AGENT_ARRAY[@]}"; do
            agent_id=$(echo "$agent_id" | xargs)
            if [[ -n "$agent_id" ]]; then
                echo "  - $agent_id (group: $DEFAULT_AGENT_GROUP)"
            fi
        done
        echo ""
    fi

    if [[ "$UPDATE_ENV_FILE" == true ]]; then
        echo -e "${GREEN}.env file has been updated with client secrets${NC}"
        echo ""
    else
        echo -e "${YELLOW}Remember to update your .env file with client secrets:${NC}"
        echo "  cat ${PROJECT_ROOT}/.oauth-tokens/keycloak-client-secrets.txt"
        echo ""
    fi

    echo "Next Steps:"
    echo "  1. Start all services:  ./build_and_run.sh --prebuilt"
    echo "  2. Access web UI:       http://localhost"
    echo "  3. Login with Keycloak: Click 'Login with Keycloak'"
    echo ""
    echo -e "${YELLOW}Important: Change default passwords before production use!${NC}"
    echo "============================================================"
}

# =============================================================================
# Main Execution
# =============================================================================
main() {
    print_header "Keycloak Full Deployment"
    echo ""

    # Parse command line arguments
    parse_arguments "$@"

    # Load environment from .env file
    load_env_file "$SCRIPT_DIR"

    # Check dependencies
    check_dependencies || exit 1
    check_container_runtime
    validate_passwords

    echo ""
    echo "Configuration:"
    echo "  Container Runtime: $CONTAINER_RUNTIME"
    echo "  Update .env:       $UPDATE_ENV_FILE"
    echo "  Skip Services:     $SKIP_SERVICES"
    echo "  Force Init:        $FORCE_INIT"
    if [[ -n "$AGENTS_TO_CREATE" ]]; then
        echo "  Agents to Create:  $AGENTS_TO_CREATE"
        echo "  Agent Group:       $DEFAULT_AGENT_GROUP"
    fi
    echo ""

    # Step 1: Start services
    echo ""
    echo "Step 1/7: Starting Services"
    echo "------------------------------------------------------------"
    start_services

    # Detect container name after services start
    detect_container_name

    # Step 2: Wait for Keycloak
    echo ""
    echo "Step 2/7: Waiting for Keycloak Readiness"
    echo "------------------------------------------------------------"
    wait_for_keycloak_ready

    # Step 3: Disable SSL for master realm (macOS Docker compatibility)
    echo ""
    echo "Step 3/7: Configuring SSL (macOS Docker Compatibility)"
    echo "------------------------------------------------------------"
    disable_ssl_for_realm "master" || true
    verify_ssl_disabled "master" || true

    # Step 4: Initialize Keycloak (realm, clients, groups, users)
    echo ""
    echo "Step 4/7: Initializing Keycloak"
    echo "------------------------------------------------------------"
    run_init_keycloak

    # Step 5: Disable SSL for mcp-gateway realm
    echo ""
    echo "Step 5/7: Configuring SSL for mcp-gateway Realm"
    echo "------------------------------------------------------------"
    disable_ssl_for_realm "mcp-gateway" || true
    verify_ssl_disabled "mcp-gateway" || true

    # Step 6: Retrieve credentials
    echo ""
    echo "Step 6/7: Retrieving Client Credentials"
    echo "------------------------------------------------------------"
    retrieve_credentials

    # Step 7: Create agents (if specified)
    echo ""
    echo "Step 7/7: Creating Agent Service Accounts"
    echo "------------------------------------------------------------"
    create_agents

    # Update .env if requested
    update_env_file

    # Print summary
    print_summary
}

# Run main function with all arguments
main "$@"
