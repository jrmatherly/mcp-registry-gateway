---
description: Create comprehensive feature implementation plan with codebase analysis
argument-hint: <feature-description>
---

# Plan Feature: $ARGUMENTS

## Mission

Transform a feature request into a **comprehensive implementation plan** through systematic codebase analysis, research, and strategic planning.

**Core Principle**: We do NOT write code in this phase. Our goal is to create a context-rich implementation plan that enables one-pass implementation success.

**Key Philosophy**: Context is King. The plan must contain ALL information needed for implementation - patterns, mandatory reading, documentation, validation commands.

## Planning Process

### Phase 1: Feature Understanding

**Deep Feature Analysis:**

- Extract the core problem being solved
- Identify user value and business impact
- Determine feature type: New Capability / Enhancement / Refactor / Bug Fix
- Assess complexity: Low / Medium / High
- Map affected systems and components

**Create User Story:**

```text
As a <type of user>
I want to <action/goal>
So that <benefit/value>
```

### Phase 2: Codebase Intelligence Gathering

**1. Project Structure Analysis**

- Review `registry/` directory structure
- Identify affected layers (API, Service, Repository)
- Locate relevant configuration in `registry/config/`
- Find environment setup patterns

**2. Pattern Recognition**

Use Serena tools to find similar implementations:

```text
find_symbol: Search for similar patterns
get_symbols_overview: Understand file structure
search_for_pattern: Find code patterns
```

Identify conventions from CLAUDE.md:

- Naming patterns (snake_case for Python)
- File organization (api/, services/, repositories/, schemas/)
- Error handling approaches
- Logging patterns

**3. Dependency Analysis**

- Check `pyproject.toml` for relevant libraries
- Understand how dependencies are used (check imports)
- Find documentation in `docs/` directory
- Note version requirements

**4. Testing Patterns**

- Review `tests/` structure (unit/, integration/)
- Find similar test examples in `tests/unit/`
- Understand fixtures in `tests/conftest.py`
- Note coverage requirements (minimum 35%)

**5. Integration Points**

- Identify files needing updates
- Determine new files to create
- Map router registration in `registry/api/__init__.py`
- Understand auth patterns if relevant

**Clarify Ambiguities:**

- If requirements are unclear, ask before continuing
- Get specific implementation preferences
- Resolve architectural decisions before proceeding

### Phase 3: External Research

**Documentation Gathering:**

- Check `docs/` for relevant guides
- Review `docs/llms.txt` sections (selective loading)
- Find FastAPI/Pydantic best practices if needed
- Identify common gotchas

**Compile References:**

```markdown
## Relevant Documentation

- `docs/auth.md` - Authentication patterns
- `docs/api/` - API documentation
- [FastAPI Docs](https://fastapi.tiangolo.com/) - Framework reference
```

### Phase 4: Strategic Thinking

**Consider:**

- How does this feature fit existing architecture?
- What are critical dependencies and order of operations?
- What could go wrong? (Edge cases, errors)
- How will this be tested comprehensively?
- Are there security considerations?
- How maintainable is this approach?

**Design Decisions:**

- Choose between alternatives with clear rationale
- Design for extensibility
- Plan for backward compatibility if needed

### Phase 5: Generate Plan

Create plan using template below.

---

## Plan Template

Save to: `.claude/output/plans/{kebab-case-feature-name}.md`

```markdown
# Feature: {Feature Name}

## Feature Description

{Detailed description of the feature, its purpose, and value}

## User Story

As a {type of user}
I want to {action/goal}
So that {benefit/value}

## Problem Statement

{The specific problem this feature addresses}

## Solution Statement

{The proposed solution and how it solves the problem}

## Feature Metadata

- **Type**: [New Capability / Enhancement / Refactor / Bug Fix]
- **Complexity**: [Low / Medium / High]
- **Affected Systems**: [List components]
- **Dependencies**: [External libraries or services]

---

## CONTEXT REFERENCES

### Codebase Files to Read (MANDATORY)

{List files with specific relevance}

- `registry/api/servers.py` (lines 50-80) - Pattern for endpoint structure
- `registry/services/server_service.py` - Service layer pattern
- `registry/schemas/server.py` - Pydantic model examples

### New Files to Create

- `registry/api/{new_resource}.py` - API endpoints
- `registry/services/{new_resource}_service.py` - Business logic
- `registry/schemas/{new_resource}.py` - Request/response models
- `tests/unit/test_{new_resource}_service.py` - Unit tests

### Patterns to Follow

**Endpoint Pattern:**
```python
@router.get(
    "/{id}",
    response_model=ResponseModel,
    responses={404: {"description": "Not found"}},
)
async def get_resource(
    id: str = Path(..., description="Resource ID"),
    service: Service = Depends(get_service),
) -> ResponseModel:
    """Endpoint docstring."""
    ...
```

**Service Pattern:**
```python
class ResourceService:
    def __init__(self, repository: ResourceRepository) -> None:
        self._repository = repository

    async def get(self, id: str) -> Resource | None:
        ...
```

**Pydantic Model Pattern:**
```python
class ResourceCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)

    model_config = ConfigDict(json_schema_extra={"example": {...}})
```

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation

{Foundational work before main implementation}

**Tasks:**
- Define Pydantic schemas in `registry/schemas/`
- Create base service class
- Set up repository interface

### Phase 2: Core Implementation

{Main implementation work}

**Tasks:**
- Implement service layer logic
- Create API endpoints
- Add dependency injection

### Phase 3: Integration

{Integration with existing system}

**Tasks:**
- Register router in `registry/api/__init__.py`
- Update dependencies in `registry/api/dependencies.py`
- Add configuration if needed

### Phase 4: Testing

{Testing approach}

**Tasks:**
- Create unit tests for service
- Create integration tests for API
- Test edge cases and error scenarios

---

## STEP-BY-STEP TASKS

Execute every task in order. Each task is atomic and independently testable.

### Task Keywords

- **CREATE**: New files or components
- **UPDATE**: Modify existing files
- **ADD**: Insert new functionality
- **MIRROR**: Copy pattern from existing code

### Task 1: CREATE `registry/schemas/{resource}.py`

- **IMPLEMENT**: Pydantic models for request/response
- **PATTERN**: Mirror `registry/schemas/server.py`
- **IMPORTS**: `from pydantic import BaseModel, Field, ConfigDict`
- **VALIDATE**: `uv run python -m py_compile registry/schemas/{resource}.py`

### Task 2: CREATE `registry/services/{resource}_service.py`

- **IMPLEMENT**: Service class with business logic
- **PATTERN**: Mirror `registry/services/server_service.py`
- **IMPORTS**: Repository, schemas, logging
- **VALIDATE**: `uv run python -m py_compile registry/services/{resource}_service.py`

{Continue with all tasks...}

---

## TESTING STRATEGY

### Unit Tests

Location: `tests/unit/test_{resource}_service.py`

```python
import pytest
from unittest.mock import AsyncMock

class TestResourceService:
    @pytest.fixture
    def mock_repository(self):
        return AsyncMock()

    @pytest.mark.asyncio
    async def test_get_resource(self, mock_repository):
        # Arrange
        # Act
        # Assert
```

### Integration Tests

Location: `tests/integration/test_{resource}_api.py`

- Test full request/response cycle
- Test error responses
- Test authentication if required

### Edge Cases

- Empty inputs
- Invalid IDs
- Missing resources (404)
- Duplicate creation attempts

---

## VALIDATION COMMANDS

Execute every command after implementation.

### Level 1: Syntax & Style

```bash
uv run ruff check --fix registry/
uv run ruff format registry/
```

### Level 2: Type Checking

```bash
uv run mypy registry/
```

### Level 3: Unit Tests

```bash
uv run pytest tests/unit/test_{resource}*.py -v
```

### Level 4: Integration Tests

```bash
uv run pytest tests/integration/test_{resource}*.py -v
```

### Level 5: Full Test Suite

```bash
uv run pytest tests/ -n 8
```

---

## ACCEPTANCE CRITERIA

- [ ] Feature implements all specified functionality
- [ ] All validation commands pass with zero errors
- [ ] Unit tests cover happy path and error cases
- [ ] Integration tests verify end-to-end workflow
- [ ] Code follows CLAUDE.md conventions
- [ ] No regressions in existing functionality
- [ ] Documentation updated if needed

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed
- [ ] All validation commands successful
- [ ] Full test suite passes
- [ ] No linting or type errors
- [ ] Acceptance criteria met

---

## NOTES

{Additional context, design decisions, trade-offs}
```

---

## Output

**Filename**: `.claude/output/plans/{kebab-case-feature-name}.md`

**Quality Criteria:**

- [ ] All necessary patterns identified
- [ ] Integration points clearly mapped
- [ ] Every task has validation command
- [ ] Tasks ordered by dependency
- [ ] Pattern references include file paths

**After creating the plan, provide:**

- Summary of feature and approach
- Full path to created plan file
- Complexity assessment
- Key implementation risks
- Confidence score (1-10) for one-pass success
