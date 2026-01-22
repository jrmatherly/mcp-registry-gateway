---
description: Pydantic model patterns and conventions
globs:
  - "**/schemas/**/*.py"
  - "**/models/**/*.py"
---

# Pydantic Model Patterns

## Model Definition
- Use Pydantic v2 syntax (`model_validate`, `model_dump`)
- Use `Field()` for validation and documentation
- Include `model_config` for serialization settings

```python
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime

class ServerBase(BaseModel):
    """Base schema for MCP Server."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "name": "weather-server",
                "description": "Weather data MCP server",
            }
        },
    )

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

## Validation
- Use `@field_validator` for custom validation
- Use `@model_validator` for cross-field validation
- Use `Annotated` with `Field` for complex constraints

```python
from pydantic import field_validator, model_validator

class ServerCreate(ServerBase):
    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v.replace("-", "").replace("_", "").isalnum():
            raise ValueError("Name must be alphanumeric with hyphens/underscores")
        return v.lower()

    @model_validator(mode="after")
    def validate_model(self) -> "ServerCreate":
        # Cross-field validation
        return self
```

## Schema Patterns
- `*Base` - Shared fields
- `*Create` - Input for creation
- `*Update` - Input for updates (all Optional)
- `*Response` - API response
- `*InDB` - Database representation

## Serialization
```python
# Convert ORM to Pydantic
response = ServerResponse.model_validate(db_server)

# Convert to dict
data = server.model_dump(exclude_unset=True)

# Convert to JSON
json_str = server.model_dump_json()
```
