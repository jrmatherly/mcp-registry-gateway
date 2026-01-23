# Service Configuration

## Docker Compose Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Main development stack |
| `docker-compose.podman.yml` | Podman-compatible config |
| `docker-compose.prebuilt.yml` | Uses prebuilt images |

## Docker Compose Services

### Core Services
| Service | Description | Port |
|---------|-------------|------|
| `registry` | Main MCP Gateway Registry | 7860 |
| `auth-server` | Authentication service | 9510 |
| `mongodb` | MongoDB database | 27017 |
| `mongodb-init` | Database initialization job | - |
| `metrics-service` | Metrics collection | 9520 |

### FastMCP Servers
| Service | Description | Port |
|---------|-------------|------|
| `mcpgw-server` | MCPGateway Registry API tools | 9001 |
| `fininfo-server` | Financial information tools | 9002 |
| `realserverfaketools-server` | Mock/test tools | 9003 |
| `currenttime-server` | Simple time server | 9004 |

### Monitoring
| Service | Description | Port |
|---------|-------------|------|
| `prometheus` | Metrics collection | 9090 |
| `grafana` | Visualization dashboard | 3000 |
| `metrics-db` | TimescaleDB for metrics | 5432 |

### Authentication
| Service | Description | Port |
|---------|-------------|------|
| `keycloak` | Identity provider | 8080 |
| `keycloak-db` | PostgreSQL for Keycloak | 5433 |

## Environment Variables

### Registry Service
```yaml
environment:
  - DOCUMENTDB_HOST=mongodb
  - DOCUMENTDB_PORT=27017
  - DOCUMENTDB_DATABASE=mcp_registry
  - DOCUMENTDB_AUTH_DATABASE=admin
  - LOG_LEVEL=INFO
  - SECRET_KEY=${SECRET_KEY}
```

### MongoDB
```yaml
environment:
  - MONGO_INITDB_ROOT_USERNAME=admin
  - MONGO_INITDB_ROOT_PASSWORD=${MONGO_PASSWORD}
```

### Keycloak
```yaml
environment:
  - KEYCLOAK_ADMIN=admin
  - KEYCLOAK_ADMIN_PASSWORD=${KEYCLOAK_PASSWORD}
  - KC_DB=postgres
  - KC_DB_URL=jdbc:postgresql://keycloak-db:5432/keycloak
```

## Volume Mounts

```yaml
volumes:
  mongodb_data:     # MongoDB data persistence
  keycloak_db:      # Keycloak PostgreSQL data
  opensearch_data:  # OpenSearch indices
```

## Network Configuration

```yaml
networks:
  mcp-network:
    driver: bridge
```

All services communicate on the internal `mcp-network`.

## Health Checks

### MongoDB
```yaml
healthcheck:
  test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
  interval: 10s
  timeout: 5s
  retries: 5
```

### Registry
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### Keycloak
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8080/health/ready"]
  interval: 30s
  timeout: 10s
  retries: 5
```

## Resource Limits (Production)

```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 4G
    reservations:
      cpus: '0.5'
      memory: 1G
```

## Development vs Production

### Development
- Uses local volumes for data persistence
- Exposes all ports to host
- Debug logging enabled
- Hot reload for registry

### Production
- Uses managed services (DocumentDB, etc.)
- Only exposes necessary ports
- Production logging
- No hot reload, optimized builds

## Starting Fresh

```bash
# Complete reset (removes all data!)
docker compose down -v
docker system prune -f
docker volume prune -f

# Rebuild from scratch
docker compose build --no-cache
docker compose up -d
```

## Multi-Profile Setup

```bash
# Use specific profile
docker compose --profile monitoring up -d

# Available profiles:
# - default: Core services
# - monitoring: Adds Grafana, Prometheus
# - full: All services including search
```
