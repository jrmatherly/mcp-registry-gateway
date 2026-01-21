---
name: implement
description: Feature and code implementation with intelligent agent coordination
category: development
complexity: advanced
argument-hint: <feature-description> [--type component|api|service|feature] [--safe] [--with-tests]
mcp-servers: [serena]
personas: [arch-analyzer, code-reviewer, security-auditor, test-runner]
---

# /implement - Feature Implementation

## Triggers

- Feature development requests for components, APIs, or complete functionality
- Code implementation needs with framework-specific requirements
- Multi-layer development requiring coordinated expertise
- Implementation projects requiring testing and validation integration

## Usage

```
/implement <feature-description> [--type component|api|service|feature] [--safe] [--with-tests]
```

**Examples:**
- `/implement "add agent capabilities endpoint"` - General implementation
- `/implement "create resource service" --type service --with-tests` - Service with tests
- `/implement "add OAuth scope validation" --type api --safe` - API with security review
- `/implement "full agent management feature" --type feature --with-tests` - Complete feature

## Behavioral Flow

1. **Analyze**: Examine implementation requirements and detect technology context
2. **Plan**: Choose approach and identify required agents for domain expertise
3. **Generate**: Create implementation code with project-specific best practices
4. **Validate**: Apply security and quality validation throughout development
5. **Integrate**: Update documentation and run tests

Key behaviors:
- Context-based agent activation (arch-analyzer, security-auditor, test-runner)
- FastAPI/Pydantic pattern compliance via codebase analysis
- Systematic multi-layer coordination (API → Service → Repository)
- Comprehensive testing integration

## MCP Integration

- **Serena MCP**: Pattern discovery and symbolic code manipulation
  - `find_symbol`: Locate similar implementations to follow
  - `get_symbols_overview`: Understand file structure
  - `replace_symbol_body`: Precise code modifications
  - `insert_after_symbol`: Add new functions/classes

## Tool Coordination

- **Write/Edit**: Code generation and modification
- **Read/Grep/Glob**: Project analysis and pattern detection
- **TodoWrite**: Progress tracking for multi-file implementations
- **Bash**: Validation commands (ruff, mypy, pytest)

## Implementation Types

### Component (`--type component`)
Single component: Pydantic schema, utility class, or module.

**Files Created:**
- `registry/[category]/[component].py`

**Validation:**
```bash
uv run python -m py_compile registry/[category]/[component].py
uv run ruff check registry/[category]/[component].py
```

### API (`--type api`)
API endpoint with schema and route definition.

**Files Created:**
- `registry/schemas/[resource].py` - Pydantic models
- `registry/api/[resource].py` - FastAPI routes

**Pattern to Follow:**
```python
# registry/api/[resource].py
from fastapi import APIRouter, Depends, HTTPException, Path, status

from registry.api.dependencies import get_[resource]_service
from registry.schemas.[resource] import (
    [Resource]Create,
    [Resource]Response,
    [Resource]Update,
)
from registry.services.[resource]_service import [Resource]Service

router = APIRouter(prefix="/[resources]", tags=["[Resources]"])

@router.post(
    "",
    response_model=[Resource]Response,
    status_code=status.HTTP_201_CREATED,
    responses={409: {"description": "Resource already exists"}},
)
async def create_[resource](
    data: [Resource]Create,
    service: [Resource]Service = Depends(get_[resource]_service),
) -> [Resource]Response:
    """Create a new [resource]."""
    return await service.create(data)
```

### Service (`--type service`)
Service layer with business logic.

**Files Created:**
- `registry/services/[resource]_service.py`

**Pattern to Follow:**
```python
# registry/services/[resource]_service.py
import logging
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from registry.repositories.[resource]_repository import [Resource]Repository

logger = logging.getLogger(__name__)

class [Resource]Service:
    """Service for [resource] management."""

    def __init__(
        self,
        repository: "[Resource]Repository",
    ) -> None:
        self._repository = repository

    async def create(
        self,
        data: [Resource]Create,
    ) -> [Resource]:
        """Create a new [resource]."""
        logger.info(f"Creating [resource]: {data.name}")
        return await self._repository.create(data)
```

### Feature (`--type feature`)
Complete feature spanning multiple layers.

**Files Created:**
- `registry/schemas/[resource].py`
- `registry/services/[resource]_service.py`
- `registry/repositories/[resource]_repository.py`
- `registry/api/[resource].py`
- `tests/unit/test_[resource]_service.py`

## Implementation Workflow

### Step 1: Pattern Analysis
```
Use Serena to find similar implementations:
- find_symbol: Locate similar service/API
- get_symbols_overview: Understand structure
```

### Step 2: Schema Creation
```
Create Pydantic models first:
- [Resource]Create - input validation
- [Resource]Update - partial updates
- [Resource]Response - API response
```

### Step 3: Service Layer
```
Implement business logic:
- Constructor with repository injection
- CRUD methods with logging
- Domain error handling
```

### Step 4: API Layer
```
Create FastAPI routes:
- Dependency injection for service
- Response models for documentation
- Error responses in responses={}
```

### Step 5: Integration
```
Wire up the feature:
- Add router to registry/api/__init__.py
- Add dependency to registry/api/dependencies.py
```

### Step 6: Testing (if --with-tests)
```
Create unit tests:
- Mock repository
- Test happy paths
- Test error cases
```

## Validation Commands

```bash
# After each file
uv run python -m py_compile [file]
uv run ruff check [file]

# After implementation
uv run mypy registry/

# With tests
uv run pytest tests/unit/test_[resource]*.py -v

# Full validation
uv run ruff check --fix . && uv run ruff format . && uv run pytest tests/ -n 8
```

## Output Format

```markdown
## Implementation Summary

### Feature: [Feature Name]
**Type**: [component|api|service|feature]
**Status**: [Complete|Partial|Blocked]

### Files Created
| File | Purpose | Lines |
|------|---------|-------|
| `registry/schemas/resource.py` | Pydantic models | 45 |
| `registry/services/resource_service.py` | Business logic | 120 |

### Files Modified
| File | Change |
|------|--------|
| `registry/api/__init__.py` | Added router import |

### Validation Results
```bash
# Ruff
All checks passed!

# MyPy
Success: no issues found

# Tests
5 passed in 1.2s
```

### Integration Steps Completed
- [x] Schema created
- [x] Service implemented
- [x] API routes added
- [x] Router registered
- [x] Tests passing

### Next Steps
[Any remaining work or recommendations]
```

## Examples

### API Endpoint Implementation
```
/implement "add agent status endpoint" --type api --with-tests
# Creates schema, route, and tests
# Follows existing API patterns from servers.py
```

### Service Layer Implementation
```
/implement "resource caching service" --type service --safe
# Creates service with business logic
# Security review of any auth-related code
```

### Full Feature Implementation
```
/implement "agent capability management" --type feature --with-tests
# Creates complete feature across all layers
# Includes comprehensive test coverage
```

## Boundaries

**Will:**
- Implement features with intelligent agent coordination for quality
- Apply FastAPI/Pydantic best practices from existing codebase patterns
- Provide comprehensive implementation with testing integration
- Run validation at each step to catch issues early

**Will Not:**
- Make architectural decisions without consulting arch-analyzer
- Implement security-sensitive features without security-auditor review
- Skip testing when --with-tests is specified
- Override user-specified safety constraints (--safe flag)
