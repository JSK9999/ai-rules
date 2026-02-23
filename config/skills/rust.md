---
description: Rust coding patterns and best practices
keywords: [rust, cargo, rs]
---

# Rust

## Style
- Follow Rust API Guidelines and clippy lints
- Use `rustfmt` — no manual formatting
- Prefer `snake_case` for functions/variables, `CamelCase` for types
- Keep functions under 50 lines

## Ownership
- Prefer borrowing (`&T`, `&mut T`) over ownership transfer
- Use `Clone` only when necessary — avoid implicit copies
- Use lifetimes only when the compiler can't infer them
- Prefer `String` for owned data, `&str` for borrowed

## Error Handling
- Use `Result<T, E>` for recoverable errors
- Use `?` operator for error propagation
- Define custom error types with `thiserror`
- Use `anyhow` for application-level errors
- Never use `.unwrap()` in production code — use `.expect("reason")`

## Patterns
- Use `enum` with variants for state machines
- Prefer iterators over manual loops
- Use `Option` over sentinel values (null, -1)
- Use builder pattern for complex struct construction
- Derive traits: `Debug`, `Clone`, `PartialEq` as needed

## Project Structure
```
src/
  main.rs (or lib.rs)
  models/
  services/
tests/
  integration/
Cargo.toml
```

## Performance
- Use `&[T]` slices over `Vec<T>` in function parameters
- Avoid unnecessary allocations — reuse buffers
- Use `cargo bench` for benchmarking
- Profile before optimizing
