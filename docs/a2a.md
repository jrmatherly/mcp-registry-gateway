# Agent-to-Agent (A2A) Protocol Support

The MCP Gateway & Registry now supports **Agent-to-Agent (A2A) communication**, enabling AI agents to securely register themselves and discover other agents within a centralized registry. This creates a self-managed agent ecosystem where agents can autonomously find, connect to, and communicate with other agents while maintaining enterprise-grade security and access control.

## Overview

### What is A2A?

Agent-to-Agent (A2A) communication allows autonomous AI agents to:

1. **Self-Register** - Agents register their capabilities, skills, and metadata with the central registry
2. **Discover Other Agents** - Agents can discover and list other agents they have permission to access
3. **Secure Communication** - All agent-to-agent communication is authenticated and authorized via Keycloak
4. **Access Control** - Fine-grained permissions ensure agents only access agents they're authorized for

### Why A2A Matters

Instead of having a central orchestrator manage all agent communication:

```
❌ OLD: Orchestrator ←→ Agent A, Agent B, Agent C
         (bottleneck, single point of failure, limited scalability)

✅ NEW: Agent A ←→ Registry ←→ Agent B
        Agent C discovers both via registry
        (decentralized, scalable, autonomous)
```

A2A enables:

- **Autonomous agent networks** - Agents operate independently
- **Dynamic discovery** - New agents join without reconfiguration
- **Enterprise security** - Keycloak-based access control
- **Audit trails** - Complete visibility into agent interactions

## Architecture

### A2A Agent Flow

```
Agent Application (AI Code)
    ↓ M2M Token (Keycloak Service Account)
┌─────────────────────────────────────┐
│  Agent Registry API (/api/agents)   │
│  - POST /api/agents/register        │
│  - GET /api/agents                  │
│  - GET /api/agents/{path}           │
│  - PUT /api/agents/{path}           │
│  - DELETE /api/agents/{path}        │
│  - POST /api/agents/{path}/toggle   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  Agent State Management             │
│  Storage backend (configurable):    │
│  - File: registry/repositories/file │
│  - MongoDB: documentdb backend      │
└─────────────────────────────────────┘
```

### Three-Tier Access Control

The A2A implementation uses **three-tier access control** to ensure agents only access agents they're authorized for:

1. **UI-Scopes** - What agents each group can see/access
   - `list_agents` - List agents visible to this group
   - `get_agent` - Get details of specific agents
   - `publish_agent` - Register new agents
   - `modify_agent` - Update agent metadata
   - `delete_agent` - Remove agents

2. **Group Mappings** - Maps Keycloak groups to scope names
   - `mcp-registry-admin` - Full access to all agents
   - `registry-users-lob1` - Limited to LOB1 agents
   - `registry-users-lob2` - Limited to LOB2 agents

3. **Individual Agent Scopes** - Detailed access per group
   - Specific agents each group can access
   - Methods each group can call on agents

## Getting Started with A2A

### Quick Start: Register an Agent

```bash
# 1. Ensure credentials are generated
./credentials-provider/generate_creds.sh

# 2. Register an agent
uv run python cli/agent_mgmt.py register cli/examples/code_reviewer_agent.json

# 3. Verify registration
curl -H "Authorization: Bearer $(jq -r '.access_token' .oauth-tokens/ingress.json)" \
  http://localhost/api/agents | jq .
```

### Complete Agent Lifecycle

```bash
# Register agent
uv run python cli/agent_mgmt.py register agent-config.json

# List agents (filtered by permissions)
uv run python cli/agent_mgmt.py list

# Get agent details
uv run python cli/agent_mgmt.py get /code-reviewer

# Update agent
uv run python cli/agent_mgmt.py update /code-reviewer agent-config.json

# Disable agent (without deleting)
uv run python cli/agent_mgmt.py toggle /code-reviewer

# Re-enable agent
uv run python cli/agent_mgmt.py toggle /code-reviewer

# Delete agent
uv run python cli/agent_mgmt.py delete /code-reviewer
```

See [A2A Agent Management](a2a-agent-management.md) for complete CLI guide.

## Agent Configuration

### Agent Metadata Example

```json
{
  "protocol_version": "1.0",
  "name": "Code Reviewer Agent",
  "description": "Reviews code for quality and best practices",
  "path": "/code-reviewer",
  "url": "https://agent.example.com",
  "skills": [
    {
      "id": "review-python",
      "name": "Python Code Review",
      "description": "Reviews Python code for style and correctness",
      "parameters": {
        "code_snippet": {"type": "string"},
        "max_issues": {"type": "integer", "default": 10}
      }
    }
  ],
  "security": ["bearer"],
  "tags": ["code-review", "qa"],
  "visibility": "public",
  "trust_level": "verified"
}
```

## Testing A2A Features

### Agent CRUD Test Script

Use the pytest test suite to verify agent operations:

```bash
# Run all agent-related unit tests
uv run pytest tests/unit/api/ -v -k agent

# Run with coverage
uv run pytest tests/unit/ -n 8 --cov=registry --cov-report=term-missing
```

Agent CRUD operations are tested via:

1. CREATE - Register new agent (`POST /api/agents`)
2. READ - Retrieve agent details (`GET /api/agents/{id}`)
3. UPDATE - Modify agent metadata (`PUT /api/agents/{id}`)
4. LIST - List all agents (`GET /api/agents`)
5. TOGGLE - Disable/enable agent (`PATCH /api/agents/{id}`)
6. DELETE - Remove agent (`DELETE /api/agents/{id}`)

See [tests/README.md](../tests/README.md) for complete testing documentation.

### Access Control Testing

Test agent access control with pytest:

```bash
# Run auth-related tests
uv run pytest tests/unit/auth/ -v

# Run integration tests for access control
uv run pytest tests/integration/ -v -k agent
```

Tests verify:

- **Token Validation** - JWT authentication and authorization
- **Scope Enforcement** - Permission checking per endpoint
- **Group-Based Access** - Team isolation and visibility

For manual testing with different bot tokens:

```bash
# Generate tokens for testing access control
./keycloak/setup/generate-agent-token.sh admin-bot
./keycloak/setup/generate-agent-token.sh lob1-bot
./keycloak/setup/generate-agent-token.sh lob2-bot
```

## Implementation Details

### Core Components

**CLI Module** (`cli/agent_mgmt.py`)

- Agent registration and lifecycle management
- CRUD operations on agent metadata
- Argument validation and error handling
- Structured logging and status reporting

**API Routes** (`registry/api/agent_routes.py`)

- Implements Agent Registry REST API endpoints
- Access control enforcement via scopes
- Token validation and authentication
- Agent state persistence and management

**Data Models** (`registry/schemas/`)

- Agent schema validation
- Skill/capability definitions
- Security configuration models
- State tracking models

**Services** (`registry/services/agent_service.py`)

- Agent business logic
- State file management
- Permission checking
- Validation

### Key Features

- **JWT Token Validation** - 5-minute token TTL with expiration checks
- **Base64 Padding** - Proper JWT payload decoding
- **HTTP Status Codes** - Correct semantics (200, 201, 204, 400, 403, 404)
- **Error Messages** - Comprehensive debugging information
- **Configurable Storage** - File-based or MongoDB/DocumentDB backend
- **Keycloak Integration** - Enterprise authentication and authorization

### Token Management

All A2A operations use **machine-to-machine (M2M) authentication**:

```bash
# Tokens expire in 5 minutes and must be regenerated
./credentials-provider/generate_creds.sh

# Generate specific bot tokens for testing
./keycloak/setup/generate-agent-token.sh admin-bot
./keycloak/setup/generate-agent-token.sh lob1-bot
./keycloak/setup/generate-agent-token.sh lob2-bot
```

Token validation includes:

- JWT payload decoding with base64 padding
- Expiration time checking
- Bearer token authentication
- Group-based access control

## Use Cases

### Multi-Agent System Coordination

Multiple specialized agents register themselves and discover each other:

```
Code Analyzer Agent ──┐
                      │
Data Processor Agent ─├──→ Agent Registry
                      │
Report Generator Agent└──→ All agents can discover and coordinate
```

### Team Isolation with A2A

Different teams' agents only see their team's agents:

```
LOB1 Agents (Code Reviewer, Test Automation)
  ↓
  Registry (with access control)
  ↓
LOB1 agents can discover each other, but not LOB2 agents

LOB2 Agents (Data Analysis, Security Analyzer)
  ↓
  Registry (with access control)
  ↓
LOB2 agents can discover each other, but not LOB1 agents
```

### Autonomous Tool Discovery

Agents can discover other agents providing specialized tools:

```
General Agent needs to perform code review
  ↓
Queries registry for agents with "code-review" capability
  ↓
Discovers Code Reviewer Agent, requests review
  ↓
Continues with confidence in code quality
```

## Documentation

- **[A2A Agent Management](a2a-agent-management.md)** - Complete CLI guide and examples
- **[Test Documentation](../tests/README.md)** - Complete test infrastructure guide
- **[Scopes Configuration](../auth_server/scopes.yml)** - Permission definitions
- **[LLM Navigation Guide](llms.txt#section-45)** - For AI systems understanding implementation

## Support

For issues or questions:

1. **Review Documentation** - Check [A2A Agent Management](a2a-agent-management.md)
2. **Run Tests** - Verify setup with `uv run pytest tests/unit/api/ -v -k agent`
3. **Check Access Control** - Run `uv run pytest tests/unit/auth/ -v`
4. **Review Logs** - Check `/tmp/*_*.log` for error details
5. **Create Issue** - Include test output and logs

---

**Part of the [Agentic Community](https://github.com/agentic-community) - Building the future of AI agent ecosystems.**
