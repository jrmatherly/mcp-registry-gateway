# Development Workflow

## Local Development Setup

### Prerequisites
1. **Python 3.11+** installed
2. **uv** package manager installed
3. **Docker** or **Podman** for containers
4. **MongoDB** running locally (for tests)

### Initial Setup
```bash
# Clone repository
git clone https://github.com/jrmatherly/mcp-registry-gateway.git
cd mcp-registry-gateway

# Copy environment configuration
cp .env.example .env
# Edit .env with your passwords

# Install dependencies
uv sync --dev

# Start MongoDB (required for development/tests)
docker-compose up -d mongodb
```

### Running the Application
```bash
# With Docker (recommended)
./build_and_run.sh --prebuilt

# Access UI at http://localhost:7860

# Direct Python execution (development)
uv run uvicorn registry.main:app --reload --host 127.0.0.1 --port 7860
```

## Development Cycle

### 1. Create Feature Branch
```bash
git checkout -b feat/feature-name
```

### 2. Make Changes
- Follow code style conventions (see code_style_conventions.md)
- Add appropriate tests
- Update documentation if needed

### 3. Validate Changes
```bash
# Quality checks
uv run ruff check --fix . && uv run ruff format .

# Run tests
uv run pytest tests/ -n 8
```

### 4. Commit
```bash
git add .
git commit -m "feat: clear description of change"
```

### 5. Push and Create PR
```bash
git push origin feat/feature-name
# Create PR on GitHub
```

## Testing Workflow

### Quick Development Testing
```bash
# Generate fresh credentials (tokens expire in 5 min)
./credentials-provider/generate_creds.sh

# Run tests skipping production
./tests/run_all_tests.sh --skip-production
```

### Full PR Testing (Required)
```bash
./tests/run_all_tests.sh
# All tests must pass before merge
```

### Test Categories
- **Unit Tests**: `tests/unit/` - Fast, isolated tests
- **Integration Tests**: `tests/integration/` - Component interaction
- **E2E Tests**: `tests/integration/test_e2e_workflows.py` - Full workflows

### Test Markers
```bash
pytest -m unit           # Unit tests only
pytest -m integration    # Integration tests
pytest -m e2e            # End-to-end tests
pytest -m auth           # Authentication tests
pytest -m servers        # Server management tests
pytest -m search         # Search and AI tests
pytest -m "not slow"     # Skip slow tests
```

## CI/CD Pipeline

### GitHub Actions
Tests run automatically on:
- Pull requests targeting `main` or `develop`
- Push to `main` or `develop`

### Build System
```bash
# Build images
make build IMAGE=registry

# Push to ECR
make push IMAGE=registry

# Build and push
make build-push IMAGE=registry

# Publish to DockerHub
make publish-dockerhub
```

## Security Scanning

**Quick vulnerability check:**
```bash
uv run pip-audit        # Dependencies
uv run bandit -r registry/  # Code
```

For comprehensive security audits, use `/security-audit` skill.

## Key Configuration Files

| File | Purpose |
|------|---------|
| `pyproject.toml` | Python project configuration, dependencies |
| `.env` | Environment variables (not committed) |
| `.env.example` | Environment template |
| `build-config.yaml` | Container build configuration |
| `docker-compose.yml` | Local development containers |
| `Makefile` | Build and test commands |
| `CLAUDE.md` | Coding standards |
| `DEV_INSTRUCTIONS.md` | Developer onboarding |

## Important Documentation
- `docs/llms.txt` - LLM/AI documentation (read before coding)
- `CLAUDE.md` - Coding standards
- `docs/testing/README.md` - Test documentation
- `docs/quickstart.md` - Quick start guide
