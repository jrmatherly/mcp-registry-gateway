# Feature: Centralized LLM Configuration via Environment Variables

## Feature Description

Standardize LLM configuration across the entire codebase to use consistent environment variables for model provider, base URL, and API key. This enables using LiteLLM proxy or any OpenAI-compatible API endpoint for all LLM operations (embeddings, chat, completion, security scanning).

## User Story

As a platform operator
I want to configure all LLM services via environment variables
So that I can use a centralized LiteLLM proxy for embeddings, chat, and completion across all components

## Feature Metadata

- **Type**: Enhancement / Refactoring
- **Complexity**: Medium
- **Affected Systems**: `registry/core/config.py`, `registry/embeddings/client.py`, `registry/services/security_scanner.py`, `registry/services/agent_scanner.py`
- **Dependencies**: LiteLLM (already installed)

---

## CURRENT STATE ANALYSIS

### LLM Usage Points

| Component | File | Current Env Vars | Purpose |
|-----------|------|------------------|---------|
| **Embeddings** | `registry/embeddings/client.py` | `EMBEDDINGS_PROVIDER`, `EMBEDDINGS_MODEL_NAME`, `EMBEDDINGS_API_KEY`, `EMBEDDINGS_API_BASE` | Vector embeddings for semantic search |
| **MCP Security Scanner** | `registry/services/security_scanner.py` | `MCP_SCANNER_LLM_API_KEY` | LLM-based security analysis of MCP servers |
| **A2A Agent Scanner** | `registry/services/agent_scanner.py` | `A2A_SCANNER_LLM_API_KEY` | LLM-based security analysis of A2A agents |

### Issues Identified

1. **Critical Bug**: `embeddings_api_key` not passed to `litellm.embedding()` call (line 255-261)
2. **Missing Feature**: Scanners have no `API_BASE` support - cannot use LiteLLM proxy
3. **Inconsistent Naming**: Different env var patterns per component
4. **No Model Selection**: Scanners cannot configure which LLM model to use

---

## PROPOSED CONFIGURATION SCHEMA

### Environment Variables (Unified Pattern)

```bash
# =============================================================================
# LLM CONFIGURATION (applies to all LLM operations)
# =============================================================================

# Default LLM settings (used by components that don't have specific overrides)
LLM_PROVIDER=litellm                        # 'litellm' or 'openai' (for direct SDK)
LLM_MODEL=openai/gpt-4o-mini                # Model identifier
LLM_API_KEY=your-api-key                    # API key for authentication
LLM_API_BASE=https://litellm-proxy.example.com  # Custom API base URL

# =============================================================================
# EMBEDDINGS CONFIGURATION (overrides default LLM settings for embeddings)
# =============================================================================

EMBEDDINGS_PROVIDER=litellm                 # 'sentence-transformers' or 'litellm'
EMBEDDINGS_MODEL_NAME=openai/text-embedding-3-small
EMBEDDINGS_MODEL_DIMENSIONS=1536
EMBEDDINGS_API_KEY=${LLM_API_KEY}           # Falls back to LLM_API_KEY if not set
EMBEDDINGS_API_BASE=${LLM_API_BASE}         # Falls back to LLM_API_BASE if not set

# =============================================================================
# SECURITY SCANNER LLM CONFIGURATION (for MCP server scanning)
# =============================================================================

MCP_SCANNER_LLM_MODEL=openai/gpt-4o-mini    # NEW: Model selection
MCP_SCANNER_LLM_API_KEY=${LLM_API_KEY}      # Falls back to LLM_API_KEY
MCP_SCANNER_LLM_API_BASE=${LLM_API_BASE}    # NEW: API base URL support

# =============================================================================
# A2A SCANNER LLM CONFIGURATION (for agent scanning)
# =============================================================================

A2A_SCANNER_LLM_MODEL=openai/gpt-4o-mini    # NEW: Model selection
A2A_SCANNER_LLM_API_KEY=${LLM_API_KEY}      # Falls back to LLM_API_KEY
A2A_SCANNER_LLM_API_BASE=${LLM_API_BASE}    # NEW: API base URL support
```

### Configuration Hierarchy

```
LLM_API_KEY (global default)
├── EMBEDDINGS_API_KEY (embeddings-specific override)
├── MCP_SCANNER_LLM_API_KEY (scanner-specific override)
└── A2A_SCANNER_LLM_API_KEY (agent scanner-specific override)

LLM_API_BASE (global default)
├── EMBEDDINGS_API_BASE (embeddings-specific override)
├── MCP_SCANNER_LLM_API_BASE (scanner-specific override)
└── A2A_SCANNER_LLM_API_BASE (agent scanner-specific override)
```

---

## IMPLEMENTATION PLAN

### Phase 1: Fix Embeddings API Key Passthrough (Critical Bug)

**Priority**: Immediate
**Effort**: Low
**Impact**: High

**File**: `registry/embeddings/client.py`

**Current code (lines 255-261):**
```python
kwargs = {"model": self.model_name, "input": texts}

if self.api_base:
    kwargs["api_base"] = self.api_base

logger.debug(f"Calling LiteLLM embedding API with model: {self.model_name}")
response = embedding(**kwargs)
```

**Fixed code:**
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

### Phase 2: Add Global LLM Settings to Config

**Priority**: Short-term
**Effort**: Low
**Impact**: Medium

**File**: `registry/core/config.py`

**Add new settings after line 40:**
```python
    # Global LLM settings (defaults for all LLM operations)
    llm_provider: str = "litellm"
    llm_model: str = "openai/gpt-4o-mini"
    llm_api_key: str | None = None
    llm_api_base: str | None = None
```

**Update embeddings settings with fallback logic:**
```python
    # Embeddings settings [Default]
    embeddings_provider: str = "sentence-transformers"
    embeddings_model_name: str = "all-MiniLM-L6-v2"
    embeddings_model_dimensions: int = 384

    # LiteLLM-specific settings (falls back to global LLM settings)
    embeddings_api_key: str | None = None  # Falls back to llm_api_key
    embeddings_api_base: str | None = None  # Falls back to llm_api_base
    embeddings_aws_region: str | None = "us-east-1"

    @property
    def effective_embeddings_api_key(self) -> str | None:
        """Get embeddings API key, falling back to global LLM API key."""
        return self.embeddings_api_key or self.llm_api_key

    @property
    def effective_embeddings_api_base(self) -> str | None:
        """Get embeddings API base, falling back to global LLM API base."""
        return self.embeddings_api_base or self.llm_api_base
```

### Phase 3: Add Scanner API Base Support

**Priority**: Short-term
**Effort**: Medium
**Impact**: High

**File**: `registry/core/config.py`

**Add scanner LLM settings:**
```python
    # MCP Security Scanner LLM settings
    mcp_scanner_llm_model: str = "openai/gpt-4o-mini"
    mcp_scanner_llm_api_key: str = ""
    mcp_scanner_llm_api_base: str | None = None  # NEW

    # A2A Agent Scanner LLM settings
    a2a_scanner_llm_model: str = "openai/gpt-4o-mini"
    a2a_scanner_llm_api_key: str = ""
    a2a_scanner_llm_api_base: str | None = None  # NEW

    @property
    def effective_mcp_scanner_api_key(self) -> str | None:
        """Get MCP scanner API key, falling back to global LLM API key."""
        return self.mcp_scanner_llm_api_key or self.llm_api_key

    @property
    def effective_mcp_scanner_api_base(self) -> str | None:
        """Get MCP scanner API base, falling back to global LLM API base."""
        return self.mcp_scanner_llm_api_base or self.llm_api_base

    @property
    def effective_a2a_scanner_api_key(self) -> str | None:
        """Get A2A scanner API key, falling back to global LLM API key."""
        return self.a2a_scanner_llm_api_key or self.llm_api_key

    @property
    def effective_a2a_scanner_api_base(self) -> str | None:
        """Get A2A scanner API base, falling back to global LLM API base."""
        return self.a2a_scanner_llm_api_base or self.llm_api_base
```

### Phase 4: Update Search Service to Use Effective Settings

**File**: `registry/search/service.py` (lines 64-82)

**Update to use effective settings:**
```python
self.embedding_model = create_embeddings_client(
    provider=settings.embeddings_provider,
    model_name=settings.embeddings_model_name,
    model_dir=settings.embeddings_model_dir
    if settings.embeddings_provider == "sentence-transformers"
    else None,
    cache_dir=model_cache_path
    if settings.embeddings_provider == "sentence-transformers"
    else None,
    api_key=settings.effective_embeddings_api_key,  # Use effective property
    api_base=settings.effective_embeddings_api_base,  # Use effective property
    aws_region=settings.embeddings_aws_region
    if settings.embeddings_provider == "litellm"
    else None,
    embedding_dimension=settings.embeddings_model_dimensions,
)
```

### Phase 5: Update DocumentDB Search Repository

**File**: `registry/repositories/documentdb/search_repository.py` (lines 128-136)

**Update to use effective settings:**
```python
self._embedding_model = create_embeddings_client(
    provider=settings.embeddings_provider,
    model_name=settings.embeddings_model_name,
    model_dir=settings.embeddings_model_dir,
    api_key=settings.effective_embeddings_api_key,  # Use effective property
    api_base=settings.effective_embeddings_api_base,  # Use effective property
    aws_region=settings.embeddings_aws_region,
    embedding_dimension=settings.embeddings_model_dimensions,
)
```

### Phase 6: Update Security Scanner (Future - Depends on Scanner Support)

**Note**: This requires the external `mcp-scanner` CLI tool to support `--api-base` flag. If the scanner doesn't support this, we need to set environment variables instead.

**File**: `registry/services/security_scanner.py`

**Current** (lines 362-365):
```python
env = os.environ.copy()
if api_key:
    env["MCP_SCANNER_LLM_API_KEY"] = api_key
```

**Updated** (adds API base support):
```python
env = os.environ.copy()
if api_key:
    env["MCP_SCANNER_LLM_API_KEY"] = api_key
if settings.effective_mcp_scanner_api_base:
    env["MCP_SCANNER_LLM_API_BASE"] = settings.effective_mcp_scanner_api_base
    # Also set provider-specific vars for compatibility
    env["OPENAI_API_BASE"] = settings.effective_mcp_scanner_api_base
```

---

## STEP-BY-STEP TASKS

### Task 1: Fix Embeddings API Key Passthrough

**File**: `registry/embeddings/client.py`
**Action**: Add `api_key` to kwargs in `encode()` method

```bash
# Validation
uv run python -m py_compile registry/embeddings/client.py
uv run pytest tests/unit/embeddings/test_embeddings_client.py -v
```

### Task 2: Add Global LLM Settings

**File**: `registry/core/config.py`
**Action**: Add `llm_provider`, `llm_model`, `llm_api_key`, `llm_api_base` settings

```bash
# Validation
uv run python -m py_compile registry/core/config.py
uv run python -c "from registry.core.config import settings; print(settings.llm_api_key)"
```

### Task 3: Add Effective Property Methods

**File**: `registry/core/config.py`
**Action**: Add `effective_embeddings_api_key`, `effective_embeddings_api_base`, etc.

```bash
# Validation
uv run python -c "
from registry.core.config import settings
print(f'Effective embeddings API key: {settings.effective_embeddings_api_key}')
print(f'Effective embeddings API base: {settings.effective_embeddings_api_base}')
"
```

### Task 4: Update Search Service

**File**: `registry/search/service.py`
**Action**: Use `effective_` properties instead of direct settings

```bash
# Validation
uv run pytest tests/unit/search/ -v
```

### Task 5: Update DocumentDB Repository

**File**: `registry/repositories/documentdb/search_repository.py`
**Action**: Use `effective_` properties

```bash
# Validation
uv run pytest tests/integration/ -v -k "search"
```

### Task 6: Add Scanner API Base Settings

**File**: `registry/core/config.py`
**Action**: Add `mcp_scanner_llm_api_base`, `a2a_scanner_llm_api_base`

### Task 7: Update .env.example

**File**: `.env.example`
**Action**: Add new environment variables with documentation

### Task 8: Update README Documentation

**File**: `registry/embeddings/README.md`
**Action**: Document LiteLLM proxy usage and global LLM configuration

### Task 9: Add Unit Tests

**File**: `tests/unit/embeddings/test_embeddings_client.py`
**Action**: Add tests for `api_key` and `api_base` passthrough

### Task 10: Run Full Test Suite

```bash
uv run pytest tests/ -n 8
```

---

## TESTING STRATEGY

### Unit Tests

| Test Case | File | Expected |
|-----------|------|----------|
| `test_encode_with_api_key` | `test_embeddings_client.py` | `api_key` passed to embedding() |
| `test_encode_with_api_base_and_api_key` | `test_embeddings_client.py` | Both passed |
| `test_effective_embeddings_api_key_fallback` | `test_config.py` | Falls back to `llm_api_key` |
| `test_effective_embeddings_api_key_override` | `test_config.py` | Uses specific value when set |

### Integration Test (Manual)

```bash
# Set up LiteLLM proxy test
export LLM_API_KEY=your-proxy-token
export LLM_API_BASE=https://your-litellm-proxy.com
export EMBEDDINGS_PROVIDER=litellm
export EMBEDDINGS_MODEL_NAME=openai/text-embedding-3-small
export EMBEDDINGS_MODEL_DIMENSIONS=1536

# Test embeddings
uv run python -c "
from registry.embeddings import create_embeddings_client
from registry.core.config import settings

client = create_embeddings_client(
    provider=settings.embeddings_provider,
    model_name=settings.embeddings_model_name,
    api_key=settings.effective_embeddings_api_key,
    api_base=settings.effective_embeddings_api_base,
    embedding_dimension=settings.embeddings_model_dimensions,
)
result = client.encode(['test embedding'])
print(f'Success! Shape: {result.shape}')
"
```

---

## VALIDATION COMMANDS

```bash
# 1. Syntax check all modified files
uv run python -m py_compile registry/core/config.py
uv run python -m py_compile registry/embeddings/client.py
uv run python -m py_compile registry/search/service.py

# 2. Run linting
uv run ruff check registry/core/config.py registry/embeddings/client.py

# 3. Run type checking
uv run mypy registry/core/config.py registry/embeddings/client.py

# 4. Run unit tests
uv run pytest tests/unit/embeddings/ -v
uv run pytest tests/unit/core/ -v

# 5. Run full test suite
uv run pytest tests/ -n 8
```

---

## ACCEPTANCE CRITERIA

### Phase 1 (Critical Bug Fix)
- [ ] `api_key` is passed directly to `litellm.embedding()` when set
- [ ] Existing tests pass
- [ ] New test `test_encode_with_api_key` passes

### Phase 2 (Global LLM Settings)
- [ ] `LLM_API_KEY` and `LLM_API_BASE` environment variables are supported
- [ ] `effective_embeddings_api_key` property falls back to `llm_api_key`
- [ ] `effective_embeddings_api_base` property falls back to `llm_api_base`

### Phase 3 (Scanner Support)
- [ ] `MCP_SCANNER_LLM_API_BASE` environment variable is supported
- [ ] `A2A_SCANNER_LLM_API_BASE` environment variable is supported
- [ ] Scanners can use LiteLLM proxy

### Documentation
- [ ] `.env.example` updated with new variables
- [ ] `registry/embeddings/README.md` documents LiteLLM proxy usage
- [ ] Configuration hierarchy documented

---

## RISKS AND MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing env var behavior | Medium | Keep all existing env vars, new ones are additive |
| Scanner tools don't support API base | Low | Fall back to environment variable injection |
| Fallback logic complexity | Low | Clear property methods with explicit fallback chain |

---

## FUTURE CONSIDERATIONS

1. **LLM Router**: Consider adding a central LLM router service that handles all LLM calls
2. **Rate Limiting**: Add rate limiting configuration for LLM calls
3. **Cost Tracking**: Add token usage tracking per component
4. **Model Aliasing**: Support model aliases (e.g., `fast-embedding` -> `openai/text-embedding-3-small`)
