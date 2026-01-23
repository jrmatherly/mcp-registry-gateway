# MCP Gateway & Registry - Project Overview

## Purpose
The MCP Gateway & Registry is a unified, enterprise-ready platform that centralizes access to both MCP Servers and AI Agents using the Model Context Protocol (MCP). It serves three core functions:

1. **Unified MCP Server Gateway** - Centralized access point for multiple MCP servers
2. **MCP Servers Registry** - Register, discover, and manage access to MCP servers with unified governance
3. **Agent Registry & A2A Communication Hub** - Agent registration, discovery, governance, and direct agent-to-agent communication through the A2A (Agent-to-Agent) Protocol

## Key Features
- OAuth 2.0/3.0 authentication (Keycloak, Amazon Cognito, Microsoft Entra ID)
- AI coding assistant integration (VS Code, Cursor, Claude Code, Cline)
- Dynamic tool discovery with semantic search
- Security scanning for MCP servers and A2A agents (Cisco AI Defense)
- Federation with external registries (Anthropic MCP Registry, Workday ASOR)
- Real-time metrics and observability (Grafana, OpenTelemetry)
- Multi-tenant access control with fine-grained permissions

## Tech Stack

### Frontend
- **Framework**: React 19.2, TypeScript 5.9
- **Build Tool**: Vite 6.0 (migrated from Create React App)
- **CSS**: Tailwind CSS 4.1
- **Router**: React Router 7.12
- **Node.js**: 18+ required for building

### Backend
- **Framework**: FastAPI
- **Package Manager**: uv with pyproject.toml
- **Python Version**: 3.11+ (requires-python = ">=3.11,<3.14")

### Database & Search
- **Database**: MongoDB Community Edition (local dev) / Amazon DocumentDB (production)
- **Vector Search**:
  - MongoDB CE: Application-level cosine similarity
  - DocumentDB: Native HNSW vector indexes (production)
  - File backend (deprecated): FAISS indexes
- **Embeddings**: sentence-transformers (all-MiniLM-L6-v2), LiteLLM (cloud providers)

### Authentication
- **Providers**: Keycloak, Amazon Cognito, Microsoft Entra ID
- **Protocol**: OAuth 2.0/OIDC

### Infrastructure
- **Container**: Docker/Podman
- **IaC**: Terraform, AWS ECS Fargate
- **AI/LLM**: LangChain, Anthropic Claude, Amazon Bedrock
- **Testing**: pytest with pytest-asyncio, pytest-cov, pytest-xdist

## Project Structure
```
mcp-registry-gateway/
├── registry/             # Main application code
│   ├── api/              # API endpoints
│   ├── auth/             # Authentication modules
│   ├── config/           # Configuration management
│   ├── core/             # Core infrastructure
│   ├── embeddings/       # Embedding providers
│   ├── health/           # Health monitoring
│   ├── metrics/          # Metrics collection
│   ├── repositories/     # Data access layer (MongoDB/DocumentDB)
│   ├── schemas/          # Pydantic models
│   ├── search/           # Semantic search
│   ├── servers/          # MCP server management
│   ├── services/         # Business logic
│   ├── static/           # Static assets (logos, branding)
│   ├── templates/        # Jinja2 templates
│   └── utils/            # Utilities
├── tests/                # Test suite
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── fixtures/         # Test fixtures
├── agents/               # A2A agent implementations
├── auth_server/          # Authentication server
├── cli/                  # CLI tools
├── config/               # Configuration files
├── credentials-provider/ # OAuth credential management
├── docker/               # Docker configurations
├── docs/                 # Documentation
├── frontend/             # Web UI frontend (React 19, Vite 6, Tailwind 4)
├── keycloak/             # Keycloak setup
├── metrics-service/      # Metrics service
├── scripts/              # Build and utility scripts
├── servers/              # FastMCP server implementations
│   ├── mcpgw/            # MCPGateway - Registry API tools
│   ├── fininfo/          # Financial information tools
│   ├── realserverfaketools/ # Test server with mock tools
│   ├── currenttime/      # Simple time server
│   └── example-server/   # Template for new servers
└── terraform/            # Infrastructure as Code
```

## FastMCP Servers

The `servers/` directory contains FastMCP-based MCP server implementations:

| Server | Description | Port |
|--------|-------------|------|
| `mcpgw` | Provides tools to interact with MCP Gateway Registry API | 9001 |
| `fininfo` | Financial information and stock data tools | 9002 |
| `realserverfaketools` | Test server with fake/mock tools for testing | 9003 |
| `currenttime` | Simple server returning current time | 9004 |

### Server Features (v2.0.6+)
- Custom root endpoint (`/`) with server info JSON
- Custom favicon endpoint (`/favicon.ico`)
- MCP protocol at `/mcp` or `/sse` endpoints
- Health checks and streaming support
