# Suggested Commands for MCP Gateway Registry Development

## Package Management (uv)
```bash
# Install dependencies
uv sync

# Install dev dependencies
uv sync --dev

# Add a new dependency
uv add <package>

# Add a dev dependency
uv add --dev <package>

# Run a Python script/module
uv run python -m registry.main
uv run python script.py
```

## Testing

### Backend (pytest)
```bash
# Run full test suite with parallel workers (recommended)
uv run pytest tests/ -n 8

# Run all tests serially (for debugging)
uv run pytest tests/

# Run unit tests only
uv run pytest tests/unit/ -n 8

# Run integration tests only
uv run pytest tests/integration/ -n 8

# Run with verbose output
uv run pytest tests/ -n 8 -v

# Run and stop at first failure
uv run pytest tests/ -n 8 -x

# Run with coverage
uv run pytest tests/ -n 8 --cov=registry --cov-report=term-missing

# Run specific test file
uv run pytest tests/unit/test_specific.py -v

# Run tests by marker
uv run pytest -m unit           # Unit tests
uv run pytest -m integration    # Integration tests
uv run pytest -m "not slow"     # Skip slow tests

# Makefile shortcuts
make test              # Full test suite
make test-unit         # Unit tests only
make test-integration  # Integration tests
make test-fast         # Skip slow tests
make test-coverage     # Generate coverage reports
```

### Frontend (Vitest)
```bash
# Run frontend tests
cd frontend && npm test

# Watch mode for development
cd frontend && npm run test:watch

# With coverage report
cd frontend && npm run test:coverage

# Run specific test file
cd frontend && npm test -- src/components/Button.test.tsx
```

## Code Quality
```bash
# Linting and formatting with ruff (fixes + format)
uv run ruff check --fix . && uv run ruff format .

# Run ruff check only
uv run ruff check .

# Run ruff format only
uv run ruff format .

# Security scanning with bandit
uv run bandit -r registry/

# Type checking with mypy
uv run mypy registry/

# Validate Python syntax
uv run python -m py_compile <filename>

# Validate shell script syntax
bash -n <filename>

# All quality checks combined
uv run ruff check --fix . && uv run ruff format . && uv run bandit -r registry/ && uv run mypy registry/
```

## Docker & Containers
```bash
# Build and run with pre-built images
./build_and_run.sh --prebuilt

# Build from source
./build_and_run.sh

# Build specific image
make build IMAGE=registry

# Push to ECR
make push IMAGE=registry

# Build and push
make build-push IMAGE=registry

# Build with Podman (for macOS/rootless)
./build_and_run.sh --prebuilt --podman

# Docker Compose
docker-compose up -d
docker-compose down
docker-compose logs -f

# Local A2A agent development
make compose-up-agents
make compose-down-agents
make compose-logs-agents
```

## Local Development
```bash
# Start local MongoDB (required for tests/development)
docker-compose up -d mongodb

# Generate fresh credentials (tokens expire in 5 minutes)
./credentials-provider/generate_creds.sh

# Run the registry server
uv run uvicorn registry.main:app --reload --host 127.0.0.1 --port 7860

# Access registry UI
open http://localhost:7860
```

## Git Operations
```bash
# Standard workflow
git status
git diff
git add .
git commit -m "feat: description"
git push

# Create feature branch
git checkout -b feat/feature-name
```

## System Utilities (Darwin/macOS)
```bash
# File operations
ls -la
find . -name "*.py" -type f
grep -r "pattern" --include="*.py" .

# Process management
ps aux | grep python
kill -9 <pid>

# Network
curl -X GET http://localhost:7860/health
netstat -an | grep 7860
lsof -i :7860
```

## AWS CLI (for production)
```bash
# ECS operations
aws ecs update-service --cluster <cluster> --service <service> --force-new-deployment

# CloudWatch logs
make view-logs
make view-logs-registry
make view-logs-follow

# ECR login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
```

## CLI Tools
```bash
# Registry Management API (primary tool for server/agent management)
uv run python api/registry_management.py --help
uv run python api/registry_management.py list
uv run python api/registry_management.py register --config <config.json>
uv run python api/registry_management.py agent-list
uv run python api/registry_management.py agent-search --query "query"

# Registry CLI (alternative wrapper)
cli/registry_cli_wrapper.py --help
```
