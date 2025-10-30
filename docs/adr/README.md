# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) for the outTime project.

## What are ADRs?

Architecture Decision Records document significant architectural decisions made during the project's development. They provide context for why certain choices were made and help future contributors understand the reasoning behind technical decisions.

## Format

Each ADR follows this structure:

1. **Title**: Brief description of the decision
2. **Date**: When the decision was made
3. **Status**: Accepted, Deprecated, Superseded, etc.
4. **Context**: The problem or situation that prompted the decision
5. **Decision**: What was decided
6. **Consequences**: Positive and negative outcomes

## Index

### Active Decisions

| # | Title | Date | Status |
|---|-------|------|--------|
| [0001](./0001-record-architecture-decisions.md) | Record architecture decisions | 2025-10-30 | Accepted |
| [0002](./0002-use-postgresql-with-drizzle.md) | Use PostgreSQL with Drizzle ORM | 2025-10-30 | Accepted |
| [0003](./0003-repository-pattern-for-data-access.md) | Repository Pattern for Data Access | 2025-10-30 | Accepted |
| [0004](./0004-supabase-for-authentication.md) | Supabase for Authentication | 2025-10-30 | Accepted |
| [0005](./0005-redis-cache-strategy.md) | Redis Cache Strategy | 2025-10-30 | Accepted |
| [0006](./0006-testing-strategy.md) | Testing Strategy with Vitest | 2025-10-30 | Accepted |

## Creating a New ADR

When making a significant architectural decision:

1. **Copy the template**:
   ```bash
   cp docs/adr/template.md docs/adr/XXXX-your-decision-name.md
   ```

2. **Use the next number**: Check the index above for the next available number

3. **Fill in all sections**: Context, Decision, and Consequences are mandatory

4. **Update this README**: Add your ADR to the index

5. **Create a PR**: Get team review before merging

## ADR Template

```markdown
# [Number]. [Title]

Date: YYYY-MM-DD

## Status

Accepted | Deprecated | Superseded by [ADR-XXXX]

## Context

What is the issue or situation that prompted this decision?

## Decision

What did we decide to do?

## Consequences

### Positive
- Good outcome 1
- Good outcome 2

### Negative
- Trade-off 1
- Limitation 1

### Mitigation
- How we address the negative consequences
```

## Guidelines

### When to Create an ADR

Create an ADR for decisions that:
- Have significant impact on the system
- Are difficult to change later
- Affect multiple components or teams
- Have non-obvious trade-offs
- Need to be explained to new team members

### When NOT to Create an ADR

Don't create ADRs for:
- Trivial implementation details
- Obvious best practices
- Temporary workarounds
- Personal preferences without technical impact

### Good ADR Characteristics

- **Specific**: Addresses a concrete decision
- **Contextualized**: Explains why the decision was needed
- **Balanced**: Acknowledges trade-offs honestly
- **Actionable**: Provides clear direction
- **Permanent**: Kept even when superseded

## Superseding ADRs

When an ADR is superseded:

1. **Update the old ADR**: Change status to "Superseded by ADR-XXXX"
2. **Create a new ADR**: Reference the old one in the context
3. **Keep both**: Don't delete the old ADR (it's historical record)

Example:
```markdown
# 3. Repository Pattern for Data Access

Status: Accepted

Supersedes: Direct storage.ts access (not documented as ADR)
```

## References

- [ADR GitHub Organization](https://adr.github.io/)
- [Michael Nygard's Article](http://thinkrelevance.com/blog/2011/11/15/documenting-architecture-decisions)
- [ADR Tools](https://github.com/npryce/adr-tools)

---

**Last Updated**: 2025-10-30  
**Maintainer**: outTime Team




