# Semantic Router Hook

The semantic router hook analyzes keywords in prompts to **dynamically activate only the necessary rules**.

## How It Works

```
1. User enters a prompt
   "Write a commit message"
         ↓
2. UserPromptSubmit hook executes
         ↓
3. Keyword analysis ("commit" detected)
         ↓
4. Dynamic rule file swap
   - .claude/rules/commit.md ← activated
   - .claude/rules/security.md → rules-inactive/ (deactivated)
         ↓
5. Claude Code loads only necessary rules
         ↓
6. Token savings!
```

## Installation

### 1. Auto-install with ai-nexus

```bash
npx ai-nexus init
# or
npx ai-nexus install

# → Select hooks option
```

### 2. Manual Installation

```bash
# Project installation
mkdir -p .claude/hooks
cp config/hooks/semantic-router.cjs .claude/hooks/

# Or global installation
mkdir -p ~/.claude/hooks
cp config/hooks/semantic-router.cjs ~/.claude/hooks/
```

### 3. Register in Claude Code settings.json

Add to `.claude/settings.json` or `~/.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/semantic-router.cjs"
          }
        ]
      }
    ]
  }
}
```

## Directory Structure

```
~/.ai-nexus/config/      ← Original rules (all)
~/.claude/rules/         ← Active rules (only needed)
~/.claude/rules-inactive/ ← Inactive rules
```

## Keyword Mapping

| Keyword | Activated Rules |
|---------|-----------------|
| commit | rules/commit.md, commands/commit.md |
| pr, pull request, merge | rules/pr.md |
| security | rules/security.md, agents/security-rules.md |
| review | commands/review.md, skills/review.md |
| react, next, nextjs | skills/react.md |
| code | agents/code-standards.md |

## Always Active Rules

- `rules/essential.md` - Always active (cannot be deactivated)

## Environment Variables

```bash
# Enable semantic router (default: true)
SEMANTIC_ROUTER_ENABLED=true

# API keys for AI-based routing (optional)
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

## Token Savings

| Method | Rules Loaded | Estimated Tokens |
|--------|--------------|------------------|
| Load all | All rules (15) | ~5000 tokens |
| Semantic Router | Only needed (2-3) | ~800 tokens |
| **Savings** | | **~84%** |
