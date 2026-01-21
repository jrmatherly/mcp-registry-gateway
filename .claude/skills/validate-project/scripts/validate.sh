#!/bin/bash
# Full project validation script
# Usage: bash .claude/skills/validate-project/scripts/validate.sh

set -e

echo "=== MCP Registry Gateway Validation ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track failures
FAILURES=0

# Function to run a check
run_check() {
    local name="$1"
    local cmd="$2"
    
    echo -n "Running $name... "
    if eval "$cmd" > /dev/null 2>&1; then
        echo -e "${GREEN}PASSED${NC}"
    else
        echo -e "${RED}FAILED${NC}"
        FAILURES=$((FAILURES + 1))
        # Show output on failure
        echo "  Output:"
        eval "$cmd" 2>&1 | head -20 | sed 's/^/    /'
    fi
}

# Step 1: Format check
echo "Step 1: Checking code formatting..."
run_check "ruff format check" "uv run ruff format --check ."

# Step 2: Lint check
echo ""
echo "Step 2: Running linter..."
run_check "ruff lint" "uv run ruff check ."

# Step 3: Security scan
echo ""
echo "Step 3: Running security scan..."
run_check "bandit" "uv run bandit -r registry/ -q"

# Step 4: Type check
echo ""
echo "Step 4: Running type checker..."
run_check "mypy" "uv run mypy registry/ --no-error-summary"

# Step 5: Tests
echo ""
echo "Step 5: Running tests..."
echo -n "Running pytest... "
if uv run pytest tests/ -n 8 -q --tb=no > /dev/null 2>&1; then
    echo -e "${GREEN}PASSED${NC}"
else
    echo -e "${YELLOW}SOME FAILURES${NC}"
    # Show summary
    uv run pytest tests/ -n 8 -q --tb=no 2>&1 | tail -5 | sed 's/^/    /'
fi

# Summary
echo ""
echo "=== Validation Summary ==="
if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
    exit 0
else
    echo -e "${RED}$FAILURES check(s) failed${NC}"
    exit 1
fi
