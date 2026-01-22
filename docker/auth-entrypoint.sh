#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

echo "Starting Auth Server Setup..."

# --- DocumentDB CA Bundle Download ---
# Source the shared CA bundle download script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/download-documentdb-ca-bundle.sh"
download_documentdb_ca_bundle

echo "Starting Auth Server..."
cd /app
source .venv/bin/activate
exec uvicorn server:app --host 0.0.0.0 --port 8888
