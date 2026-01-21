---
name: system-review
description: Analyze implementation against plan for process improvements
category: validation
complexity: standard
argument-hint: <plan-file> <execution-report-file>
mcp-servers: [serena]
personas: [arch-analyzer, quality-engineer]
---

# /system-review - Process Improvement Analysis

## Triggers

- After completing a feature implementation cycle
- When execution report shows significant divergences
- Periodic review of development processes
- After implementing major features

## Usage

```
/system-review <plan-file> <execution-report-file>
```

**Examples:**
- `/system-review .claude/output/plans/add-user-auth.md .claude/output/execution-reports/add-user-auth-report.md`
- `/system-review .claude/output/plans/server-monitoring.md .claude/output/execution-reports/server-monitoring-report.md`

## Behavioral Flow

1. **Understand**: Read plan and execution report
2. **Compare**: Identify divergences between planned and actual
3. **Classify**: Categorize divergences as justified or problematic
4. **Trace**: Find root causes of problematic divergences
5. **Improve**: Suggest concrete asset updates

Key behaviors:
- Meta-level analysis (process, not code)
- Pattern recognition across divergences
- Action-oriented improvement suggestions

**Philosophy:**

- Good divergence reveals plan limitations -> improve planning
- Bad divergence reveals unclear requirements -> improve communication
- Repeated issues reveal missing automation -> create commands/skills

## MCP Integration

- **Serena MCP**: Memory and context access
  - `read_memory`: Access code_style_conventions, development_workflow
  - `write_memory`: Document recurring patterns for future reference

## Tool Coordination

- **Read**: Plan files, execution reports, CLAUDE.md
- **Write**: System review document
- **Serena Tools**: Memory access for conventions
- **Grep/Glob**: Find patterns across multiple implementations

## Analysis Workflow

### Step 1: Understand the Planned Approach

Read the generated plan and extract:

- What features were planned?
- What architecture was specified?
- What validation steps were defined?
- What patterns were referenced?

### Step 2: Understand the Actual Implementation

Read the execution report and extract:

- What was implemented?
- What diverged from the plan?
- What challenges were encountered?
- What was skipped and why?

### Step 3: Classify Each Divergence

For each divergence identified, classify as:

**Good Divergence (Justified):**

- Plan assumed something that didn't exist in codebase
- Better pattern discovered during implementation
- Performance optimization needed
- Security issue discovered that required different approach

**Bad Divergence (Problematic):**

- Ignored explicit constraints in plan
- Created new architecture instead of following existing patterns
- Took shortcuts that introduce tech debt
- Misunderstood requirements

### Step 4: Trace Root Causes

For each problematic divergence, identify root cause:

- Was the plan unclear? Where? Why?
- Was context missing? Where? Why?
- Was validation missing? Where? Why?
- Was manual step repeated? Where? Why?

### Step 5: Generate Process Improvements

Based on patterns, suggest:

- **CLAUDE.md updates**: Universal patterns or anti-patterns to document
- **Plan command updates**: Instructions that need clarification
- **New commands/skills**: Manual processes that should be automated
- **Validation additions**: Checks that would catch issues earlier

## Output Format

Save to: `.claude/output/system-reviews/{feature-name}-review.md`

```markdown
# System Review: {Feature Name}

## Meta Information

- **Plan reviewed**: {path to plan}
- **Execution report**: {path to execution report}
- **Date**: {current date}
- **Reviewer**: Claude

## Overall Alignment Score: __/10

**Scoring guide:**
- 10: Perfect adherence, all divergences justified
- 7-9: Minor justified divergences
- 4-6: Mix of justified and problematic divergences
- 1-3: Major problematic divergences

## Divergence Analysis

### Divergence 1: {Title}

- **Planned**: {What plan specified}
- **Actual**: {What was implemented}
- **Reason**: {Agent's stated reason}
- **Classification**: Good / Bad
- **Justified**: Yes / No
- **Root Cause**: {If problematic: unclear plan / missing context / etc.}

### Divergence 2: {Title}
...

## Pattern Compliance

- [ ] Followed codebase architecture
- [ ] Used documented patterns (from CLAUDE.md)
- [ ] Applied testing patterns correctly
- [ ] Met validation requirements

## System Improvement Actions

### Update CLAUDE.md

- [ ] Document {pattern X} discovered during implementation
- [ ] Add anti-pattern warning for {Y}
- [ ] Clarify {technology constraint Z}

### Update Plan Command

- [ ] Add instruction for {missing step}
- [ ] Clarify {ambiguous instruction}
- [ ] Add validation requirement for {X}

### Create New Command/Skill

- [ ] `/{command-name}` for {manual process repeated 3+ times}

### Update Execute Command

- [ ] Add {validation step} to execution checklist

## Key Learnings

### What Worked Well

- {Specific things that went smoothly}

### What Needs Improvement

- {Specific process gaps identified}

### For Next Implementation

- {Concrete improvements to try}
```

## Boundaries

**Will:**
- Perform meta-level analysis of development process
- Identify patterns across multiple divergences
- Suggest concrete asset updates with specific text
- Focus on actionable process improvements

**Will Not:**
- Review code quality (that's code-reviewer's job)
- Implement suggested improvements directly
- Focus on one-off issues (patterns only)
- Skip root cause analysis for problematic divergences
