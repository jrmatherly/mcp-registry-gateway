# Code Style and Conventions

## General Principles
- Write code with minimal complexity for maximum maintainability and clarity
- Choose simple, readable solutions over clever or complex implementations
- Prioritize code that any team member can confidently understand, modify, and debug
- Avoid over-engineering - only make changes that are directly requested or clearly necessary

## Python Version
- Python 3.11+ required (>=3.11,<3.14)

## Formatting & Linting
- **Formatter**: ruff format
- **Linter**: ruff (replaces flake8, isort, etc.)
- **Line length**: 100 characters
- **Quote style**: double quotes
- **Indent style**: spaces

## Function Structure
- All internal/private functions must start with underscore (`_`)
- Private functions at top of file, followed by public functions
- Functions should be modular, 30-50 lines maximum
- Two blank lines between function definitions
- One function parameter per line

## Type Annotations
- Use clear type annotations for all function parameters
- Use `Optional[type]` for parameters that can be None
- Be explicit about optional parameters

```python
from typing import Optional, List

def process_data(
    input_file: str,
    output_format: str,
    validate: bool = True,
    sample_size: Optional[int] = None,
) -> dict:
    """Process data with validation."""
    pass
```

## Class Definitions
- Use Pydantic BaseModel for data classes
- Leverage Pydantic validation, serialization, and Field constraints

```python
from pydantic import BaseModel, Field

class UserConfig(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str
    timeout_seconds: int = Field(default=30, ge=1, le=300)
```

## Imports
- Write imports as multi-line imports for better readability
```python
from .services.output_formatter import (
    _display_evaluation_results,
    _print_results_summary,
)
```

## Constants
- Don't hard code constants within functions
- For trivial constants, declare at top of file:
```python
STARTUP_DELAY: int = 10
MAX_RETRIES: int = 3
```
- For many constants, create separate `constants.py` file

## Logging
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s,p%(process)s,{%(filename)s:%(lineno)d},%(levelname)s,%(message)s",
)
```
- Add sufficient log messages for debugging and monitoring
- Use `logging.debug()` for detailed tracing
- Pretty print dictionaries in log messages:
```python
logger.info(f"Processing data:\n{json.dumps(data_dict, indent=2, default=str)}")
```

## Error Handling
- Use specific exception types, avoid bare `except:`
- Always log exceptions with proper context
- Fail fast and fail clearly - don't suppress errors silently
- Write clear, actionable error messages

```python
try:
    result = _validate_and_transform(data)
except ValidationError as e:
    logger.error(f"Validation failed for data: {e}")
    raise DomainSpecificError(f"Invalid input data: {e}") from e
```

## Docstrings
- Use Google-style docstrings
- All public functions must have docstrings
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
        Dictionary containing calculated metrics
        
    Raises:
        ValueError: If data is empty
    """
```

## Async Code
- Use `async with` for async context managers
- Use `asyncio.gather()` for concurrent operations
- Don't mix blocking and async code

## Testing
- Use pytest with AAA pattern (Arrange, Act, Assert)
- One assertion per test when possible
- Use descriptive test names
- Mock external dependencies
- Test both happy paths and error cases

## Additional Guidelines
- Never use emojis in code, comments, docstrings, or documentation
- Never add auto-generated messages or attribution in commits/PRs
- Use `@lru_cache` for expensive computations where appropriate
- Avoid deep nesting (2-3 levels max), use early returns
- Keep README files professional and emoji-free
