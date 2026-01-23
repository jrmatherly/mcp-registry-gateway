# Environment Variables Reference

This document provides a comprehensive reference for all environment variables used to configure the MCP Gateway Registry.

## Quick Start

1. Copy the example configuration:

   ```bash
   cp .env.example .env
   ```

2. Generate required secrets (see [Secret Generation](#secret-generation))

3. Configure your authentication provider (Keycloak, Cognito, or Entra ID)

4. Start the services:

   ```bash
   docker compose up -d
   ```

---

## Table of Contents

- [Secret Generation](#secret-generation)
- [Registry Configuration](#registry-configuration)
- [Auth Server Configuration](#auth-server-configuration)
- [Authentication Providers](#authentication-providers)
  - [Keycloak](#keycloak-configuration)
  - [Amazon Cognito](#amazon-cognito-configuration)
  - [Microsoft Entra ID](#microsoft-entra-id-configuration)
  - [GitHub OAuth](#github-oauth-configuration)
  - [Google OAuth](#google-oauth-configuration)
- [Application Security](#application-security)
- [Session Configuration](#session-configuration)
- [AI/LLM Configuration](#aillm-configuration)
- [Security Scanning](#security-scanning-configuration)
- [Embeddings Configuration](#embeddings-configuration)
- [A2A Agent Security](#a2a-agent-security-scanning)
- [Container Registry](#container-registry-credentials)
- [Storage Backend](#storage-backend-configuration)
- [External Registry Tags](#external-registry-configuration)
- [Auto-Managed Variables](#auto-managed-variables)

---

## Secret Generation

### Generate All Secrets at Once

Run this script to generate all required secrets:

```bash
#!/bin/bash
echo "ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
echo "KEYCLOAK_ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
echo "KEYCLOAK_DB_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
echo "KEYCLOAK_CLIENT_SECRET=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)"
echo "KEYCLOAK_M2M_CLIENT_SECRET=$(openssl rand -base64 32 | tr -d '/+=' | head -c 32)"
echo "INITIAL_ADMIN_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
echo "INITIAL_USER_PASSWORD=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)"
echo "SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
```

### Individual Secret Commands

| Variable | Command | Output |
|----------|---------|--------|
| 32-char alphanumeric | `openssl rand -base64 24 \| tr -d '/+=' \| head -c 32` | `2x0jsA5fyZXfvsixpmnLqynzx3lD` |
| 64-char hex (SECRET_KEY) | `python3 -c "import secrets; print(secrets.token_hex(32))"` | `a1b2c3d4e5f6...` |

---

## Registry Configuration

Core settings for the MCP Gateway Registry service.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REGISTRY_URL` | Yes | `http://localhost` | Public URL where the registry is accessible. For production with HTTPS: `https://mcpgateway.mycorp.com` |
| `ADMIN_USER` | Yes | `admin` | Registry administrator username |
| `ADMIN_PASSWORD` | Yes | - | Registry administrator password. **Generate with:** `openssl rand -base64 24 \| tr -d '/+=' \| head -c 32` |

### Example

```bash
REGISTRY_URL=https://mcpgateway.example.com
ADMIN_USER=admin
ADMIN_PASSWORD=2x0jsA5fyZXfvsixpmnLqynzx3lDowG
```

---

## Auth Server Configuration

Settings for the internal authentication server.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTH_SERVER_URL` | Yes | `http://auth-server:8888` | Internal auth server URL (Docker network) |
| `AUTH_SERVER_EXTERNAL_URL` | Yes | `http://localhost:8888` | External auth server URL (browser redirects) |

### Example

```bash
# Local development
AUTH_SERVER_URL=http://auth-server:8888
AUTH_SERVER_EXTERNAL_URL=http://localhost:8888

# Production
AUTH_SERVER_URL=http://auth-server:8888
AUTH_SERVER_EXTERNAL_URL=https://mcpgateway.example.com
```

---

## Authentication Providers

Choose your authentication provider by setting `AUTH_PROVIDER`:

```bash
AUTH_PROVIDER=keycloak  # Options: keycloak, cognito, entra
```

### Keycloak Configuration

Full-featured open-source identity provider included in the Docker Compose setup.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTH_PROVIDER` | Yes | `keycloak` | Set to `keycloak` |
| `KEYCLOAK_URL` | Yes | `http://keycloak:8080` | Internal Keycloak URL (Docker network). **Do not change.** |
| `KEYCLOAK_EXTERNAL_URL` | Yes | `http://localhost:8080` | External Keycloak URL (browser redirects) |
| `KEYCLOAK_ADMIN_URL` | Yes | `http://localhost:8080` | Keycloak admin console URL |
| `KEYCLOAK_REALM` | Yes | `mcp-gateway` | Keycloak realm name |
| `KEYCLOAK_ADMIN` | Yes | `admin` | Keycloak admin username |
| `KEYCLOAK_ADMIN_PASSWORD` | Yes | - | Keycloak admin password. **Generate with:** `openssl rand -base64 24 \| tr -d '/+=' \| head -c 32` |
| `KEYCLOAK_DB_PASSWORD` | Yes | - | Keycloak database password. **Generate with:** `openssl rand -base64 24 \| tr -d '/+=' \| head -c 32` |
| `KEYCLOAK_CLIENT_ID` | Yes | `mcp-gateway-web` | OAuth client ID for web authentication |
| `KEYCLOAK_CLIENT_SECRET` | Yes | - | OAuth client secret. **Generate with:** `openssl rand -base64 32 \| tr -d '/+=' \| head -c 32` |
| `KEYCLOAK_M2M_CLIENT_ID` | Yes | `mcp-gateway-m2m` | OAuth client ID for machine-to-machine auth |
| `KEYCLOAK_M2M_CLIENT_SECRET` | Yes | - | M2M client secret. **Generate with:** `openssl rand -base64 32 \| tr -d '/+=' \| head -c 32` |
| `KEYCLOAK_ENABLED` | Yes | `true` | Enable Keycloak provider |
| `INITIAL_ADMIN_PASSWORD` | Yes | - | Initial admin user password. **Generate with:** `openssl rand -base64 24 \| tr -d '/+=' \| head -c 32` |
| `INITIAL_USER_PASSWORD` | Yes | - | Initial test user password. **Generate with:** `openssl rand -base64 24 \| tr -d '/+=' \| head -c 32` |

#### Keycloak Setup

After generating secrets, run the Keycloak initialization script:

```bash
./keycloak/setup/init-keycloak.sh
```

This script will output the generated client secrets. Update your `.env` file with these values.

---

### Amazon Cognito Configuration

AWS-managed identity service.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTH_PROVIDER` | Yes | - | Set to `cognito` |
| `AWS_REGION` | Yes | `us-east-1` | AWS region |
| `COGNITO_USER_POOL_ID` | Yes | - | Cognito User Pool ID. Format: `{region}_{random_string}` |
| `COGNITO_CLIENT_ID` | Yes | - | App Client ID from Cognito console |
| `COGNITO_CLIENT_SECRET` | Yes | - | App Client Secret from Cognito console |
| `COGNITO_ENABLED` | Yes | `false` | Enable Cognito provider |
| `COGNITO_DOMAIN` | No | - | Custom Cognito domain (optional) |

#### Where to Find Cognito Values

1. **User Pool ID**: AWS Console → Cognito → User Pools → General settings
2. **Client ID/Secret**: AWS Console → Cognito → User Pools → App Integration → App clients

See [Cognito Setup Guide](cognito.md) for detailed instructions.

---

### Microsoft Entra ID Configuration

Azure Active Directory identity provider.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AUTH_PROVIDER` | Yes | - | Set to `entra` |
| `ENTRA_TENANT_ID` | Yes | - | Azure AD Tenant ID (GUID format) |
| `ENTRA_CLIENT_ID` | Yes | - | Application (client) ID (GUID format) |
| `ENTRA_CLIENT_SECRET` | Yes | - | Client secret value (copy immediately after creation) |
| `ENTRA_ENABLED` | Yes | `false` | Enable Entra ID provider |
| `ENTRA_LOGIN_BASE_URL` | No | `https://login.microsoftonline.com` | Login URL (change for sovereign clouds) |
| `ENTRA_GROUP_ADMIN_ID` | No | - | Admin group Object ID for authorization |
| `ENTRA_GROUP_USERS_ID` | No | - | Users group Object ID for authorization |

#### Sovereign Cloud URLs

| Cloud | URL |
|-------|-----|
| Azure Public (default) | `https://login.microsoftonline.com` |
| Azure Government | `https://login.microsoftonline.us` |
| Azure China | `https://login.chinacloudapi.cn` |
| Azure Germany | `https://login.microsoftonline.de` |

#### Where to Find Entra ID Values

1. **Tenant ID**: Azure Portal → Azure Active Directory → Overview
2. **Client ID**: Azure Portal → App registrations → Your App → Overview
3. **Client Secret**: Azure Portal → App registrations → Your App → Certificates & secrets

See [Entra ID Setup Guide](entra-id-setup.md) for detailed instructions.

---

### GitHub OAuth Configuration

GitHub OAuth for user authentication.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_CLIENT_ID` | Yes | - | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | Yes | - | GitHub OAuth App Client Secret |
| `GITHUB_ENABLED` | Yes | `false` | Enable GitHub OAuth provider |

#### Where to Find GitHub Values

GitHub → Settings → Developer settings → OAuth Apps

---

### Google OAuth Configuration

Google OAuth for user authentication.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | Yes | - | Google OAuth2 Client ID |
| `GOOGLE_CLIENT_SECRET` | Yes | - | Google OAuth2 Client Secret |
| `GOOGLE_ENABLED` | Yes | `false` | Enable Google OAuth provider |

#### Where to Find Google Values

Google Cloud Console → APIs & Services → Credentials

---

## Application Security

Critical security settings for JWT tokens and session management.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | **Critical** | - | JWT token signing and session security key (64 hex chars). **Generate with:** `python3 -c "import secrets; print(secrets.token_hex(32))"` |

### Security Warning

Never use the default `SECRET_KEY` value in production. Always generate a unique, random key.

---

## Session Configuration

Cookie and session settings.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SESSION_COOKIE_SECURE` | Yes | `false` | Set to `true` for HTTPS-only cookies. **Must be `true` in production.** |
| `SESSION_COOKIE_DOMAIN` | No | (empty) | Cookie domain for cross-subdomain auth. Leave empty for single-domain. |

### Session Cookie Domain Examples

```bash
# Single domain (recommended for most cases)
SESSION_COOKIE_DOMAIN=

# Cross-subdomain (auth.example.com + registry.example.com)
SESSION_COOKIE_DOMAIN=.example.com

# Multi-level domains
SESSION_COOKIE_DOMAIN=.corp.company.internal
```

---

## AI/LLM Configuration

Settings for AI and LLM integrations.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | No | - | Anthropic API key for Claude models. Get from [console.anthropic.com](https://console.anthropic.com/) |
| `SMITHERY_API_KEY` | No | - | API key for Smithery-hosted MCP servers. Get from [smithery.ai](https://smithery.ai/) |

### Global LLM Configuration

Fallback settings for all LLM operations.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_PROVIDER` | No | `litellm` | LLM provider (`litellm` for proxy or direct access) |
| `LLM_MODEL` | No | `openai/gpt-4o-mini` | Default model for chat/completion |
| `LLM_API_KEY` | No | - | Global API key (fallback if component-specific not set) |
| `LLM_API_BASE` | No | - | Global API base URL for LiteLLM proxy |

---

## Security Scanning Configuration

MCP server security scanning settings (Cisco AI Defense integration).

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECURITY_SCAN_ENABLED` | No | `true` | Enable/disable security scanning |
| `SECURITY_SCAN_ON_REGISTRATION` | No | `true` | Scan servers during registration |
| `SECURITY_BLOCK_UNSAFE_SERVERS` | No | `true` | Auto-disable servers that fail scans |
| `SECURITY_ANALYZERS` | No | `yara` | Analyzers to use: `yara`, `llm`, `api` |
| `SECURITY_SCAN_TIMEOUT` | No | `60` | Scan timeout in seconds |
| `SECURITY_ADD_PENDING_TAG` | No | `true` | Tag failed servers as `security-pending` |
| `MCP_SCANNER_LLM_API_KEY` | No | - | OpenAI API key for LLM analyzer. Get from [platform.openai.com](https://platform.openai.com/api-keys) |
| `MCP_SCANNER_LLM_MODEL` | No | `openai/gpt-4o-mini` | Model for LLM-based analysis |
| `MCP_SCANNER_LLM_API_BASE` | No | - | Custom API base for LiteLLM proxy |

### Available Analyzers

| Analyzer | Description | API Key Required |
|----------|-------------|------------------|
| `yara` | Pattern matching with YARA rules | No |
| `llm` | LLM-as-a-judge evaluation | Yes (`MCP_SCANNER_LLM_API_KEY`) |
| `api` | Cisco AI Defense inspect API | Yes (Cisco credentials) |

---

## Embeddings Configuration

Settings for semantic search embeddings.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMBEDDINGS_PROVIDER` | No | `sentence-transformers` | Provider: `sentence-transformers` (local) or `litellm` (cloud) |
| `EMBEDDINGS_MODEL_NAME` | No | `all-MiniLM-L6-v2` | Model name for embeddings |
| `EMBEDDINGS_MODEL_DIMENSIONS` | No | `384` | Embedding vector dimensions (must match model) |
| `EMBEDDINGS_API_KEY` | No | - | API key for cloud providers (OpenAI, Cohere) |
| `EMBEDDINGS_API_BASE` | No | - | Custom API base URL |
| `EMBEDDINGS_AWS_REGION` | No | `us-east-1` | AWS region for Bedrock embeddings |

### Embedding Dimensions by Model

| Model | Dimensions |
|-------|------------|
| `all-MiniLM-L6-v2` | 384 |
| `text-embedding-3-small` | 1536 |
| `amazon.titan-embed-text-v1` | 1536 |
| `cohere/embed-english-v3.0` | 1024 |

---

## A2A Agent Security Scanning

Security scanning for A2A (Agent-to-Agent) agents.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AGENT_SECURITY_SCAN_ENABLED` | No | `true` | Enable agent security scanning |
| `AGENT_SECURITY_SCAN_ON_REGISTRATION` | No | `true` | Scan agents during registration |
| `AGENT_SECURITY_BLOCK_UNSAFE_AGENTS` | No | `true` | Auto-disable unsafe agents |
| `AGENT_SECURITY_ANALYZERS` | No | `yara,spec` | Analyzers: `yara`, `spec`, `heuristic`, `llm`, `endpoint` |
| `AGENT_SECURITY_SCAN_TIMEOUT` | No | `60` | Scan timeout in seconds |
| `AGENT_SECURITY_ADD_PENDING_TAG` | No | `true` | Tag failed agents as `security-pending` |
| `A2A_SCANNER_LLM_API_KEY` | No | - | Azure OpenAI API key for LLM analyzer |
| `A2A_SCANNER_LLM_MODEL` | No | `openai/gpt-4o-mini` | Model for agent analysis |
| `A2A_SCANNER_LLM_API_BASE` | No | - | Custom API base for LiteLLM proxy |

### Available Agent Analyzers

| Analyzer | Description | API Key Required |
|----------|-------------|------------------|
| `yara` | Pattern matching with YARA rules | No |
| `spec` | A2A protocol specification validation | No |
| `heuristic` | Logic-based threat detection | No |
| `llm` | LLM-as-a-judge evaluation | Yes (`A2A_SCANNER_LLM_API_KEY`) |
| `endpoint` | Dynamic endpoint security testing | No (requires live agent) |

---

## Container Registry Credentials

Credentials for Docker image publishing.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DOCKERHUB_USERNAME` | No | - | Docker Hub username |
| `DOCKERHUB_TOKEN` | No | - | Docker Hub access token. Get from [hub.docker.com/settings/security](https://hub.docker.com/settings/security) |
| `GITHUB_USERNAME` | No | - | GitHub username for GHCR |
| `GITHUB_TOKEN` | No | - | GitHub PAT with `packages:write` scope |
| `IMAGE_REGISTRY` | No | `ghcr.io/jrmatherly` | Base registry URL for pre-built images |

---

## Storage Backend Configuration

Database and storage settings.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STORAGE_BACKEND` | Yes | `mongodb-ce` | Backend: `file`, `mongodb-ce`, or `documentdb` |

### Storage Backend Options

| Backend | Description | Use Case |
|---------|-------------|----------|
| `file` | JSON files | Simple local development |
| `mongodb-ce` | MongoDB Community Edition | Local dev with vector search |
| `documentdb` | Amazon DocumentDB | Production deployments |

### MongoDB/DocumentDB Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DOCUMENTDB_HOST` | Yes | `mongodb` | Database hostname |
| `DOCUMENTDB_PORT` | Yes | `27017` | Database port |
| `DOCUMENTDB_DATABASE` | Yes | `mcp_registry` | Database name |
| `DOCUMENTDB_USERNAME` | Yes | `admin` | Database username |
| `DOCUMENTDB_PASSWORD` | Yes | `admin` | Database password. For production: `openssl rand -base64 24 \| tr -d '/+=' \| head -c 32` |
| `DOCUMENTDB_USE_TLS` | Yes | `false` | Enable TLS (required for AWS DocumentDB) |
| `DOCUMENTDB_NAMESPACE` | No | `default` | Kubernetes namespace |

### AWS DocumentDB Additional Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DOCUMENTDB_TLS_CA_FILE` | No | `global-bundle.pem` | TLS CA certificate file |
| `DOCUMENTDB_USE_IAM` | No | `false` | Use IAM authentication |
| `DOCUMENTDB_REPLICA_SET` | No | `rs0` | Replica set name |
| `DOCUMENTDB_READ_PREFERENCE` | No | `secondaryPreferred` | Read preference |

---

## External Registry Configuration

Settings for external registry integrations.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EXTERNAL_REGISTRY_TAGS` | No | `anthropic-registry,workday-asor` | Tags identifying external registry servers |

Servers tagged with these values appear in the "External Registries" tab in the UI.

---

## Federation Configuration (ASOR/Workday)

Settings for agent federation with external registries like Workday ASOR. See [Federation Guide](federation.md) for complete setup.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ASOR_ACCESS_TOKEN` | For ASOR | - | OAuth2 access token for Workday ASOR (generated by `get_asor_token.py`) |
| `ASOR_CLIENT_CREDENTIALS` | Alternative | - | Client credentials in format `client_id:client_secret` for 2-legged OAuth |

### ASOR Authentication Methods

**3-Legged OAuth (Recommended):**
```bash
# Generate token interactively
python get_asor_token.py

# Token is saved to .env automatically
```

**2-Legged OAuth (If supported by your ASOR tenant):**
```bash
ASOR_CLIENT_CREDENTIALS=your_client_id:your_client_secret
```

---

## Gateway Host Configuration

Optional nginx reverse proxy settings.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GATEWAY_ADDITIONAL_SERVER_NAMES` | No | (auto-detect) | Additional server names for nginx `server_name` directive |

### Examples

```bash
# Custom domain
GATEWAY_ADDITIONAL_SERVER_NAMES=mcpgateway.example.com

# Public IP
GATEWAY_ADDITIONAL_SERVER_NAMES=54.123.45.67

# Multiple names
GATEWAY_ADDITIONAL_SERVER_NAMES=mcpgateway.example.com 54.123.45.67 10.0.1.42
```

---

## Metrics Service Configuration

Settings for the internal metrics collection service. See [Metrics Architecture](metrics-architecture.md) for complete documentation.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `METRICS_API_KEY_AUTH_SERVER` | No | (auto-generated) | API key for auth-server metrics authentication |
| `METRICS_API_KEY_REGISTRY` | No | (auto-generated) | API key for registry service metrics authentication |
| `METRICS_API_KEY_MCPGW_SERVER` | No | (auto-generated) | API key for MCP gateway server metrics authentication |

> **Note:** These API keys are automatically generated by `build_and_run.sh` if not present in `.env`. You only need to set them manually if you want specific values or are deploying without using the build script.

### Manual Generation

If you need to generate metrics API keys manually:

```bash
# Generate a metrics API key
openssl rand -hex 16 | xargs -I {} echo "mcp_metrics_{}"

# Example output: mcp_metrics_a1b2c3d4e5f67890a1b2c3d4e5f67890
```

---

## Environment Profiles

### Local Development

```bash
# Minimal local development configuration
REGISTRY_URL=http://localhost
AUTH_PROVIDER=keycloak
STORAGE_BACKEND=mongodb-ce
SESSION_COOKIE_SECURE=false
KEYCLOAK_ENABLED=true
```

### Production

```bash
# Production configuration checklist
REGISTRY_URL=https://mcpgateway.example.com
AUTH_PROVIDER=keycloak  # or cognito, entra
STORAGE_BACKEND=documentdb
SESSION_COOKIE_SECURE=true
SECRET_KEY=<generated-64-char-hex>
DOCUMENTDB_USE_TLS=true
```

---

## Troubleshooting

### Common Issues

1. **Login fails on localhost**: Ensure `SESSION_COOKIE_SECURE=false` for HTTP development

2. **Keycloak connection errors**: Verify `KEYCLOAK_URL=http://keycloak:8080` (Docker internal network)

3. **Database connection failures**: Check `DOCUMENTDB_HOST` matches your Docker service name

4. **OAuth redirect errors**: Ensure `*_EXTERNAL_URL` variables match your browser-accessible URLs

### Validation

Verify your configuration:

```bash
# Check required variables are set
grep -E "^[A-Z_]+=$" .env | head -10

# Validate no placeholder values remain
grep -E "your[-_]|CHANGE[-_]THIS|XXXXXXXXX" .env
```

---

## Auto-Managed Variables

These variables are automatically managed by system scripts and should **not** be manually edited.

### OAuth Tokens

| Variable | Managed By | Description |
|----------|------------|-------------|
| `ATLASSIAN_AUTH_TOKEN` | `credentials-provider/` | OAuth token for Atlassian MCP server integration |
| `SRE_GATEWAY_AUTH_TOKEN` | `credentials-provider/` | OAuth token for SRE Gateway integration |

### Metrics API Keys

| Variable | Managed By | Description |
|----------|------------|-------------|
| `METRICS_API_KEY_AUTH_SERVER` | `build_and_run.sh` | API key for auth-server metrics submission |
| `METRICS_API_KEY_REGISTRY` | `build_and_run.sh` | API key for registry service metrics submission |
| `METRICS_API_KEY_MCPGW_SERVER` | `build_and_run.sh` | API key for MCP gateway server metrics submission |

### How Auto-Managed Variables Work

**OAuth Tokens:**
1. The `credentials-provider/` scripts handle OAuth flows for external services
2. Upon successful authentication, tokens are automatically written to `.env`
3. These tokens are refreshed automatically by the token refresh service
4. Manual edits will be overwritten by the next OAuth flow or token refresh

**Metrics API Keys:**
1. The `build_and_run.sh` script checks for existing metrics API keys in `.env`
2. If not present, it generates secure random tokens using `openssl rand -hex 16`
3. These keys authenticate metrics submissions from each service component
4. Keys are only regenerated if missing or empty

See [Token Refresh Service](token-refresh-service.md) for details on automatic token management.
See [Metrics Architecture](metrics-architecture.md) for details on the metrics service.

---

## Related Documentation

- [Complete Setup Guide](complete-setup-guide.md)
- [Keycloak Integration](keycloak-integration.md)
- [Cognito Setup](cognito.md)
- [Entra ID Setup](entra-id-setup.md)
- [Security Scanner](security-scanner.md)
- [Embeddings Configuration](embeddings.md)
