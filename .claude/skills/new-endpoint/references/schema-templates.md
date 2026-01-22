# Schema Templates

## Base Schema Pattern

```python
# registry/schemas/your_resource.py
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class YourResourceBase(BaseModel):
    """Base schema with shared fields."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "name": "example-resource",
                "description": "An example resource",
            }
        },
    )

    name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Resource name",
    )
    description: Optional[str] = Field(
        None,
        max_length=500,
        description="Resource description",
    )


class YourResourceCreate(YourResourceBase):
    """Schema for creating a resource."""
    pass


class YourResourceUpdate(BaseModel):
    """Schema for updating a resource (all fields optional)."""

    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)


class YourResourceResponse(YourResourceBase):
    """Schema for API responses."""

    id: str = Field(..., description="Resource ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")


class YourResourceInDB(YourResourceResponse):
    """Schema for database representation."""
    pass
```

## Validation Examples

```python
from pydantic import field_validator, model_validator
import re


class ServerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    url: str = Field(..., description="Server URL")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate name is alphanumeric with hyphens."""
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Name must be alphanumeric with hyphens/underscores")
        return v.lower()

    @field_validator("url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        """Validate URL format."""
        if not v.startswith(("http://", "https://")):
            raise ValueError("URL must start with http:// or https://")
        return v

    @model_validator(mode="after")
    def validate_model(self) -> "ServerCreate":
        """Cross-field validation."""
        # Add any cross-field validation here
        return self
```

## Enum Fields

```python
from enum import Enum


class ResourceStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"


class ResourceWithStatus(BaseModel):
    status: ResourceStatus = Field(
        default=ResourceStatus.PENDING,
        description="Resource status",
    )
```

## Nested Models

```python
class ToolDefinition(BaseModel):
    name: str
    description: str
    parameters: dict = Field(default_factory=dict)


class ServerWithTools(BaseModel):
    name: str
    tools: List[ToolDefinition] = Field(default_factory=list)
```
