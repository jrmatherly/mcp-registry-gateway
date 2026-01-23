# Multi-Tenant Data Isolation Architecture

**Version:** 1.0
**Last Updated:** 2026-01-23

## Quick Links

- [Authentication Design](./authentication-design.md) - Authentication and authorization system
- [IdP Provider Support](./idp-provider-support.md) - Multi-provider identity architecture
- [Cookie Security Design](./cookie-security-design.md) - Session security patterns

## Overview

This document describes how the MCP Gateway Registry implements multi-tenant data isolation in a shared infrastructure model. The architecture uses a **proxy-based credential federation pattern** where the gateway authenticates individual users while using centralized service account credentials for upstream MCP server access.

## Architecture Pattern: Proxy-Based Credential Federation

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│    User A                    User B                    User C               │
│    (JWT Token A)             (JWT Token B)             (JWT Token C)        │
│         │                         │                         │               │
└─────────┼─────────────────────────┼─────────────────────────┼───────────────┘
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MCP GATEWAY REGISTRY                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐          │
│  │  NGINX Reverse  │    │   Auth Server   │    │  FastAPI        │          │
│  │     Proxy       │───▶│   /validate     │    │  Application    │          │
│  └────────┬────────┘    └────────┬────────┘    └─────────────────┘          │
│           │                      │                                          │
│           │  auth_request_set:   │                                          │
│           │  ├─ X-User           │                                          │
│           │  ├─ X-Username       │                                          │
│           │  ├─ X-Scopes         │                                          │
│           │  └─ X-Auth-Method    │                                          │
│           │                      │                                          │
│           ▼                      ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                    EGRESS PROXY LAYER                           │        │
│  │                                                                 │        │
│  │  Outbound headers to upstream MCP servers:                      │        │
│  │  ┌─────────────────────────────────────────────────────────┐    │        │
│  │  │ Authorization: Bearer <GATEWAY_SERVICE_ACCOUNT_TOKEN>   │    │        │
│  │  │ X-User: user_a@company.com                              │    │        │
│  │  │ X-Username: user_a@company.com                          │    │        │
│  │  │ X-Scopes: jira-server/* slack-server/read               │    │        │
│  │  │ X-Auth-Method: keycloak                                 │    │        │
│  │  └─────────────────────────────────────────────────────────┘    │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                             │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UPSTREAM MCP SERVERS                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ Jira Server  │    │ Slack Server │    │ GitHub Server│                   │
│  │              │    │              │    │              │                   │
│  │ Receives:    │    │ Receives:    │    │ Receives:    │                   │
│  │ X-User header│    │ X-User header│    │ X-User header│                   │
│  │              │    │              │    │              │                   │
│  │ Filters data │    │ Filters data │    │ Filters data │                   │
│  │ by user      │    │ by user      │    │ by user      │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Dual-Layer Authentication Model

The gateway implements a dual-layer authentication model that separates **ingress authentication** (per-user) from **egress authentication** (service account):

### Layer 1: Ingress Authentication (Per-User)

| Aspect | Description |
|--------|-------------|
| **Purpose** | Identify and authenticate individual users |
| **Location** | Gateway entry point (nginx + auth-server) |
| **Mechanism** | JWT tokens validated against IdP (Keycloak, Entra ID, Cognito) |
| **Credentials** | User-specific JWT tokens |
| **Result** | User identity extracted and propagated via headers |

### Layer 2: Egress Authentication (Service Account)

| Aspect | Description |
|--------|-------------|
| **Purpose** | Authenticate gateway to upstream MCP servers |
| **Location** | Gateway egress (nginx proxy_pass) |
| **Mechanism** | Service account credentials (OAuth2 Client Credentials, API keys) |
| **Credentials** | Centralized gateway credentials (from `.env` or secrets manager) |
| **Result** | Gateway authorized to call upstream APIs |

## User Identity Propagation

### HTTP Headers Forwarded to Upstream Servers

The gateway extracts user identity during authentication and forwards it to upstream MCP servers via HTTP headers:

```nginx
# From nginx_service.py - common_settings for MCP server location blocks
# Forward auth server response headers to backend
proxy_set_header X-User $auth_user;
proxy_set_header X-Username $auth_username;
proxy_set_header X-Client-Id-Auth $auth_client_id;
proxy_set_header X-Scopes $auth_scopes;
proxy_set_header X-Auth-Method $auth_method;
proxy_set_header X-Server-Name $auth_server_name;
proxy_set_header X-Tool-Name $auth_tool_name;
```

### Header Definitions

| Header | Source | Purpose |
|--------|--------|---------|
| `X-User` | JWT `sub` or `username` claim | Primary user identifier |
| `X-Username` | JWT `preferred_username` or `email` | Human-readable username |
| `X-Client-Id-Auth` | JWT `client_id` claim | OAuth2 client identifier |
| `X-Scopes` | Mapped from IdP groups | Space-separated list of granted scopes |
| `X-Auth-Method` | Auth server detection | Authentication method used (keycloak, entra, cognito) |
| `X-Server-Name` | URL path parsing | Target MCP server name |
| `X-Tool-Name` | JSON-RPC payload parsing | Requested tool name |

### Auth Server Header Generation

The auth server (`auth_server/server.py`) generates these headers after successful token validation:

```python
# Create JSON response with headers that nginx can use
response = JSONResponse(content=response_data, status_code=200)

# Set headers for nginx auth_request_set directives
response.headers["X-User"] = validation_result.get("username") or ""
response.headers["X-Username"] = validation_result.get("username") or ""
response.headers["X-Client-Id"] = validation_result.get("client_id") or ""
response.headers["X-Scopes"] = " ".join(user_scopes)
response.headers["X-Auth-Method"] = validation_result.get("method") or ""
response.headers["X-Server-Name"] = server_name or ""
response.headers["X-Tool-Name"] = tool_name or ""
```

## Separation of Concerns

The architecture follows a clear separation of responsibilities between the gateway and upstream MCP servers:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        GATEWAY RESPONSIBILITIES                              │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Authentication                    Authorization                             │
│  ─────────────                     ─────────────                             │
│  • Validate JWT tokens             • Check user scopes against server access │
│  • Verify token signatures         • Enforce tool-level permissions          │
│  • Extract user identity           • Map IdP groups to scopes                │
│  • Support multiple IdPs           • Deny access if no matching scope        │
│                                                                              │
│  Routing                           Identity Propagation                      │
│  ───────                           ────────────────────                      │
│  • Route requests to MCP servers   • Forward X-User headers                  │
│  • Handle transport protocols      • Include scopes in headers               │
│  • Manage connection pooling       • Preserve audit context                  │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    UPSTREAM MCP SERVER RESPONSIBILITIES                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Data Storage                      Per-User Data Isolation                  │
│  ────────────                      ───────────────────────                  │
│  • Store business data             • Read X-User header from request        │
│  • Manage data schemas             • Filter queries by user identifier      │
│  • Handle data persistence         • Enforce row-level security             │
│                                    • Implement data ownership model         │
│                                                                             │
│  Business Logic                    Audit Logging                            │
│  ──────────────                    ─────────────                            │
│  • Implement domain operations     • Log operations with user context       │
│  • Apply business rules            • Track data access patterns             │
│  • Manage workflows                • Support compliance requirements        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Isolation Patterns

### Pattern 1: User-Scoped Data Queries

Upstream MCP servers should filter data based on the `X-User` header:

```python
# Example: Upstream MCP server implementation
@app.post("/tools/call")
async def call_tool(request: Request, body: dict):
    # Extract user identity from gateway-forwarded headers
    user_id = request.headers.get("X-User")
    username = request.headers.get("X-Username")

    tool_name = body.get("params", {}).get("name")

    if tool_name == "list_tasks":
        # Filter tasks by the authenticated user
        tasks = await db.tasks.find({"owner": user_id}).to_list()
        return {"tasks": tasks}

    elif tool_name == "create_task":
        # Associate new data with the authenticated user
        task_data = body.get("params", {}).get("arguments", {})
        task_data["owner"] = user_id
        task_data["created_by"] = username
        await db.tasks.insert_one(task_data)
        return {"status": "created"}
```

### Pattern 2: Shared Resources with User Context

Some MCP servers provide shared resources but should still log user context:

```python
# Example: Weather MCP server (shared data, user-aware logging)
@app.post("/tools/call")
async def call_tool(request: Request, body: dict):
    user_id = request.headers.get("X-User", "anonymous")

    tool_name = body.get("params", {}).get("name")

    if tool_name == "get_weather":
        location = body.get("params", {}).get("arguments", {}).get("location")

        # Log the request with user context for audit
        logger.info(f"Weather request for {location} by user {user_id}")

        # Return shared data (weather is the same for all users)
        weather_data = await weather_api.get_current(location)
        return weather_data
```

### Pattern 3: External API Delegation

For MCP servers that wrap external APIs with their own user systems:

```python
# Example: Jira MCP server with delegated user context
@app.post("/tools/call")
async def call_tool(request: Request, body: dict):
    gateway_user = request.headers.get("X-User")

    # Map gateway user to Jira user (may be different identity systems)
    jira_user = await user_mapping_service.get_jira_user(gateway_user)

    tool_name = body.get("params", {}).get("name")

    if tool_name == "list_issues":
        # Use Jira's API with impersonation or filtered query
        issues = await jira_client.search_issues(
            jql=f"assignee = {jira_user}",
            # Gateway uses service account, but filters by user
        )
        return {"issues": issues}
```

## Security Considerations

### Why Shared Gateway Credentials Are Acceptable

| Concern | Mitigation |
|---------|------------|
| Single credential for all users | User identity still propagated via headers; upstream servers filter by user |
| Credential compromise | Gateway credentials have limited scope; can be rotated without affecting users |
| Audit trail | User identity headers provide full audit context |
| Blast radius | Scope-based authorization limits which servers each user can access |

### Why This Pattern Is Industry Standard

This pattern is used by:

- **AWS API Gateway**: Authenticates users, uses IAM roles for backend access
- **Kong Gateway**: JWT validation at edge, service mesh credentials internally
- **Istio Service Mesh**: mTLS between services, user identity via headers
- **OAuth2 Proxy / Pomerium**: User authentication, identity header forwarding

### Security Requirements for Upstream MCP Servers

Upstream MCP servers **MUST**:

1. **Read the `X-User` header** to identify the requesting user
2. **Filter data queries** by user identifier when returning user-specific data
3. **Associate new data** with the user identifier for ownership tracking
4. **Log operations** with user context for audit compliance
5. **Trust the gateway** as the source of truth for user identity

Upstream MCP servers **MUST NOT**:

1. Accept requests without the `X-User` header (unless intentionally public)
2. Trust client-provided user identity that bypasses the gateway
3. Expose data belonging to other users

## Configuration

### Gateway Service Account Credentials

Gateway credentials for upstream MCP servers are configured in `.env`:

```bash
# AUTO-MANAGED VARIABLES (Do Not Edit)
# The following variables are automatically managed by system scripts.
# They are populated by OAuth credential flows in credentials-provider/

# ATLASSIAN_AUTH_TOKEN=<auto-populated by credentials-provider OAuth flow>
# SRE_GATEWAY_AUTH_TOKEN=<auto-populated by credentials-provider OAuth flow>
```

These are referenced in server configuration files:

```json
{
  "name": "jira-server",
  "url": "https://your-instance.atlassian.net/mcp",
  "headers": [
    {
      "Authorization": "Bearer $ATLASSIAN_AUTH_TOKEN"
    }
  ]
}
```

### User Scope Configuration

User access to MCP servers is controlled via scope mappings:

```json
{
  "group_name": "engineering-team",
  "server_access": [
    {
      "server_name": "jira-server",
      "methods": ["tools/list", "tools/call"],
      "tools": ["list_issues", "create_issue", "update_issue"]
    },
    {
      "server_name": "slack-server",
      "methods": ["tools/list", "tools/call"],
      "tools": ["*"]
    }
  ]
}
```

## Validation and Testing

### Verify Header Propagation

```bash
# Test that user headers are forwarded to upstream
curl -v -X POST "https://gateway.example.com/jira-server/tools/call" \
  -H "Authorization: Bearer <user_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"method": "tools/call", "params": {"name": "list_issues"}}'

# Check upstream server logs for:
# - X-User header present
# - X-Username header present
# - X-Scopes header present
```

### Verify Data Isolation

```bash
# As User A: Create a task
curl -X POST "https://gateway.example.com/tasks-server/tools/call" \
  -H "Authorization: Bearer <user_a_token>" \
  -d '{"method": "tools/call", "params": {"name": "create_task", "arguments": {"title": "User A Task"}}}'

# As User B: List tasks (should NOT see User A's task)
curl -X POST "https://gateway.example.com/tasks-server/tools/call" \
  -H "Authorization: Bearer <user_b_token>" \
  -d '{"method": "tools/call", "params": {"name": "list_tasks"}}'
```

## Related Documentation

- [Authentication Design](./authentication-design.md) - JWT validation and IdP integration
- [Cookie Security Design](./cookie-security-design.md) - Session-based authentication
- [IdP Provider Support](./idp-provider-support.md) - Multi-provider architecture
- [Scopes Management](../scopes-mgmt.md) - Scope configuration and group mappings
