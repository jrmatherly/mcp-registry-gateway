# MCP Gateway & Registry - API Reference

## Authentication

All API endpoints require authentication via one of:
- **Session Cookie**: Web UI authentication via `/login`
- **JWT Bearer Token**: `Authorization: Bearer <token>` header
- **X-Authorization Header**: For gateway authentication

---

## Server Management API

**Note**: Server routes are mounted at `/api/` prefix (not `/api/v2/`).

### List Servers
```
GET /api/servers
```
**Response:** HTML dashboard (use JSON endpoints below for programmatic access)

### Get Servers (JSON API)
```
GET /api/servers/list
```
**Response:** Array of server objects with metadata

### Register Server
```
POST /api/servers/register
Content-Type: application/json

{
  "name": "Server Name",
  "description": "Server description",
  "path": "/server-path",
  "proxy_pass_url": "http://localhost:8001/sse",
  "tags": ["tag1", "tag2"],
  "is_python": true,
  "license": "MIT"
}
```

### Toggle Server
```
POST /api/toggle/{service_path}
# OR via internal API:
POST /api/servers/toggle
Content-Type: application/json

{
  "path": "/server-path"
}
```

### Remove Server
```
POST /api/servers/remove
Content-Type: application/json

{
  "path": "/server-path"
}
```

### Rate Server
```
POST /api/servers/{server_path}/rating
Content-Type: application/json

{
  "rating": 5,
  "username": "user@example.com"
}
```

### Get Security Scan
```
GET /api/servers/{server_path}/security-scan
```

### Rescan Server
```
POST /api/servers/{server_path}/rescan
```

### Refresh Server (Reload Tools)
```
POST /api/refresh/{service_path}
```

---

## Agent Management API

### Register Agent
```
POST /api/agents/register
Content-Type: application/json

{
  "name": "Agent Name",
  "description": "Agent description",
  "path": "/agent-path",
  "url": "https://agent.example.com",
  "protocol_version": "1.0",
  "skills": [
    {
      "id": "skill-1",
      "name": "Skill Name",
      "description": "Skill description",
      "parameters": {"param1": {"type": "string"}}
    }
  ],
  "security": [{"type": "bearer"}],
  "tags": ["ai", "automation"],
  "visibility": "public",
  "trust_level": "verified"
}
```

### List Agents
```
GET /api/agents
```
**Query Parameters:**
- `visibility`: Filter by visibility (public/private)
- `trust_level`: Filter by trust level

### Get Agent
```
GET /api/agents/{agent_path}
```

### Update Agent
```
PUT /api/agents/{agent_path}
Content-Type: application/json

{
  "description": "Updated description",
  "tags": ["updated", "tags"]
}
```

### Delete Agent
```
DELETE /api/agents/{agent_path}
```

### Toggle Agent
```
POST /api/agents/{agent_path}/toggle
```

### Rate Agent
```
POST /api/agents/{agent_path}/rating
Content-Type: application/json

{
  "rating": 4,
  "username": "user@example.com"
}
```

### Discover Agents (Semantic)
```
POST /api/agents/discover/semantic?query=book+flights&max_results=5
```

### Get Agent Security Scan
```
GET /api/agents/{agent_path}/security-scan
```

---

## Search API

### Semantic Search
```
POST /api/search/semantic
Content-Type: application/json

{
  "query": "natural language query",
  "entity_types": ["server", "tool", "agent"],
  "max_results": 10,
  "min_score": 0.5
}
```

**Response:**
```json
{
  "servers": [
    {
      "path": "/server-path",
      "name": "Server Name",
      "score": 0.89
    }
  ],
  "tools": [
    {
      "server_path": "/server-path",
      "tool_name": "tool_name",
      "score": 0.85
    }
  ],
  "agents": [
    {
      "path": "/agent-path",
      "name": "Agent Name",
      "score": 0.82
    }
  ]
}
```

---

## Group Management API

### List Groups
```
GET /api/internal/list-groups
```

### Create Group
```
POST /api/servers/groups/create
Content-Type: application/json

{
  "group_name": "mcp-servers-finance",
  "scope_suffix": "read"
}
```

### Delete Group
```
POST /api/servers/groups/delete
Content-Type: application/json

{
  "group_name": "mcp-servers-finance"
}
```

### Add Server to Groups
```
POST /api/servers/groups/add
Content-Type: application/json

{
  "path": "/server-path",
  "groups": ["group1", "group2"]
}
```

### Remove Server from Groups
```
POST /api/servers/groups/remove
Content-Type: application/json

{
  "path": "/server-path",
  "groups": ["group1"]
}
```

---

## IAM Management API

### List Users
```
GET /api/management/users
```
**Requires:** `mcp-registry-admin` scope

### Create M2M User (Service Account)
```
POST /api/management/users/m2m
Content-Type: application/json

{
  "username": "service-account-name",
  "groups": ["mcp-servers-unrestricted"]
}
```

### Create Human User
```
POST /api/management/users/human
Content-Type: application/json

{
  "username": "john.doe",
  "email": "john.doe@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "groups": ["mcp-registry-user"]
}
```

### Delete User
```
DELETE /api/management/users/{username}
```

### List Groups (IAM)
```
GET /api/management/groups
```

### Create Group (IAM)
```
POST /api/management/groups
Content-Type: application/json

{
  "name": "group-name",
  "description": "Group description"
}
```

### Delete Group (IAM)
```
DELETE /api/management/groups/{group_name}
```

---

## Federation API

### Sync Federation
```
POST /api/federation/sync
```

### Get Federation Status
```
GET /api/federation/status
```

---

## Anthropic-Compatible API (v0.1)

### List Servers
```
GET /v0.1/servers?limit=10&offset=0
```

### Get Server Versions
```
GET /v0.1/servers/{server_name}/versions
```

### Get Version Details
```
GET /v0.1/servers/{server_name}/versions/{version}
```

---

## Well-Known Endpoints

### MCP Discovery
```
GET /.well-known/mcp.json
```

### Agent Discovery
```
GET /.well-known/agent.json
```

---

## Health Endpoints

### Health Check
```
GET /health
```

### Version
```
GET /version
```

---

## Error Responses

All endpoints return standard error responses:

```json
{
  "detail": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `204` - No Content (successful delete)
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error
