#!/bin/bash
set -e

REGION="us-east-1"
ACCOUNT_ID="128755427449"

# List of images to push (from GHCR)
IMAGES=(
  "ghcr.io/jrmatherly/mcp-registry:latest"
  "ghcr.io/jrmatherly/mcp-auth-server:latest"
  "ghcr.io/jrmatherly/mcp-metrics-service:latest"
  "ghcr.io/jrmatherly/mcp-mcp-server:latest"
)

echo "Logging into ECR..."
aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com

for IMAGE in "${IMAGES[@]}"; do
  # Extract repo name from GHCR image (e.g., ghcr.io/jrmatherly/mcp-registry:latest -> mcp-registry)
  REPO_NAME=$(echo $IMAGE | cut -d'/' -f3 | cut -d':' -f1)
  TAG=$(echo $IMAGE | cut -d':' -f2)

  echo ""
  echo "========================================="
  echo "Processing: $IMAGE"
  echo "========================================="

  echo "Creating ECR repository: ${REPO_NAME}..."
  aws ecr create-repository --repository-name ${REPO_NAME} --region ${REGION} 2>/dev/null || echo "Repository already exists"

  echo "Pulling image (AMD64)..."
  docker pull --platform linux/amd64 ${IMAGE}

  echo "Tagging for ECR..."
  docker tag ${IMAGE} ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:${TAG}

  echo "Pushing to ECR..."
  docker push ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPO_NAME}:${TAG}

  echo "✅ Done: ${REPO_NAME}:${TAG}"
done

echo ""
echo "========================================="
echo "✅ All images pushed to ECR!"
echo "========================================="
echo ""
echo "Update terraform.tfvars with ECR URIs:"
echo "registry_image_uri = \"${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/mcp-registry:latest\""
echo "auth_server_image_uri = \"${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/mcp-auth-server:latest\""
echo ""
echo "Then run: terraform apply -auto-approve"
