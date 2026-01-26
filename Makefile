.PHONY: help test test-unit test-integration test-e2e test-fast test-coverage test-auth test-servers test-search test-health test-core install-dev install-docs install-all lint lint-fix format format-check security check-deps clean build-keycloak push-keycloak build-and-push-keycloak deploy-keycloak update-keycloak save-outputs view-logs view-logs-keycloak view-logs-registry view-logs-auth view-logs-follow list-images build push build-push generate-manifest validate-config publish-dockerhub publish-dockerhub-component publish-dockerhub-version publish-dockerhub-no-mirror publish-local compose-up-agents compose-down-agents compose-logs-agents build-agents push-agents setup-keycloak keycloak-start keycloak-init keycloak-credentials keycloak-status keycloak-logs keycloak-stop keycloak-reset release version-bump helm-lint helm-package helm-push helm-release helm-deps dev dev-keycloak dev-frontend dev-backend dev-services dev-services-kc dev-stop dev-status dev-logs frontend-install frontend-build frontend-test frontend-lint

# Version file
VERSION_FILE := VERSION

# Default target
help:
	@echo "MCP Registry Testing Commands"
	@echo ""
	@echo "Hot-Reload Development (NEW - Fastest iteration):"
	@echo "  dev             Start full hot-reload dev environment (frontend + backend + services)"
	@echo "  dev-keycloak    Start hot-reload dev with Keycloak auth provider"
	@echo "  dev-frontend    Start Vite dev server with hot-reload (port 3000)"
	@echo "  dev-backend     Start FastAPI backend with auto-reload (port 7860)"
	@echo "  dev-services    Start supporting services only (MongoDB, auth-server, metrics)"
	@echo "  dev-services-kc Start supporting services WITH Keycloak (for Keycloak auth)"
	@echo "  dev-stop        Stop all development services and processes"
	@echo "  dev-status      Check status of development services"
	@echo "  dev-logs        View logs from development services"
	@echo ""
	@echo "Frontend Development:"
	@echo "  frontend-install  Install frontend dependencies"
	@echo "  frontend-build    Build frontend for production"
	@echo "  frontend-test     Run frontend tests"
	@echo "  frontend-lint     Lint and format frontend code"
	@echo ""
	@echo "Setup:"
	@echo "  install-dev     Install development dependencies (testing, linting)"
	@echo "  install-docs    Install documentation dependencies (mkdocs)"
	@echo "  install-all     Install ALL dependencies (dev + docs) - recommended for contributors"
	@echo "  check-deps      Check if test dependencies are installed"
	@echo ""
	@echo "Testing:"
	@echo "  test            Run full test suite with coverage"
	@echo "  test-unit       Run unit tests only"
	@echo "  test-integration Run integration tests only"
	@echo "  test-e2e        Run end-to-end tests only"
	@echo "  test-fast       Run fast tests (exclude slow tests)"
	@echo "  test-coverage   Generate coverage reports"
	@echo ""
	@echo "Domain Testing:"
	@echo "  test-auth       Run authentication domain tests"
	@echo "  test-servers    Run server management domain tests"
	@echo "  test-search     Run search domain tests"
	@echo "  test-health     Run health monitoring domain tests"
	@echo "  test-core       Run core infrastructure tests"
	@echo ""
	@echo "Code Quality (ruff):"
	@echo "  lint            Run ruff linting checks"
	@echo "  lint-fix        Run ruff with auto-fix"
	@echo "  format          Format code with ruff"
	@echo "  format-check    Check formatting without changes"
	@echo "  security        Run bandit security scan"
	@echo "  clean           Clean up test artifacts"
	@echo ""
	@echo "Keycloak Build & Deploy:"
	@echo "  build-keycloak              Build Keycloak Docker image locally"
	@echo "  build-and-push-keycloak     Build and push to ECR"
	@echo "  deploy-keycloak             Update ECS service (after push)"
	@echo "  update-keycloak             Build, push, and deploy in one command"
	@echo ""
	@echo "Local Keycloak Development:"
	@echo "  setup-keycloak              Full local Keycloak setup (start, init, configure)"
	@echo "  keycloak-start              Start Keycloak services (db + keycloak)"
	@echo "  keycloak-init               Initialize realm, clients, groups, users"
	@echo "  keycloak-credentials        Retrieve and display all client credentials"
	@echo "  keycloak-status             Check Keycloak health and status"
	@echo "  keycloak-logs               View Keycloak container logs"
	@echo "  keycloak-stop               Stop Keycloak services"
	@echo "  keycloak-reset              Stop Keycloak and remove data volumes"
	@echo ""
	@echo "Infrastructure Documentation:"
	@echo "  save-outputs                Save Terraform outputs as JSON"
	@echo ""
	@echo "CloudWatch Logs Viewing:"
	@echo "  view-logs                   View logs from all components (last 30 min)"
	@echo "  view-logs-keycloak          View Keycloak logs (last 30 min)"
	@echo "  view-logs-registry          View Registry logs (last 30 min)"
	@echo "  view-logs-auth              View Auth Server logs (last 30 min)"
	@echo "  view-logs-follow            Follow logs in real-time for all components"
	@echo ""
	@echo "Container Build & Registry:"
	@echo "  list-images                 List all configured container images"
	@echo "  build                       Build all images locally"
	@echo "  build IMAGE=name            Build specific image (e.g., IMAGE=registry)"
	@echo "  push                        Push all images to ECR"
	@echo "  push IMAGE=name             Push specific image to ECR"
	@echo "  build-push                  Build and push all images"
	@echo "  build-push IMAGE=name       Build and push specific image"
	@echo "  generate-manifest           Generate image-manifest.json for Terraform"
	@echo "  validate-config             Validate build-config.yaml syntax"
	@echo ""
	@echo "DockerHub Publishing:"
	@echo "  publish-dockerhub           Publish all images to DockerHub"
	@echo "  publish-dockerhub-component Publish specific component (COMPONENT=name)"
	@echo "  publish-dockerhub-version   Publish with version tag (VERSION=v1.0.0)"
	@echo "  publish-dockerhub-no-mirror Publish without external images"
	@echo "  publish-local               Build locally without pushing"
	@echo ""
	@echo "Local A2A Agent Development:"
	@echo "  compose-up-agents           Start A2A agents with docker-compose"
	@echo "  compose-down-agents         Stop A2A agents"
	@echo "  compose-logs-agents         Follow A2A agent logs in real-time"
	@echo "  build-agents                Build both A2A agent images locally"
	@echo "  push-agents                 Push both A2A agent images to ECR"
	@echo ""
	@echo "Helm Charts:"
	@echo "  helm-lint                   Lint all Helm charts"
	@echo "  helm-deps                   Update Helm chart dependencies"
	@echo "  helm-package                Package all Helm charts"
	@echo "  helm-push                   Push charts to OCI registry (requires GITHUB_TOKEN)"
	@echo "  helm-release                Package and push charts with current version"
	@echo ""
	@echo "Release Management:"
	@echo "  version-bump                Show next version (with optional manual override)"
	@echo "  release                     Bump version, create tag, and push release (with optional manual override)"

# Installation
install-dev:
	@echo "Installing development dependencies (testing, linting, type checking)..."
	uv sync --dev

install-docs:
	@echo "Installing documentation dependencies (mkdocs)..."
	uv sync --all-extras

install-all:
	@echo "Installing ALL dependencies (dev + docs)..."
	uv sync --dev --all-extras
	@echo "Verifying installation..."
	@uv run pytest --version
	@uv run mkdocs --version
	@uv run ruff --version

check-deps:
	@python scripts/test.py check

# Full test suite
test:
	@python scripts/test.py full

# Test types
test-unit:
	@python scripts/test.py unit

test-integration:
	@python scripts/test.py integration

test-e2e:
	@python scripts/test.py e2e

test-fast:
	@python scripts/test.py fast

test-coverage:
	@python scripts/test.py coverage

# Domain-specific tests
test-auth:
	@python scripts/test.py auth

test-servers:
	@python scripts/test.py servers

test-search:
	@python scripts/test.py search

test-health:
	@python scripts/test.py health

test-core:
	@python scripts/test.py core

# Code quality (using ruff - configured in pyproject.toml)
lint:
	@echo "Running ruff linting checks..."
	@uv run ruff check registry/ agents/ auth_server/ api/ tests/
	@echo "Linting complete"

lint-fix:
	@echo "Running ruff with auto-fix..."
	@uv run ruff check --fix registry/ agents/ auth_server/ api/ tests/
	@echo "Lint fixes applied"

format:
	@echo "Formatting code with ruff..."
	@uv run ruff format registry/ agents/ auth_server/ api/ tests/
	@echo "Formatting complete"

format-check:
	@echo "Checking code formatting..."
	@uv run ruff format --check registry/ agents/ auth_server/ api/ tests/

security:
	@echo "Running bandit security scan..."
	@uv run bandit -r registry/ -c pyproject.toml || true
	@echo "Security scan complete"

# Cleanup
clean:
	@echo "Cleaning up test artifacts..."
	@rm -rf htmlcov/
	@rm -rf tests/reports/
	@rm -rf .coverage
	@rm -rf coverage.xml
	@rm -rf .pytest_cache/
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "✅ Cleanup complete"

# Development workflow
dev-test: clean install-dev test-fast
	@echo "✅ Development test cycle complete!"

# CI/CD workflow
ci-test: clean check-deps test test-coverage
	@echo "✅ CI/CD test cycle complete!"

# Keycloak Build & Deployment
# Variables
AWS_REGION ?= us-west-2
AWS_PROFILE ?= default
IMAGE_TAG ?= latest

build-keycloak:
	@echo "Building Keycloak Docker image..."
	@$(MAKE) build IMAGE=keycloak
	@echo "✅ Image built: keycloak:$(IMAGE_TAG)"

build-and-push-keycloak:
	@echo "Building and pushing Keycloak to ECR..."
	@$(MAKE) build-push IMAGE=keycloak
	@echo "✅ Keycloak image built and pushed successfully"

deploy-keycloak:
	@echo "Deploying Keycloak ECS service..."
	aws ecs update-service \
		--cluster keycloak \
		--service keycloak \
		--force-new-deployment \
		--region $(AWS_REGION) \
		--profile $(AWS_PROFILE) \
		--output table
	@echo "✅ ECS service update initiated"

update-keycloak: build-and-push-keycloak deploy-keycloak
	@echo ""
	@echo "✅ Keycloak update complete!"
	@echo ""
	@echo "Monitor deployment:"
	@echo "  aws ecs describe-services --cluster keycloak --services keycloak --region $(AWS_REGION) --query 'services[0].[serviceName,status,runningCount,desiredCount]' --output table"

# ========================================
# Local Keycloak Development
# ========================================

# Full local Keycloak setup (recommended for first-time setup)
setup-keycloak:
	@echo "Running full Keycloak local setup..."
	@./keycloak/setup/deploy-keycloak.sh --update-env
	@echo ""
	@echo "✅ Keycloak setup complete!"

# Start Keycloak services only (database + keycloak)
keycloak-start:
	@echo "Starting Keycloak services..."
	@docker compose up -d keycloak-db keycloak
	@echo "Waiting for Keycloak to be ready (this may take 1-2 minutes)..."
	@timeout=120; while [ $$timeout -gt 0 ]; do \
		if curl -sf http://localhost:8080/realms/master >/dev/null 2>&1; then \
			echo "✅ Keycloak is ready!"; \
			exit 0; \
		fi; \
		sleep 5; \
		timeout=$$((timeout - 5)); \
		echo "  Waiting... ($$timeout seconds remaining)"; \
	done; \
	echo "⚠️  Timeout waiting for Keycloak. Check logs with: make keycloak-logs"

# Initialize Keycloak realm, clients, groups, users
keycloak-init:
	@echo "Initializing Keycloak configuration..."
	@./keycloak/setup/init-keycloak.sh
	@echo "✅ Keycloak initialization complete!"

# Retrieve and display all client credentials
keycloak-credentials:
	@echo "Retrieving Keycloak client credentials..."
	@./keycloak/setup/get-all-client-credentials.sh
	@echo ""
	@echo "Credentials saved to: .oauth-tokens/keycloak-client-secrets.txt"
	@echo "To view: cat .oauth-tokens/keycloak-client-secrets.txt"

# Check Keycloak health and status
keycloak-status:
	@echo "Checking Keycloak status..."
	@echo ""
	@echo "Container Status:"
	@docker compose ps keycloak keycloak-db 2>/dev/null || echo "  Keycloak services not running"
	@echo ""
	@echo "Health Checks:"
	@if curl -sf http://localhost:8080/realms/master >/dev/null 2>&1; then \
		echo "  ✅ Keycloak master realm: healthy"; \
	else \
		echo "  ❌ Keycloak master realm: unreachable"; \
	fi
	@if curl -sf http://localhost:8080/realms/mcp-gateway >/dev/null 2>&1; then \
		echo "  ✅ mcp-gateway realm: configured"; \
	else \
		echo "  ⚠️  mcp-gateway realm: not configured (run: make keycloak-init)"; \
	fi
	@if curl -sf http://localhost:9000/health/ready >/dev/null 2>&1; then \
		echo "  ✅ Health endpoint (9000): ready"; \
	else \
		echo "  ⚠️  Health endpoint (9000): not available"; \
	fi
	@echo ""
	@echo "Service URLs (when running):"
	@echo "  Admin Console: http://localhost:8080/admin"
	@echo "  mcp-gateway Realm: http://localhost:8080/realms/mcp-gateway"

# View Keycloak container logs
keycloak-logs:
	@docker compose logs -f keycloak

# Stop Keycloak services
keycloak-stop:
	@echo "Stopping Keycloak services..."
	@docker compose stop keycloak keycloak-db
	@echo "✅ Keycloak services stopped"

# Stop Keycloak and remove data volumes (full reset)
keycloak-reset:
	@echo "⚠️  This will stop Keycloak and DELETE all data!"
	@read -p "Are you sure? (y/N) " confirm && [ "$$confirm" = "y" ] || exit 1
	@echo "Stopping and removing Keycloak services..."
	@docker compose down keycloak keycloak-db -v
	@echo "✅ Keycloak reset complete. Run 'make setup-keycloak' to reinitialize."

save-outputs:
	@echo "Saving Terraform outputs as JSON..."
	./terraform/aws-ecs/scripts/save-terraform-outputs.sh
	@echo ""
	@echo "✅ Outputs saved to terraform/aws-ecs/terraform-outputs.json"

view-logs:
	@echo "Viewing CloudWatch logs from last 30 minutes for all components..."
	./terraform/aws-ecs/scripts/view-cloudwatch-logs.sh

view-logs-keycloak:
	@echo "Viewing Keycloak CloudWatch logs from last 30 minutes..."
	./terraform/aws-ecs/scripts/view-cloudwatch-logs.sh --component keycloak --minutes 30

view-logs-registry:
	@echo "Viewing Registry CloudWatch logs from last 30 minutes..."
	./terraform/aws-ecs/scripts/view-cloudwatch-logs.sh --component registry --minutes 30

view-logs-auth:
	@echo "Viewing Auth Server CloudWatch logs from last 30 minutes..."
	./terraform/aws-ecs/scripts/view-cloudwatch-logs.sh --component auth-server --minutes 30

view-logs-follow:
	@echo "Following CloudWatch logs in real-time for all components..."
	./terraform/aws-ecs/scripts/view-cloudwatch-logs.sh --follow

# ========================================
# Unified Container Build System
# ========================================

list-images:
	@./scripts/generate-image-manifest.sh --list

generate-manifest:
	@./scripts/generate-image-manifest.sh

validate-config:
	@python3 -c "import yaml; yaml.safe_load(open('build-config.yaml'))" && echo "Config is valid!"

build:
	@$(if $(IMAGE),IMAGE=$(IMAGE),) ./scripts/build-images.sh build

push:
	@$(if $(IMAGE),IMAGE=$(IMAGE),) ./scripts/build-images.sh push

build-push:
	@$(if $(NO_CACHE),NO_CACHE=$(NO_CACHE),) $(if $(IMAGE),IMAGE=$(IMAGE),) ./scripts/build-images.sh build-push

build-push-deploy:
	@if [ "$(IMAGE)" != "registry" ]; then \
		echo "Error: build-push-deploy only supports IMAGE=registry"; \
		exit 1; \
	fi
	@$(if $(NO_CACHE),NO_CACHE=$(NO_CACHE),) IMAGE=registry ./scripts/deploy-registry.sh

# ========================================
# DockerHub Publishing
# ========================================

publish-dockerhub:
	@echo "Publishing all images to DockerHub..."
	./scripts/publish_containers.sh --dockerhub

publish-dockerhub-component:
	@echo "Publishing $(COMPONENT) to DockerHub..."
	./scripts/publish_containers.sh --dockerhub --component $(COMPONENT)

publish-dockerhub-version:
	@echo "Publishing all images to DockerHub with version $(VERSION)..."
	./scripts/publish_containers.sh --dockerhub --version $(VERSION)

publish-dockerhub-no-mirror:
	@echo "Publishing all images to DockerHub (skipping external images)..."
	./scripts/publish_containers.sh --dockerhub --skip-mirror

publish-local:
	@echo "Building all images locally (no push)..."
	./scripts/publish_containers.sh --local

# ========================================
# Local A2A Agent Development
# ========================================

compose-up-agents:
	@echo "Starting A2A agents with docker-compose..."
	cd agents/a2a && docker-compose -f docker-compose.local.yml up -d
	@echo "Agents started:"
	@echo "  Flight Booking Agent: http://localhost:9002/ping"
	@echo "  Travel Assistant Agent: http://localhost:9001/ping"

compose-down-agents:
	@echo "Stopping A2A agents..."
	cd agents/a2a && docker-compose -f docker-compose.local.yml down

compose-logs-agents:
	@echo "Following A2A agent logs..."
	cd agents/a2a && docker-compose -f docker-compose.local.yml logs -f

build-agents:
	@echo "Building A2A agent images locally..."
	@$(MAKE) build IMAGE=flight_booking_agent
	@$(MAKE) build IMAGE=travel_assistant_agent
	@echo "Both agents built successfully"

push-agents:
	@echo "Pushing A2A agent images to ECR..."
	@$(MAKE) push IMAGE=flight_booking_agent
	@$(MAKE) push IMAGE=travel_assistant_agent
	@echo "Both agents pushed to ECR"

# ========================================
# Release Management
# ========================================

# Calculate next version: increment patch, roll to next major at .10
# Example: 2.0.7 -> 2.0.8, 2.0.9 -> 3.0.0 (not 2.0.10)
define calc_next_version
$(shell \
	current=$$(cat $(VERSION_FILE) | tr -d '[:space:]'); \
	major=$$(echo $$current | cut -d. -f1); \
	minor=$$(echo $$current | cut -d. -f2); \
	patch=$$(echo $$current | cut -d. -f3); \
	next_patch=$$((patch + 1)); \
	if [ $$next_patch -ge 10 ]; then \
		echo "$$((major + 1)).0.0"; \
	else \
		echo "$$major.$$minor.$$next_patch"; \
	fi \
)
endef

# Show next version without making changes (with optional manual override)
version-bump:
	@current=$$(cat $(VERSION_FILE) | tr -d '[:space:]'); \
	auto_next=$(calc_next_version); \
	echo "Current version: $$current"; \
	echo "Auto-calculated next version: $$auto_next"; \
	echo ""; \
	read -p "Enter version manually (or press Enter for $$auto_next): " manual_version; \
	if [ -n "$$manual_version" ]; then \
		if ! echo "$$manual_version" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$$'; then \
			echo "Error: Invalid version format. Expected X.Y.Z (e.g., 2.1.0)"; \
			exit 1; \
		fi; \
		next="$$manual_version"; \
		echo "Using manual version: $$next"; \
	else \
		next="$$auto_next"; \
		echo "Using auto-calculated version: $$next"; \
	fi

# Bump version, create tag, and push release (with optional manual override)
release:
	@echo "Starting release process..."
	@echo ""
	@current=$$(cat $(VERSION_FILE) | tr -d '[:space:]'); \
	auto_next=$(calc_next_version); \
	echo "Current version: $$current"; \
	echo "Auto-calculated next version: $$auto_next"; \
	echo ""; \
	read -p "Enter version manually (or press Enter for $$auto_next): " manual_version; \
	if [ -n "$$manual_version" ]; then \
		if ! echo "$$manual_version" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$$'; then \
			echo "Error: Invalid version format. Expected X.Y.Z (e.g., 2.1.0)"; \
			exit 1; \
		fi; \
		next="$$manual_version"; \
		echo "Using manual version: $$next"; \
	else \
		next="$$auto_next"; \
		echo "Using auto-calculated version: $$next"; \
	fi; \
	echo ""; \
	read -p "Proceed with release v$$next? (y/N) " confirm; \
	if [ "$$confirm" != "y" ] && [ "$$confirm" != "Y" ]; then \
		echo "Release cancelled."; \
		exit 1; \
	fi; \
	echo ""; \
	echo "Updating VERSION file..."; \
	echo "$$next" > $(VERSION_FILE); \
	echo "Updating pyproject.toml version..."; \
	sed -i.bak "s/^version = \".*\"/version = \"$$next\"/" pyproject.toml && rm -f pyproject.toml.bak; \
	echo "Regenerating uv.lock with new version..."; \
	uv lock; \
	echo "Updating Helm chart versions..."; \
	for chart in registry auth-server keycloak-configure mongodb-configure mcp-gateway-registry-stack; do \
		chart_file="charts/$$chart/Chart.yaml"; \
		if [ -f "$$chart_file" ]; then \
			sed -i.bak "s/^version:.*/version: $$next/" "$$chart_file" && rm -f "$$chart_file.bak"; \
			sed -i.bak "s/^appVersion:.*/appVersion: \"$$next\"/" "$$chart_file" && rm -f "$$chart_file.bak"; \
		fi; \
	done; \
	stack_file="charts/mcp-gateway-registry-stack/Chart.yaml"; \
	sed -i.bak "s/version: 2\.[0-9]*\.[0-9]*/version: $$next/g" "$$stack_file" && rm -f "$$stack_file.bak"; \
	echo "Staging version files..."; \
	git add $(VERSION_FILE) pyproject.toml uv.lock charts/*/Chart.yaml; \
	echo "Creating commit..."; \
	git commit -m "chore: bump version to $$next"; \
	echo "Creating tag v$$next..."; \
	git tag -a "v$$next" -m "Release v$$next"; \
	echo "Pushing commit and tag to origin..."; \
	git push origin HEAD; \
	git push origin "v$$next"; \
	echo ""; \
	echo "✅ Release v$$next complete!"; \
	echo ""; \
	echo "Release artifacts:"; \
	echo "  - VERSION file updated to $$next"; \
	echo "  - pyproject.toml version updated to $$next"; \
	echo "  - uv.lock regenerated with $$next"; \
	echo "  - Helm chart versions updated to $$next"; \
	echo "  - Git tag v$$next created and pushed"; \
	echo "  - Commit pushed to origin"; \
	echo ""; \
	echo "GitHub Actions will automatically:"; \
	echo "  - Build and push Docker images to ghcr.io"; \
	echo "  - Package and push Helm charts to oci://ghcr.io/jrmatherly/charts"

# =============================================================================
# Helm Chart Management
# =============================================================================

# OCI Registry for Helm charts
HELM_REGISTRY := ghcr.io
HELM_REPO := $(HELM_REGISTRY)/jrmatherly/charts
CHARTS_DIR := charts
HELM_VERSION := 3.14.0

# List of charts to manage
CHARTS := registry auth-server keycloak-configure mongodb-configure mcp-gateway-registry-stack

# Lint all Helm charts
helm-lint:
	@echo "Linting Helm charts..."
	@for chart in $(CHARTS); do \
		if [ -f "$(CHARTS_DIR)/$$chart/Chart.yaml" ]; then \
			echo "Linting $$chart..."; \
			helm lint "$(CHARTS_DIR)/$$chart" || exit 1; \
		fi; \
	done
	@echo "All charts passed linting."

# Update chart dependencies
helm-deps:
	@echo "Updating Helm chart dependencies..."
	@helm repo add bitnami https://charts.bitnami.com/bitnami 2>/dev/null || true
	@helm repo add mongodb https://mongodb.github.io/helm-charts 2>/dev/null || true
	@helm repo update
	@for chart in $(CHARTS); do \
		if [ -f "$(CHARTS_DIR)/$$chart/Chart.yaml" ]; then \
			echo "Building dependencies for $$chart..."; \
			helm dependency build "$(CHARTS_DIR)/$$chart" || true; \
		fi; \
	done
	@echo "Dependencies updated."

# Package all charts
helm-package: helm-deps
	@echo "Packaging Helm charts..."
	@mkdir -p dist/charts
	@version=$$(cat $(VERSION_FILE) | tr -d '[:space:]'); \
	for chart in $(CHARTS); do \
		if [ -f "$(CHARTS_DIR)/$$chart/Chart.yaml" ]; then \
			echo "Packaging $$chart..."; \
			helm package "$(CHARTS_DIR)/$$chart" --version "$$version" --app-version "$$version" --destination dist/charts; \
		fi; \
	done
	@echo "Charts packaged in dist/charts/"
	@ls -la dist/charts/

# Push charts to OCI registry (requires GITHUB_TOKEN environment variable)
helm-push:
	@if [ -z "$$GITHUB_TOKEN" ]; then \
		echo "Error: GITHUB_TOKEN environment variable is required"; \
		echo "Usage: GITHUB_TOKEN=your_token make helm-push"; \
		exit 1; \
	fi
	@echo "Logging in to $(HELM_REGISTRY)..."
	@echo "$$GITHUB_TOKEN" | helm registry login $(HELM_REGISTRY) -u $${GITHUB_USER:-$$USER} --password-stdin
	@echo "Pushing charts to oci://$(HELM_REPO)..."
	@version=$$(cat $(VERSION_FILE) | tr -d '[:space:]'); \
	for chart in $(CHARTS); do \
		pkg="dist/charts/$$chart-$$version.tgz"; \
		if [ -f "$$pkg" ]; then \
			echo "Pushing $$pkg..."; \
			helm push "$$pkg" "oci://$(HELM_REPO)"; \
		else \
			echo "Warning: $$pkg not found, skipping"; \
		fi; \
	done
	@helm registry logout $(HELM_REGISTRY) || true
	@echo "Charts pushed to OCI registry."

# Package and push charts (convenience target)
helm-release: helm-lint helm-package helm-push
	@echo "Helm chart release complete!"
	@version=$$(cat $(VERSION_FILE) | tr -d '[:space:]'); \
	echo ""; \
	echo "Charts available at:"; \
	for chart in $(CHARTS); do \
		echo "  oci://$(HELM_REPO)/$$chart:$$version"; \
	done

# Update chart versions (called during release)
helm-version-update:
	@version=$$(cat $(VERSION_FILE) | tr -d '[:space:]'); \
	echo "Updating Helm chart versions to $$version..."; \
	for chart in $(CHARTS); do \
		chart_file="$(CHARTS_DIR)/$$chart/Chart.yaml"; \
		if [ -f "$$chart_file" ]; then \
			echo "  Updating $$chart..."; \
			sed -i.bak "s/^version:.*/version: $$version/" "$$chart_file" && rm -f "$$chart_file.bak"; \
			sed -i.bak "s/^appVersion:.*/appVersion: \"$$version\"/" "$$chart_file" && rm -f "$$chart_file.bak"; \
		fi; \
	done; \
	stack_file="$(CHARTS_DIR)/mcp-gateway-registry-stack/Chart.yaml"; \
	if [ -f "$$stack_file" ]; then \
		echo "  Updating stack chart dependency versions..."; \
		sed -i.bak "s/version: 2\.[0-9]*\.[0-9]*/version: $$version/g" "$$stack_file" && rm -f "$$stack_file.bak"; \
	fi; \
	echo "Chart versions updated."

# =============================================================================
# Hot-Reload Development Environment
# =============================================================================
# These commands enable fast iteration without rebuilding Docker containers.
# Frontend: Vite dev server with HMR (Hot Module Replacement)
# Backend: Uvicorn with auto-reload on Python file changes
# Services: MongoDB, auth-server, metrics via Docker Compose

# Start full development environment with hot-reload
dev: dev-services
	@echo ""
	@echo "Starting hot-reload development environment..."
	@echo ""
	@echo "This will start:"
	@echo "  - Frontend: http://localhost:3000 (Vite with HMR)"
	@echo "  - Backend:  http://localhost:7860 (FastAPI with auto-reload)"
	@echo "  - Services: MongoDB, auth-server, metrics (Docker)"
	@echo ""
	@echo "NOTE: For Keycloak auth, use 'make dev-keycloak' instead."
	@echo ""
	@echo "Starting backend and frontend in parallel..."
	@trap 'kill 0' EXIT; \
	(cd frontend && npm run dev) & \
	(DOCUMENTDB_HOST=localhost DOCUMENTDB_DIRECT_CONNECTION=true uv run uvicorn registry.main:app --host 0.0.0.0 --port 7860 --reload) & \
	wait

# Start full development environment with Keycloak auth provider
dev-keycloak: dev-services-kc
	@echo ""
	@echo "Starting hot-reload development environment with Keycloak..."
	@echo ""
	@echo "This will start:"
	@echo "  - Frontend:  http://localhost:3000 (Vite with HMR)"
	@echo "  - Backend:   http://localhost:7860 (FastAPI with auto-reload)"
	@echo "  - Keycloak:  http://localhost:8080 (Admin console)"
	@echo "  - Services:  MongoDB, auth-server, metrics (Docker)"
	@echo ""
	@echo "Keycloak Admin: http://localhost:8080/admin"
	@echo "  Default credentials: admin / (check KEYCLOAK_ADMIN_PASSWORD in .env)"
	@echo ""
	@echo "Starting backend and frontend in parallel..."
	@trap 'kill 0' EXIT; \
	(cd frontend && npm run dev) & \
	(DOCUMENTDB_HOST=localhost DOCUMENTDB_DIRECT_CONNECTION=true AUTH_PROVIDER=keycloak KEYCLOAK_ENABLED=true AUTH_SERVER_URL=http://localhost:8888 uv run uvicorn registry.main:app --host 0.0.0.0 --port 7860 --reload) & \
	wait

# Start only frontend with Vite hot-reload
dev-frontend: frontend-install
	@echo "Starting Vite dev server with hot-reload..."
	@echo "Frontend will be available at: http://localhost:3000"
	@echo "API requests proxied to: http://localhost:7860"
	@echo ""
	cd frontend && npm run dev

# Start only backend with auto-reload
dev-backend:
	@echo "Starting FastAPI backend with auto-reload..."
	@echo "Backend will be available at: http://localhost:7860"
	@echo ""
	DOCUMENTDB_HOST=localhost DOCUMENTDB_DIRECT_CONNECTION=true uv run uvicorn registry.main:app --host 0.0.0.0 --port 7860 --reload

# Start supporting services only (MongoDB, auth-server, metrics)
dev-services:
	@echo "Starting development services..."
	@docker compose up -d mongodb mongodb-init auth-server metrics-service metrics-db
	@echo ""
	@echo "Waiting for services to be ready..."
	@timeout=60; while [ $$timeout -gt 0 ]; do \
		if docker compose ps mongodb 2>/dev/null | grep -q "healthy"; then \
			echo "MongoDB is ready."; \
			break; \
		fi; \
		sleep 2; \
		timeout=$$((timeout - 2)); \
		echo "  Waiting for MongoDB... ($$timeout seconds remaining)"; \
	done
	@echo ""
	@echo "Development services started:"
	@echo "  - MongoDB:        localhost:27017"
	@echo "  - Auth Server:    localhost:8888"
	@echo "  - Metrics:        localhost:8890"

# Start supporting services WITH Keycloak (for Keycloak auth provider)
dev-services-kc:
	@echo "Starting development services with Keycloak..."
	@docker compose up -d mongodb mongodb-init keycloak-db keycloak auth-server metrics-service metrics-db
	@echo ""
	@echo "Waiting for services to be ready..."
	@timeout=60; while [ $$timeout -gt 0 ]; do \
		if docker compose ps mongodb 2>/dev/null | grep -q "healthy"; then \
			echo "MongoDB is ready."; \
			break; \
		fi; \
		sleep 2; \
		timeout=$$((timeout - 2)); \
		echo "  Waiting for MongoDB... ($$timeout seconds remaining)"; \
	done
	@echo ""
	@echo "Waiting for Keycloak to be ready (this may take 1-2 minutes)..."
	@timeout=120; while [ $$timeout -gt 0 ]; do \
		if curl -sf http://localhost:8080/realms/master >/dev/null 2>&1; then \
			echo "Keycloak is ready."; \
			break; \
		fi; \
		sleep 5; \
		timeout=$$((timeout - 5)); \
		echo "  Waiting for Keycloak... ($$timeout seconds remaining)"; \
	done
	@echo ""
	@if ! curl -sf http://localhost:8080/realms/mcp-gateway >/dev/null 2>&1; then \
		echo "mcp-gateway realm not found. Run 'make keycloak-init' to initialize."; \
	fi
	@echo ""
	@echo "Development services started:"
	@echo "  - MongoDB:        localhost:27017"
	@echo "  - Keycloak:       localhost:8080"
	@echo "  - Auth Server:    localhost:8888"
	@echo "  - Metrics:        localhost:8890"

# Stop all development services (including Keycloak if running)
# Also kills any running uvicorn/node processes started by dev targets
dev-stop:
	@echo "Stopping development services..."
	@# Kill processes by port first (most reliable for catching orphaned children)
	@for port in 7860 3000; do \
		pids=$$(lsof -ti :$$port 2>/dev/null); \
		if [ -n "$$pids" ]; then \
			echo "  Killing processes on port $$port: $$pids"; \
			echo "$$pids" | xargs kill -9 2>/dev/null || true; \
		fi; \
	done
	@# Kill uvicorn and related processes by pattern
	@pkill -9 -f "uvicorn registry.main" 2>/dev/null || true
	@pkill -9 -f "uv run uvicorn" 2>/dev/null || true
	@# Kill any running Vite dev server
	@pkill -9 -f "vite" 2>/dev/null || true
	@# Stop Docker services
	@docker compose stop mongodb mongodb-init auth-server metrics-service metrics-db keycloak keycloak-db 2>/dev/null || true
	@# Brief pause to allow processes to terminate
	@sleep 1
	@echo "Development services stopped."

# Check status of development services
dev-status:
	@echo "Development Services Status:"
	@echo ""
	@echo "Docker Services:"
	@docker compose ps mongodb auth-server metrics-service keycloak 2>/dev/null || echo "  No Docker services running"
	@echo ""
	@echo "Port Check:"
	@if lsof -i :3000 >/dev/null 2>&1; then echo "  Port 3000 (Frontend):  IN USE"; else echo "  Port 3000 (Frontend):  Available"; fi
	@if lsof -i :7860 >/dev/null 2>&1; then echo "  Port 7860 (Backend):   IN USE"; else echo "  Port 7860 (Backend):   Available"; fi
	@if lsof -i :27017 >/dev/null 2>&1; then echo "  Port 27017 (MongoDB):  IN USE"; else echo "  Port 27017 (MongoDB):  Available"; fi
	@if lsof -i :8080 >/dev/null 2>&1; then echo "  Port 8080 (Keycloak):  IN USE"; else echo "  Port 8080 (Keycloak):  Available"; fi
	@if lsof -i :8888 >/dev/null 2>&1; then echo "  Port 8888 (Auth):      IN USE"; else echo "  Port 8888 (Auth):      Available"; fi
	@echo ""
	@echo "Keycloak Realm Status:"
	@if curl -sf http://localhost:8080/realms/mcp-gateway >/dev/null 2>&1; then \
		echo "  mcp-gateway realm: Configured"; \
	elif curl -sf http://localhost:8080/realms/master >/dev/null 2>&1; then \
		echo "  mcp-gateway realm: Not initialized (run 'make keycloak-init')"; \
	else \
		echo "  Keycloak: Not running"; \
	fi

# View logs from development services
dev-logs:
	@docker compose logs -f mongodb auth-server metrics-service keycloak 2>/dev/null || \
	 docker compose logs -f mongodb auth-server metrics-service

# =============================================================================
# Frontend Development Commands
# =============================================================================

# Install frontend dependencies
frontend-install:
	@echo "Installing frontend dependencies..."
	@cd frontend && npm install --legacy-peer-deps
	@echo "Frontend dependencies installed."

# Build frontend for production
frontend-build: frontend-install
	@echo "Building frontend for production..."
	@cd frontend && npm run build
	@echo "Frontend built to frontend/build/"

# Run frontend tests
frontend-test:
	@echo "Running frontend tests..."
	@cd frontend && npm run test

# Run frontend tests with coverage
frontend-test-coverage:
	@echo "Running frontend tests with coverage..."
	@cd frontend && npm run test:coverage

# Lint and format frontend code
frontend-lint:
	@echo "Linting and formatting frontend code..."
	@cd frontend && npm run check
	@echo "Frontend lint complete."
