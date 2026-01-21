# Documentation Standards

## Docstring Format
Use Google-style docstrings:

```python
def calculate_metrics(
    data: List[float],
    threshold: float = 0.5
) -> Dict[str, float]:
    """Calculate statistical metrics for the given data.
    
    Args:
        data: List of numerical values to analyze
        threshold: Minimum value to include in calculations
        
    Returns:
        Dictionary containing calculated metrics:
        - mean: Average value
        - std: Standard deviation
        - count: Number of values above threshold
        
    Raises:
        ValueError: If data is empty or contains non-numeric values
        
    Example:
        >>> metrics = calculate_metrics([1.0, 2.0, 3.0])
        >>> print(metrics['mean'])
        2.0
    """
    pass
```

## Documentation Requirements
- All public functions must have docstrings
- Include type hints in function signatures
- Document exceptions that can be raised
- Provide usage examples for complex functions
- Keep docstrings up-to-date with code changes

## API Documentation
FastAPI auto-generates OpenAPI docs. Enhance with:

```python
@router.post(
    "/",
    response_model=ServerResponse,
    status_code=201,
    summary="Create a new MCP server",
    description="""
    Register a new MCP server in the registry.
    
    The server will be validated and indexed for semantic search.
    """,
    responses={
        201: {"description": "Server created successfully"},
        400: {"description": "Invalid request body"},
        409: {"description": "Server with this name already exists"},
    },
)
async def create_server(
    server: ServerCreate = Body(
        ...,
        example={
            "name": "weather-server",
            "description": "Provides weather data",
            "url": "https://weather.example.com/mcp",
        },
    ),
) -> ServerResponse:
    """Create a new MCP server registration."""
    pass
```

## README Best Practices
A well-structured README should include:

1. **Prerequisites Section**: List external dependencies and setup requirements
2. **Links to External Resources**: Provide links to datasets, documentation, and services
3. **Clear Command Examples**: Show all command-line options with examples
4. **Development Workflow**: Include a section on development practices
5. **Performance Warnings**: Alert users about time-intensive operations

## Code Comments
- Only add comments where the logic isn't self-evident
- Explain "why" not "what"
- Keep comments up-to-date with code changes

```python
# Bad - explains what (obvious from code)
# Increment counter by 1
counter += 1

# Good - explains why
# Rate limit: max 100 requests per minute per client
if request_count > 100:
    raise RateLimitExceeded()
```

## Architecture Decision Records (ADRs)
For significant decisions, create an ADR in `docs/adr/`:

```markdown
# ADR-001: Use MongoDB for primary storage

## Status
Accepted

## Context
Need a database that supports flexible schemas and scales horizontally.

## Decision
Use MongoDB Community Edition for development, DocumentDB for production.

## Consequences
- Flexible document schemas
- Good Python driver support (motor)
- Some SQL features not available
```
