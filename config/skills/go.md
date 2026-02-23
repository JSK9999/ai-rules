---
description: Go coding standards and idioms
keywords: [go, golang]
---

# Go

## Style
- Follow Effective Go and Go Code Review Comments
- Use `gofmt` / `goimports` — no style debates
- Keep functions short. If it needs a comment, it's too complex
- Use meaningful package names — short, lowercase, no underscores

## Error Handling
- Check errors immediately. Never ignore with `_`
- Return errors, don't panic. Reserve panic for truly unrecoverable
- Wrap errors with context: `fmt.Errorf("fetch user %d: %w", id, err)`
- Use `errors.Is` and `errors.As` for error checking
- Define sentinel errors: `var ErrNotFound = errors.New("not found")`

## Patterns
- Accept interfaces, return structs
- Use composition over inheritance (embed structs)
- Use table-driven tests
- Keep interfaces small (1-3 methods)
- Use `context.Context` as first parameter for cancellation

## Concurrency
- Don't communicate by sharing memory; share memory by communicating
- Use channels for coordination, mutexes for state protection
- Always clean up goroutines (use `context` or `done` channel)
- Use `sync.WaitGroup` for fan-out patterns
- Use `errgroup` for concurrent error handling

## Project Layout
```
cmd/app/main.go
internal/
  service/
  repository/
pkg/          # Public libraries only
go.mod
```
