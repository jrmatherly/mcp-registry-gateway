#!/bin/bash
# shellcheck shell=bash
#
# MCP Gateway Registry - Build and Deploy Script
#
# This script builds and deploys the MCP Gateway Registry stack using
# either Docker or Podman, with support for pre-built images.
#
# Usage: ./build_and_run.sh [--prebuilt] [--podman] [--help]
#
# Environment Variables:
#   MCP_GATEWAY_BASE_DIR - Base directory for MCP Gateway data (default: ~/mcp-gateway)
#

# Enable strict error handling
set -euo pipefail

# =============================================================================
# CONFIGURATION CONSTANTS
# =============================================================================

readonly MCP_GATEWAY_BASE_DIR="${MCP_GATEWAY_BASE_DIR:-${HOME}/mcp-gateway}"
readonly MCPGATEWAY_SERVERS_DIR="$MCP_GATEWAY_BASE_DIR/servers"
readonly AGENTS_DIR="$MCP_GATEWAY_BASE_DIR/agents"
readonly AUTH_SERVER_DIR="$MCP_GATEWAY_BASE_DIR/auth_server"
readonly SECURITY_SCANS_DIR="$MCP_GATEWAY_BASE_DIR/security_scans"
readonly SSL_DIR="$MCP_GATEWAY_BASE_DIR/ssl"
readonly FEDERATION_JSON_FILE="$MCP_GATEWAY_BASE_DIR/federation.json"

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Function for logging with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function for error handling
handle_error() {
    log "ERROR: $1"
    exit 1
}

# Wait for a service to become healthy
# Usage: wait_for_service "Service Name" "http://url/health" [max_retries] [sleep_interval]
wait_for_service() {
    local service_name="$1"
    local url="$2"
    local max_retries="${3:-30}"
    local sleep_interval="${4:-2}"
    local retry_count=0

    log "Waiting for $service_name to be ready..."
    while [ "$retry_count" -lt "$max_retries" ]; do
        if curl -sf --connect-timeout 5 --max-time 10 "$url" &>/dev/null; then
            log "$service_name is ready"
            return 0
        fi
        sleep "$sleep_interval"
        retry_count=$((retry_count + 1))
        log "Waiting for $service_name... ($retry_count/$max_retries)"
    done

    return 1
}

# Display an information box with title and messages
# Usage: show_info_box "TITLE" "message1" "message2" ...
show_info_box() {
    local title="$1"
    shift
    local messages=("$@")

    echo ""
    echo "╔════════════════════════════════════════════════════════════════════════════╗"
    printf "║ %-74s ║\n" "$title"
    echo "╠════════════════════════════════════════════════════════════════════════════╣"
    echo "║                                                                            ║"
    for msg in "${messages[@]}"; do
        printf "║  %-72s  ║\n" "$msg"
    done
    echo "║                                                                            ║"
    echo "╚════════════════════════════════════════════════════════════════════════════╝"
    echo ""
}

# Copy JSON files from source to destination directory
# Usage: copy_json_files "src_dir" "dest_dir" "pattern" "description" [use_envsubst]
copy_json_files() {
    local src_dir="$1"
    local dest_dir="$2"
    local pattern="$3"
    local description="$4"
    local use_envsubst="${5:-false}"

    log "Copying $description from $src_dir to $dest_dir..."

    if [ ! -d "$src_dir" ]; then
        log "WARNING: $src_dir directory not found"
        return 1
    fi

    mkdir -p "$dest_dir"

    # shellcheck disable=SC2086
    if ! ls $src_dir/$pattern 1> /dev/null 2>&1; then
        log "No files matching $pattern found in $src_dir"
        return 0
    fi

    # shellcheck disable=SC2086
    for json_file in $src_dir/$pattern; do
        local filename
        filename=$(basename "$json_file")
        log "Processing $filename..."

        if [ "$use_envsubst" = true ]; then
            envsubst < "$json_file" > "$dest_dir/$filename"
        else
            cp "$json_file" "$dest_dir/$filename"
        fi
    done

    log "$description copied successfully"
    return 0
}

# Display service URLs based on container engine
# Usage: display_service_urls "http://main" "https://main"
display_service_urls() {
    local main_http="$1"
    local main_https="$2"

    log "Services are available at:"
    log "  - Main interface: $main_http or $main_https"
    log "  - Registry API: http://localhost:7860"
    log "  - Auth service: http://localhost:8888"
    log "  - Current Time MCP: http://localhost:8000"
    log "  - Financial Info MCP: http://localhost:8001"
    log "  - Real Server Fake Tools MCP: http://localhost:8002"
    log "  - MCP Gateway MCP: http://localhost:8003"
    log "  - Atlassian MCP: http://localhost:8005"
}

# Portable cleanup of environment variable lines (works on both macOS and Linux)
# Usage: cleanup_env_var "VAR_NAME"
cleanup_env_var() {
    local var_name="$1"
    local tmp_file
    tmp_file=$(mktemp)

    # Remove lines matching VAR_NAME= or VAR_NAME=""
    grep -v "^${var_name}=\$\|^${var_name}=\"\"\$" .env > "$tmp_file" 2>/dev/null || true
    mv "$tmp_file" .env
}

# Check service health (non-blocking, returns status)
# Usage: check_service_health "Service Name" "http://url/health"
check_service_health() {
    local service_name="$1"
    local url="$2"

    if curl -sf --connect-timeout 5 --max-time 10 "$url" &>/dev/null; then
        log "$service_name is healthy"
        return 0
    else
        log "WARNING: $service_name may still be starting up..."
        return 1
    fi
}

# =============================================================================
# MAIN SCRIPT
# =============================================================================

# Parse command line arguments
USE_PREBUILT=false
USE_PODMAN=false
DOCKER_COMPOSE_FILE="docker-compose.yml"
PODMAN_COMPOSE_FILE="docker-compose.podman.yml"

while [[ $# -gt 0 ]]; do
  case $1 in
    --prebuilt)
      USE_PREBUILT=true
      DOCKER_COMPOSE_FILE="docker-compose.prebuilt.yml"
      shift
      ;;
    --podman)
      USE_PODMAN=true
      shift
      ;;
    --help)
      echo "Usage: $0 [--prebuilt] [--podman] [--help]"
      echo ""
      echo "Options:"
      echo "  --prebuilt    Use pre-built container images (faster startup)"
      echo "  --podman      Use Podman instead of Docker (rootless-friendly)"
      echo "  --help        Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                     # Build containers locally with Docker (default)"
      echo "  $0 --prebuilt          # Use pre-built images from registry with Docker"
      echo "  $0 --podman            # Build containers locally with Podman"
      echo "  $0 --prebuilt --podman # Use pre-built images with Podman"
      echo ""
      echo "Benefits of --prebuilt:"
      echo "  - Instant deployment (no build time)"
      echo "  - Reduced friction (eliminate build environment issues)"
      echo "  - Consistent experience (all users get the same tested images)"
      echo "  - Bandwidth efficient (pull optimized, compressed images)"
      echo ""
      echo "Benefits of --podman:"
      echo "  - Rootless container execution (no privileged ports)"
      echo "  - Compatible with macOS Podman Desktop"
      echo "  - Uses non-privileged ports (8080 for HTTP, 8443 for HTTPS)"
      echo "  - No Docker daemon required"
      exit 0
      ;;
    *)
      echo "Unknown option $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

echo "MCP Gateway Registry Deployment"
echo "==============================="

# Detect and configure container engine
COMPOSE_CMD=""
COMPOSE_FILES=""

if [ "$USE_PODMAN" = true ]; then
    # User explicitly requested Podman
    if command -v podman &> /dev/null; then
        COMPOSE_CMD="podman compose"
        # Use standalone Podman compose file to avoid port merge issues
        COMPOSE_FILES="-f $PODMAN_COMPOSE_FILE"
        log "Using Podman (rootless mode)"
        log "Services will be available at:"
        log "   - HTTP:  http://localhost:8080"
        log "   - HTTPS: https://localhost:8443"
    else
        log "ERROR: --podman flag specified but podman command not found"
        log "Please install Podman: https://podman.io/getting-started/installation"
        exit 1
    fi
else
    # Auto-detect: prefer Docker, fallback to Podman
    if command -v docker &> /dev/null && docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
        COMPOSE_FILES="-f $DOCKER_COMPOSE_FILE"
        log "Using Docker"
        log "Services will be available at:"
        log "   - HTTP:  http://localhost"
        log "   - HTTPS: https://localhost"
    elif command -v podman &> /dev/null; then
        log "WARNING: Docker not found, automatically using Podman (rootless mode)"
        log "To suppress this message, use --podman flag explicitly"
        COMPOSE_CMD="podman compose"
        # Use standalone Podman compose file to avoid port merge issues
        COMPOSE_FILES="-f $PODMAN_COMPOSE_FILE"
        log "Services will be available at:"
        log "   - HTTP:  http://localhost:8080"
        log "   - HTTPS: https://localhost:8443"
    else
        log "ERROR: Neither 'docker compose' nor 'podman compose' is available"
        log "Please install one of:"
        log "  - Docker: https://docs.docker.com/compose/install/"
        log "  - Podman: https://podman.io/getting-started/installation"
        exit 1
    fi
fi

if [ "$USE_PREBUILT" = true ]; then
    log "Using pre-built container images for fast deployment"
    log "Will pull latest images from container registry during startup..."

    # Warn about ARM64 compatibility with Podman
    if [[ "$COMPOSE_CMD" == "podman compose" ]] && [[ $(uname -m) == "arm64" ]]; then
        log "WARNING: Pre-built images are amd64. On Apple Silicon, consider:"
        log "   - Building locally: ./build_and_run.sh --podman"
        log "   - Or using Docker Desktop: ./build_and_run.sh --prebuilt"
        log "   Continuing in 5 seconds... (Ctrl+C to cancel)"
        sleep 5
    fi
else
    log "Building containers locally (this may take several minutes)"
fi

log "Using compose files: $COMPOSE_FILES"
log "Starting MCP Gateway deployment script"

# Only check Node.js and build frontend when building locally
if [ "$USE_PREBUILT" = false ]; then
    # Check if Node.js and npm are installed
    if ! command -v node &> /dev/null; then
        log "ERROR: Node.js is not installed"
        log "Please install Node.js (version 16 or higher): https://nodejs.org/"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        log "ERROR: npm is not installed"
        log "Please install npm (usually comes with Node.js): https://nodejs.org/"
        exit 1
    fi

    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        log "ERROR: Node.js version $NODE_VERSION is too old. Please install Node.js 16 or higher."
        exit 1
    fi

    log "Node.js $(node -v) and npm $(npm -v) are available"

    # Build the React frontend
    log "Building React frontend..."
    if [ ! -d "frontend" ]; then
        handle_error "Frontend directory not found"
    fi

    cd frontend

    # Install frontend dependencies
    log "Installing frontend dependencies..."
    npm install || handle_error "Failed to install frontend dependencies"

    # Build the React application
    log "Building React application for production..."
    npm run build || handle_error "Failed to build React application"

    log "Frontend build completed successfully"
    cd ..
else
    log "Skipping frontend build (using pre-built images)"
fi

# Check if .env file exists
if [ ! -f .env ]; then
    log "ERROR: .env file not found"
    log "Please create a .env file with your configuration values:"
    log "Example .env file:"
    log "SECRET_KEY=your_secret_key_here"
    log "ADMIN_USER=admin"
    log "ADMIN_PASSWORD=your_secure_password"
    log "# For Financial Info server API keys, see servers/fininfo/README_SECRETS.md"
    exit 1
fi

log "Found .env file"

# Load environment variables from .env file early
# Note: .env is sourced multiple times in this script because it may be modified
# (SECRET_KEY generation, metrics tokens). Each source reloads after modifications.
source .env

# Stop and remove existing services if they exist
log "Stopping existing services (if any)..."
# shellcheck disable=SC2086
$COMPOSE_CMD $COMPOSE_FILES down --remove-orphans || log "No existing services to stop"
log "Existing services stopped"

# Clean up FAISS index files to force registry to recreate them
log "Checking FAISS index files..."
FAISS_FILES=("service_index.faiss" "service_index_metadata.json")

# Check if FAISS index files exist
FAISS_EXISTS=false
for file in "${FAISS_FILES[@]}"; do
    file_path="$MCPGATEWAY_SERVERS_DIR/$file"
    if [ -f "$file_path" ]; then
        FAISS_EXISTS=true
        break
    fi
done

if [ "$FAISS_EXISTS" = true ]; then
    show_info_box "FAISS INDEX FILES EXIST" \
        "Existing FAISS index files were found in:" \
        "$MCPGATEWAY_SERVERS_DIR/" \
        "" \
        "These files contain your server registry and search index." \
        "To preserve your registered servers, these files will NOT be deleted." \
        "" \
        "If you need to regenerate the FAISS index (e.g., after corruption):" \
        "1. Delete the existing files:" \
        "   rm $MCPGATEWAY_SERVERS_DIR/service_index*" \
        "2. The registry will automatically rebuild the index on startup"
    log "Keeping existing FAISS index files - NOT deleting"
else
    log "No existing FAISS index files found - will be created on first startup"
fi

# Clean up any root-owned directories from previous Docker runs
log "Checking for root-owned directories from previous Docker runs..."

# Check and remove root-owned directories
# Note: stat syntax differs between Linux (-c '%U') and macOS (-f '%Su')
for dir in "$MCPGATEWAY_SERVERS_DIR" "${HOME}/mcp-gateway/agents" "${HOME}/mcp-gateway/auth_server" "${HOME}/mcp-gateway/security_scans" "${HOME}/mcp-gateway/federation.json"; do
    if [ -e "$dir" ]; then
        owner=$(stat -c '%U' "$dir" 2>/dev/null || stat -f '%Su' "$dir" 2>/dev/null)
        if [ "$owner" = "root" ]; then
            log "Removing root-owned: $dir"
            sudo rm -rf "$dir"
        fi
    fi
done

# Copy JSON files from registry/servers with environment variable substitution
# Export all environment variables from .env file for envsubst
set -a  # Automatically export all variables
source .env  # Reload to export variables for envsubst
set +a  # Turn off automatic export

copy_json_files "registry/servers" "$MCPGATEWAY_SERVERS_DIR" "*.json" "server configs" true

# Verify atlassian.json was copied
if [ -f "$MCPGATEWAY_SERVERS_DIR/atlassian.json" ]; then
    log "atlassian.json copied successfully"
else
    log "WARNING: atlassian.json not found in copied files"
fi

# Copy seed agent JSON files from cli/examples
copy_json_files "cli/examples" "$AGENTS_DIR" "*agent*.json" "seed agents" false

# Copy scopes.yml to auth_server directory
TARGET_SCOPES_FILE="$AUTH_SERVER_DIR/scopes.yml"

log "Checking scopes.yml configuration..."
if [ -f "auth_server/scopes.yml" ]; then
    # Create the target directory if it doesn't exist
    mkdir -p "$AUTH_SERVER_DIR"

    # Check if scopes.yml already exists in the target directory
    if [ -f "$TARGET_SCOPES_FILE" ]; then
        show_info_box "SCOPES.YML EXISTS" \
            "An existing scopes.yml file was found at:" \
            "$TARGET_SCOPES_FILE" \
            "" \
            "This file contains your custom groups and server configurations." \
            "To preserve your settings, this file will NOT be overwritten." \
            "" \
            "If you need to restore the default scopes.yml from the codebase:" \
            "1. Delete the existing file:" \
            "   rm $TARGET_SCOPES_FILE" \
            "2. Re-run this script"
        log "Keeping existing scopes.yml - NOT overwriting"
    else
        # Copy scopes.yml for first-time setup
        cp auth_server/scopes.yml "$AUTH_SERVER_DIR/"
        log "scopes.yml copied successfully to $AUTH_SERVER_DIR (initial setup)"
    fi
else
    log "WARNING: auth_server/scopes.yml not found in codebase"
fi

# Create empty security_scans directory for Docker mount
log "Creating empty security_scans directory for Docker mount"
mkdir -p "$SECURITY_SCANS_DIR"

# Create empty federation.json file for Docker mount
log "Creating empty federation.json for Docker mount"
touch "$FEDERATION_JSON_FILE"

# Setup SSL certificate directory structure
log "Setting up SSL certificate directory structure..."
mkdir -p "$SSL_DIR/certs"
mkdir -p "$SSL_DIR/private"

# Check if SSL certificates exist and are properly located
if [ -f "$SSL_DIR/certs/fullchain.pem" ] && [ -f "$SSL_DIR/private/privkey.pem" ]; then
    log "SSL certificates found - HTTPS will be enabled"
    chmod 644 "$SSL_DIR/certs/fullchain.pem"
    chmod 600 "$SSL_DIR/private/privkey.pem"
else
    log "No SSL certificates found - HTTP-only mode will be used"
    log "To enable HTTPS, place certificates at:"
    log "  - $SSL_DIR/certs/fullchain.pem"
    log "  - $SSL_DIR/private/privkey.pem"
fi

# Generate a random SECRET_KEY if not already in .env
if ! grep -q "SECRET_KEY=" .env || grep -q "SECRET_KEY=$" .env || grep -q "SECRET_KEY=\"\"" .env; then
    log "Generating SECRET_KEY..."
    SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))') || handle_error "Failed to generate SECRET_KEY"

    # Remove any existing empty SECRET_KEY line (portable across macOS and Linux)
    cleanup_env_var "SECRET_KEY"

    # Add new SECRET_KEY
    echo "SECRET_KEY=$SECRET_KEY" >> .env
    log "SECRET_KEY added to .env"
else
    log "SECRET_KEY already exists in .env"
fi

# Validate required environment variables
log "Validating required environment variables..."
source .env  # Reload after potential SECRET_KEY addition

if [ -z "$ADMIN_PASSWORD" ] || [ "$ADMIN_PASSWORD" = "your_secure_password" ]; then
    log "ERROR: ADMIN_PASSWORD must be set to a secure value in .env file"
    exit 1
fi

# Determine BUILD_VERSION
# Priority: 1) Git tag (exact match), 2) Git describe, 3) VERSION file, 4) Default
log "Determining version..."
if command -v git &> /dev/null && [ -d .git ]; then
    # Get the current git tag
    GIT_TAG=$(git describe --tags --exact-match 2>/dev/null || echo "")

    if [ -n "$GIT_TAG" ]; then
        # We're on a tagged commit - use just the tag (remove 'v' prefix)
        export BUILD_VERSION="${GIT_TAG#v}"
        log "Building release version: $BUILD_VERSION"
    else
        # Not on a tag - include branch name and commit info
        GIT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
        GIT_DESCRIBE=$(git describe --tags --always 2>/dev/null || echo "dev")

        # Format: version-branch or describe-branch
        if [[ "$GIT_DESCRIBE" =~ ^[0-9] ]]; then
            # Starts with version number from describe
            export BUILD_VERSION="${GIT_DESCRIBE#v}-${GIT_BRANCH}"
        else
            # No version tags found, use commit hash
            export BUILD_VERSION="${GIT_DESCRIBE}-${GIT_BRANCH}"
        fi

        log "Building development version: $BUILD_VERSION"
    fi
elif [ -f "VERSION" ]; then
    # Fallback to VERSION file (single source of truth for releases)
    export BUILD_VERSION=$(cat VERSION | tr -d '[:space:]')
    log "Using VERSION file: $BUILD_VERSION"
else
    export BUILD_VERSION="2.0.0-dev"
    log "Git and VERSION file not available, using default: $BUILD_VERSION"
fi

# Build or pull container images
if [ "$USE_PREBUILT" = true ]; then
    log "Pulling pre-built container images..."
    # shellcheck disable=SC2086
    $COMPOSE_CMD $COMPOSE_FILES pull || handle_error "Compose pull failed"
    log "Pre-built container images pulled successfully"
else
    log "Building container images with optimization..."
    # Enable BuildKit for better caching and parallel builds (Docker only)
    if [[ "$COMPOSE_CMD" == "docker compose" ]]; then
        export DOCKER_BUILDKIT=1
        export COMPOSE_DOCKER_CLI_BUILD=1
    fi

    # Build with parallel jobs and build cache
    # shellcheck disable=SC2086
    $COMPOSE_CMD $COMPOSE_FILES build --parallel --progress=auto || handle_error "Compose build failed"
    log "Container images built successfully with optimization"
fi

# Start metrics service first to generate API keys
log "Starting metrics service first..."
# shellcheck disable=SC2086
$COMPOSE_CMD $COMPOSE_FILES up -d metrics-service || handle_error "Failed to start metrics service"

# Wait for metrics service to be ready
wait_for_service "Metrics service" "http://localhost:8890/health" 30 2 || \
    handle_error "Metrics service did not become ready within expected time"

# Generate dynamic pre-shared tokens for metrics authentication
log "Setting up dynamic pre-shared tokens for services..."

# Get all services from compose file that might need metrics (exclude monitoring services)
# shellcheck disable=SC2086
METRICS_SERVICES=$($COMPOSE_CMD $COMPOSE_FILES config --services 2>/dev/null | grep -v -E "(prometheus|grafana|metrics-db)" | sort | uniq)

if [ -z "$METRICS_SERVICES" ]; then
    log "WARNING: No services found for metrics configuration"
else
    log "Found services for metrics: $(echo "$METRICS_SERVICES" | tr '\n' ' ')"
fi

# Check if tokens already exist in .env
source .env 2>/dev/null || true  # Reload to check for existing tokens

# Generate tokens for each service dynamically
for service in $METRICS_SERVICES; do
    # Convert service name to environment variable format
    # auth-server -> METRICS_API_KEY_AUTH_SERVER
    # metrics-service -> METRICS_API_KEY_METRICS_SERVICE (will be skipped as it's the metrics service itself)
    ENV_VAR_NAME="METRICS_API_KEY_$(echo "$service" | tr '[:lower:]-' '[:upper:]_')"

    # Skip the metrics service itself and non-metrics services
    if [ "$service" = "metrics-service" ] || [ "$service" = "prometheus" ] || [ "$service" = "grafana" ]; then
        continue
    fi

    # Get current value (use default empty string if variable is unset)
    CURRENT_VALUE="${!ENV_VAR_NAME:-}"

    # Generate token only if it doesn't exist or is empty
    if [ -z "$CURRENT_VALUE" ] || [ "$CURRENT_VALUE" = "" ]; then
        NEW_TOKEN="mcp_metrics_$(openssl rand -hex 16)"

        # Remove any existing line for this variable (portable across macOS and Linux)
        TMP_FILE=$(mktemp)
        grep -v "^${ENV_VAR_NAME}=" .env > "$TMP_FILE" 2>/dev/null || true
        mv "$TMP_FILE" .env

        # Add new token
        echo "$ENV_VAR_NAME=$NEW_TOKEN" >> .env
        log "Generated new $service token: ${NEW_TOKEN:0:20}..."
    else
        log "Using existing $service token: ${CURRENT_VALUE:0:20}..."
    fi
done

log "Dynamic metrics API tokens configured successfully"

# Now start all other services with the API keys in environment
log "Starting remaining services..."
# shellcheck disable=SC2086
$COMPOSE_CMD $COMPOSE_FILES up -d || handle_error "Failed to start remaining services"

# Wait a moment for services to initialize
log "Waiting for services to initialize..."
sleep 10

# Check service status
log "Checking service status..."
# shellcheck disable=SC2086
$COMPOSE_CMD $COMPOSE_FILES ps

# Verify key services are running
log "Verifying services are healthy..."

# Check registry service
check_service_health "Registry service" "http://localhost:7860/health" || true

# Check auth service
check_service_health "Auth service" "http://localhost:8888/health" || true

# Check nginx is responding
if curl -sf --connect-timeout 5 --max-time 10 http://localhost:80 &>/dev/null || \
   curl -ksf --connect-timeout 5 --max-time 10 https://localhost:443 &>/dev/null; then
    log "Nginx is responding"
else
    log "WARNING: Nginx may still be starting up..."
fi

# Verify FAISS index creation
log "Verifying FAISS index creation..."
sleep 5  # Give registry service time to create the index

if [ -f "$MCPGATEWAY_SERVERS_DIR/service_index.faiss" ]; then
    log "FAISS index created successfully at $MCPGATEWAY_SERVERS_DIR/service_index.faiss"

    # Check if metadata file also exists
    if [ -f "$MCPGATEWAY_SERVERS_DIR/service_index_metadata.json" ]; then
        log "FAISS index metadata created successfully"
    else
        log "WARNING: FAISS index metadata file not found"
    fi
else
    log "WARNING: FAISS index not yet created. The registry service will create it on first access."
fi

# Verify server list includes Atlassian
log "Verifying server list..."
if [ -f "$MCPGATEWAY_SERVERS_DIR/atlassian.json" ]; then
    log "Atlassian server configuration present"
fi

# List all available server JSON files
log "Available server configurations in $MCPGATEWAY_SERVERS_DIR:"
if find "$MCPGATEWAY_SERVERS_DIR" -maxdepth 1 -name "*.json" -type f 2>/dev/null | head -n 10; then
    TOTAL_SERVERS=$(find "$MCPGATEWAY_SERVERS_DIR" -maxdepth 1 -name "*.json" -type f 2>/dev/null | wc -l)
    log "Total server configurations: $TOTAL_SERVERS"
else
    log "WARNING: No server configurations found in $MCPGATEWAY_SERVERS_DIR"
fi


log "Deployment completed successfully"
log ""

# Display correct URLs based on container engine
if [[ "$COMPOSE_CMD" == "podman compose" ]]; then
    display_service_urls "http://localhost:8080" "https://localhost:8443"
else
    display_service_urls "http://localhost" "https://localhost"
fi
log ""
log "To view logs for all services: $COMPOSE_CMD $COMPOSE_FILES logs -f"
log "To view logs for a specific service: $COMPOSE_CMD $COMPOSE_FILES logs -f <service-name>"
log "To stop services: $COMPOSE_CMD $COMPOSE_FILES down"
log ""

# Ask if user wants to follow logs
read -r -p "Do you want to follow the logs? (y/n): " -n 1 REPLY
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Following container logs (press Ctrl+C to stop following logs without stopping the services):"
    echo "---------- CONTAINER LOGS ----------"
    # shellcheck disable=SC2086
    $COMPOSE_CMD $COMPOSE_FILES logs -f
else
    log "Services are running in the background. Use '$COMPOSE_CMD $COMPOSE_FILES logs -f' to view logs."
fi
