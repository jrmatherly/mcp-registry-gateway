# FastMCP 3.0 Upgrade - Phase 5: Production Migration

**Parent Plan**: [fastmcp-3-upgrade.md](fastmcp-3-upgrade.md)
**Created**: 2026-01-23
**Status**: Waiting (for Phase 4 completion)
**Priority**: High
**Estimated Effort**: 1-2 days (plus 24-hour monitoring)
**Prerequisites**:
- [Phase 4: Development Testing](fastmcp-3-upgrade-phase-4-development-testing.md) completed
- Code review approved
- QA sign-off obtained

---

## Objective

Deploy FastMCP 3.0 upgrade to staging environment for validation, then to production with proper rollout procedures and monitoring.

---

## Pre-Deployment Checklist

### Stakeholder Sign-offs Required

| Stakeholder | Required Sign-off | Obtained |
|-------------|------------------|----------|
| Tech Lead | Migration plan approved | [ ] |
| QA Lead | Test coverage acceptable | [ ] |
| DevOps | Deployment plan reviewed | [ ] |
| Product Owner | Timeline acceptable | [ ] |

### Go/No-Go Criteria

- [ ] All Phase 4 tests pass
- [ ] Code review approved and merged to main
- [ ] No critical bugs in development testing
- [ ] Performance within acceptable thresholds
- [ ] Rollback procedure documented and tested
- [ ] Monitoring dashboards configured
- [ ] On-call team notified

---

## Staging Deployment

### Step 1: Deploy to Staging

```bash
# Merge feature branch to main (if not already done)
git checkout main
git pull origin main

# Tag release candidate
git tag -a v3.0.0-rc1 -m "FastMCP 3.0 upgrade release candidate"
git push origin v3.0.0-rc1
```

**Deploy via CI/CD pipeline** or manually:

```bash
# Build and push staging images
docker compose -f docker-compose.staging.yml build mcpgw-server fininfo-server realserverfaketools-server
docker compose -f docker-compose.staging.yml push

# Deploy to staging cluster
kubectl -n staging rollout restart deployment/mcpgw-server
kubectl -n staging rollout restart deployment/fininfo-server
kubectl -n staging rollout restart deployment/realserverfaketools-server
```

### Step 2: Staging Verification

**Health Checks**:
```bash
# Staging URLs (adjust based on environment)
curl -s https://staging.example.com/mcpgw/health | jq
curl -s https://staging.example.com/fininfo/health | jq
curl -s https://staging.example.com/realserverfaketools/health | jq
```

**Smoke Tests**:
```bash
# Run integration tests against staging
STAGING_URL=https://staging.example.com uv run pytest tests/integration/ -v
```

### Step 3: QA Validation in Staging

| Test Type | Description | Owner | Status |
|-----------|-------------|-------|--------|
| Functional | All tools execute correctly | QA | [ ] |
| Auth | Authentication flows work | QA | [ ] |
| Performance | Response times acceptable | QA | [ ] |
| Security | No auth bypass possible | Security | [ ] |

**QA Sign-off Date**: _______________
**QA Sign-off By**: _______________

### Step 4: Performance Testing in Staging

```bash
# Load test health endpoint
hey -n 5000 -c 50 https://staging.example.com/mcpgw/health

# Load test tool execution
hey -n 500 -c 20 -m POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STAGING_TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list_services"},"id":1}' \
  https://staging.example.com/mcpgw/sse
```

**Performance Acceptance Criteria**:

| Metric | v2.x Baseline | v3.0 Target | Staging Result | Pass/Fail |
|--------|--------------|-------------|----------------|-----------|
| Health P50 | <10ms | <10ms | ___ | [ ] |
| Health P99 | <50ms | <60ms | ___ | [ ] |
| Tool list P50 | <50ms | <55ms | ___ | [ ] |
| Tool list P99 | <200ms | <220ms | ___ | [ ] |

---

## Production Deployment

### Step 5: Change Approval

Submit change request through your organization's change management process:

- **Change Type**: Standard (pre-approved if following documented procedure)
- **Risk Level**: Medium
- **Rollback Time**: ~10 minutes
- **Impact**: MCP server functionality during deployment

### Step 6: Notify Stakeholders

Send notification 24 hours before production deployment:

```markdown
**Production Deployment Notice: FastMCP 3.0 Upgrade**

**Date/Time**: [Date] at [Time] [Timezone]
**Duration**: ~30 minutes (including verification)
**Impact**: Brief service interruption during container restart

**Changes**:
- Upgrade FastMCP framework from 2.x to 3.0
- Add tool timeouts for improved reliability
- Enhanced documentation for LLM tool discovery

**Rollback Plan**: Automatic rollback if health checks fail

**Contact**: [On-call contact]
```

### Step 7: Production Deployment

**Recommended: Rolling deployment to minimize downtime**

```bash
# Tag release
git tag -a v3.0.0 -m "FastMCP 3.0 upgrade"
git push origin v3.0.0

# Deploy via CI/CD pipeline
# OR manually:

# Build and push production images
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml push

# Rolling restart (one service at a time)
kubectl -n production rollout restart deployment/realserverfaketools-server
kubectl -n production rollout status deployment/realserverfaketools-server
# Wait for healthy

kubectl -n production rollout restart deployment/fininfo-server
kubectl -n production rollout status deployment/fininfo-server
# Wait for healthy

kubectl -n production rollout restart deployment/mcpgw-server
kubectl -n production rollout status deployment/mcpgw-server
# Wait for healthy
```

### Step 8: Production Verification

**Immediate Checks** (within 5 minutes):

```bash
# Health checks
curl -s https://api.example.com/mcpgw/health | jq
curl -s https://api.example.com/fininfo/health | jq
curl -s https://api.example.com/realserverfaketools/health | jq

# Version verification
curl -s https://api.example.com/mcpgw/health | jq '.version'
# Expected: 3.0.x or similar indicator
```

**Functional Checks** (within 15 minutes):

```bash
# Test tool execution
curl -s -X POST https://api.example.com/mcpgw/sse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PROD_TOKEN" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' | jq '.result.tools | length'
# Expected: Tool count matches expected (e.g., 12 for mcpgw)
```

### Step 9: Post-Deployment Monitoring

**Monitor for 24 hours** after deployment:

| Metric | Alert Threshold | Monitoring Tool |
|--------|-----------------|-----------------|
| Error rate | >1% | Datadog/Prometheus |
| P99 latency | >500ms | Datadog/Prometheus |
| Container restarts | >2 in 1 hour | Kubernetes |
| Auth failures | >10 in 5 min | Application logs |

**Grafana Dashboard Checks**:
- [ ] Error rate stable
- [ ] Latency within bounds
- [ ] No unusual patterns
- [ ] Memory usage stable
- [ ] CPU usage normal

---

## Rollback Procedure

### Trigger Conditions

Rollback immediately if:
- Health checks fail after deployment
- Auth context extraction returns incorrect data
- Tool execution errors increase >1%
- Container enters restart loop
- Security issue identified

### Rollback Steps

**Option 1: Kubernetes Rollback** (fastest):
```bash
kubectl -n production rollout undo deployment/mcpgw-server
kubectl -n production rollout undo deployment/fininfo-server
kubectl -n production rollout undo deployment/realserverfaketools-server
```

**Option 2: Redeploy Previous Version**:
```bash
# Revert code
git revert HEAD  # or specific commit

# Rebuild and deploy
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml push
kubectl -n production rollout restart deployment/mcpgw-server
kubectl -n production rollout restart deployment/fininfo-server
kubectl -n production rollout restart deployment/realserverfaketools-server
```

### Rollback Time Estimate

- Container rebuild: ~2-3 minutes per service
- Rollout: ~1-2 minutes per service
- Total recovery: ~10-15 minutes

---

## Post-Deployment Tasks

### Step 10: Update Documentation

- [ ] Update README.md files with new FastMCP version requirements
- [ ] Add CHANGELOG.md entry for v3.0 migration
- [ ] Update architecture documentation if needed
- [ ] Archive v2.x baseline data

### Step 11: Communicate Completion

Send completion notification:

```markdown
**Production Deployment Complete: FastMCP 3.0 Upgrade**

**Status**: Successful
**Completion Time**: [Time]

**Summary**:
- All services upgraded to FastMCP 3.0
- No user-facing impact
- Performance within acceptable bounds

**New Features Available**:
- Tool timeouts for improved reliability
- Enhanced LLM tool discovery via annotations
- Session state caching capability

**Monitoring**: 24-hour observation period in effect

**Issues**: Report to [contact] or #fastmcp-migration
```

### Step 12: Incident Retrospective (if applicable)

If any issues occurred during deployment:

1. Schedule retrospective meeting within 5 business days
2. Document timeline of events
3. Identify root cause
4. Create action items for improvement
5. Update this plan with lessons learned

---

## Success Criteria

### Staging Success

- [ ] All containers deploy successfully
- [ ] All health checks pass
- [ ] QA validation complete
- [ ] Performance within acceptable bounds
- [ ] Security validation complete

### Production Success

- [ ] Rolling deployment successful
- [ ] All health checks pass
- [ ] No increase in error rates
- [ ] Performance within 10% of baseline
- [ ] No rollback required
- [ ] 24-hour monitoring complete without issues
- [ ] Documentation updated
- [ ] Stakeholders notified of completion

---

## Timeline Summary

| Day | Activity | Owner | Status |
|-----|----------|-------|--------|
| Day 1 AM | Deploy to staging | DevOps | [ ] |
| Day 1 | QA validation in staging | QA | [ ] |
| Day 1 | Performance testing | DevOps | [ ] |
| Day 2 AM | Production deployment | DevOps | [ ] |
| Day 2 | Post-deployment verification | Dev | [ ] |
| Day 2-3 | 24-hour monitoring | On-call | [ ] |
| Day 3 | Documentation updates | Dev | [ ] |
| Day 3 | Completion communication | Tech Lead | [ ] |

---

## Appendix: Communication Templates

### Deployment Start Notification

```markdown
**[IN PROGRESS] FastMCP 3.0 Production Deployment**

Started: [Time]
Expected Duration: 30 minutes

Status updates will be posted here.
```

### Deployment Success Notification

```markdown
**[COMPLETE] FastMCP 3.0 Production Deployment**

Completed: [Time]
Duration: [X] minutes

All services healthy. Monitoring in effect for 24 hours.
```

### Rollback Notification

```markdown
**[ROLLBACK] FastMCP 3.0 Production Deployment**

Rollback initiated at: [Time]
Reason: [Brief description]

Previous version restored. Services stable.

Root cause analysis to follow.
```
