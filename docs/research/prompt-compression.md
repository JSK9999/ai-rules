# Prompt Compression Research

> **Goal**: Combine selective loading (semantic router) + compression for maximum token savings (~85% per request).

## Current State

- **Selective loading**: ai-nexus semantic router loads only relevant rules per prompt
- **Compression**: Not implemented — full rule content is sent as-is

## Research Areas

### 1. LLMLingua (Microsoft)

**What**: Small LM (BERT-level) filters unnecessary tokens via data distillation from GPT-4.

**Pros**:
- 20x compression with minimal performance loss
- 3–6x faster than original LLMLingua
- Task-agnostic, works across domains
- JavaScript package: `@atjsh/llmlingua-2` (Node + browser)

**Cons**:
- Heavy deps: `@huggingface/transformers`, `@tensorflow/tfjs`, `js-tiktoken`
- Model size: 57MB (TinyBERT) to 710MB (BERT)
- Adds ~1–3s latency for compression

**Integration**: Optional opt-in via `PROMPT_COMPRESSION_LLMLINGUA=true`. Requires `npm install @atjsh/llmlingua-2`.

### 2. Semantic Summarization

**What**: Use a fast model (GPT-4o-mini, Claude Haiku) to condense rule content while preserving meaning.

**Pros**:
- High fidelity — preserves intent
- Works well for verbose rules

**Cons**:
- API cost per prompt (~$0.001–0.005)
- Latency (~500ms–2s)
- Risk of losing nuance

**Integration**: `PROMPT_COMPRESSION_SEMANTIC=true` + existing API keys.

### 3. Redundancy Removal (Heuristic)

**What**: Rule-based compression without ML:
- Strip frontmatter
- Remove repeated section headers across rules
- Collapse bullet lists with overlapping content
- Remove filler words (e.g. "always", "never" when redundant)
- Deduplicate repeated patterns (e.g. "Validate inputs" in multiple rules)

**Pros**:
- Zero dependencies
- Zero latency
- Zero cost
- Predictable, auditable

**Cons**:
- Lower compression ratio (~30–50% vs 60–80% for ML)
- May miss semantic redundancy

**Integration**: Default, always-on when `PROMPT_COMPRESSION_ENABLED=true`.

## Recommended Approach

**Phase 1 (Implemented)**: Heuristic compression as default
- Fast, no deps, immediate value
- Targets: frontmatter strip, whitespace collapse, section dedup, bullet consolidation

**Phase 2 (Optional)**: LLMLingua for users who want max compression
- Opt-in via env + optional dependency
- Fallback to heuristic if not installed

**Phase 3 (Future)**: Semantic summarization as premium option
- For teams with API budget
- Best for very long rule sets

## Token Savings Estimate

| Approach              | Compression | Combined with selective loading |
|-----------------------|-------------|----------------------------------|
| Heuristic only        | ~35%        | ~70% total                      |
| Heuristic + LLMLingua | ~60%        | ~85% total                      |
| Semantic summarization| ~50%        | ~80% total                      |

*Selective loading alone: ~50% (load 2–3 rules vs 10+). Combined: multiplicative.*

## References

- [LLMLingua-2 (Microsoft Research)](https://www.microsoft.com/en-us/research/project/llmlingua/llmlingua-2/)
- [@atjsh/llmlingua-2 (npm)](https://www.npmjs.com/package/@atjsh/llmlingua-2)
- [CompactPrompt (arXiv 2510.18043)](https://arxiv.org/abs/2510.18043)
- [ETH Zurich study: loading all rules hurts performance ~3%, cost +20%](https://arxiv.org/pdf/2602.11988)
