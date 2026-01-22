#!/bin/bash
# Generate image-manifest.json from build-config.yaml for Terraform consumption
# This script creates a JSON file with all ghcr.io image URIs for Terraform to reference

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/build-config.yaml"
OUTPUT_FILE="${SCRIPT_DIR}/image-manifest.json"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Error: $CONFIG_FILE not found"
    exit 1
fi

echo "Generating image manifest from $CONFIG_FILE..."

# Determine GitHub owner from git remote or environment variable
get_github_owner() {
    if [[ -n "${GITHUB_OWNER:-}" ]]; then
        echo "$GITHUB_OWNER"
        return
    fi

    # Try to extract from git remote
    if command -v git &> /dev/null && [ -d "$SCRIPT_DIR/.git" ]; then
        local remote_url
        remote_url=$(git -C "$SCRIPT_DIR" remote get-url origin 2>/dev/null || echo "")

        if [[ -n "$remote_url" ]]; then
            # Handle both HTTPS and SSH URLs
            # https://github.com/owner/repo.git -> owner
            # git@github.com:owner/repo.git -> owner
            local owner
            owner=$(echo "$remote_url" | sed -E 's|.*github\.com[:/]([^/]+)/.*|\1|')
            if [[ -n "$owner" && "$owner" != "$remote_url" ]]; then
                echo "$owner"
                return
            fi
        fi
    fi

    echo ""
}

GITHUB_OWNER=$(get_github_owner)

if [ -z "$GITHUB_OWNER" ]; then
    echo "Error: Could not determine GitHub owner. Set GITHUB_OWNER environment variable."
    exit 1
fi

GHCR_REGISTRY="ghcr.io/${GITHUB_OWNER}"
echo "GitHub Container Registry: $GHCR_REGISTRY"

# Handle --list flag to just list images
if [ "${1:-}" = "--list" ]; then
    python3 << EOF
import yaml

with open('$CONFIG_FILE') as f:
    cfg = yaml.safe_load(f)

images = cfg.get('images', {})

print("Configured images:")
for name, config in images.items():
    repo_name = config.get('repo_name', 'N/A')
    dockerfile = config.get('dockerfile', 'N/A')
    external = config.get('external_image', '')
    if external:
        print(f"  {name:25} (external: {external})")
    else:
        print(f"  {name:25} -> {repo_name}")
EOF
    exit 0
fi

python3 << EOF
import yaml
import json
import sys

with open('$CONFIG_FILE') as f:
    cfg = yaml.safe_load(f)

ghcr_registry = '$GHCR_REGISTRY'
images = cfg.get('images', {})

if not ghcr_registry:
    print("Error: ghcr_registry not available")
    sys.exit(1)

manifest = {}
for name, config in images.items():
    repo_name = config.get('repo_name')
    if not repo_name:
        # Skip external images without repo_name
        continue

    ghcr_uri = f'{ghcr_registry}/{repo_name}:latest'
    manifest[name] = ghcr_uri

# Write manifest
with open('$OUTPUT_FILE', 'w') as f:
    json.dump(manifest, f, indent=2)

print(f"Successfully generated {len(manifest)} image URIs in image-manifest.json")
print()
print("Image URIs (for Terraform):")
for name, uri in manifest.items():
    print(f"  {name:25} = {uri}")
EOF

echo ""
echo "Manifest saved to: $OUTPUT_FILE"
echo ""
echo "Usage in Terraform:"
echo "  locals {"
echo "    image_manifest = jsondecode(file(\"\${path.module}/image-manifest.json\"))"
echo "    registry_image = local.image_manifest[\"registry\"]"
echo "  }"
