---
name: analyze
description: Comprehensive code analysis across quality, security, performance, and architecture domains
category: analysis
complexity: standard
argument-hint: [target] [--focus quality|security|performance|architecture] [--depth quick|deep]
mcp-servers: [serena]
personas: [code-reviewer, security-auditor, arch-analyzer]
---

# /analyze - Code Analysis and Quality Assessment

## Triggers

- Code quality assessment requests for projects or specific components
- Security vulnerability scanning and compliance validation needs
- Performance bottleneck identification and optimization planning
- Architecture review and technical debt assessment requirements
- Pre-PR comprehensive code analysis

## Usage

```
/analyze [target] [--focus quality|security|performance|architecture] [--depth quick|deep]
```

**Examples:**
- `/analyze` - Full project analysis
- `/analyze registry/api/ --focus security` - Security scan of API layer
- `/analyze registry/services/ --focus quality --depth deep` - Deep quality review
- `/analyze --focus architecture` - Architecture assessment

## Behavioral Flow

1. **Discover**: Identify target files using Glob, categorize by type
2. **Scan**: Apply domain-specific analysis based on focus area
3. **Evaluate**: Generate prioritized findings with severity ratings
4. **Recommend**: Create actionable recommendations with implementation guidance
5. **Report**: Present comprehensive analysis with metrics and improvement roadmap

Key behaviors:
- Multi-domain analysis combining static analysis and pattern recognition
- Intelligent file discovery and language-specific analysis
- Severity-based prioritization of findings
- Comprehensive reporting with metrics and actionable insights

## MCP Integration

- **Serena MCP**: Symbolic analysis, pattern detection, codebase navigation
  - `find_symbol`: Locate functions, classes, methods
  - `get_symbols_overview`: File structure analysis
  - `search_for_pattern`: Pattern-based code search
  - `find_referencing_symbols`: Dependency analysis

## Tool Coordination

- **Glob**: File discovery and project structure analysis
- **Grep**: Pattern analysis and code search operations
- **Read**: Source code inspection and configuration analysis
- **Bash**: External analysis tool execution (ruff, mypy, bandit)

## Analysis Domains

### Quality Analysis (`--focus quality`)
```bash
# Lint check
uv run ruff check registry/ --output-format=json

# Type check
uv run mypy registry/ --json-output
```

**Checks:**
- Function length and complexity
- Type annotation coverage
- Docstring presence and quality
- Code duplication
- Import organization
- Naming conventions

### Security Analysis (`--focus security`)
```bash
# Security scan
uv run bandit -r registry/ -f json

# Dependency audit
uv run pip-audit
```

**Checks:**
- OWASP Top 10 compliance
- Hardcoded secrets detection
- Injection vulnerability patterns
- Authentication/authorization review
- Data handling practices

### Performance Analysis (`--focus performance`)

**Checks:**
- N+1 query patterns
- Missing async/await
- Blocking calls in async code
- Caching opportunities
- Index usage in queries
- Connection pooling

### Architecture Analysis (`--focus architecture`)

**Checks:**
- Layer separation compliance
- Dependency direction (no circular imports)
- Repository pattern adherence
- Service layer isolation
- API design consistency

## Key Patterns

- **Domain Analysis**: Focus selection → specialized assessment → prioritized findings
- **Pattern Recognition**: Language detection → appropriate analysis techniques
- **Severity Assessment**: Issue classification → impact evaluation → prioritization
- **Report Generation**: Analysis results → structured documentation → action items

## Output Format

```markdown
## Code Analysis Report

### Analysis Summary
- **Target**: [files/directories analyzed]
- **Focus**: [quality|security|performance|architecture|all]
- **Depth**: [quick|deep]
- **Date**: [current date]

### Overview
- **Files Analyzed**: X
- **Issues Found**: X critical, X high, X medium, X low
- **Overall Score**: X/10

### Critical Issues
[If any - must be addressed immediately]

#### Issue 1: [Title]
- **Location**: `file:line`
- **Severity**: Critical
- **Description**: [What's wrong]
- **Impact**: [Business/security impact]
- **Remediation**: [How to fix]

### High Priority Issues
[...]

### Medium Priority Issues
[...]

### Recommendations
1. [Prioritized action item]
2. [Prioritized action item]

### Metrics
| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| Type Coverage | X% | 80% | [PASS/FAIL] |
| Test Coverage | X% | 35% | [PASS/FAIL] |
| Lint Issues | X | 0 | [PASS/FAIL] |
| Security Issues | X | 0 | [PASS/FAIL] |

### Improvement Roadmap
1. **Immediate**: [Critical fixes]
2. **Short-term**: [High priority improvements]
3. **Long-term**: [Technical debt reduction]
```

## Examples

### Comprehensive Project Analysis
```
/analyze
# Multi-domain analysis of entire project
# Generates comprehensive report with key findings and roadmap
```

### Focused Security Assessment
```
/analyze registry/api/auth/ --focus security --depth deep
# Deep security analysis of authentication components
# Vulnerability assessment with detailed remediation guidance
```

### Performance Optimization Analysis
```
/analyze registry/services/ --focus performance
# Performance bottleneck identification
# Optimization recommendations with expected impact
```

### Quick Quality Check
```
/analyze registry/schemas/ --focus quality --depth quick
# Rapid quality assessment of schema definitions
# Identifies code smells and maintainability issues
```

## Boundaries

**Will:**
- Perform comprehensive static code analysis across multiple domains
- Generate severity-rated findings with actionable recommendations
- Provide detailed reports with metrics and improvement guidance
- Coordinate multiple analysis agents for comprehensive coverage

**Will Not:**
- Execute dynamic analysis requiring runtime execution
- Modify source code or apply fixes without explicit user consent
- Analyze external dependencies beyond import and usage patterns
- Replace manual security review for critical authentication flows
