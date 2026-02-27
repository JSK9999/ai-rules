# Contributing to ai-nexus

Thanks for your interest in contributing! ai-nexus grows through community rules.

## How to Contribute a Rule

### 1. Choose a Category

| Directory | Purpose | Example |
|-----------|---------|---------|
| `config/rules/` | Core coding rules | `security.md`, `code-thresholds.md` |
| `config/commands/` | Slash commands (`/commit`, `/review`) | `commit.md`, `review.md` |
| `config/skills/` | Domain knowledge | `react.md`, `rust.md` |
| `config/agents/` | Sub-agent definitions | `code-reviewer.md` |
| `config/contexts/` | Context files (`@dev`) | `dev.md`, `research.md` |

### 2. Write Your Rule

Every rule file follows this format:

```markdown
---
description: One-line description of when this rule should activate
---

# Rule Title

## Section

- Clear, actionable instructions
- Keep it concise
```

**The `description` field is critical** - the semantic router uses it to decide when to load your rule.

### 3. Rule Writing Guidelines

- **Be specific**: "Use parameterized queries for all SQL" > "Write secure code"
- **Be actionable**: Tell the AI what to DO, not just what to know
- **Keep it short**: Aim for under 100 lines. Shorter rules = fewer tokens
- **No overlap**: Check existing rules to avoid duplication
- **Use examples**: Show correct and incorrect patterns when helpful

### 4. Naming Convention

```
config/rules/security.md          # lowercase, kebab-case
config/rules/code-thresholds.md   # descriptive name
config/skills/react-nextjs.md     # scope included
```

### 5. Test Your Rule

```bash
# Build the project
npm install && npm run build

# Test which rules activate for a prompt
node bin/ai-rules.cjs test "your test prompt here"
```

### 6. Submit a PR

1. Fork the repository
2. Create a branch: `git checkout -b rule/your-rule-name`
3. Add your rule file
4. Test it locally
5. Open a PR using the template

## Rule Review Criteria

PRs are reviewed based on:

- [ ] Has a clear, specific `description` field
- [ ] Does not duplicate existing rules
- [ ] Under 100 lines (exceptions for complex topics)
- [ ] Actionable instructions (not just reference material)
- [ ] Tested with `ai-nexus test`

## Bug Reports & Feature Requests

- **Bug**: Use the [Bug Report](https://github.com/JSK9999/ai-nexus/issues/new?template=bug-report.yml) template
- **Rule idea**: Use the [Rule Request](https://github.com/JSK9999/ai-nexus/issues/new?template=rule-request.yml) template
- **Feature**: Open a regular issue with context

## Development Setup

```bash
git clone https://github.com/JSK9999/ai-nexus.git
cd ai-nexus
npm install
npm run build
npm test
```

### Project Structure

```
src/              # CLI source code (TypeScript)
config/           # Rule files (distributed with npm)
bin/              # CLI entry point
docs/             # Landing page (GitHub Pages)
```

## Code Contributions

For CLI code changes (not rules):

1. Follow existing code style
2. Add tests for new features
3. Keep functions under 50 lines
4. Run `npm test` before submitting

## License

By contributing, you agree that your contributions will be licensed under Apache 2.0.
