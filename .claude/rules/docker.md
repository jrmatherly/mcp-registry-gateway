---
description: Docker and container patterns
globs:
  - "**/Dockerfile*"
  - "**/docker-compose*.yml"
  - "**/docker/**/*"
---

# Docker Patterns

## Dockerfile Best Practices
- Use multi-stage builds for smaller images
- Pin base image versions
- Use non-root user
- Order instructions by change frequency (cache optimization)

```dockerfile
# Build stage
FROM python:3.11-slim as builder
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN pip install uv && uv sync --frozen --no-dev

# Runtime stage
FROM python:3.11-slim
WORKDIR /app

# Create non-root user
RUN useradd -m -u 1000 appuser

# Copy dependencies from builder
COPY --from=builder /app/.venv /app/.venv
COPY registry/ ./registry/

# Set environment
ENV PATH="/app/.venv/bin:$PATH"
USER appuser

EXPOSE 8000
CMD ["uvicorn", "registry.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Note**: Project Dockerfiles follow naming convention `docker/Dockerfile.<service>`:
- `docker/Dockerfile.registry` - Main registry service
- `docker/Dockerfile.registry-cpu` - CPU-only variant
- `docker/Dockerfile.auth` - Authentication server
- `docker/Dockerfile.mcp-server` - MCP server with GPU
- `docker/Dockerfile.mcp-server-cpu` - MCP server CPU-only
- `docker/Dockerfile.mcp-server-light` - Lightweight MCP server

## Docker Compose Patterns
- Use environment files for configuration
- Define healthchecks
- Use named volumes for persistence
- Set resource limits

```yaml
services:
  registry:
    build:
      context: .
      dockerfile: docker/Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DOCUMENTDB_HOST=mongodb
      - DOCUMENTDB_DATABASE=mcp_registry
    depends_on:
      mongodb:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Project-Specific Images
- `docker/Dockerfile.registry` - Main registry service
- `docker/Dockerfile.registry-cpu` - Registry CPU-only variant
- `docker/Dockerfile.auth` - Authentication server
- `docker/Dockerfile.mcp-server` - Full MCP server with GPU support
- `docker/Dockerfile.mcp-server-cpu` - CPU-only variant
- `docker/Dockerfile.mcp-server-light` - Lightweight variant
- `docker/Dockerfile.scopes-init` - Scopes initialization job

## Local Development
```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f registry

# Rebuild after changes
docker compose up -d --build registry
```
