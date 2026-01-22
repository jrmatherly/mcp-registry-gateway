# Feature: LiteLLM Proxy Embeddings Support

## Feature Description

Enable proper support for LiteLLM proxy with custom `EMBEDDINGS_API_BASE` and API key authentication. The current implementation has a gap where the API key is not passed directly to the LiteLLM `embedding()` call, which is required for proxy authentication.

## User Story

As a platform operator
I want to use a LiteLLM proxy server for embeddings
So that I can centralize LLM access, manage costs, and use OpenAI-compatible APIs through a single endpoint

## Feature Metadata

- **Type**: Bug Fix / Enhancement
- **Complexity**: Low
- **Affected Systems**: `registry/embeddings/client.py`
- **Dependencies**: None (LiteLLM already installed)

---

## CONTEXT REFERENCES

### Codebase Files to Read (MANDATORY)

- `registry/embeddings/client.py` (lines 233-288) - `LiteLLMClient.encode()` method - **THE FIX LOCATION**
- `registry/embeddings/client.py` (lines 173-208) - `LiteLLMClient.__init__()` - understand current state
- `registry/embeddings/client.py` (lines 210-231) - `_set_api_key_env()` - understand env var handling
- `registry/core/config.py` (lines 28-40) - Settings for embeddings configuration
- `tests/unit/embeddings/test_embeddings_client.py` - existing test patterns

### Files to Modify

- `registry/embeddings/client.py` - Add `api_key` to embedding kwargs
- `registry/embeddings/README.md` - Update documentation for proxy usage
- `tests/unit/embeddings/test_embeddings_client.py` - Add tests for api_key passthrough

### Patterns to Follow

**Existing kwargs pattern in `encode()` method:**
```python
kwargs = {"model": self.model_name, "input": texts}

if self.api_base:
    kwargs["api_base"] = self.api_base

# ADD: Pass api_key directly for proxy authentication
if self.api_key:
    kwargs["api_key"] = self.api_key
```

**Test pattern from existing tests:**
```python
def test_encode_with_api_base(self, mock_litellm_response):
    """Test encoding with custom API base URL."""
    with patch("litellm.embedding") as mock_embedding:
        mock_embedding.return_value = mock_litellm_response
        client = LiteLLMClient(
            model_name="openai/text-embedding-3-small",
            api_base="https://custom.api.com",
        )
        client.encode(["test"])
        mock_embedding.assert_called_once_with(
            model="openai/text-embedding-3-small",
            input=["test"],
            api_base="https://custom.api.com",
        )
```

---

## IMPLEMENTATION PLAN

### Phase 1: Fix API Key Passthrough (Core Fix)

**File**: `registry/embeddings/client.py`

**Change**: In `LiteLLMClient.encode()` method, add `api_key` to kwargs when set.

**Current code (lines 255-261):**
```python
kwargs = {"model": self.model_name, "input": texts}

if self.api_base:
    kwargs["api_base"] = self.api_base

logger.debug(f"Calling LiteLLM embedding API with model: {self.model_name}")
response = embedding(**kwargs)
```

**New code:**
```python
kwargs = {"model": self.model_name, "input": texts}

if self.api_base:
    kwargs["api_base"] = self.api_base

# Pass API key directly for proxy authentication
if self.api_key:
    kwargs["api_key"] = self.api_key

logger.debug(f"Calling LiteLLM embedding API with model: {self.model_name}")
response = embedding(**kwargs)
```

### Phase 2: Add Unit Tests

**File**: `tests/unit/embeddings/test_embeddings_client.py`

Add test cases for:
1. `test_encode_with_api_key` - Verify api_key is passed to embedding call
2. `test_encode_with_api_base_and_api_key` - Verify both are passed (proxy scenario)

### Phase 3: Update Documentation

**File**: `registry/embeddings/README.md`

Add a dedicated section for LiteLLM Proxy usage with examples.

---

## STEP-BY-STEP TASKS

### Task 1: Modify `LiteLLMClient.encode()` to pass api_key

**File**: `registry/embeddings/client.py`

**Action**: Add api_key to kwargs in the encode method

**Validation**:
```bash
uv run python -m py_compile registry/embeddings/client.py
```

### Task 2: Add test for api_key passthrough

**File**: `tests/unit/embeddings/test_embeddings_client.py`

**Action**: Add `test_encode_with_api_key` test method

**Test code**:
```python
def test_encode_with_api_key(self, mock_litellm_response):
    """Test encoding with API key passed directly."""
    with patch("litellm.embedding") as mock_embedding:
        mock_embedding.return_value = mock_litellm_response
        client = LiteLLMClient(
            model_name="openai/text-embedding-3-small",
            api_key="test-api-key",
        )
        client.encode(["test"])
        mock_embedding.assert_called_once_with(
            model="openai/text-embedding-3-small",
            input=["test"],
            api_key="test-api-key",
        )
```

**Validation**:
```bash
uv run pytest tests/unit/embeddings/test_embeddings_client.py -v -k "test_encode_with_api_key"
```

### Task 3: Add test for proxy scenario (api_base + api_key)

**File**: `tests/unit/embeddings/test_embeddings_client.py`

**Action**: Add `test_encode_with_api_base_and_api_key` test method

**Test code**:
```python
def test_encode_with_api_base_and_api_key(self, mock_litellm_response):
    """Test encoding with both API base and API key (LiteLLM proxy scenario)."""
    with patch("litellm.embedding") as mock_embedding:
        mock_embedding.return_value = mock_litellm_response
        client = LiteLLMClient(
            model_name="openai/text-embedding-3-small",
            api_base="https://litellm-proxy.example.com",
            api_key="proxy-auth-token",
        )
        client.encode(["test"])
        mock_embedding.assert_called_once_with(
            model="openai/text-embedding-3-small",
            input=["test"],
            api_base="https://litellm-proxy.example.com",
            api_key="proxy-auth-token",
        )
```

**Validation**:
```bash
uv run pytest tests/unit/embeddings/test_embeddings_client.py -v -k "test_encode_with_api_base_and_api_key"
```

### Task 4: Update README documentation

**File**: `registry/embeddings/README.md`

**Action**: Add "Using LiteLLM Proxy" section after the existing provider examples

**Content to add**:
```markdown
### Using LiteLLM Proxy

For centralized LLM access through a LiteLLM proxy server:

```bash
# In .env
EMBEDDINGS_PROVIDER=litellm
EMBEDDINGS_MODEL_NAME=openai/text-embedding-3-small
EMBEDDINGS_MODEL_DIMENSIONS=1536
EMBEDDINGS_API_BASE=https://your-litellm-proxy.example.com
EMBEDDINGS_API_KEY=your-proxy-auth-token
```

The API key is passed directly to the LiteLLM proxy for authentication. This works with any OpenAI-compatible API endpoint.
```

**Validation**:
```bash
# Verify markdown syntax
cat registry/embeddings/README.md | head -150
```

### Task 5: Run full test suite

**Validation**:
```bash
uv run pytest tests/unit/embeddings/test_embeddings_client.py -v
```

### Task 6: Run linting and type checks

**Validation**:
```bash
uv run ruff check registry/embeddings/client.py
uv run mypy registry/embeddings/client.py
```

---

## TESTING STRATEGY

### Unit Tests

| Test Case | Description | Expected Result |
|-----------|-------------|-----------------|
| `test_encode_with_api_key` | API key passed to embedding call | `api_key` in kwargs |
| `test_encode_with_api_base_and_api_key` | Both api_base and api_key passed | Both in kwargs |
| `test_encode_without_api_key` | No api_key when not set | `api_key` not in kwargs |

### Integration Test (Manual)

```bash
# Set up test environment
export EMBEDDINGS_PROVIDER=litellm
export EMBEDDINGS_MODEL_NAME=openai/text-embedding-3-small
export EMBEDDINGS_MODEL_DIMENSIONS=1536
export EMBEDDINGS_API_BASE=https://your-proxy.example.com
export EMBEDDINGS_API_KEY=your-token

# Run a quick test
uv run python -c "
from registry.embeddings import create_embeddings_client
from registry.core.config import settings

client = create_embeddings_client(
    provider=settings.embeddings_provider,
    model_name=settings.embeddings_model_name,
    api_base=settings.embeddings_api_base,
    api_key=settings.embeddings_api_key,
    embedding_dimension=settings.embeddings_model_dimensions,
)
result = client.encode(['test embedding'])
print(f'Success! Shape: {result.shape}')
"
```

---

## VALIDATION COMMANDS

```bash
# 1. Syntax check
uv run python -m py_compile registry/embeddings/client.py

# 2. Run specific tests
uv run pytest tests/unit/embeddings/test_embeddings_client.py -v

# 3. Lint check
uv run ruff check registry/embeddings/client.py

# 4. Type check
uv run mypy registry/embeddings/client.py

# 5. Full test suite (parallel)
uv run pytest tests/ -n 8
```

---

## ACCEPTANCE CRITERIA

- [ ] `api_key` is passed directly to `litellm.embedding()` when set
- [ ] Unit test `test_encode_with_api_key` passes
- [ ] Unit test `test_encode_with_api_base_and_api_key` passes
- [ ] All existing tests continue to pass
- [ ] README includes LiteLLM proxy usage documentation
- [ ] No ruff linting errors
- [ ] No mypy type errors

---

## RISKS AND MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing env var behavior | Low | Keep existing `_set_api_key_env()` - direct passthrough is additive |
| LiteLLM API changes | Low | LiteLLM `api_key` kwarg is stable and documented |

---

## NOTES

- The `_set_api_key_env()` method is retained for backward compatibility with users who rely on environment variable-based authentication
- Both methods (env var + direct passthrough) can coexist - LiteLLM will use the direct kwarg if provided
- This is a minimal, targeted fix with low risk of regression
