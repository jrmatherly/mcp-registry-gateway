#!/bin/bash
# Shared entrypoint script for MCP servers
# Used by Dockerfile.mcp-server, Dockerfile.mcp-server-cpu, and Dockerfile.mcp-server-light

set -e

# Set default port
SERVER_PORT=${PORT:-8000}

# Create .env file if needed (for servers that require it)
# Note: Using -n to check for non-empty string (safer than ! -z)
if [ -n "$POLYGON_API_KEY" ]; then
    echo "POLYGON_API_KEY=$POLYGON_API_KEY" > /app/.env
fi

if [ -n "$REGISTRY_BASE_URL" ]; then
    echo "REGISTRY_BASE_URL=$REGISTRY_BASE_URL" > /app/.env
    echo "REGISTRY_USERNAME=$REGISTRY_USERNAME" >> /app/.env
    echo "REGISTRY_PASSWORD=$REGISTRY_PASSWORD" >> /app/.env
fi

# Activate virtual environment and run the server
source .venv/bin/activate
exec python server.py --port "$SERVER_PORT"
