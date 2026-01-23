# MCP Gateway & Registry - Project Index

## Quick Navigation

| Section | Description |
|---------|-------------|
| [Architecture Overview](#architecture-overview) | Layered architecture and design patterns |
| [Frontend](#frontend) | React 19, Vite 6, Tailwind 4 web UI |
| [Core Modules](#core-modules) | Main application components |
| [API Layer](#api-layer) | REST API endpoints |
| [Service Layer](#service-layer) | Business logic |
| [Repository Layer](#repository-layer) | Data access abstraction |
| [Authentication](#authentication) | Auth dependencies and IAM |
| [Testing](#testing) | Test structure and patterns |

---

## Architecture Overview

### Layered Architecture (MANDATORY)
```
API Routes → Services → Repositories → Storage Backends
     ↓            ↓           ↓              ↓
  registry/   registry/   registry/     documentdb/
    api/      services/  repositories/    file/
```

### Key Design Patterns
- **Factory Pattern**: Repository instantiation via `registry/repositories/factory.py`
- **Repository Pattern**: Abstract data access via `registry/repositories/interfaces.py`
- **Service Layer**: Business logic separation in `registry/services/`
- **Dependency Injection**: FastAPI dependencies in `registry/auth/dependencies.py`

---

## Frontend

The web UI is built with modern frontend technologies (upgraded January 2026).

### Technology Stack
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.2.3 | UI framework |
| Vite | 6.0.0 | Build tool (migrated from CRA) |
| Tailwind CSS | 4.1.18 | Styling framework |
| TypeScript | 5.9.3 | Type safety |
| React Router | 7.12.0 | Client-side routing |
| Vitest | 4.0.18 | Testing framework |

### Directory Structure (`frontend/`)
| Path | Purpose |
|------|---------|
| `package.json` | Dependencies and scripts |
| `vite.config.ts` | Vite build configuration |
| `tailwind.config.js` | Tailwind CSS configuration |
| `tsconfig.json` | TypeScript configuration |
| `src/` | React application source code |
| `src/components/` | Reusable UI components |
| `src/pages/` | Page components |
| `src/hooks/` | Custom React hooks |
| `src/utils/` | Utility functions |
| `dist/` | Production build output |

### Build Commands
```bash
# Development server
cd frontend && npm run dev

# Production build
cd frontend && npm run build

# Preview production build
cd frontend && npm run preview

# Run tests (Vitest)
cd frontend && npm test

# Watch mode
cd frontend && npm run test:watch

# Coverage
cd frontend && npm run test:coverage
```

### Integration with Registry
- Frontend build output (`dist/`) served by FastAPI
- Static assets in `dist/assets/` (Vite convention)
- API calls to registry backend at same origin
- Authentication via session cookies

---

## Core Modules

### Entry Point
| File | Purpose |
|------|---------|
| `registry/main.py` | FastAPI application, routing, OpenAPI setup |

**Key Functions:**
- `setup_logging()` - Configure application logging
- `lifespan()` - Application startup/shutdown lifecycle
- `custom_openapi()` - OpenAPI schema customization

### Configuration
| File | Purpose |
|------|---------|
| `registry/core/config.py` | Settings, paths, environment configuration |
| `registry/constants.py` | Application constants |

**Key Classes:**
- `Settings` - Pydantic settings with all configuration
- `EmbeddingConfig` - Embedding model configuration

### Schemas (Pydantic Models)
| File | Purpose |
|------|---------|
| `registry/schemas/agent_models.py` | Agent card, skills, security schemes |
| `registry/schemas/security.py` | Security scan results |
| `registry/schemas/federation_schema.py` | Federation configuration |
| `registry/schemas/anthropic_schema.py` | Anthropic API compatibility |
| `registry/schemas/management.py` | IAM management schemas |

**Key Models:**
- `AgentCard` - A2A agent registration
- `Skill` - Agent capability definition
- `SecurityScheme` - Auth configuration
- `AgentRegistrationRequest` - Registration payload

---

## API Layer

### Route Files
| File | Prefix | Purpose |
|------|--------|---------|
| `registry/api/server_routes.py` | `/` | MCP server management |
| `registry/api/agent_routes.py` | `/api/agents` | A2A agent management |
| `registry/api/search_routes.py` | `/api/search` | Semantic search |
| `registry/api/management_routes.py` | `/api/management` | IAM user/group management |
| `registry/api/federation_routes.py` | `/api/federation` | Federation sync |
| `registry/api/wellknown_routes.py` | `/.well-known` | Discovery endpoints |
| `registry/api/registry_routes.py` | `/v0.1` | Anthropic API compatibility |

### Server Routes (`/api`)
| Endpoint | Method | Function |
|----------|--------|----------|
| `/` | GET | `read_root` - Dashboard |
| `/api/servers` | GET | `get_servers` - List servers HTML |
| `/api/servers/register` | POST | `register_server` |
| `/api/toggle/{path}` | POST | `toggle_service` |
| `/api/servers/remove` | POST | `remove_server` |
| `/api/servers/{path}/rating` | POST | `rate_server` |
| `/api/servers/{path}/security-scan` | GET | `get_server_security_scan` |
| `/api/servers/groups/create` | POST | `create_group` |
| `/api/servers/groups/delete` | POST | `delete_group` |

### Agent Routes (`/api/agents`)
| Endpoint | Method | Function |
|----------|--------|----------|
| `/register` | POST | `register_agent` |
| `/` | GET | `list_agents` |
| `/{path}` | GET | `get_agent` |
| `/{path}` | PUT | `update_agent` |
| `/{path}` | DELETE | `delete_agent` |
| `/{path}/toggle` | POST | `toggle_agent` |
| `/{path}/rating` | POST | `rate_agent` |
| `/discover/semantic` | POST | `discover_agents_semantic` |
| `/{path}/security-scan` | GET | `get_agent_security_scan` |

### Search Routes (`/api/search`)
| Endpoint | Method | Function |
|----------|--------|----------|
| `/semantic` | POST | `semantic_search` |

**Request/Response Models:**
- `SemanticSearchRequest` - Query with filters
- `SemanticSearchResponse` - Servers, tools, agents results

### Management Routes (`/api/management`)
| Endpoint | Method | Function |
|----------|--------|----------|
| `/users` | GET | `management_list_users` |
| `/users/m2m` | POST | `management_create_m2m_user` |
| `/users/human` | POST | `management_create_human_user` |
| `/users/{username}` | DELETE | `management_delete_user` |
| `/groups` | GET/POST | Group operations |
| `/groups/{name}` | DELETE | `management_delete_group` |

---

## Service Layer

### Services
| File | Class/Functions | Purpose |
|------|-----------------|---------|
| `registry/services/server_service.py` | `ServerService` | Server lifecycle management |
| `registry/services/agent_service.py` | `AgentService` | Agent lifecycle management |
| `registry/services/federation_service.py` | `FederationService` | External registry sync |
| `registry/services/rating_service.py` | Rating functions | 5-star rating system |
| `registry/services/security_scanner.py` | `SecurityScannerService` | MCP server scanning |
| `registry/services/agent_scanner.py` | `AgentScannerService` | A2A agent scanning |
| `registry/services/scope_service.py` | Scope management | Access control |
| `registry/services/transform_service.py` | Data transformation | Server data conversion |

### ServerService Methods
- `register_server()` - Register new MCP server
- `update_server()` - Update server metadata
- `toggle_service()` - Enable/disable server
- `get_all_servers()` - List all servers
- `update_rating()` - Update server rating
- `remove_server()` - Delete server

### AgentService Methods
- `register_agent()` - Register A2A agent
- `get_agent()` / `list_agents()` - Retrieve agents
- `update_agent()` - Modify agent
- `toggle_agent()` / `enable_agent()` / `disable_agent()` - State management
- `update_rating()` - Agent rating
- `delete_agent()` - Remove agent

### Federation Clients
| File | Class | Purpose |
|------|-------|---------|
| `registry/services/federation/anthropic_client.py` | `AnthropicClient` | Anthropic MCP Registry |
| `registry/services/federation/asor_client.py` | `ASORClient` | Workday ASOR |
| `registry/services/federation/base_client.py` | `BaseFederationClient` | Abstract base |

---

## Repository Layer

### Factory Functions (`registry/repositories/factory.py`)
```python
get_server_repository() → ServerRepositoryBase
get_agent_repository() → AgentRepositoryBase
get_scope_repository() → ScopeRepositoryBase
get_security_scan_repository() → SecurityScanRepositoryBase
get_search_repository() → SearchRepositoryBase
get_federation_config_repository() → FederationConfigRepositoryBase
reset_repositories() → None  # For testing
```

### Abstract Interfaces (`registry/repositories/interfaces.py`)
| Interface | Methods |
|-----------|---------|
| `ServerRepositoryBase` | get, list_all, create, update, delete, get_state, set_state, load_all |
| `AgentRepositoryBase` | get, list_all, create, update, delete, get_state, set_state, load_all |
| `ScopeRepositoryBase` | get_ui_scopes, get_group_mappings, create_group, delete_group, add_server_to_ui_scopes, ... |
| `SecurityScanRepositoryBase` | get, list_all, create, get_latest, query_by_status, load_all |
| `SearchRepositoryBase` | initialize, index_server, index_agent, remove_entity, search |
| `FederationConfigRepositoryBase` | get_config, save_config, delete_config, list_configs |

### DocumentDB Implementation (`registry/repositories/documentdb/`)
| File | Class | Collections |
|------|-------|-------------|
| `server_repository.py` | `DocumentDBServerRepository` | servers, server_state |
| `agent_repository.py` | `DocumentDBAgentRepository` | agents, agent_state |
| `scope_repository.py` | `DocumentDBScopeRepository` | scopes |
| `search_repository.py` | `DocumentDBSearchRepository` | search_index |
| `security_scan_repository.py` | `DocumentDBSecurityScanRepository` | security_scans |
| `federation_config_repository.py` | `DocumentDBFederationConfigRepository` | federation_config |
| `client.py` | `DocumentDBClient` | Connection management |

### File Implementation (DEPRECATED) (`registry/repositories/file/`)
- Same interface, JSON file-based storage
- **DO NOT USE for new development**

---

## Authentication

### Dependencies (`registry/auth/dependencies.py`)
| Function | Purpose |
|----------|---------|
| `get_current_user()` | Extract user from session/token |
| `api_auth()` | API endpoint authentication |
| `web_auth()` | Web UI authentication |
| `enhanced_auth()` | Combined auth modes |
| `nginx_proxied_auth()` | Nginx auth subrequest |
| `ui_permission_required()` | Decorator for UI permissions |
| `get_accessible_services_for_user()` | FGAC filtering |
| `get_accessible_agents_for_user()` | Agent FGAC |
| `user_can_access_server()` | Server access check |

### IAM Managers (`registry/utils/iam_manager.py`)
| Class | Provider |
|-------|----------|
| `IAMManager` | Abstract base |
| `KeycloakIAMManager` | Keycloak implementation |
| `EntraIAMManager` | Microsoft Entra ID |

**Factory:** `get_iam_manager()` - Returns provider based on `AUTH_PROVIDER`

### Scopes Management (`registry/utils/scopes_manager.py`)
- Scope CRUD operations
- Group-to-scope mappings
- Server permission management

---

## Embeddings

### Client (`registry/embeddings/client.py`)
| Class | Provider |
|-------|----------|
| `EmbeddingsClient` | Abstract base |
| `SentenceTransformersClient` | Local models (all-MiniLM-L6-v2) |
| `LiteLLMClient` | Cloud providers (OpenAI, Bedrock, Cohere) |

**Factory:** `create_embeddings_client()` - Based on `EMBEDDINGS_PROVIDER`

---

## Testing

### Structure
```
tests/
├── unit/                    # Isolated component tests
│   ├── api/                 # Route tests
│   ├── services/            # Service layer tests
│   ├── repositories/        # Repository tests
│   ├── auth/                # Auth tests
│   ├── core/                # Config, nginx tests
│   ├── embeddings/          # Embedding client tests
│   ├── health/              # Health service tests
│   └── search/              # Search tests
├── integration/             # Multi-component tests
│   ├── test_server_lifecycle.py
│   ├── test_search_integration.py
│   └── test_mongodb_connectivity.py
├── auth_server/             # Auth server tests
│   ├── unit/providers/      # Provider tests
│   └── fixtures/            # Mock providers
├── fixtures/                # Shared test data
│   ├── factories.py         # Factory Boy factories
│   ├── helpers.py           # Test utilities
│   ├── constants.py         # Test constants
│   └── mocks/               # Mock implementations
└── conftest.py              # Global fixtures
```

### Running Tests
```bash
# Full suite (parallel)
uv run pytest tests/ -n 8

# By category
uv run pytest tests/unit/ -n 8
uv run pytest tests/integration/

# With coverage
uv run pytest tests/ -n 8 --cov=registry --cov-report=term-missing
```

---

## Health Monitoring

### Service (`registry/health/service.py`)
- Server health checks
- Status tracking
- WebSocket updates

### Routes (`registry/health/routes.py`)
- Health endpoints
- Status API

---

## Metrics

### Components (`registry/metrics/`)
| File | Purpose |
|------|---------|
| `client.py` | Metrics client |
| `middleware.py` | Request metrics middleware |
| `utils.py` | Metric utilities |

---

## File Locations Summary

| Category | Location |
|----------|----------|
| FastAPI App | `registry/main.py` |
| Configuration | `registry/core/config.py` |
| API Routes | `registry/api/*.py` |
| Services | `registry/services/*.py` |
| Repositories | `registry/repositories/` |
| Pydantic Models | `registry/schemas/*.py` |
| Auth Logic | `registry/auth/` |
| Embeddings | `registry/embeddings/` |
| Templates | `registry/templates/` |
| Static Assets (logos) | `registry/static/` |
| Frontend Source | `frontend/src/` |
| Frontend Build | `frontend/dist/` |
| Tests | `tests/` |
