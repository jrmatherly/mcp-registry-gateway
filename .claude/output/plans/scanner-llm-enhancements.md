# Feature: Scanner LLM Enhancements

## Feature Description

Fix configuration gaps in the MCP and A2A security scanners to fully support LiteLLM-based security scanning. The current implementation has three issues:

1. **Bug**: A2A scanner uses wrong environment variable (`AZURE_OPENAI_API_KEY` instead of `A2A_SCANNER_LLM_API_KEY`)
2. **Missing**: Neither scanner passes the LLM model to the external scanner tools
3. **Missing**: No `effective_*_model` properties with fallback to global `llm_model`

These fixes enable users to configure a single LiteLLM proxy or model globally and have it apply to all security scanning operations.

## User Story

As a platform administrator
I want to configure LLM-based security scanning with a single set of credentials
So that I can use any LiteLLM-supported model (OpenAI, Azure, Bedrock, etc.) for MCP server and A2A agent security analysis

## Feature Metadata

- **Type**: Bug Fix + Enhancement
- **Complexity**: Low
- **Affected Systems**: Security Scanner Services, Core Configuration
- **Dependencies**: External scanner tools (a2a-scanner, mcp-scanner)

---

## CONTEXT REFERENCES

### Codebase Files to Read (MANDATORY)

Before implementing, read these files to understand existing patterns:

| File | Lines | Purpose |
|------|-------|---------|
| `registry/core/config.py` | 196-226 | Existing `effective_*` property patterns |
| `registry/services/security_scanner.py` | 363-371 | MCP scanner env var setup |
| `registry/services/agent_scanner.py` | 200-208 | A2A scanner env var setup (BUG HERE) |
| `tests/unit/core/test_config.py` | 754-829 | Test patterns for effective properties |
| `.venv/lib/python3.12/site-packages/a2ascanner/config/config.py` | 64-73 | A2A scanner expected env vars |

### Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `registry/core/config.py` | Add properties | Add `effective_mcp_scanner_model` and `effective_a2a_scanner_model` |
| `registry/services/agent_scanner.py` | Bug fix | Fix API key env var name |
| `registry/services/agent_scanner.py` | Enhancement | Add model env var |
| `registry/services/security_scanner.py` | Enhancement | Add model env var |
| `tests/unit/core/test_config.py` | Add tests | Tests for new effective model properties |

### External Scanner Expected Environment Variables

**A2A Scanner** (`cisco-ai-a2a-scanner` package):
```python
# From a2ascanner/config/config.py
A2A_SCANNER_LLM_PROVIDER   # Provider: openai, anthropic, azure, ollama
A2A_SCANNER_LLM_API_KEY    # API key for LLM provider  <-- CORRECT ONE
A2A_SCANNER_LLM_MODEL      # Model name (default: gpt-4.1)
A2A_SCANNER_LLM_BASE_URL   # Custom base URL
A2A_SCANNER_LLM_API_VERSION # Azure API version
```

**MCP Scanner** (external tool):
```bash
MCP_SCANNER_LLM_API_KEY    # API key for LLM
MCP_SCANNER_LLM_MODEL      # Model name
MCP_SCANNER_LLM_API_BASE   # Custom base URL
```

### Patterns to Follow

**Effective Property Pattern** (from `config.py:209-226`):
```python
@property
def effective_mcp_scanner_api_key(self) -> str | None:
    """Get MCP scanner API key, falling back to global LLM API key."""
    return self.mcp_scanner_llm_api_key or self.llm_api_key

@property
def effective_mcp_scanner_api_base(self) -> str | None:
    """Get MCP scanner API base, falling back to global LLM API base."""
    return self.mcp_scanner_llm_api_base or self.llm_api_base
```

**Test Pattern** (from `test_config.py:754-776`):
```python
def test_effective_mcp_scanner_api_key_uses_specific_when_set(self, monkeypatch) -> None:
    """Test that effective_mcp_scanner_api_key uses specific key when set."""
    # Arrange
    monkeypatch.setenv("MCP_SCANNER_LLM_API_KEY", "scanner-specific-key")
    monkeypatch.setenv("LLM_API_KEY", "global-key")

    # Act
    settings = Settings()

    # Assert
    assert settings.effective_mcp_scanner_api_key == "scanner-specific-key"

def test_effective_mcp_scanner_api_key_falls_back_to_global(self, monkeypatch) -> None:
    """Test that effective_mcp_scanner_api_key falls back to llm_api_key."""
    # Arrange
    monkeypatch.setenv("MCP_SCANNER_LLM_API_KEY", "")  # Empty string
    monkeypatch.setenv("LLM_API_KEY", "global-key")

    # Act
    settings = Settings()

    # Assert
    assert settings.effective_mcp_scanner_api_key == "global-key"
```

---

## IMPLEMENTATION PLAN

### Phase 1: Configuration Enhancement (config.py)

Add two new `effective_*_model` properties to `registry/core/config.py` after line 226.

**New Properties:**
```python
@property
def effective_mcp_scanner_model(self) -> str:
    """Get MCP scanner model, falling back to global LLM model."""
    return self.mcp_scanner_llm_model or self.llm_model

@property
def effective_a2a_scanner_model(self) -> str:
    """Get A2A scanner model, falling back to global LLM model."""
    return self.a2a_scanner_llm_model or self.llm_model
```

### Phase 2: Bug Fix (agent_scanner.py)

Fix the wrong environment variable name at line 203.

**Current (WRONG):**
```python
env["AZURE_OPENAI_API_KEY"] = api_key
```

**Fixed (CORRECT):**
```python
env["A2A_SCANNER_LLM_API_KEY"] = api_key
```

### Phase 3: Add Model Environment Variables

**MCP Scanner** (`security_scanner.py` after line 370):
```python
if settings.effective_mcp_scanner_model:
    env["MCP_SCANNER_LLM_MODEL"] = settings.effective_mcp_scanner_model
```

**A2A Scanner** (`agent_scanner.py` after line 208):
```python
if settings.effective_a2a_scanner_model:
    env["A2A_SCANNER_LLM_MODEL"] = settings.effective_a2a_scanner_model
```

### Phase 4: Add Tests

Add tests for the new effective model properties following the existing pattern.

---

## STEP-BY-STEP TASKS

### Task 1: Add effective model properties to config.py

**File:** `registry/core/config.py`
**Location:** After line 226 (after `effective_a2a_scanner_api_base`)

**Code to add:**
```python
@property
def effective_mcp_scanner_model(self) -> str:
    """Get MCP scanner model, falling back to global LLM model."""
    return self.mcp_scanner_llm_model or self.llm_model

@property
def effective_a2a_scanner_model(self) -> str:
    """Get A2A scanner model, falling back to global LLM model."""
    return self.a2a_scanner_llm_model or self.llm_model
```

**Validation:**
```bash
uv run python -m py_compile registry/core/config.py
```

---

### Task 2: Fix A2A scanner API key environment variable

**File:** `registry/services/agent_scanner.py`
**Location:** Line 203

**Change:**
```python
# FROM:
env["AZURE_OPENAI_API_KEY"] = api_key

# TO:
env["A2A_SCANNER_LLM_API_KEY"] = api_key
```

**Validation:**
```bash
uv run python -m py_compile registry/services/agent_scanner.py
```

---

### Task 3: Add model environment variable to A2A scanner

**File:** `registry/services/agent_scanner.py`
**Location:** After line 208 (after `AZURE_OPENAI_ENDPOINT` line)

**Code to add:**
```python
# Set model if configured
if settings.effective_a2a_scanner_model:
    env["A2A_SCANNER_LLM_MODEL"] = settings.effective_a2a_scanner_model
```

**Validation:**
```bash
uv run python -m py_compile registry/services/agent_scanner.py
```

---

### Task 4: Add model environment variable to MCP scanner

**File:** `registry/services/security_scanner.py`
**Location:** After line 370 (after `OPENAI_API_BASE` line)

**Code to add:**
```python
# Set model if configured
if settings.effective_mcp_scanner_model:
    env["MCP_SCANNER_LLM_MODEL"] = settings.effective_mcp_scanner_model
```

**Validation:**
```bash
uv run python -m py_compile registry/services/security_scanner.py
```

---

### Task 5: Add tests for effective model properties

**File:** `tests/unit/core/test_config.py`
**Location:** After line 842 (after existing effective property tests)

**Tests to add:**
```python
def test_effective_mcp_scanner_model_uses_specific_when_set(self, monkeypatch) -> None:
    """Test that effective_mcp_scanner_model uses specific model when set."""
    # Arrange
    monkeypatch.setenv("MCP_SCANNER_LLM_MODEL", "openai/gpt-4")
    monkeypatch.setenv("LLM_MODEL", "openai/gpt-3.5-turbo")

    # Act
    settings = Settings()

    # Assert
    assert settings.effective_mcp_scanner_model == "openai/gpt-4"

def test_effective_mcp_scanner_model_falls_back_to_global(self, monkeypatch) -> None:
    """Test that effective_mcp_scanner_model falls back to llm_model."""
    # Arrange
    monkeypatch.delenv("MCP_SCANNER_LLM_MODEL", raising=False)
    monkeypatch.setenv("LLM_MODEL", "openai/gpt-3.5-turbo")

    # Act
    settings = Settings()

    # Assert
    assert settings.effective_mcp_scanner_model == "openai/gpt-3.5-turbo"

def test_effective_a2a_scanner_model_uses_specific_when_set(self, monkeypatch) -> None:
    """Test that effective_a2a_scanner_model uses specific model when set."""
    # Arrange
    monkeypatch.setenv("A2A_SCANNER_LLM_MODEL", "azure/gpt-4")
    monkeypatch.setenv("LLM_MODEL", "openai/gpt-3.5-turbo")

    # Act
    settings = Settings()

    # Assert
    assert settings.effective_a2a_scanner_model == "azure/gpt-4"

def test_effective_a2a_scanner_model_falls_back_to_global(self, monkeypatch) -> None:
    """Test that effective_a2a_scanner_model falls back to llm_model."""
    # Arrange
    monkeypatch.delenv("A2A_SCANNER_LLM_MODEL", raising=False)
    monkeypatch.setenv("LLM_MODEL", "openai/gpt-3.5-turbo")

    # Act
    settings = Settings()

    # Assert
    assert settings.effective_a2a_scanner_model == "openai/gpt-3.5-turbo"
```

**Validation:**
```bash
uv run pytest tests/unit/core/test_config.py -v -k "effective" --no-header
```

---

## TESTING STRATEGY

### Unit Tests

| Test Case | File | Description |
|-----------|------|-------------|
| `test_effective_mcp_scanner_model_uses_specific_when_set` | `test_config.py` | Verifies specific model takes precedence |
| `test_effective_mcp_scanner_model_falls_back_to_global` | `test_config.py` | Verifies fallback to `llm_model` |
| `test_effective_a2a_scanner_model_uses_specific_when_set` | `test_config.py` | Verifies specific model takes precedence |
| `test_effective_a2a_scanner_model_falls_back_to_global` | `test_config.py` | Verifies fallback to `llm_model` |

### Integration Verification

Manual verification steps (no automated integration tests needed for config):

1. Start registry with `LLM_MODEL=openai/gpt-4` and no scanner-specific model
2. Verify scanner uses `openai/gpt-4` by checking logs
3. Set `MCP_SCANNER_LLM_MODEL=anthropic/claude-3-haiku` and restart
4. Verify MCP scanner uses `anthropic/claude-3-haiku` while A2A uses `openai/gpt-4`

---

## VALIDATION COMMANDS

### After Each File Change

```bash
# Syntax check
uv run python -m py_compile registry/core/config.py
uv run python -m py_compile registry/services/security_scanner.py
uv run python -m py_compile registry/services/agent_scanner.py
```

### After All Changes

```bash
# Lint and format
uv run ruff check --fix registry/core/config.py registry/services/security_scanner.py registry/services/agent_scanner.py
uv run ruff format registry/core/config.py registry/services/security_scanner.py registry/services/agent_scanner.py

# Type check
uv run mypy registry/core/config.py registry/services/security_scanner.py registry/services/agent_scanner.py

# Run related unit tests
uv run pytest tests/unit/core/test_config.py -v -k "effective" --no-header

# Run full test suite
uv run pytest tests/ -n 8
```

---

## ACCEPTANCE CRITERIA

- [ ] `effective_mcp_scanner_model` property exists and falls back to `llm_model`
- [ ] `effective_a2a_scanner_model` property exists and falls back to `llm_model`
- [ ] A2A scanner uses `A2A_SCANNER_LLM_API_KEY` (not `AZURE_OPENAI_API_KEY`)
- [ ] MCP scanner passes `MCP_SCANNER_LLM_MODEL` environment variable
- [ ] A2A scanner passes `A2A_SCANNER_LLM_MODEL` environment variable
- [ ] All 4 new unit tests pass
- [ ] All existing tests continue to pass
- [ ] Code passes `ruff check` and `ruff format`
- [ ] Code passes `mypy` type checking

---

## RISK ASSESSMENT

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing scanner behavior | Low | High | Bug fix aligns with expected env var names |
| Fallback logic incorrect | Low | Medium | Tests verify both specific and fallback paths |
| External scanner doesn't read new env var | Low | Low | Env vars match scanner documentation |

---

## NOTES

- The `mcp-scanner` tool is not installed as a Python dependency - it's an external CLI tool
- The `a2a-scanner` (`cisco-ai-a2a-scanner`) is installed and its config.py confirms `A2A_SCANNER_LLM_API_KEY`
- Both scanners use LiteLLM internally, so any LiteLLM-supported model format works
- Empty string for model settings should fall back to global (not use empty string)
