[한국어](README.ko.md) | **English**

# ai-nexus

> Stop wasting tokens. Load only the rules you need.

AI coding assistant rule manager for **Claude Code**, **Cursor**, and **Codex**.

[![npm version](https://img.shields.io/npm/v/ai-nexus.svg)](https://www.npmjs.com/package/ai-nexus)
[![npm downloads](https://img.shields.io/npm/dw/ai-nexus.svg)](https://www.npmjs.com/package/ai-nexus)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**[Homepage](https://jsk9999.github.io/ai-nexus/)** | **[Documentation](https://jsk9999.github.io/ai-nexus/docs.html)**

```bash
npx ai-nexus install
```

---

## The Problem

Every time you ask Claude Code a question, it loads **all** your rules — React rules when you're asking about Git commits, security rules when you're styling a button.

The more rules you add, the more tokens get wasted on every single prompt.

## The Solution

**ai-nexus** uses a semantic router to load only relevant rules:

```
You: "Write a commit message"

Semantic Router activates:
  ✓ commit.md (needed)
  ✓ essential.md (always on)
  ✗ react.md (skipped)
  ✗ security.md (skipped)

Add as many rules as you want — only the relevant ones are loaded.
```

---

## Quick Start

```bash
# Interactive setup wizard (default)
npx ai-nexus install

# Quick install with defaults
npx ai-nexus install -q

# Use your team's rules
npx ai-nexus install --rules github.com/your-org/team-rules
```

### Demo

**Setup Wizard**

![init](https://raw.githubusercontent.com/JSK9999/ai-nexus/main/docs/ai-nexus-init.gif)

**Installed Rules**

![list](https://raw.githubusercontent.com/JSK9999/ai-nexus/main/docs/ai-nexus-list.gif)

**Rule Marketplace**

![browse](https://raw.githubusercontent.com/JSK9999/ai-nexus/main/docs/ai-nexus-browse.gif)

---

## Supported Tools

| Tool | How it works | Token overhead |
|------|--------------|----------------|
| **Claude Code** | Semantic Router dynamically swaps rules per prompt | Only relevant rules loaded |
| **Cursor** | Semantic Search via `.mdc` description fields | Description-based filtering |
| **Codex** | Static `AGENTS.md` (no dynamic loading) | All rules loaded |

---

## How It Works

### Claude Code: Semantic Router

A hook runs on every prompt, analyzing what rules you actually need:

```
~/.claude/
├── hooks/
│   └── semantic-router.cjs   # Runs on each prompt
├── settings.json             # Hook configuration
├── rules/                    # Active rules
└── rules-inactive/           # Parked rules (not loaded)
```

**With AI routing** (recommended):
```bash
export OPENAI_API_KEY=sk-xxx        # or ANTHROPIC_API_KEY
export SEMANTIC_ROUTER_ENABLED=true
```

GPT-4o-mini or Claude Haiku analyzes your prompt and picks the right rules. Cost: ~$0.50/month.

**Without AI** (fallback):
Keyword matching activates rules based on words in your prompt.

### Cursor: Semantic Search

Rules are converted to `.mdc` format with description metadata:

```markdown
---
description: Git commit message conventions and best practices
alwaysApply: false
---

# Commit Rules
...
```

Cursor's built-in semantic search loads rules based on relevance.

### Codex: Static Rules

A single `AGENTS.md` file is loaded at session start. No dynamic loading.

---

## Commands

| Command | Description |
|---------|-------------|
| `install` | Install rules globally (interactive wizard) |
| `install -q` | Quick install with defaults |
| `init` | Install in current project (`.claude/`) |
| `update` | Sync latest rules (respects local changes) |
| `list` | Show installed rules |
| `test <prompt>` | Preview which rules would load |
| `search [keyword]` | Search community rules from the registry |
| `get <filename>` | Download a rule from the community registry |
| `add <url>` | Add rules from a Git repository |
| `remove <name>` | Remove a rule source |
| `browse` | Open rule marketplace in browser |
| `doctor` | Diagnose installation issues |
| `uninstall` | Remove ai-nexus installation |

---

## Team Rules

Share rules across your team via Git:

```bash
# Everyone installs from the same source
npx ai-nexus install --rules github.com/acme/team-rules

# When rules are updated
npx ai-nexus update
```

### Creating a Rules Repository

```
team-rules/
├── config/
│   ├── rules/           # Core rules (essential.md, security.md)
│   ├── commands/        # Slash commands (/commit, /review)
│   ├── skills/          # Domain knowledge (react.md, rust.md)
│   ├── agents/          # Sub-agents (code-reviewer.md)
│   ├── contexts/        # Context files (@dev, @research)
│   ├── hooks/           # semantic-router.cjs
│   └── settings.json    # Claude Code hook config
└── README.md
```

### Rule Format

```markdown
---
description: When to load this rule (used by semantic router)
---

# Rule Title

Your rule content...
```

---

## Installation Modes

### Symlink (default)

```bash
npx ai-nexus install
```

- Rules link to source → `update` syncs instantly
- Cannot edit rules directly (edit source instead)

### Copy

```bash
npx ai-nexus install --copy
```

- Rules are independent copies
- Can edit locally
- `update` only adds new files, never overwrites

---

## Local Priority

Your customizations are always safe:

- **Existing files are never overwritten** during install or update
- Only new files from source are added
- Use `--force` to override (backup first!)

```bash
# This will NOT overwrite your custom commit.md
npx ai-nexus update

# This WILL overwrite everything
npx ai-nexus update --force
```

---

## Directory Structure

```
.ai-nexus/                    # ai-nexus metadata
├── config/                   # Merged rules from all sources
├── sources/                  # Cloned Git repositories
└── meta.json                 # Installation info

.claude/                      # Claude Code
├── hooks/semantic-router.cjs
├── settings.json
├── rules/          → .ai-nexus/config/rules
└── commands/       → .ai-nexus/config/commands

.cursor/rules/                # Cursor (.mdc files)
├── essential.mdc
└── commit.mdc

.codex/AGENTS.md              # Codex
```

---

## Examples

### Personal Setup

```bash
npx ai-nexus install
# Select: Claude Code, Cursor
# Select: rules, commands, hooks, settings
# Template: React/Next.js
# Mode: symlink
```

### Team Setup

```bash
# 1. Create team rules repo on GitHub

# 2. Each developer:
npx ai-nexus install --rules github.com/acme/team-rules

# 3. Weekly sync:
npx ai-nexus update
```

### Multi-Source Setup

```bash
# Base company rules
npx ai-nexus install --rules github.com/acme/base-rules

# Add frontend team rules
npx ai-nexus add github.com/acme/frontend-rules

# Add security rules
npx ai-nexus add github.com/acme/security-rules

# Update all at once
npx ai-nexus update
```

---

## Rule Marketplace

![browse](https://raw.githubusercontent.com/JSK9999/ai-nexus/main/docs/browse.png)

Open the web-based marketplace to search, install, and remove rules with one click:

```bash
npx ai-nexus browse
```

- Browse community rules with real-time search and category filters
- Install/remove rules directly from the browser
- View tool status (Claude Code, Cursor, Codex) and diagnostics
- Runs locally on `http://localhost:3847`

---

## Community Registry

Browse and download community-contributed rules directly from GitHub — no `npm publish` needed.

```bash
# List all available rules
npx ai-nexus search

# Search by keyword
npx ai-nexus search react
```

```
  Results for "react":

  skills/
    react.md - React/Next.js best practices

  1 file(s) found.
  Use "ai-nexus get <filename>" to download.
```

```bash
# Download a rule
npx ai-nexus get react.md

# Specify category when name exists in multiple
npx ai-nexus get commit.md --category commands
```

Rules are downloaded from the [latest GitHub repo](https://github.com/JSK9999/ai-nexus/tree/main/config) to `~/.claude/`. Anyone can contribute new rules via PR — they become available to `search` and `get` immediately after merge.

---

## Testing

Preview which rules would load for a given prompt:

```bash
$ npx ai-nexus test "write a react component with hooks"

Selected rules (3):
  • rules/essential.md
  • rules/react.md
  • skills/react.md
```

---

## Contributing

We welcome rule contributions! Contributed rules are instantly available via `ai-nexus search` and `ai-nexus get` — no npm publish needed.

1. **Suggest a rule**: [Open a Rule Request](https://github.com/JSK9999/ai-nexus/issues/new?template=rule-request.yml)
2. **Submit a rule**: See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide

```bash
# Quick start for contributors
git clone https://github.com/JSK9999/ai-nexus.git
cd ai-rules && npm install && npm run build

# Add your rule to config/rules/, then test:
node bin/ai-rules.cjs test "your prompt"
```

---

## License

Apache 2.0
