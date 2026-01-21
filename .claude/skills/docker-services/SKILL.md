# Docker Services Skill

Manage Docker Compose services for the MCP Gateway & Registry.

## Quick Reference

```bash
# Start all services
docker compose up -d

# Start specific services
docker compose up -d mongodb keycloak

# Stop all services
docker compose down

# View logs
docker compose logs -f registry

# Check status
docker compose ps
```

## Available Services

| Service | Port | Purpose |
|---------|------|---------|
| `mongodb` | 27017 | Primary database |
| `keycloak` | 8080 | OAuth provider |
| `keycloak-db` | 5432 | Keycloak PostgreSQL |
| `registry` | 8000 | Main application |
| `opensearch` | 9200 | Vector search |
| `grafana` | 3000 | Monitoring dashboard |

## Common Operations

### Start Development Stack
```bash
# Minimal stack (MongoDB only)
docker compose up -d mongodb

# With authentication
docker compose up -d mongodb keycloak-db keycloak

# Full stack
docker compose up -d
```

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f registry

# Last 100 lines
docker compose logs --tail=100 registry

# With timestamps
docker compose logs -f -t registry
```

### Restart Services
```bash
# Restart single service
docker compose restart registry

# Rebuild and restart
docker compose up -d --build registry

# Force recreate
docker compose up -d --force-recreate registry
```

### Check Health
```bash
# Service status
docker compose ps

# Container health
docker inspect --format='{{.State.Health.Status}}' mcp-mongodb

# Resource usage
docker stats --no-stream
```

### Database Operations
```bash
# Connect to MongoDB
docker exec -it mcp-mongodb mongosh

# In mongosh:
> use mcp_registry
> db.servers.find().limit(5)
> db.servers.countDocuments()

# Export collection
docker exec mcp-mongodb mongoexport --db=mcp_registry --collection=servers --out=/tmp/servers.json

# Import collection
docker exec mcp-mongodb mongoimport --db=mcp_registry --collection=servers --file=/tmp/servers.json
```

### Cleanup
```bash
# Stop and remove containers
docker compose down

# Also remove volumes (DATA LOSS!)
docker compose down -v

# Remove unused images
docker image prune -f

# Full cleanup
docker system prune -f
```

## Troubleshooting

### MongoDB Won't Start
```bash
# Check logs
docker compose logs mongodb

# Check if port is in use
lsof -i :27017

# Remove and recreate volume
docker compose down -v
docker compose up -d mongodb
```

### Keycloak Issues
```bash
# Check keycloak-db first
docker compose logs keycloak-db

# Then check keycloak
docker compose logs keycloak

# Restart both
docker compose restart keycloak-db keycloak
```

### Registry Won't Connect
```bash
# Verify MongoDB is running
docker compose ps mongodb

# Check connectivity
docker exec mcp-registry curl -s mongodb:27017 || echo "Cannot connect"

# Check environment
docker exec mcp-registry env | grep DOCUMENTDB
```

## References

- [Service Configuration](references/service-config.md)
