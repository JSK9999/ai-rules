# Project Structure Guide

Comprehensive guide to organizing Rust projects, workspaces, modules, and dependencies.

## Table of Contents

1. [Basic Project Structure](#basic-project-structure)
2. [Module Organization](#module-organization)
3. [Workspace Management](#workspace-management)
4. [Dependency Management](#dependency-management)
5. [Feature Flags](#feature-flags)
6. [Build Scripts](#build-scripts)
7. [Documentation](#documentation)
8. [Best Practices](#best-practices)

## Basic Project Structure

### Binary Project

```
my-app/
├── Cargo.toml          # Project manifest
├── Cargo.lock          # Dependency lockfile (commit for binaries)
├── README.md           # Project description
├── LICENSE             # License file
├── .gitignore          # Git ignore rules
├── src/
│   ├── main.rs         # Binary entry point
│   ├── config.rs       # Configuration module
│   ├── cli.rs          # CLI argument parsing
│   └── lib.rs          # Optional library code
├── tests/              # Integration tests
│   └── integration_test.rs
├── benches/            # Benchmarks
│   └── benchmark.rs
└── examples/           # Example programs
    └── simple.rs
```

### Library Project

```
my-lib/
├── Cargo.toml
├── README.md
├── LICENSE
├── .gitignore
├── src/
│   ├── lib.rs          # Library entry point
│   ├── error.rs        # Error types
│   ├── types.rs        # Common types
│   └── utils/          # Utilities module
│       ├── mod.rs
│       ├── parser.rs
│       └── formatter.rs
├── tests/
│   ├── common/
│   │   └── mod.rs      # Shared test utilities
│   └── api_tests.rs
├── benches/
│   └── performance.rs
├── examples/
│   ├── basic.rs
│   └── advanced.rs
└── docs/               # Additional documentation
    └── architecture.md
```

### Mixed Binary and Library

```
my-project/
├── Cargo.toml
├── src/
│   ├── main.rs         # Binary uses the library
│   ├── lib.rs          # Library code
│   ├── config/
│   │   ├── mod.rs
│   │   └── parser.rs
│   └── api/
│       ├── mod.rs
│       └── routes.rs
└── tests/
    └── integration_test.rs
```

```rust
// src/main.rs
use my_project::Config;  // Use library code

fn main() {
    let config = Config::load().expect("Failed to load config");
    println!("Loaded config: {:?}", config);
}

// src/lib.rs
pub mod config;
pub mod api;

pub use config::Config;  // Re-export for convenience
```

## Module Organization

### Module Declaration

```rust
// src/lib.rs
pub mod config;      // Looks for src/config.rs or src/config/mod.rs
pub mod api;         // Looks for src/api.rs or src/api/mod.rs
mod internal;        // Private module

pub use config::Config;  // Re-export for easier access
pub use api::{Router, Route};

// Make everything in a module public
pub mod prelude {
    pub use crate::config::*;
    pub use crate::api::*;
}
```

### File-Based Modules (Rust 2018+)

```
src/
├── lib.rs
├── config.rs           # Module: config
└── api/
    ├── mod.rs          # Module: api
    ├── routes.rs       # Submodule: api::routes
    └── handlers.rs     # Submodule: api::handlers
```

```rust
// src/lib.rs
pub mod config;
pub mod api;

// src/api/mod.rs
pub mod routes;
pub mod handlers;

pub use routes::Router;
pub use handlers::{handle_get, handle_post};
```

### Alternative: Directory Name as Module (Rust 2018+)

```
src/
├── lib.rs
├── config.rs
└── api.rs              # Module: api
    ├── routes.rs       # If using include! or path attribute
    └── handlers.rs
```

```rust
// src/api.rs
mod routes;
mod handlers;

pub use routes::Router;
pub use handlers::{handle_get, handle_post};
```

### Nested Modules

```rust
// src/lib.rs
pub mod database {
    pub mod connection {
        pub struct Connection {
            // ...
        }

        impl Connection {
            pub fn new() -> Self {
                Self { /* ... */ }
            }
        }
    }

    pub mod query {
        pub fn execute(sql: &str) -> Result<(), Error> {
            // ...
        }
    }

    // Re-export for convenience
    pub use connection::Connection;
    pub use query::execute;
}

// Usage
use my_crate::database::Connection;
// Instead of: use my_crate::database::connection::Connection;
```

### Visibility Modifiers

```rust
// src/lib.rs
pub mod api;          // Public module
mod internal;         // Private module

// src/api.rs
pub struct PublicStruct {
    pub public_field: i32,
    private_field: String,
    pub(crate) crate_visible: bool,    // Visible within crate
    pub(super) parent_visible: i32,    // Visible to parent module
}

impl PublicStruct {
    pub fn new() -> Self { /* ... */ }
    fn private_method(&self) { /* ... */ }
    pub(crate) fn crate_method(&self) { /* ... */ }
}
```

## Workspace Management

### Workspace Structure

```
my-workspace/
├── Cargo.toml          # Workspace manifest
├── Cargo.lock          # Shared lockfile (commit this)
├── README.md
├── crates/
│   ├── core/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs
│   ├── api/
│   │   ├── Cargo.toml
│   │   └── src/
│   │       └── lib.rs
│   └── cli/
│       ├── Cargo.toml
│       └── src/
│           └── main.rs
└── examples/
    └── demo.rs
```

### Workspace Cargo.toml

```toml
[workspace]
members = [
    "crates/core",
    "crates/api",
    "crates/cli",
]

# Exclude directories
exclude = [
    "old-code",
    "experiments",
]

# Shared dependencies across workspace
[workspace.dependencies]
tokio = { version = "1.35", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
anyhow = "1.0"

# Shared metadata
[workspace.package]
version = "0.1.0"
edition = "2021"
license = "MIT OR Apache-2.0"
authors = ["Your Name <you@example.com>"]
```

### Member Crate Cargo.toml

```toml
# crates/api/Cargo.toml
[package]
name = "my-api"
version.workspace = true
edition.workspace = true
license.workspace = true

[dependencies]
# Use workspace dependency
tokio = { workspace = true }
serde = { workspace = true }

# Local workspace dependency
my-core = { path = "../core" }

# Crate-specific dependency
axum = "0.7"

[dev-dependencies]
anyhow = { workspace = true }
```

### Workspace Commands

```bash
# Build entire workspace
cargo build

# Build specific crate
cargo build -p my-api

# Test all crates
cargo test

# Test specific crate
cargo test -p my-core

# Run binary from workspace
cargo run -p my-cli

# Check all crates
cargo check --workspace
```

### Virtual Workspace

```toml
# Cargo.toml (root, no [package] section)
[workspace]
members = [
    "crates/*",  # Glob pattern
]

[workspace.dependencies]
# Shared dependencies
```

## Dependency Management

### Cargo.toml Sections

```toml
[package]
name = "my-app"
version = "0.1.0"
edition = "2021"
authors = ["Your Name <you@example.com>"]
license = "MIT OR Apache-2.0"
description = "A short description"
repository = "https://github.com/user/repo"
documentation = "https://docs.rs/my-app"
homepage = "https://example.com"
keywords = ["cli", "tool"]
categories = ["command-line-utilities"]
readme = "README.md"

[dependencies]
# From crates.io
serde = "1.0"

# With features
tokio = { version = "1.35", features = ["rt-multi-thread", "macros"] }

# Optional dependency (for feature flags)
mysql = { version = "24", optional = true }

# From git
my-lib = { git = "https://github.com/user/my-lib" }

# From git with branch/tag/commit
my-lib = { git = "https://github.com/user/my-lib", branch = "dev" }
my-lib = { git = "https://github.com/user/my-lib", tag = "v1.0.0" }
my-lib = { git = "https://github.com/user/my-lib", rev = "abc123" }

# From local path
my-local-lib = { path = "../my-local-lib" }

# Platform-specific dependencies
[target.'cfg(windows)'.dependencies]
winapi = "0.3"

[target.'cfg(unix)'.dependencies]
libc = "0.2"

# Development dependencies (for tests, benches, examples)
[dev-dependencies]
proptest = "1.4"
criterion = "0.5"

# Build dependencies (for build.rs)
[build-dependencies]
cc = "1.0"
```

### Dependency Version Requirements

```toml
[dependencies]
# Caret (default): Compatible with ^1.2.3
# Allows: 1.2.3 <= version < 2.0.0
my-crate = "1.2.3"
my-crate = "^1.2.3"

# Tilde: Compatible with ~1.2.3
# Allows: 1.2.3 <= version < 1.3.0
my-crate = "~1.2.3"

# Wildcard: Any version matching pattern
my-crate = "1.*"
my-crate = "1.2.*"

# Exact version
my-crate = "=1.2.3"

# Greater than
my-crate = ">1.2.3"

# Greater than or equal
my-crate = ">=1.2.3"

# Less than
my-crate = "<2.0.0"

# Range
my-crate = ">=1.2, <1.5"
```

### Managing Updates

```bash
# Check for outdated dependencies
cargo outdated

# Update dependencies within version requirements
cargo update

# Update specific dependency
cargo update -p serde

# Update and allow breaking changes
cargo upgrade  # Requires cargo-edit

# Clean up unused dependencies
cargo machete  # Requires cargo-machete
```

## Feature Flags

### Defining Features

```toml
[package]
name = "my-lib"
version = "0.1.0"
edition = "2021"

[features]
# Default features
default = ["std"]

# Feature with no dependencies
std = []

# Feature that enables other features
full = ["std", "serde", "async"]

# Feature that enables optional dependency
serde = ["dep:serde_crate"]
async = ["dep:tokio"]

[dependencies]
serde_crate = { package = "serde", version = "1.0", optional = true }
tokio = { version = "1.35", optional = true }
```

### Using Features in Code

```rust
// Compile different code based on features
#[cfg(feature = "serde")]
use serde::{Deserialize, Serialize};

pub struct MyStruct {
    pub field: String,
}

#[cfg(feature = "serde")]
impl Serialize for MyStruct {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        self.field.serialize(serializer)
    }
}

// Conditional compilation
#[cfg(feature = "async")]
pub async fn fetch_data() -> Result<String, Error> {
    // Async implementation
}

#[cfg(not(feature = "async"))]
pub fn fetch_data() -> Result<String, Error> {
    // Sync implementation
}
```

### Building with Features

```bash
# Build with default features
cargo build

# Build with no default features
cargo build --no-default-features

# Build with specific features
cargo build --features "serde async"

# Build with all features
cargo build --all-features

# Test with specific features
cargo test --features "serde"
```

## Build Scripts

### build.rs Example

```rust
// build.rs
use std::env;
use std::path::PathBuf;

fn main() {
    // Tell cargo to rerun if build.rs changes
    println!("cargo:rerun-if-changed=build.rs");

    // Tell cargo to rerun if source files change
    println!("cargo:rerun-if-changed=src/proto/schema.proto");

    // Set environment variable for the build
    let out_dir = env::var("OUT_DIR").unwrap();
    println!("cargo:rustc-env=OUT_DIR={}", out_dir);

    // Link to a native library
    println!("cargo:rustc-link-lib=static=mylib");
    println!("cargo:rustc-link-search=native=/path/to/lib");

    // Add compiler flags
    println!("cargo:rustc-cfg=feature=\"special_feature\"");

    // Generate code
    generate_code(&out_dir);
}

fn generate_code(out_dir: &str) {
    // Code generation logic
    let dest_path = PathBuf::from(out_dir).join("generated.rs");
    std::fs::write(
        &dest_path,
        "pub const GENERATED: &str = \"Hello\";"
    ).unwrap();
}
```

### Using Generated Code

```rust
// src/lib.rs
include!(concat!(env!("OUT_DIR"), "/generated.rs"));

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_generated() {
        assert_eq!(GENERATED, "Hello");
    }
}
```

## Documentation

### Module-Level Documentation

```rust
//! # My Library
//!
//! This is a library for doing amazing things.
//!
//! ## Examples
//!
//! ```
//! use my_lib::Config;
//!
//! let config = Config::new();
//! ```

/// Configuration for the application.
///
/// # Examples
///
/// ```
/// use my_lib::Config;
///
/// let config = Config::default();
/// assert_eq!(config.port, 8080);
/// ```
pub struct Config {
    /// The port to listen on
    pub port: u16,
}
```

### Documentation Comments

```rust
/// A short one-line description.
///
/// A longer description with multiple paragraphs.
///
/// # Examples
///
/// ```
/// let result = my_function(42);
/// assert_eq!(result, 84);
/// ```
///
/// # Errors
///
/// Returns `Error::InvalidInput` if the input is negative.
///
/// # Panics
///
/// Panics if the input is zero.
///
/// # Safety
///
/// This function is unsafe because...
pub fn my_function(x: i32) -> Result<i32, Error> {
    // ...
}
```

### Cargo.toml Documentation

```toml
[package]
# ...

[package.metadata.docs.rs]
all-features = true
rustdoc-args = ["--cfg", "docsrs"]
```

### Building Documentation

```bash
# Build documentation
cargo doc

# Build and open documentation
cargo doc --open

# Build with all features
cargo doc --all-features

# Build without dependencies
cargo doc --no-deps
```

## Best Practices

### 1. Consistent Naming

```rust
// ✅ Good naming conventions
pub struct UserConfig { }        // Struct: PascalCase
pub enum Status { }              // Enum: PascalCase
pub trait Drawable { }           // Trait: PascalCase
const MAX_SIZE: usize = 100;     // Constant: SCREAMING_SNAKE_CASE
static GLOBAL: i32 = 42;         // Static: SCREAMING_SNAKE_CASE
fn calculate_total() { }         // Function: snake_case
let user_name = "Alice";         // Variable: snake_case

// Module names
mod user_management { }          // Module: snake_case
```

### 2. Module Organization by Feature

```
src/
├── lib.rs
├── user/              # User-related functionality
│   ├── mod.rs
│   ├── model.rs       # User data model
│   ├── service.rs     # User business logic
│   └── repository.rs  # User data access
├── auth/              # Authentication
│   ├── mod.rs
│   ├── token.rs
│   └── middleware.rs
└── api/               # API layer
    ├── mod.rs
    ├── routes.rs
    └── handlers.rs
```

### 3. Prelude Pattern

```rust
// src/prelude.rs
pub use crate::error::{Error, Result};
pub use crate::config::Config;
pub use crate::user::User;

// Usage in other modules
use crate::prelude::*;
```

### 4. Error Module

```rust
// src/error.rs
use thiserror::Error;

#[derive(Error, Debug)]
pub enum Error {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Parse error: {0}")]
    Parse(String),

    #[error("Not found: {0}")]
    NotFound(String),
}

pub type Result<T> = std::result::Result<T, Error>;

// src/lib.rs
pub mod error;
pub use error::{Error, Result};
```

### 5. Re-export Pattern

```rust
// src/lib.rs
mod internal_module;

// Re-export public types
pub use internal_module::{PublicType, public_function};

// Hide implementation details
use internal_module::internal_helper;  // Private
```

### 6. Cargo.toml Organization

```toml
[package]
name = "my-app"
version = "0.1.0"
edition = "2021"
authors = ["Author <author@example.com>"]
license = "MIT OR Apache-2.0"
description = "A concise description"
repository = "https://github.com/user/repo"
readme = "README.md"

[dependencies]
# Core dependencies
tokio = { version = "1.35", features = ["rt-multi-thread", "macros"] }
serde = { version = "1.0", features = ["derive"] }

# Optional features
mysql = { version = "24", optional = true }
postgres = { version = "0.19", optional = true }

[dev-dependencies]
# Test dependencies
proptest = "1.4"
criterion = "0.5"

[features]
default = []
full = ["mysql", "postgres"]

[[bin]]
name = "my-app"
path = "src/main.rs"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
strip = true
```

### 7. .gitignore for Rust

```gitignore
# Cargo
/target/
Cargo.lock  # For libraries only (commit for binaries)

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Backup files
*~
*.bak
```

### 8. README Template

```markdown
# Project Name

Brief description

## Features

- Feature 1
- Feature 2

## Installation

\`\`\`bash
cargo install my-app
\`\`\`

## Usage

\`\`\`rust
use my_lib::Config;

let config = Config::load()?;
\`\`\`

## Development

\`\`\`bash
cargo build
cargo test
cargo run
\`\`\`

## License

MIT OR Apache-2.0
```

## Project Templates

### Library Template

```bash
cargo new --lib my-lib
cd my-lib
mkdir -p src/error src/utils tests examples benches
```

### Binary Template

```bash
cargo new my-app
cd my-app
mkdir -p src/cli src/config tests examples
```

### Workspace Template

```bash
mkdir my-workspace && cd my-workspace
cargo new --lib crates/core
cargo new --lib crates/api
cargo new crates/cli
cat > Cargo.toml << 'EOF'
[workspace]
members = ["crates/*"]

[workspace.dependencies]
tokio = { version = "1.35", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
EOF
```

## Further Reading

- [The Cargo Book](https://doc.rust-lang.org/cargo/)
- [Rust API Guidelines](https://rust-lang.github.io/api-guidelines/)
- [Cargo.toml Format](https://doc.rust-lang.org/cargo/reference/manifest.html)
- [Workspaces](https://doc.rust-lang.org/book/ch14-03-cargo-workspaces.html)
- [Crates.io Best Practices](https://doc.rust-lang.org/cargo/reference/publishing.html)
