#!/bin/bash
# Shared script to download AWS DocumentDB CA bundle
# Used by auth-entrypoint.sh and registry-entrypoint.sh
#
# Usage: source this script or call it directly
# Requires: DOCUMENTDB_HOST environment variable
# Output: Downloads CA bundle to /app/global-bundle.pem if needed

set -e

# Default CA bundle path (can be overridden)
CA_BUNDLE_PATH="${CA_BUNDLE_PATH:-/app/global-bundle.pem}"

download_documentdb_ca_bundle() {
    if [[ "${DOCUMENTDB_HOST}" == *"docdb-elastic.amazonaws.com"* ]]; then
        echo "Detected DocumentDB Elastic cluster"
        echo "Downloading DocumentDB Elastic CA bundle..."
        CA_BUNDLE_URL="https://www.amazontrust.com/repository/SFSRootCAG2.pem"
        if [ ! -f "$CA_BUNDLE_PATH" ]; then
            if curl -fsSL "$CA_BUNDLE_URL" -o "$CA_BUNDLE_PATH"; then
                echo "DocumentDB Elastic CA bundle (SFSRootCAG2.pem) downloaded successfully to $CA_BUNDLE_PATH"
            else
                echo "ERROR: Failed to download DocumentDB Elastic CA bundle" >&2
                return 1
            fi
        else
            echo "CA bundle already exists at $CA_BUNDLE_PATH"
        fi
    elif [[ "${DOCUMENTDB_HOST}" == *"docdb.amazonaws.com"* ]]; then
        echo "Detected regular DocumentDB cluster"
        echo "Downloading regular DocumentDB CA bundle..."
        CA_BUNDLE_URL="https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem"
        if [ ! -f "$CA_BUNDLE_PATH" ]; then
            if curl -fsSL "$CA_BUNDLE_URL" -o "$CA_BUNDLE_PATH"; then
                echo "DocumentDB CA bundle (global-bundle.pem) downloaded successfully to $CA_BUNDLE_PATH"
            else
                echo "ERROR: Failed to download DocumentDB CA bundle" >&2
                return 1
            fi
        else
            echo "CA bundle already exists at $CA_BUNDLE_PATH"
        fi
    else
        echo "No DocumentDB host detected or DOCUMENTDB_HOST is empty - skipping CA bundle download"
    fi
}

# Run if script is executed directly (not sourced)
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    download_documentdb_ca_bundle
fi
