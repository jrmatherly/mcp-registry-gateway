---
description: Analyze implementation against plan for process improvements
argument-hint: <plan-file> <execution-report-file>
---

# System Review

Perform a meta-level analysis of how well the implementation followed the plan and identify process improvements.

## Purpose

**System review is NOT code review.** You're not looking for bugs in the code - you're looking for bugs in the process.

**Your job:**

- Analyze plan adherence and divergence patterns
- Identify which divergences were justified vs problematic
- Surface process improvements that prevent future issues
- Suggest updates to Layer 1 assets (CLAUDE.md, commands, skills)

**Philosophy:**

- Good divergence reveals plan limitations -> improve planning
- Bad divergence reveals unclear requirements -> improve communication
- Repeated issues reveal missing automation -> create commands/skills

## Context & Inputs

You will analyze these artifacts:

**Plan Command:**
`.claude/commands/piv-loop/plan-feature.md`

**Generated Plan:**
`$1` (first argument - the plan file)

**Execute Command:**
`.claude/commands/piv-loop/execute.md`

**Execution Report:**
`$2` (second argument - the execution report)

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

### Report Structure

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

## Important

- **Be specific**: Don't say "plan was unclear" - say "plan didn't specify which auth pattern to use"
- **Focus on patterns**: One-off issues aren't actionable. Look for repeated problems.
- **Action-oriented**: Every finding should have a concrete asset update suggestion
- **Suggest improvements**: Don't just analyze - actually suggest the text to add

## Example Usage

```bash
# After completing a feature implementation
/system-review .claude/output/plans/add-user-auth.md .claude/output/execution-reports/add-user-auth.md
```
