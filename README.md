# ai-rules

AI coding assistant rule manager for **Claude Code**, **Codex**, and **Cursor**.

Manage, share, and sync rules across teams via Git repositories.

## Quick Start

```bash
# Install with built-in rules (interactive mode)
npx ai-rules install -i

# Or quick install
npx ai-rules install

# Use your team's rules
npx ai-rules install --rules github.com/your-org/your-rules
```

## Why ai-rules?

**Problem**: AI coding assistants load all rules on every request, wasting tokens.

**Solution**: Organize rules with semantic routing that loads only needed rules.

| Before | After |
|--------|-------|
| 4,300 lines loaded every time | Only needed rules loaded |
| Each developer manages own rules | Team shares rules via Git |
| No sync when rules update | `ai-rules update` syncs all |

## Supported Tools

| Tool | Support | Features |
|------|---------|----------|
| Claude Code | ✅ | Semantic Router (dynamic loading) |
| Cursor | ✅ | Semantic Search (.mdc files) |
| Codex | ✅ | Static AGENTS.md |

## Commands

| Command | Description |
|---------|-------------|
| `init` | Initialize rules in current project |
| `init -i` | Interactive mode with file selection |
| `install` | Install rules globally |
| `update` | Update rules to latest version |
| `list` | List installed rules |
| `add <url>` | Add rules from a Git repository |
| `remove <name>` | Remove a rule source |
| `test <input>` | Test which rules will be loaded |

---

## Semantic Router (Claude Code)

The Semantic Router dynamically activates only the rules needed for each prompt.

### How It Works

```
User: "Write a commit message"
       ↓
Semantic Router analyzes prompt
       ↓
Activates: commit.md, essential.md
Deactivates: react.md, security.md (not needed)
       ↓
Token savings: ~84%
```

### Setup

When you install with ai-rules, the hook is automatically set up:

```
~/.claude/
├── hooks/
│   └── semantic-router.cjs  ← Runs on each prompt
├── settings.json            ← Hook configuration
└── rules/                   ← Active rules
```

### Environment Variables

```bash
# Enable AI-based routing (uses OpenAI or Anthropic)
SEMANTIC_ROUTER_ENABLED=true
OPENAI_API_KEY=sk-xxx
# or
ANTHROPIC_API_KEY=sk-ant-xxx
```

Without API keys, falls back to keyword matching.

---

## Cursor Support

Cursor uses `.mdc` files with semantic search based on `description` fields.

```bash
npx ai-rules init -i
# Select "Cursor" in tool selection
```

Rules are automatically converted to `.mdc` format:

```markdown
---
description: Commit message conventions
alwaysApply: false
---

# Commit Rules
...
```

---

## Using Team Rules

### Option 1: Install with --rules

```bash
# Project-level (current directory)
npx ai-rules init --rules github.com/your-org/team-rules

# Global (~/.claude/)
npx ai-rules install --rules github.com/your-org/team-rules
```

### Option 2: Add rules later

```bash
npx ai-rules add github.com/your-org/security-rules
npx ai-rules add github.com/your-org/react-rules --name react
```

### Updating rules

```bash
# Pull latest from all Git sources and sync
npx ai-rules update
```

---

## Creating a Rules Repository

Your rules repository should have this structure:

```
your-rules/
├── config/
│   ├── rules/          # Always loaded
│   │   └── essential.md
│   ├── commands/       # Slash commands (/commit)
│   │   └── commit.md
│   ├── skills/         # Domain knowledge (react, rust)
│   │   └── react.md
│   ├── agents/         # Sub-agent definitions
│   │   └── reviewer.md
│   ├── contexts/       # Context files (@dev)
│   │   └── dev.md
│   ├── hooks/          # Semantic router hook
│   │   └── semantic-router.cjs
│   └── settings.json   # Claude Code hook config
└── README.md
```

### Rule file format

```markdown
---
description: When this rule should be loaded
---

# Rule Title

Your rule content here...
```

The `description` field helps AI assistants decide when to load the rule.

---

## Installation Modes

### Symlink (default)

```bash
npx ai-rules install
```

- Rules are symlinked to source
- `update` instantly syncs changes
- Cannot modify rules directly

### Copy

```bash
npx ai-rules install --copy
```

- Rules are copied as files
- Can modify rules locally
- `update` respects local changes (adds new files only)

---

## Local Priority

ai-rules respects your local customizations:

- **Existing files are never overwritten** during install/update
- Only new files from the source are added
- Use `--force` with update to overwrite all files

---

## How It Works

```
.ai-rules/              # ai-rules data
├── config/             # Merged rules from all sources
├── sources/            # Git repositories
│   ├── team-rules/
│   └── security-rules/
└── meta.json           # Installation metadata

.claude/                # Claude Code reads from here
├── hooks/              # Semantic router
├── settings.json       # Hook configuration
├── rules/       → symlink or copy
├── commands/    → symlink or copy
└── ...

.cursor/                # Cursor reads from here
└── rules/
    ├── essential.mdc
    └── commit.mdc
```

---

## Example Workflows

### Team Setup

```bash
# 1. Create rules repo on GitHub
# 2. Each team member:
npx ai-rules install --rules github.com/acme/claude-rules

# 3. When rules update:
npx ai-rules update
```

### Multi-tool Setup

```bash
# Install for all tools
npx ai-rules install -i
# Select: Claude Code, Codex, Cursor
```

### Multi-source Setup

```bash
# Base rules from company
npx ai-rules install --rules github.com/acme/base-rules

# Add team-specific rules
npx ai-rules add github.com/acme/frontend-rules

# Add security rules
npx ai-rules add github.com/acme/security-rules

# Update all at once
npx ai-rules update
```

---

## License

MIT
