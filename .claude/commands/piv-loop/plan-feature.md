---
name: plan-feature
description: Create comprehensive feature implementation plan with codebase analysis
category: planning
complexity: advanced
argument-hint: <feature-description>
mcp-servers: [serena]
personas: [arch-analyzer, security-auditor]
---

# /plan-feature - Feature Planning

## Triggers

- New feature development requests
- Major refactoring requiring architectural planning
- Complex multi-file implementations
- Features requiring cross-layer coordination (API, Service, Repository)

## Usage

```
/plan-feature <feature-description>
```

**Examples:**
- `/plan-feature "add agent capability management"`
- `/plan-feature "implement server health monitoring"`
- `/plan-feature "add OAuth scope validation to endpoints"`

## Behavioral Flow

1. **Understand**: Deep feature analysis and requirement extraction
2. **Research**: Codebase intelligence gathering via Serena
3. **Design**: Strategic architecture decisions and pattern selection
4. **Plan**: Generate comprehensive step-by-step implementation plan
5. **Validate**: Review plan completeness and feasibility

Key behaviors:
- Context-first approach (research before planning)
- Pattern recognition from existing codebase
- Risk assessment and mitigation planning

**Core Principle**: We do NOT write code in this phase. Our goal is to create a context-rich implementation plan that enables one-pass implementation success.

## MCP Integration

- **Serena MCP**: Pattern discovery and codebase analysis
  - `find_symbol`: Locate similar implementations to follow
  - `get_symbols_overview`: Understand file structure
  - `search_for_pattern`: Find code patterns and conventions
  - `read_memory`: Load project patterns (api_reference, code_style_conventions)

## Tool Coordination

- **Serena Tools**: Pattern discovery, symbol search, codebase analysis
- **Read**: Documentation, configuration files
- **Grep/Glob**: File and pattern discovery
- **Write**: Plan document creation
- **TodoWrite**: Track planning phases

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

### Phase 3: External Research

**Documentation Gathering:**

- Check `docs/` for relevant guides
- Review `docs/llms.txt` sections (selective loading)
- Find FastAPI/Pydantic best practices if needed
- Identify common gotchas

### Phase 4: Strategic Thinking

**Consider:**

- How does this feature fit existing architecture?
- What are critical dependencies and order of operations?
- What could go wrong? (Edge cases, errors)
- How will this be tested comprehensively?
- Are there security considerations?
- How maintainable is this approach?

### Phase 5: Generate Plan

Create plan using template below.

## Output Format

Save to: `.claude/output/plans/{kebab-case-feature-name}.md`

```markdown
# Feature: {Feature Name}

## Feature Description
{Detailed description of the feature, its purpose, and value}

## User Story
As a {type of user}
I want to {action/goal}
So that {benefit/value}

## Feature Metadata
- **Type**: [New Capability / Enhancement / Refactor / Bug Fix]
- **Complexity**: [Low / Medium / High]
- **Affected Systems**: [List components]
- **Dependencies**: [External libraries or services]

---

## CONTEXT REFERENCES

### Codebase Files to Read (MANDATORY)
- `registry/api/servers.py` (lines 50-80) - Pattern for endpoint structure
- `registry/services/server_service.py` - Service layer pattern
- `registry/schemas/server.py` - Pydantic model examples

### New Files to Create
- `registry/api/{new_resource}.py` - API endpoints
- `registry/services/{new_resource}_service.py` - Business logic
- `registry/schemas/{new_resource}.py` - Request/response models
- `tests/unit/test_{new_resource}_service.py` - Unit tests

### Patterns to Follow
[Include code patterns from existing implementations]

---

## IMPLEMENTATION PLAN

### Phase 1: Foundation
{Foundational work before main implementation}

### Phase 2: Core Implementation
{Main implementation work}

### Phase 3: Integration
{Integration with existing system}

### Phase 4: Testing
{Testing approach}

---

## STEP-BY-STEP TASKS
[Detailed atomic tasks with validation commands]

---

## TESTING STRATEGY
[Test cases for unit, integration, edge cases]

---

## VALIDATION COMMANDS
[All validation commands to run]

---

## ACCEPTANCE CRITERIA
[Checklist of completion requirements]
```

## Boundaries

**Will:**
- Create comprehensive implementation plans with full context
- Research codebase patterns before planning
- Include validation commands for each step
- Identify risks and mitigation strategies

**Will Not:**
- Write implementation code during planning phase
- Skip codebase research and assume patterns
- Create plans without testing strategy
- Ignore security considerations for sensitive features
