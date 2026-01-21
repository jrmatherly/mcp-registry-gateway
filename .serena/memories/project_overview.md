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
- **Backend Framework**: FastAPI
- **Package Manager**: uv with pyproject.toml
- **Python Version**: 3.11+ (requires-python = ">=3.11,<3.14")
- **Database**: MongoDB Community Edition (local dev) / Amazon DocumentDB (production)
- **Authentication**: Keycloak, Amazon Cognito, Microsoft Entra ID
- **Search**: FAISS (vector), sentence-transformers, LiteLLM embeddings
- **AI/LLM**: LangChain, Anthropic Claude, Amazon Bedrock
- **Container**: Docker/Podman
- **Infrastructure**: Terraform, AWS ECS Fargate
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
│   ├── static/           # Static assets
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
├── frontend/             # Web UI frontend
├── keycloak/             # Keycloak setup
├── metrics-service/      # Metrics service
├── scripts/              # Build and utility scripts
├── servers/              # MCP server definitions
└── terraform/            # Infrastructure as Code
```
