# Claude Code Features Guide

This guide documents Claude Code features implemented in the MCP Registry Gateway project, including progressive disclosure, hooks, agents, and skills.

## Progressive Disclosure Pattern

The project implements a 3-level progressive disclosure pattern to minimize token usage while maintaining comprehensive guidance.

### Level 1: Metadata (Always Loaded)

YAML frontmatter in skill/agent files provides minimal context:

```yaml
---
name: code-reviewer
description: Reviews Python/FastAPI code for patterns, errors, security
tools:
  - Read
  - Glob
  - Grep
model: sonnet
---
```

**Token cost**: ~20-30 tokens per file

### Level 2: Instructions (On-Demand)

Main content of SKILL.md or agent files loaded when the skill/agent is invoked:

- Skill instructions (~150 tokens)
- Agent behavior guidelines (~200 tokens)
- Quick reference commands

### Level 3: Deep Resources (As Needed)

Detailed references loaded only when required:

```
skills/validate-project/
├── SKILL.md                      # Level 2 (~150 tokens)
├── references/
│   ├── ci-pipeline.md            # Level 3 (~300 tokens)
│   └── pre-commit-checklist.md   # Level 3 (~200 tokens)
└── scripts/
    └── validate.sh               # Level 3 (~100 tokens)
```

**Total if fully loaded**: ~750 tokens
**Typical usage**: ~150-300 tokens (Levels 1-2 only)

## Hooks

Hooks allow automated actions in response to Claude Code events. They can be configured in `.claude/settings.json`.

### Hook Types

| Hook | Trigger | Use Case |
|------|---------|----------|
| `PreToolUse` | Before a tool runs | Validation, logging |
| `PostToolUse` | After a tool completes | Cleanup, notifications |
| `Stop` | When Claude stops | Session summary, cleanup |
| `Notification` | On specific events | Alerts, logging |

### Example Hook Configuration

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "command": "echo 'Running: $TOOL_INPUT' >> .claude/audit.log"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit",
        "command": "uv run ruff check --fix $FILE_PATH 2>/dev/null || true"
      }
    ]
  }
}
```

### Potential Hook Applications

| Application | Hook Type | Description |
|-------------|-----------|-------------|
| Auto-lint on edit | PostToolUse | Run ruff after file edits |
| Audit logging | PreToolUse | Log all bash commands |
| Test reminder | Stop | Remind to run tests before ending |
| Security check | PostToolUse | Run bandit after code changes |

## Agents

The project includes 4 specialized agents for different tasks.

### code-reviewer

**Purpose**: Reviews Python/FastAPI code for patterns, errors, and best practices.

| Attribute | Value |
|-----------|-------|
| Model | sonnet |
| Tools | Read, Glob, Grep, Task |
| MCP Servers | serena |

**When to use**:

- Code review before PR submission
- Checking adherence to project conventions
- Identifying potential issues in new code

**Invocation**: Use Task tool with `subagent_type: "code-reviewer"`

### arch-analyzer

**Purpose**: Analyzes architecture patterns, design decisions, and system structure.

| Attribute | Value |
|-----------|-------|
| Model | opus |
| Tools | Read, Glob, Grep, Task |
| MCP Servers | serena |

**When to use**:

- Architecture decisions
- Understanding component relationships
- Design review for new features

### test-runner

**Purpose**: Executes pytest tests and analyzes results.

| Attribute | Value |
|-----------|-------|
| Model | haiku |
| Tools | Bash, Read, Glob |

**When to use**:

- Running test suites
- Analyzing test failures
- Coverage reporting

**Note**: Uses haiku model for cost efficiency on straightforward tasks.

### security-auditor

**Purpose**: Performs security analysis using Bandit and OWASP guidelines.

| Attribute | Value |
|-----------|-------|
| Model | sonnet |
| Tools | Bash, Read, Glob, Grep |
| MCP Servers | serena |

**When to use**:

- Security scans before deployment
- Reviewing authentication/authorization code
- Checking for vulnerabilities

## Skills

Skills provide reusable workflows with progressive loading.

### validate-project

**Purpose**: Run comprehensive validation before committing.

```
validate-project/
├── SKILL.md                      # Quick/full validation commands
├── references/
│   ├── ci-pipeline.md            # CI/CD details
│   └── pre-commit-checklist.md   # Manual checklist
└── scripts/
    └── validate.sh               # Executable script
```

**Quick command**:

```bash
uv run ruff check --fix . && uv run ruff format . && uv run pytest tests/ -n 8
```

### code-review

**Purpose**: Comprehensive code review workflow.

```
code-review/
├── SKILL.md                      # Review process
└── references/
    ├── review-checklist.md       # Detailed checklist
    └── common-issues.md          # Known patterns to watch for
```

### new-endpoint

**Purpose**: Create new FastAPI endpoints following conventions.

```
new-endpoint/
├── SKILL.md                      # Step-by-step guide
└── references/
    ├── schema-templates.md       # Pydantic model templates
    └── service-templates.md      # Service layer templates
```

**Creates**:

1. Route in `registry/api/`
2. Service in `registry/services/`
3. Repository method
4. Pydantic schemas
5. Tests

### add-test

**Purpose**: Add tests for components.

```
add-test/
├── SKILL.md                      # Test writing guide
└── references/
    ├── fixture-patterns.md       # Common fixtures
    └── mock-patterns.md          # Mocking strategies
```

### docker-services

**Purpose**: Docker service configuration and management.

```
docker-services/
├── SKILL.md                      # Service management
└── references/
    └── service-config.md         # Configuration details
```

## GitHub Actions Integration

The project uses GitHub Actions for CI/CD. Potential enhancements for Claude Code integration:

### Current CI Pipeline

```yaml
# .github/workflows/registry-test.yml
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: uv run pytest tests/ -n 8
```

### Potential Enhancements

| Enhancement | Description |
|-------------|-------------|
| Automated PR review | Use Claude to review PRs via GitHub Actions |
| Security scanning | Trigger security-auditor on security-related changes |
| Documentation check | Verify docs are updated with code changes |
| Test coverage gate | Require minimum coverage on changed files |

### Example: Automated PR Review Action

```yaml
# .github/workflows/claude-review.yml (potential)
name: Claude Code Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Get changed files
        id: changed
        uses: tj-actions/changed-files@v40
      - name: Claude review
        if: steps.changed.outputs.any_changed == 'true'
        run: |
          # Invoke Claude code-reviewer agent
          # Post review comments to PR
```

## Best Practices

### Agent Selection

| Task | Recommended Agent |
|------|-------------------|
| Code review | code-reviewer |
| Architecture analysis | arch-analyzer |
| Test execution | test-runner |
| Security audit | security-auditor |

### Skill Usage

| Task | Recommended Skill |
|------|-------------------|
| Pre-commit validation | validate-project |
| New API endpoint | new-endpoint |
| Adding tests | add-test |
| Docker changes | docker-services |
| PR review | code-review |

### Model Selection by Task

| Task Type | Recommended Model | Reason |
|-----------|-------------------|--------|
| Code review | sonnet | Balance of quality and speed |
| Architecture | opus | Complex reasoning required |
| Test running | haiku | Simple, repetitive task |
| Security | sonnet | Requires careful analysis |
| Quick fixes | haiku | Cost efficient for simple tasks |

## Creating New Skills

To add a new skill:

### 1. Create Directory Structure

```bash
mkdir -p .claude/skills/my-skill/references
mkdir -p .claude/skills/my-skill/scripts
```

### 2. Create SKILL.md

```markdown
# My Skill Name

Brief description of what this skill does.

## Quick Start

[Minimal instructions for common use case]

## Detailed Steps

[Step-by-step guide]

## References

- [Detailed Guide](references/detailed-guide.md)

## Scripts

- [Automation Script](scripts/automate.sh)
```

### 3. Add References (Optional)

Create detailed guides in `references/` for complex topics.

### 4. Add Scripts (Optional)

Create executable scripts in `scripts/` for automation.

## Creating New Agents

To add a new agent:

### 1. Create Agent File

Create `.claude/agents/my-agent.md`:

```markdown
---
name: my-agent
description: Brief description of agent purpose
tools:
  - Read
  - Glob
  - Grep
allowedMcpServers:
  - serena
model: sonnet
---

# My Agent Name

You are a specialist for [domain]. [Detailed behavior instructions]

## Capabilities

[What the agent can do]

## Output Format

[Expected output structure]
```

### 2. Choose Appropriate Model

- **haiku**: Simple, repetitive tasks
- **sonnet**: Balanced quality and speed
- **opus**: Complex reasoning, architecture decisions

### 3. Define Tool Access

Only include tools the agent needs:

- `Read`, `Glob`, `Grep`: For code analysis
- `Bash`: For command execution
- `Task`: For delegating subtasks
- MCP servers: For advanced capabilities
