---
name: rust-best-practices
description: Comprehensive Rust best practices covering ownership, error handling, async patterns, testing, and project structure
version: 1.0.0
categories:
  - rust
  - best-practices
  - programming
  - systems
---

# Rust Best Practices

A comprehensive guide to writing idiomatic, safe, and performant Rust code.

## Overview

This skill provides best practices for Rust development across five key areas:

1. **Ownership & Borrowing** - Memory safety without garbage collection
2. **Error Handling** - Robust error management with Result and Option
3. **Async Patterns** - Efficient concurrent programming with async/await
4. **Testing** - Unit, integration, and property-based testing strategies
5. **Project Structure** - Organizing Rust projects and workspaces

## Default Configuration

**🚀 ALWAYS USE RUST EDITION 2024 FOR NEW PROJECTS**

```toml
[package]
name = "my-project"
version = "0.1.0"
edition = "2024"
rust-version = "1.85"  # Minimum required version
```

For workspaces:
```toml
[workspace.package]
edition = "2024"
rust-version = "1.85"

[workspace]
resolver = "2"
members = ["crates/*"]
```

**Why Edition 2024?**
- ✅ Native async fn in traits (no more async-trait crate!)
- ✅ if let chains for cleaner pattern matching
- ✅ Return position impl Trait in traits (RPITIT)
- ✅ Improved type inference for closures and iterators
- ✅ Better const fn capabilities for compile-time computation
- ✅ Enhanced error messages with actionable suggestions
- ✅ Improved lifetime elision
- ✅ Better diagnostic attributes

**See [edition-2024.md](references/edition-2024.md) for comprehensive Edition 2024 guide including:**
- Key features and improvements
- Migration guide from Edition 2021
- Best practices and common patterns
- Performance optimizations
- Security considerations

## Core Principles

### 1. Ownership & Borrowing

Rust's ownership system ensures memory safety at compile time. Follow these principles:

**Ownership Rules**:
- Each value has a single owner
- When the owner goes out of scope, the value is dropped
- Values can be moved or borrowed (immutably or mutably)

**Best Practices**:
```rust
// ✅ Good: Use references to avoid unnecessary moves
fn process_data(data: &Vec<u8>) {
    // data is borrowed, not moved
    println!("Processing {} bytes", data.len());
}

// ❌ Avoid: Taking ownership when borrowing suffices
fn process_data_bad(data: Vec<u8>) {
    println!("Processing {} bytes", data.len());
    // data is dropped here - caller can't use it anymore
}

// ✅ Good: Use mutable references for in-place modifications
fn append_data(buffer: &mut Vec<u8>, data: &[u8]) {
    buffer.extend_from_slice(data);
}

// ✅ Good: Return owned values when transferring ownership
fn create_buffer(size: usize) -> Vec<u8> {
    vec![0; size]
}
```

**Common Patterns**:
- Use `&T` for read-only access
- Use `&mut T` for exclusive write access
- Use `Clone` explicitly when you need ownership of data
- Prefer `&str` over `String` and `&[T]` over `Vec<T>` in function parameters

See [ownership-borrowing.md](references/ownership-borrowing.md) for detailed patterns.

### 2. Error Handling

Rust uses `Result<T, E>` and `Option<T>` for recoverable errors and absent values.

**Best Practices**:
```rust
use std::fs::File;
use std::io::{self, Read};
use thiserror::Error;

// ✅ Good: Define custom error types with thiserror
#[derive(Error, Debug)]
pub enum ConfigError {
    #[error("Failed to read config file: {0}")]
    IoError(#[from] io::Error),

    #[error("Invalid format: {0}")]
    ParseError(String),

    #[error("Missing required field: {0}")]
    MissingField(String),
}

// ✅ Good: Use ? operator for error propagation
fn read_config(path: &str) -> Result<String, ConfigError> {
    let mut file = File::open(path)?; // Automatically converts io::Error
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

// ✅ Good: Provide context with map_err or context from anyhow
fn parse_config(contents: &str) -> Result<Config, ConfigError> {
    serde_json::from_str(contents)
        .map_err(|e| ConfigError::ParseError(e.to_string()))
}

// ✅ Good: Use Option for absent values, not null
fn find_user(id: u64) -> Option<User> {
    database.get(id)
}

// ✅ Good: Combine Options and Results with combinators
fn get_user_email(id: u64) -> Option<String> {
    find_user(id)
        .and_then(|user| user.email)
        .map(|email| email.to_lowercase())
}
```

**Error Handling Strategy**:
- Use `Result` for operations that can fail
- Use `Option` for values that may be absent
- Use `thiserror` for library errors, `anyhow` for application errors
- Never use `unwrap()` or `expect()` in production without justification
- Provide meaningful error messages with context

See [error-handling.md](references/error-handling.md) for comprehensive patterns.

### 3. Async Patterns

Rust's async/await enables efficient concurrent programming without blocking threads.

**Best Practices**:
```rust
use tokio;
use futures::future::join_all;

// ✅ Good: Mark async functions clearly
async fn fetch_data(url: &str) -> Result<String, reqwest::Error> {
    let response = reqwest::get(url).await?;
    response.text().await
}

// ✅ Good: Run concurrent tasks with join or select
async fn fetch_multiple(urls: Vec<String>) -> Vec<Result<String, reqwest::Error>> {
    let futures = urls.iter().map(|url| fetch_data(url));
    join_all(futures).await
}

// ✅ Good: Use tokio::spawn for background tasks
async fn process_in_background(data: Vec<u8>) {
    tokio::spawn(async move {
        // Process data in background
        expensive_operation(data).await;
    });
}

// ✅ Good: Use channels for communication between tasks
use tokio::sync::mpsc;

async fn producer_consumer() {
    let (tx, mut rx) = mpsc::channel(100);

    // Producer task
    tokio::spawn(async move {
        for i in 0..10 {
            tx.send(i).await.unwrap();
        }
    });

    // Consumer task
    while let Some(value) = rx.recv().await {
        println!("Received: {}", value);
    }
}

// ❌ Avoid: Blocking operations in async code
async fn bad_async() {
    std::thread::sleep(Duration::from_secs(1)); // Blocks the executor!
}

// ✅ Good: Use async equivalents
async fn good_async() {
    tokio::time::sleep(Duration::from_secs(1)).await; // Doesn't block
}
```

**Async Guidelines**:
- Choose the right runtime (tokio for I/O, async-std, smol)
- Avoid blocking operations in async contexts
- Use structured concurrency (join, select, timeout)
- Handle cancellation properly
- Be mindful of task overhead

See [async-patterns.md](references/async-patterns.md) for advanced patterns.

### 4. Testing

Comprehensive testing ensures code reliability and maintainability.

**Best Practices**:
```rust
// ✅ Good: Unit tests in the same file
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_addition() {
        assert_eq!(add(2, 2), 4);
    }

    #[test]
    fn test_division() {
        assert_eq!(divide(10, 2), Ok(5));
        assert!(divide(10, 0).is_err());
    }

    #[test]
    #[should_panic(expected = "index out of bounds")]
    fn test_panic() {
        let v = vec![1, 2, 3];
        v[99]; // Should panic
    }
}

// ✅ Good: Integration tests in tests/ directory
// tests/integration_test.rs
use my_crate::Config;

#[test]
fn test_config_loading() {
    let config = Config::from_file("test_config.toml").unwrap();
    assert_eq!(config.version, "1.0");
}

// ✅ Good: Use property-based testing with proptest
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_reverse_twice(s in ".*") {
        let reversed = s.chars().rev().collect::<String>();
        let double_reversed = reversed.chars().rev().collect::<String>();
        assert_eq!(s, double_reversed);
    }
}

// ✅ Good: Use test fixtures and helpers
#[cfg(test)]
mod test_helpers {
    pub fn create_test_user() -> User {
        User {
            id: 1,
            name: "Test User".to_string(),
            email: Some("test@example.com".to_string()),
        }
    }
}

// ✅ Good: Test error conditions explicitly
#[test]
fn test_invalid_input() {
    let result = parse_config("");
    assert!(matches!(result, Err(ConfigError::ParseError(_))));
}
```

**Testing Strategy**:
- Write unit tests for individual functions
- Write integration tests for API boundaries
- Use `cargo test --doc` for documentation tests
- Use `cargo tarpaulin` or `cargo-llvm-cov` for coverage
- Mock external dependencies with traits
- Test edge cases and error paths

See [testing.md](references/testing.md) for comprehensive testing strategies.

### 5. Project Structure

Well-organized projects are easier to maintain and scale.

**Best Practices**:

**Example Cargo.toml**:
```toml
[package]
name = "my-project"
version = "0.1.0"
edition = "2024"
```

**Project Structure**:
```
my-project/
├── Cargo.toml          # Project manifest (with edition = "2024")
├── Cargo.lock          # Dependency lockfile (commit for binaries)
├── src/
│   ├── main.rs         # Binary entry point
│   ├── lib.rs          # Library entry point
│   ├── config/
│   │   ├── mod.rs      # Config module
│   │   └── parser.rs
│   ├── api/
│   │   ├── mod.rs
│   │   ├── routes.rs
│   │   └── handlers.rs
│   └── models/
│       ├── mod.rs
│       └── user.rs
├── tests/              # Integration tests
│   ├── common/
│   │   └── mod.rs      # Shared test utilities
│   └── api_tests.rs
├── benches/            # Benchmarks
│   └── benchmarks.rs
├── examples/           # Example code
│   └── simple.rs
└── README.md
```

**Workspace Organization**:
```toml
# Cargo.toml (workspace root)
[workspace]
members = [
    "crates/core",
    "crates/api",
    "crates/cli",
]
resolver = "2"

[workspace.package]
edition = "2024"

[workspace.dependencies]
# Shared dependencies
tokio = { version = "1.35", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
```

**Module Guidelines**:
- Use `mod.rs` or `module_name.rs` consistently
- Keep modules focused and cohesive
- Use `pub use` to re-export commonly used items
- Document public APIs with `///` doc comments
- Use `#[doc(hidden)]` for internal public items

**Dependency Management**:
```toml
[package]
edition = "2024"

[dependencies]
# Production dependencies
tokio = { version = "1.35", features = ["rt-multi-thread", "macros"] }
serde = { version = "1.0", features = ["derive"] }

[dev-dependencies]
# Test/bench dependencies only
proptest = "1.4"
criterion = "0.5"

[build-dependencies]
# Build script dependencies
cc = "1.0"
```

See [project-structure.md](references/project-structure.md) for detailed patterns.

## Performance Best Practices

### Memory Efficiency
```rust
// ✅ Good: Use iterators instead of collecting intermediate results
fn process_numbers(nums: &[i32]) -> Vec<i32> {
    nums.iter()
        .filter(|&&n| n > 0)
        .map(|&n| n * 2)
        .collect()
}

// ✅ Good: Use String::with_capacity for known sizes
let mut s = String::with_capacity(100);

// ✅ Good: Use Vec::with_capacity to avoid reallocations
let mut v = Vec::with_capacity(1000);
```

### Zero-Cost Abstractions
```rust
// ✅ Good: Iterator chains compile to tight loops
let sum: i32 = (1..1000)
    .filter(|x| x % 2 == 0)
    .map(|x| x * x)
    .sum();

// ✅ Good: Use inline for small, hot functions
#[inline]
fn add(a: i32, b: i32) -> i32 {
    a + b
}
```

## Security Best Practices

```rust
// ✅ Good: Use strong types to prevent misuse
struct UserId(u64);
struct PostId(u64);

// Can't accidentally pass PostId where UserId is expected

// ✅ Good: Sanitize user input
use validator::Validate;

#[derive(Validate)]
struct UserInput {
    #[validate(email)]
    email: String,

    #[validate(length(min = 8, max = 100))]
    password: String,
}

// ✅ Good: Use constant-time comparison for secrets
use subtle::ConstantTimeEq;

fn verify_token(provided: &[u8], expected: &[u8]) -> bool {
    provided.ct_eq(expected).into()
}
```

## Common Anti-Patterns to Avoid

### ❌ Unnecessary Cloning
```rust
// Bad
fn process(s: String) -> String {
    let s_clone = s.clone();
    s_clone.to_uppercase()
}

// Good
fn process(s: &str) -> String {
    s.to_uppercase()
}
```

### ❌ Panic in Libraries
```rust
// Bad
pub fn divide(a: i32, b: i32) -> i32 {
    a / b  // Panics on division by zero
}

// Good
pub fn divide(a: i32, b: i32) -> Result<i32, &'static str> {
    if b == 0 {
        Err("Division by zero")
    } else {
        Ok(a / b)
    }
}
```

### ❌ Ignoring Errors
```rust
// Bad
let _ = file.write_all(data);

// Good
file.write_all(data)
    .map_err(|e| eprintln!("Failed to write: {}", e))?;
```

## Tools and Linters

Essential tools for Rust development:

- **rustfmt**: Code formatting (`cargo fmt`)
- **clippy**: Advanced linting (`cargo clippy`)
- **cargo-audit**: Security vulnerability scanning
- **cargo-outdated**: Dependency version checking
- **cargo-deny**: License and dependency validation
- **cargo-watch**: Automatic rebuilds during development

**Recommended clippy configuration**:
```toml
# .cargo/config.toml or clippy.toml
[lints.rust]
unsafe_code = "forbid"

[lints.clippy]
enum_glob_use = "deny"
unwrap_used = "deny"
expect_used = "deny"
```

## References

- **[Edition 2024 Guide](references/edition-2024.md)** ⭐ Start here for Edition 2024 features
- [Ownership & Borrowing Patterns](references/ownership-borrowing.md)
- [Error Handling Strategies](references/error-handling.md)
- [Async Programming Patterns](references/async-patterns.md)
- [Testing Best Practices](references/testing.md)
- [Project Structure Guide](references/project-structure.md)

## Additional Resources

- [The Rust Book](https://doc.rust-lang.org/book/)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [Rust Performance Book](https://nnethercote.github.io/perf-book/)
- [Effective Rust](https://www.lurklurk.org/effective-rust/)
