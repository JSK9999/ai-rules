[한국어](README.ko.md) | **English**

# ai-nexus

> Only 2-3 relevant rules and skills load per prompt.
> The rest are hidden from Claude completely.
> Your rules and skills also work in Cursor and Codex — no extra setup.

[![npm version](https://img.shields.io/npm/v/ai-nexus.svg)](https://www.npmjs.com/package/ai-nexus)
[![npm downloads](https://img.shields.io/npm/dw/ai-nexus.svg)](https://www.npmjs.com/package/ai-nexus)
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**[Homepage](https://jsk9999.github.io/ai-nexus/)** | **[Documentation](https://jsk9999.github.io/ai-nexus/docs.html)** | **[Roadmap](ROADMAP.md)**

```bash
npx ai-nexus install
```

---

## The Problem

Rules with `alwaysApply: true` load on every prompt — the more you have, the more tokens you waste. With `alwaysApply: false`, Claude reads every rule's description to decide what to load — all your rule descriptions sit in Claude's context while it picks 2-3. You're paying Claude to filter rules instead of writing code. Skills and commands only load when invoked, but that means you have to remember what to call and when.

So most people only install a handful of rules. The more you have, the harder it is to know what's there — useful rules end up never loading or never getting installed in the first place.

A [recent study from ETH Zurich](https://arxiv.org/pdf/2602.11988) (12 repos, 5,694 PRs) confirms this: **loading all rules at once hurts performance by ~3% and increases cost by 20%+.** The takeaway: only relevant context should be loaded per prompt.

On top of that, every AI tool has its own format — `.claude/rules/*.md`, `.cursor/rules/*.mdc`, `.codex/AGENTS.md`. If you use more than one tool, you end up maintaining the same rules and skills in multiple places, and they inevitably drift apart.

## The Solution

**ai-nexus** filters rules **before Claude sees them**. A semantic router hook runs on each prompt, picks 2-3 relevant files, and physically parks the rest in `rules-inactive/`. Claude only sees what it needs — it doesn't even know the rest exist. Filtering is done by keyword matching (free) or GPT-4o-mini (~$0.50/month), not by Claude.

Nothing is deleted — just parked in `rules-inactive/` and reactivated when the next prompt needs it. Write once, deploy across all your tools:

```
Write once:
  config/rules/commit.md
  config/skills/react.md

Deploy everywhere:
  ✓ Claude Code  → .claude/rules/ (with semantic routing)
  ✓ Cursor       → .cursor/rules/*.mdc (auto-converted)
  ✓ Codex        → .codex/AGENTS.md (aggregated)

One source of truth. Every tool in sync.
Only 2-3 relevant rules and skills loaded per prompt.
```

---

## Why ai-nexus?

| | Benefit | Detail |
|---|---|---|
| **Filter before Claude, not inside Claude** | However many installed, only 2-3 loaded per prompt | Native `alwaysApply: false` has Claude read all descriptions to decide. ai-nexus filters before Claude starts — Claude never sees irrelevant files. Filtering costs $0 (keywords) or ~$0.50/mo (GPT-4o-mini). |
| **Write once, deploy everywhere** | One file → three tools | Write a single `.md` file. ai-nexus auto-converts to `.mdc` for Cursor and `AGENTS.md` for Codex. No more copy-pasting. |
| **AI-powered selection** | GPT-4o-mini or Claude Haiku picks files for you | A hook runs on every prompt, loading only what you need. Costs ~$0.50/month. Falls back to keyword matching with zero cost. |
| **Team-wide consistency** | Git-based sharing | Everyone installs from the same repo. `npx ai-nexus update` keeps the whole team in sync. |
| **Your edits are safe** | Non-destructive updates | Install and update never overwrite your local customizations. Only new files are added. |
| **Community marketplace** | Browse, install, remove — from your browser | `npx ai-nexus browse` opens a local web UI. 230+ community rules and skills available instantly after PR merge. |

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

![init](https://raw.githubusercontent.com/JSK9999/ai-nexus/main/docs/nexus-setup.gif)

**Installed Rules**

![list](https://raw.githubusercontent.com/JSK9999/ai-nexus/main/docs/nexus-rules.gif)

---

## Supported Tools

| Tool | How it works | Token overhead |
|------|--------------|----------------|
| **Claude Code** | Semantic Router dynamically loads relevant rules and skills per prompt | Only 2-3 files loaded |
| **Cursor** | Converts to `.mdc` format; Cursor's built-in search handles filtering | Depends on Cursor's search |
| **Codex** | Aggregated `AGENTS.md` (all files merged into single file) | All files loaded |

---

## How It Works

### Claude Code: Semantic Router

Unlike `alwaysApply: false` where Claude reads all descriptions inside its context, ai-nexus runs a hook **before** Claude starts. It moves relevant files into `rules/` and parks the rest in `rules-inactive/`. Claude never sees the irrelevant ones:

```
~/.claude/
├── hooks/
│   └── semantic-router.cjs   # Runs on each prompt
├── settings.json             # Hook configuration
├── rules/                    # Active rules
└── rules-inactive/           # Parked rules (not loaded)
```

**With AI routing** (optional):
```bash
export OPENAI_API_KEY=sk-xxx        # or ANTHROPIC_API_KEY
export SEMANTIC_ROUTER_ENABLED=true
```

GPT-4o-mini or Claude Haiku analyzes your prompt and picks the right rules and skills. Cost: ~$0.50/month. Requires explicit opt-in.

> **Full setup guide:** [Semantic Router Setup](https://jsk9999.github.io/ai-nexus/docs.html#semantic-router-setup) — provider selection, environment variables, custom models, and verification.

**Without AI** (default):
Keyword matching activates rules and skills based on words in your prompt. Zero cost, no API key needed.

### Cursor: Rule Converter

ai-nexus converts `.md` rules to Cursor's `.mdc` format, adding `description` and `alwaysApply` metadata automatically:

```markdown
---
description: Git commit message conventions and best practices
alwaysApply: false
---

# Commit Rules
...
```

After conversion, **Cursor's built-in semantic search** handles rule filtering — ai-nexus does not run a router for Cursor. The value is unified rule management: write rules once, use them across Claude Code, Cursor, and Codex.

### Codex: Aggregated Rules

Individual rule files are aggregated into a single `AGENTS.md` file, which is loaded at session start. No dynamic loading.

> **Codex users: select only the rules you need.** Since all rules are loaded every session, installing too many wastes tokens. Use the interactive wizard (`npx ai-nexus install`) to pick only relevant categories and files. Recommended starting set: `rules/essential.md`, `rules/commit.md`, `rules/security.md`.

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

## Update & Local Priority

Rules are installed as independent copies. Your customizations are always safe:

- **Existing files are never overwritten** during install or update
- Only new files from source are added
- `npx ai-nexus update` syncs new rules from the latest package
- Use `--force` to override (backup first!)

```bash
# This will NOT overwrite your custom commit.md
npx ai-nexus update

# This WILL overwrite everything
npx ai-nexus update --force
```

> **Migrating from symlink mode?** Just run `npx ai-nexus update` — symlinks are automatically converted to copies.

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
├── rules/                    # Copied from .ai-nexus/config/rules
└── commands/                 # Copied from .ai-nexus/config/commands

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

## Network & Privacy

ai-nexus runs locally. Here is a complete list of network requests the tool may make:

| When | Destination | Purpose | Required? |
|------|-------------|---------|-----------|
| Semantic routing (per prompt) | `api.openai.com` | AI-powered rule selection via GPT-4o-mini | **Opt-in only** — requires `SEMANTIC_ROUTER_ENABLED=true` + `OPENAI_API_KEY` |
| Semantic routing (per prompt) | `api.anthropic.com` | AI-powered rule selection via Claude Haiku | **Opt-in only** — requires `SEMANTIC_ROUTER_ENABLED=true` + `ANTHROPIC_API_KEY` |
| `search`, `get`, `browse` | `api.github.com` | Fetch community rule registry | Only when you run these commands |
| `get` | `raw.githubusercontent.com` | Download rule file content | Only when you run `get` |
| `browse` | `localhost:3847` | Local-only HTTP server for marketplace UI | Bound to `127.0.0.1` — not accessible from other machines |
| `install --rules <url>` | Git remote host | Clone a team rules repository | Only when you provide a `--rules` URL |

**No telemetry. No analytics. No external data collection.**

- API keys are read from environment variables only — never stored on disk or logged.
- Your prompts are sent to OpenAI/Anthropic **only** when semantic routing is explicitly enabled. Without it, keyword-based fallback runs entirely offline.
- The `browse` server binds to `127.0.0.1` and is not accessible from the network.

---

## Rule Marketplace

![browse](https://raw.githubusercontent.com/JSK9999/ai-nexus/main/docs/nexus-marketplace.png)

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

Method: Keyword matching

Selected files (3):
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
cd ai-nexus && npm install && npm run build

# Add your rule to config/rules/, then test:
node bin/ai-nexus.cjs test "your prompt"
```

---

## FAQ

**Do I actually need this?**

If you use one tool with a few rules or skills, probably not — your tool's built-in settings are enough. ai-nexus is for people who:
- Install a lot of rules/skills and want them loaded efficiently (however many installed, only 2-3 loaded)
- Use **multiple tools** (Claude Code + Cursor + Codex) and want one source of truth
- Want **230+ community rules and skills** without writing everything from scratch

**I only use skills, not rules. Is this relevant?**

Yes. The semantic router handles skills, rules, commands, and agents equally. Install 50 skills and only the relevant ones load per prompt. The "install everything without worrying about tokens" benefit applies to skills just as much as rules.

**How is this different from Claude Code skills (`alwaysApply: false`)?**

Skills handle on-demand loading within Claude Code. ai-nexus adds:
- **Cross-tool sync** — deploy skills to Cursor and Codex too, not just Claude Code
- **Smarter routing** — keyword matching (free) or a cheaper model instead of Claude doing the filtering
- **Community library** — 230+ rules and skills ready to use

**Why not just put everything in CLAUDE.md or AGENTS.md?**

Works fine with 5 files. With 50+, you're burning tokens on Docker best practices while writing a commit message. The [ETH Zurich study](https://arxiv.org/pdf/2602.11988) shows this hurts both performance and cost. ai-nexus loads only 2-3 relevant files per prompt.

**Skills vs rules?**

Skills are workflows you explicitly invoke (`/commit`, `/review`). Rules are passive guidelines that apply automatically (coding conventions, security standards, naming patterns). ai-nexus routes both based on your prompt — no need to remember which to invoke.

---

## Support

If you find ai-nexus useful, give it a ⭐ on GitHub — it helps others discover the project and motivates continued development.

[![Star on GitHub](https://img.shields.io/github/stars/JSK9999/ai-nexus?style=social)](https://github.com/JSK9999/ai-nexus)

---

## License

Apache 2.0
