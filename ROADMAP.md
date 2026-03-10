[한국어](ROADMAP.ko.md) | **English**

# Roadmap

This document outlines the current priorities and future direction of ai-nexus. It's meant to help contributors understand where the project is heading and where help is most needed.

## Now

> Actively working on or accepting contributions for these.

- [ ] **Add missing community skill rules** — Django (#1), Kubernetes (#2), AWS (#3), GraphQL (#5), CI/CD (#6), Flutter (#41), Testing Frameworks (#44)
- [ ] **Korean keyword support for new skills** (#45) — Semantic router already supports Korean for some rules, but newly added skills need Korean equivalents
- [ ] **Improve terminal UI/UX** (#50) — Better formatting, colors, and interactive experience

## Next

> Planned for upcoming releases.

- [ ] **Token count display in test command** (#25) — Show how many tokens are loaded before/after rule selection so users can see the savings
- [ ] **Duplicate rule detection** (#48) — Warn when rules overlap or conflict across sources
- [ ] **Improve doctor command with hook verification** (#47) — Better diagnostics for setup issues
- [ ] **Selective AGENTS.md generation for Codex** (#46) — Currently all rules are merged into one file; need smarter filtering
- [ ] **Cursor user guide for .mdc semantic search** (#49) — Documentation for Cursor-specific workflows

## Later

> On the radar, but not yet prioritized.

- [ ] **Prompt compression for loaded rules** (#26) — Reduce token usage further by compressing rule content before injection
- [ ] **Usage examples and testimonials** — Real-world use cases from the community to help new users understand the value
- [ ] **Broader promotion** — Hacker News, dev.to, awesome-lists, and developer communities beyond Reddit

## How to Help

- Pick any issue linked above and open a PR
- Suggest new ideas via [GitHub Issues](https://github.com/JSK9999/ai-nexus/issues)
- Share your experience using ai-nexus — feedback helps shape priorities
