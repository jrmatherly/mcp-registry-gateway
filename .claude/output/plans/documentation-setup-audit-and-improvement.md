# Feature: Documentation Setup Audit and Improvement

## Feature Description

Audit and improve the project's setup documentation to ensure all development environment prerequisites, dependency installation commands, and deployment steps are comprehensively documented. The discovered gap was that `uv sync --extra docs` (required for mkdocs) was missing from setup guides, indicating potential gaps throughout the documentation.

This plan involves a systematic step-by-step walkthrough of the entire setup process—from cloning the repository to deploying services—to discover undocumented prerequisites, missing commands, and incomplete instructions.

## User Story

As a **new contributor**
I want to **follow comprehensive, accurate setup documentation**
So that **I can successfully set up my development environment without trial-and-error debugging**

## Feature Metadata

- **Type**: Enhancement (Documentation Improvement)
- **Complexity**: Medium
- **Affected Systems**: Documentation (`docs/`), Configuration (`pyproject.toml`, `Makefile`), Setup Scripts
- **Dependencies**: None (documentation-only changes)

---

## CONTEXT REFERENCES

### Current State Analysis

#### Discovery: The `uv sync --extra docs` Gap

The `pyproject.toml` defines optional dependency groups:

```toml
[project.optional-dependencies]
docs = [
    "mkdocs>=1.5.0",
    "mkdocs-material>=9.4.0",
    "mkdocs-git-revision-date-localized-plugin>=1.2.0",
    "mkdocs-minify-plugin>=0.7.0",
    "pymdown-extensions>=10.0.0",
]

[dependency-groups]
dev = [
    # Testing framework
    "pytest>=8.0.0",
    # ... more dev dependencies
]
```

**The problem**: Neither `docs/complete-setup-guide.md` nor `docs/macos-setup-guide.md` mention:
- `uv sync --extra docs` for documentation dependencies
- `uv sync --dev` is only mentioned in `Makefile` as `install-dev` target
- The relationship between dev dependencies and docs dependencies is unclear

#### Documented vs. Actual Commands

| Command | Where Documented | Gap |
|---------|-----------------|-----|
| `uv sync` | complete-setup-guide.md, macos-setup-guide.md | Basic deps only |
| `uv sync --dev` | Makefile (install-dev), CONTRIBUTING.md | Not in setup guides |
| `uv sync --extra docs` | **NOWHERE** | **CRITICAL GAP** |
| Full dev setup | **MISSING** | Need comprehensive command |

#### Current Documentation Files

| File | Purpose | Key Issues |
|------|---------|------------|
| `docs/complete-setup-guide.md` | VM/EC2/K8s deployment | Missing `--dev` and `--extra docs` |
| `docs/macos-setup-guide.md` | macOS local dev | Missing `--dev` and `--extra docs` |
| `docs/installation.md` | Quick start + platforms | Missing dev dependencies |
| `CONTRIBUTING.md` | Contribution guidelines | Has `uv sync` only |
| `DEV_INSTRUCTIONS.md` | Dev setup summary | References other guides, no deps |
| `Makefile` | `install-dev` target | Uses `uv sync --dev` only |

### Codebase Files to Read (MANDATORY)

Files already read during planning:
- `pyproject.toml` - Dependency definitions (read)
- `docs/complete-setup-guide.md` - Full setup guide (read)
- `docs/macos-setup-guide.md` - macOS guide (read)
- `docs/installation.md` - Installation guide (read)
- `CONTRIBUTING.md` - Contribution guidelines (read)
- `DEV_INSTRUCTIONS.md` - Developer instructions (read)
- `Makefile` - Build targets (read)

Files to read during implementation:
- `docs/testing.md` - Testing documentation
- `docs/configuration.md` - Configuration reference
- `mkdocs.yml` - MkDocs configuration
- `build_and_run.sh` - Deployment script

### Files to Modify

1. **`docs/complete-setup-guide.md`**
   - Add development dependencies section
   - Document `uv sync --dev --extra docs` command
   - Add documentation building instructions

2. **`docs/macos-setup-guide.md`**
   - Add development dependencies section
   - Document full dev setup command
   - Add documentation building instructions

3. **`docs/installation.md`**
   - Add development prerequisites section
   - Document dependency groups clearly

4. **`CONTRIBUTING.md`**
   - Update Development Setup section with complete commands
   - Add docs building prerequisites

5. **`DEV_INSTRUCTIONS.md`**
   - Add explicit dependency installation section
   - Document all `uv sync` variants

6. **`Makefile`** (potentially)
   - Add `install-docs` target
   - Add `install-all` target for full setup
   - Update help text

### New Files to Create

None - all changes are to existing documentation files.

### Patterns to Follow

From CLAUDE.md - Documentation standards:
```markdown
### README Best Practices
1. **Prerequisites Section**: List external dependencies and setup requirements
2. **Links to External Resources**: Provide links to datasets, documentation, and services
3. **Clear Command Examples**: Show all command-line options with examples
4. **Development Workflow**: Include a section on development practices
```

---

## IMPLEMENTATION PLAN

### Phase 1: Audit and Validation

**Goal**: Validate the complete setup process step-by-step to discover all gaps.

**Tasks**:
1. Document the actual full setup sequence by testing it
2. Identify all missing prerequisites and commands
3. Create comprehensive list of all setup scenarios

### Phase 2: Documentation Updates

**Goal**: Update all setup documentation with complete, accurate instructions.

**Tasks**:
1. Update `docs/complete-setup-guide.md` with development prerequisites
2. Update `docs/macos-setup-guide.md` with development prerequisites
3. Update `docs/installation.md` with dependency groups explanation
4. Update `CONTRIBUTING.md` with complete setup commands
5. Update `DEV_INSTRUCTIONS.md` with explicit dependency installation

### Phase 3: Build System Improvements

**Goal**: Add Makefile targets for comprehensive setup.

**Tasks**:
1. Add `install-docs` Makefile target
2. Add `install-all` Makefile target
3. Update Makefile help text

### Phase 4: Validation

**Goal**: Ensure documentation is accurate and complete.

**Tasks**:
1. Test complete setup process following new documentation
2. Verify all commands work as documented
3. Cross-check consistency across all documentation files

---

## STEP-BY-STEP TASKS

### Task 1: Audit Current Setup Process

**Objective**: Document what actually works vs. what's documented

**Actions**:
1. Read `mkdocs.yml` to understand documentation build requirements
2. Read `build_and_run.sh` to understand deployment prerequisites
3. Test the sequence of commands needed for full development setup
4. Document any missing prerequisites

**Validation**:
```bash
# Test current documented setup
uv sync
uv run mkdocs --version  # Should fail without --extra docs

# Test full setup
uv sync --dev --extra docs
uv run mkdocs --version  # Should work
uv run pytest --version  # Should work
```

### Task 2: Update complete-setup-guide.md

**Objective**: Add comprehensive development setup section

**Location**: After "Setup Python Virtual Environment" section (around line 160)

**Changes**:
1. Add new subsection "### Install Development Dependencies"
2. Document the three dependency groups:
   - Core: `uv sync`
   - Development: `uv sync --dev`
   - Documentation: `uv sync --extra docs`
   - Full: `uv sync --dev --extra docs`
3. Add explanation of when each is needed
4. Add documentation building commands

**Content to Add**:
```markdown
### Install Development Dependencies

The project uses three dependency groups:

| Group | Command | When Needed |
|-------|---------|-------------|
| Core | `uv sync` | Running the application |
| Development | `uv sync --dev` | Running tests, linting, type checking |
| Documentation | `uv sync --extra docs` | Building MkDocs documentation |
| All | `uv sync --dev --extra docs` | Full development environment |

**For contributors (recommended):**

```bash
# Install all development and documentation dependencies
uv sync --dev --extra docs

# Verify installation
uv run pytest --version
uv run mkdocs --version
```

**Building Documentation Locally:**

```bash
# Serve documentation locally with live reload
uv run mkdocs serve

# Build documentation for deployment
uv run mkdocs build
```
```

**Validation**:
```bash
# Verify documentation renders correctly
uv run mkdocs serve --dev-addr localhost:8001
# Visit http://localhost:8001 and verify content
```

### Task 3: Update macos-setup-guide.md

**Objective**: Add development dependencies to macOS guide

**Location**: After "Setup Python Virtual Environment" section (around line 90)

**Changes**: Same as Task 2, adapted for macOS context

**Validation**:
```bash
# Same validation as Task 2
```

### Task 4: Update installation.md

**Objective**: Add dependency groups explanation

**Location**: After "Prerequisites" section

**Changes**:
1. Add "Dependency Groups" subsection explaining the UV dependency structure
2. Update Quick Start sections with appropriate dependency commands

**Validation**:
```bash
# Verify markdown renders correctly
uv run mkdocs serve
```

### Task 5: Update CONTRIBUTING.md

**Objective**: Complete the Development Setup section

**Location**: Update existing "Development Setup" section

**Changes**:
```markdown
## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/mcp-registry-gateway.git
cd mcp-registry-gateway

# Install ALL development dependencies (includes testing, linting, and docs)
uv sync --dev --extra docs

# Start MongoDB
docker compose up -d mongodb

# Run tests to verify setup
uv run pytest tests/ -n 8

# Build documentation locally (optional)
uv run mkdocs serve

# Format and lint code
uv run ruff check --fix . && uv run ruff format .
```
```

**Validation**:
```bash
# Verify the commands work in sequence
```

### Task 6: Update DEV_INSTRUCTIONS.md

**Objective**: Add explicit dependency installation section

**Location**: New section after "Step 1: Choose Your Development Environment"

**Changes**:
1. Add new section "### Step 2: Install Development Dependencies"
2. Document all dependency installation commands
3. Explain when each is needed

**Validation**:
```bash
# Verify documentation consistency
```

### Task 7: Update Makefile

**Objective**: Add comprehensive setup targets

**Changes**:
1. Add `install-docs` target
2. Add `install-all` target
3. Update `install-dev` target comment
4. Update help text

**Content**:
```makefile
install-dev:
	@echo "Installing development dependencies (testing, linting, type checking)..."
	uv sync --dev

install-docs:
	@echo "Installing documentation dependencies (mkdocs)..."
	uv sync --extra docs

install-all:
	@echo "Installing ALL dependencies (dev + docs)..."
	uv sync --dev --extra docs
```

**Validation**:
```bash
make install-all
make help | grep install
```

### Task 8: Final Validation

**Objective**: Ensure all documentation is consistent and accurate

**Actions**:
1. Run through complete setup from scratch using new documentation
2. Verify all commands work as documented
3. Check cross-references between documents are accurate
4. Run linting on markdown files

**Validation**:
```bash
# Lint markdown files
uv run markdownlint docs/*.md || true

# Build documentation
uv run mkdocs build --strict

# Run tests
uv run pytest tests/ -n 8
```

---

## TESTING STRATEGY

### Manual Testing

1. **Fresh Clone Test**: Clone to new directory and follow documentation exactly
2. **Command Verification**: Test each documented command works
3. **Build Test**: Verify documentation builds without errors

### Automated Checks

```bash
# Verify all documented commands are valid
uv sync --dev --extra docs
uv run pytest --version
uv run mkdocs --version
uv run ruff --version
uv run mypy --version
uv run bandit --version

# Build documentation
uv run mkdocs build --strict
```

---

## VALIDATION COMMANDS

```bash
# Task 1: Audit validation
uv sync
uv run mkdocs --version 2>&1 | grep -q "No such command" && echo "EXPECTED: mkdocs not available"
uv sync --extra docs
uv run mkdocs --version

# Task 2-6: Documentation validation
uv run mkdocs serve --dev-addr localhost:8001 &
sleep 3
curl -s http://localhost:8001 | grep -q "MCP Gateway" && echo "Docs server working"
pkill -f "mkdocs serve"

# Task 7: Makefile validation
make help | grep -E "(install-dev|install-docs|install-all)"

# Task 8: Final validation
uv sync --dev --extra docs
uv run pytest tests/unit/ -n 4 -q
uv run mkdocs build --strict
```

---

## ACCEPTANCE CRITERIA

- [ ] `uv sync --extra docs` is documented in all setup guides
- [ ] `uv sync --dev` is documented in all setup guides
- [ ] Combined command `uv sync --dev --extra docs` is documented
- [ ] Makefile has `install-all` target
- [ ] Documentation builds without errors (`mkdocs build --strict`)
- [ ] All setup guides are internally consistent
- [ ] CONTRIBUTING.md has complete setup instructions
- [ ] DEV_INSTRUCTIONS.md references correct commands
- [ ] Fresh clone following documentation succeeds

---

## RISKS AND MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking existing workflows | Medium | Only add new content, don't remove existing instructions |
| Inconsistent documentation | Low | Cross-check all files during validation |
| Missing other gaps | Medium | Comprehensive audit in Phase 1 |

---

## APPENDIX: Dependency Group Reference

### pyproject.toml Structure

```toml
[project]
dependencies = [
    # Core runtime dependencies
    "fastapi>=0.127.0",
    "pydantic>=2.12.0",
    # ... ~40 more
]

[project.optional-dependencies]
docs = [
    "mkdocs>=1.5.0",
    "mkdocs-material>=9.4.0",
    # ... documentation tools
]

[dependency-groups]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=1.3.0",
    # ... testing and linting tools
]
```

### UV Commands Reference

| Command | What It Installs |
|---------|-----------------|
| `uv sync` | Core `[project].dependencies` only |
| `uv sync --dev` | Core + `[dependency-groups].dev` |
| `uv sync --extra docs` | Core + `[project.optional-dependencies].docs` |
| `uv sync --dev --extra docs` | All of the above |
