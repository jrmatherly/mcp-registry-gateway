# MCP Gateway & Registry - Agent Guidelines

Universal guidelines for all agents working on this project.

## Project Context

**MCP Gateway & Registry** is an enterprise platform for:

1. **MCP Server Gateway** - Centralized access to MCP servers
2. **MCP Server Registry** - Register, discover, and manage MCP servers
3. **Agent Registry & A2A Hub** - Agent-to-agent communication

## Commands Reference

### Development

```bash
# Install dependencies
uv sync

# Run application
uv run uvicorn registry.main:app --reload --host 127.0.0.1 --port 8000

# Run tests
uv run pytest tests/ -n 8

# Format code
uv run ruff format .

# Lint code
uv run ruff check --fix .

# Type check
uv run mypy registry/

# Security scan
uv run bandit -r registry/
```

### Docker

```bash
# Start all services
docker compose up -d

# Start MongoDB only
docker compose up -d mongodb

# View logs
docker compose logs -f registry

# Stop services
docker compose down
```

### Git

```bash
# Status
git status

# Diff
git diff

# Commit (conventional format)
git commit -m "feat(api): add server search endpoint"
```

## Coding Patterns

### FastAPI Route

```python
@router.get(
    "/{server_id}",
    response_model=ServerResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_server(
    server_id: str = Path(..., description="Server ID"),
    service: ServerService = Depends(get_server_service),
) -> ServerResponse:
    server = await service.get_server(server_id)
    if not server:
        raise HTTPException(status_code=404, detail="Server not found")
    return ServerResponse.model_validate(server)
```

### Pydantic Model

```python
class ServerCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
```

### Async Service

```python
class ServerService:
    def __init__(self, repository: ServerRepository) -> None:
        self._repository = repository
    
    async def get_server(self, server_id: str) -> Optional[Server]:
        return await self._repository.get(server_id)
```

### Test Pattern

```python
@pytest.mark.asyncio
async def test_get_server_returns_server(
    mock_repository: AsyncMock,
    service: ServerService,
) -> None:
    # Arrange
    expected = ServerFactory.build()
    mock_repository.get.return_value = expected
    
    # Act
    result = await service.get_server(expected.id)
    
    # Assert
    assert result == expected
```

## Do's and Don'ts

### Do

- Use type annotations on all functions
- Use `async/await` for I/O operations
- Use `Depends()` for dependency injection
- Use Pydantic v2 syntax (`model_validate`, `model_dump`)
- Use `uv` for package management
- Run tests before committing
- Use conventional commit messages

### Don't

- Hardcode secrets or credentials
- Use `pip` directly
- Use blocking calls in async functions
- Bind servers to `0.0.0.0` unnecessarily
- Use Pydantic v1 syntax
- Skip tests before PRs
- Add emojis to code or docs
- Include Claude attribution in commits

## Architecture Layers

```
API Layer (registry/api/)
    ↓ Depends()
Service Layer (registry/services/)
    ↓ Constructor injection
Repository Layer (registry/repositories/)
    ↓ Motor/PyMongo
Database (MongoDB/DocumentDB)
```

## Key Files

| Purpose | Location |
|---------|----------|
| Application entry | `registry/main.py` |
| Configuration | `registry/config/settings.py` |
| API routes | `registry/api/` |
| Business logic | `registry/services/` |
| Data access | `registry/repositories/` |
| Pydantic schemas | `registry/schemas/` |
| Tests | `tests/` |
| Docker config | `docker-compose.yml` |
| Infrastructure | `terraform/` |

## Error Handling

```python
# Custom exceptions in services
raise ServerNotFoundError(server_id)

# HTTP exceptions in API layer
raise HTTPException(status_code=404, detail="Server not found")

# Always log with context
logger.error(f"Failed to fetch server {server_id}: {e}")
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DOCUMENTDB_HOST` | MongoDB/DocumentDB host |
| `DOCUMENTDB_DATABASE` | Database name |
| `SECRET_KEY` | Application secret |
| `LOG_LEVEL` | Logging level (DEBUG, INFO, etc.) |

## Test Expectations

- **701 passed**, ~57 skipped
- **Coverage**: ~39.50%
- **Duration**: ~30 seconds (parallel with -n 8)

## Commit Message Format

```
<type>(<scope>): <description>

Types: feat, fix, docs, style, refactor, test, chore
```

Examples:

- `feat(api): add server search endpoint`
- `fix(auth): handle expired tokens correctly`
- `test(services): add server service tests`
