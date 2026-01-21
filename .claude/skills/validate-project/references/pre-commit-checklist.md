# Pre-Commit Checklist

## Before Every Commit

### Code Quality
- [ ] Code formatted with `uv run ruff format .`
- [ ] Linting passed with `uv run ruff check .`
- [ ] No new type errors from `uv run mypy registry/`

### Security
- [ ] No hardcoded secrets or credentials
- [ ] No new bandit warnings without `# nosec` justification
- [ ] Sensitive data not logged

### Testing
- [ ] New code has tests
- [ ] All tests pass with `uv run pytest tests/ -n 8`
- [ ] No decrease in coverage

### Documentation
- [ ] Public functions have docstrings
- [ ] Complex logic has comments explaining "why"
- [ ] README updated if adding new features

### Git Hygiene
- [ ] Commit message follows conventional format
- [ ] No unrelated changes mixed in
- [ ] No debug code left in (print statements, etc.)

## Before Pull Request

### Additional Checks
- [ ] PR title is descriptive
- [ ] PR description explains the changes
- [ ] Related issues linked
- [ ] Screenshots for UI changes (if applicable)
- [ ] Breaking changes documented

### Code Review Readiness
- [ ] Self-reviewed the diff
- [ ] No TODO comments without issue links
- [ ] No commented-out code
- [ ] Error handling is appropriate
- [ ] Edge cases considered

## Quick Commands

```bash
# Run all checks
uv run ruff check --fix . && \
uv run ruff format . && \
uv run bandit -r registry/ && \
uv run mypy registry/ && \
uv run pytest tests/ -n 8

# Check for debug statements
grep -r "print(" registry/ --include="*.py" | grep -v "logging"
grep -r "breakpoint()" registry/
grep -r "import pdb" registry/

# Check for TODOs without issues
grep -r "TODO" registry/ --include="*.py" | grep -v "#[0-9]"
```
