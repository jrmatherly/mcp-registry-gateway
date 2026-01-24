# Developer Instructions

## Prerequisite Reading

**READ THIS FIRST:** [CONTRIBUTING.md](CONTRIBUTING.md)

Before you start contributing, please review the project's contribution guidelines.

## Setup Instructions for Contributors

### Step 1: Choose Your Development Environment

We recommend the fastest option to get started:

#### Option A: macOS Setup (Fastest)

Complete this setup guide first:

- [macOS Setup Guide](docs/macos-setup-guide.md)
- Time to first run: ~30 minutes

#### Option B: EC2 Complete Setup (Preferred for Server Setup)

If working on EC2 or a Linux server, complete this guide first:

- [Complete Setup Guide](docs/complete-setup-guide.md)
- Time to first run: ~60 minutes

### Step 2: Install Development Dependencies

After completing the environment setup, install all development dependencies:

```bash
# Install ALL dependencies (testing, linting, documentation)
uv sync --dev --all-extras

# Verify installation
uv run pytest --version    # Testing framework
uv run mkdocs --version    # Documentation builder
uv run ruff --version      # Linting and formatting
uv run mypy --version      # Type checking
```

**Dependency Groups Reference:**

| Command | What It Installs |
|---------|-----------------|
| `uv sync` | Core runtime dependencies only |
| `uv sync --dev` | Core + pytest, ruff, mypy, bandit |
| `uv sync --all-extras` | Core + all optional extras (mkdocs, etc.) |
| `uv sync --dev --all-extras` | Everything (recommended) |

**Makefile shortcuts:**

```bash
make install-dev   # Install dev dependencies only
make install-all   # Install dev + docs dependencies
```

## Hot-Reload Development (Recommended for UI Work)

For the fastest iteration cycle, use the hot-reload development environment instead of rebuilding Docker containers after each change.

### Quick Start (Full Stack Hot-Reload)

```bash
# Start everything with hot-reload enabled (Cognito/GitHub/Google auth)
make dev

# OR: Start with Keycloak as auth provider
make dev-keycloak
```

This starts:

- **Frontend** at `http://localhost:3000` (Vite with HMR - instant updates)
- **Backend** at `http://localhost:7860` (FastAPI with auto-reload)
- **Services**: MongoDB, auth-server, metrics (Docker)
- **Keycloak** at `http://localhost:8080` (only with `make dev-keycloak`)

### Frontend-Only Development

If you're only working on frontend changes:

```bash
# Terminal 1: Start supporting services
make dev-services

# Terminal 2: Start frontend with hot-reload
make dev-frontend
```

The Vite dev server provides:

- **Hot Module Replacement (HMR)**: Changes appear instantly without page refresh
- **API Proxy**: All `/api`, `/auth`, `/health` requests proxied to backend
- **Error Overlay**: Build errors shown in browser

### Backend-Only Development

If you're only working on backend changes:

```bash
# Terminal 1: Start supporting services
make dev-services

# Terminal 2: Start backend with auto-reload
make dev-backend
```

Changes to Python files automatically restart the server.

### Development Workflow Commands

| Command | Description |
|---------|-------------|
| `make dev` | Start full hot-reload environment |
| `make dev-keycloak` | Start hot-reload with Keycloak auth provider |
| `make dev-frontend` | Start Vite dev server only (port 3000) |
| `make dev-backend` | Start FastAPI with auto-reload (port 7860) |
| `make dev-services` | Start MongoDB, auth-server, metrics |
| `make dev-services-kc` | Start services WITH Keycloak |
| `make dev-stop` | Stop all development services |
| `make dev-status` | Check status of all services |
| `make dev-logs` | View logs from Docker services |

### Keycloak Development

If using Keycloak as your auth provider:

```bash
# First time setup: Initialize Keycloak realm, clients, users
make dev-services-kc
make keycloak-init

# After initialization, use this for development
make dev-keycloak
```

The `dev-keycloak` target automatically sets `AUTH_PROVIDER=keycloak` and `KEYCLOAK_ENABLED=true` environment variables for the backend.

### Frontend Commands

| Command | Description |
|---------|-------------|
| `make frontend-install` | Install npm dependencies |
| `make frontend-build` | Build for production |
| `make frontend-test` | Run frontend tests |
| `make frontend-lint` | Lint and format code |

### When to Use Docker vs Hot-Reload

| Scenario | Recommended Approach |
|----------|---------------------|
| UI/frontend changes | `make dev-frontend` (instant feedback) |
| Backend API changes | `make dev-backend` (auto-reload) |
| Full stack development | `make dev` (both hot-reload) |
| Testing Docker builds | `docker compose up --build` |
| Production testing | `make build-push` |

## Before You Start Coding

### 1. Ask Your Coding Assistant to Read Documentation

Before making any code changes, ask your AI coding assistant to read:

**LLM/AI Documentation (Critical for understanding the project):**

- [docs/llms.txt](docs/llms.txt)

**Coding Standards and Guidelines:**

- [CLAUDE.md](CLAUDE.md) - Project-specific coding standards

### 2. Review the CLAUDE.md File

This project uses [CLAUDE.md](CLAUDE.md) for coding standards. The file is already included in the repository root - make sure to review it before contributing.

## Testing Your Changes

Before submitting a pull request, you must run and pass the test suite:

### Quick Start Testing

```bash
# Run all tests in parallel (standard approach)
uv run pytest tests/ -n 8

# Run only unit tests (fast iteration)
uv run pytest tests/unit/ -n 8

# Run with verbose output
uv run pytest tests/ -n 8 -v
```

### For PR Merge (REQUIRED)

```bash
# Full validation: lint, format, type check, and test
uv run ruff check --fix . && uv run ruff format . && uv run mypy registry/ && uv run pytest tests/ -n 8

# All tests must pass before merging
# Expected: ~850+ tests collected, ~30 seconds runtime (parallel with -n 8)
```

### Understanding the Tests

See the comprehensive testing documentation:

- **[tests/README.md](tests/README.md)** - Test suite overview and structure
- **[auth_server/scopes.yml](auth_server/scopes.yml)** - Permission definitions (admin, LOB1, LOB2)

### Common Testing Workflows

**Run specific test file:**

```bash
uv run pytest tests/unit/test_server_service.py -v
```

**Run with coverage:**

```bash
uv run pytest tests/ -n 8 --cov=registry --cov-report=term-missing
```

**Run integration tests only:**

```bash
uv run pytest tests/integration/ -n 8
```

**Generate tokens for manual testing:**

```bash
./credentials-provider/generate_creds.sh
./keycloak/setup/generate-agent-token.sh admin-bot
```

## Fork and Contribute

### Repository Access

**Important:** There is no direct access to this repository. To contribute:

1. **Fork the repository on GitHub**

   ```
   https://github.com/jrmatherly/mcp-registry-gateway
   ```

2. **Clone your fork locally**

   ```bash
   git clone https://github.com/YOUR-USERNAME/mcp-registry-gateway.git
   cd mcp-registry-gateway
   ```

3. **Create a feature branch**

   ```bash
   git checkout -b feat/your-feature-name
   ```

4. **Make your changes** following the coding standards in CLAUDE.md

5. **Commit and push to your fork**

   ```bash
   git push origin feat/your-feature-name
   ```

6. **Create a Pull Request** to the main repository
   - Use a clear, descriptive PR title
   - Reference any related issues
   - Include test results and screenshots if applicable

## Development Checklist

Before submitting a pull request:

- [ ] Completed one of the setup guides (macOS or EC2)
- [ ] Read docs/llms.txt
- [ ] Read CLAUDE.md (coding standards)
- [ ] Code follows project conventions (use ruff, mypy, pytest)
- [ ] Lint passes: `uv run ruff check --fix . && uv run ruff format .`
- [ ] Type check passes: `uv run mypy registry/`
- [ ] Tests pass: `uv run pytest tests/ -n 8`
- [ ] Reviewed test documentation: [tests/README.md](tests/README.md)
- [ ] Changes are pushed to a fork, not directly to this repo
- [ ] Pull request is created with clear description

## Questions?

- Check the [CONTRIBUTING.md](CONTRIBUTING.md) file for more details
- Review existing PRs to see contribution patterns
- Ask your coding assistant to review the documentation with you
