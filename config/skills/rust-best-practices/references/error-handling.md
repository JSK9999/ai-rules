# Error Handling Strategies

Comprehensive guide to error handling in Rust using Result, Option, and error libraries.

## Table of Contents

1. [Error Handling Philosophy](#error-handling-philosophy)
2. [Result and Option](#result-and-option)
3. [Custom Error Types](#custom-error-types)
4. [Error Libraries](#error-libraries)
5. [Error Propagation](#error-propagation)
6. [Context and Backtrace](#context-and-backtrace)
7. [Best Practices](#best-practices)

## Error Handling Philosophy

Rust distinguishes between:

- **Recoverable errors** - Use `Result<T, E>`
- **Unrecoverable errors** - Use `panic!`

### When to Use Each

```rust
// ✅ Use Result for expected error conditions
fn divide(a: i32, b: i32) -> Result<i32, String> {
    if b == 0 {
        Err("Division by zero".to_string())
    } else {
        Ok(a / b)
    }
}

// ✅ Use panic! for programming errors (bugs)
fn access_element(v: &Vec<i32>, index: usize) -> i32 {
    if index >= v.len() {
        panic!("Index {} out of bounds for vector of length {}", index, v.len());
    }
    v[index]
}

// ✅ Use Option for absent values
fn find_user(id: u64) -> Option<User> {
    database.get(&id)
}
```

## Result and Option

### Result<T, E>

```rust
// Basic Result usage
fn parse_number(s: &str) -> Result<i32, std::num::ParseIntError> {
    s.parse()
}

match parse_number("42") {
    Ok(n) => println!("Parsed: {}", n),
    Err(e) => println!("Error: {}", e),
}

// Using ? operator for propagation
fn read_and_parse(path: &str) -> Result<i32, Box<dyn std::error::Error>> {
    let contents = std::fs::read_to_string(path)?;
    let number = contents.trim().parse()?;
    Ok(number)
}
```

### Option<T>

```rust
// Basic Option usage
fn first_element(v: &[i32]) -> Option<i32> {
    if v.is_empty() {
        None
    } else {
        Some(v[0])
    }
}

// Pattern matching
match first_element(&vec![1, 2, 3]) {
    Some(n) => println!("First: {}", n),
    None => println!("Empty vector"),
}

// Using unwrap_or and unwrap_or_else
let value = first_element(&vec![]).unwrap_or(0);
let value = first_element(&vec![]).unwrap_or_else(|| expensive_computation());
```

### Combining Result and Option

```rust
// Converting between Result and Option
fn parse_optional(s: Option<&str>) -> Option<i32> {
    s?.parse().ok()  // ? on Option, ok() converts Result to Option
}

// Option to Result
fn get_config_value(key: &str) -> Result<String, &'static str> {
    env::var(key).ok()
        .ok_or("Config value not found")
}

// Result to Option
fn parse_lenient(s: &str) -> Option<i32> {
    s.parse().ok()
}
```

### Combinators

```rust
use std::fs;

// map - transform success value
fn file_size(path: &str) -> Result<u64, std::io::Error> {
    fs::metadata(path).map(|m| m.len())
}

// and_then - chain operations that return Result
fn read_username_from_file(path: &str) -> Result<String, std::io::Error> {
    fs::read_to_string(path)
        .and_then(|contents| {
            contents.lines()
                .next()
                .ok_or_else(|| std::io::Error::new(
                    std::io::ErrorKind::InvalidData,
                    "Empty file"
                ))
                .map(|s| s.to_string())
        })
}

// or_else - provide alternative on error
fn read_config(path: &str) -> Result<String, std::io::Error> {
    fs::read_to_string(path)
        .or_else(|_| fs::read_to_string("/etc/default_config"))
}

// Option combinators
fn get_user_email(user_id: u64) -> Option<String> {
    find_user(user_id)
        .and_then(|user| user.email)
        .map(|email| email.to_lowercase())
        .filter(|email| email.contains('@'))
}
```

## Custom Error Types

### Simple Enum Errors

```rust
#[derive(Debug)]
pub enum ConfigError {
    Io(std::io::Error),
    Parse(String),
    MissingField(String),
    InvalidValue { field: String, value: String },
}

// Implement Display for user-friendly messages
impl std::fmt::Display for ConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        match self {
            Self::Io(err) => write!(f, "I/O error: {}", err),
            Self::Parse(msg) => write!(f, "Parse error: {}", msg),
            Self::MissingField(field) => write!(f, "Missing field: {}", field),
            Self::InvalidValue { field, value } => {
                write!(f, "Invalid value '{}' for field '{}'", value, field)
            }
        }
    }
}

// Implement std::error::Error
impl std::error::Error for ConfigError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            Self::Io(err) => Some(err),
            _ => None,
        }
    }
}

// Implement From for automatic conversions
impl From<std::io::Error> for ConfigError {
    fn from(err: std::io::Error) -> Self {
        Self::Io(err)
    }
}
```

### Struct-Based Errors

```rust
#[derive(Debug)]
pub struct ValidationError {
    field: String,
    message: String,
    line: Option<usize>,
}

impl ValidationError {
    pub fn new(field: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            field: field.into(),
            message: message.into(),
            line: None,
        }
    }

    pub fn with_line(mut self, line: usize) -> Self {
        self.line = Some(line);
        self
    }
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        if let Some(line) = self.line {
            write!(f, "Line {}: {} - {}", line, self.field, self.message)
        } else {
            write!(f, "{}: {}", self.field, self.message)
        }
    }
}

impl std::error::Error for ValidationError {}
```

## Error Libraries

### thiserror - For Library Errors

```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum DataStoreError {
    #[error("Connection failed: {0}")]
    Connection(String),

    #[error("Query failed: {query}")]
    Query {
        query: String,
        #[source]
        source: sqlx::Error,
    },

    #[error("Invalid data at line {line}")]
    InvalidData { line: usize },

    #[error("Not found: {0}")]
    NotFound(String),

    #[error(transparent)]
    Io(#[from] std::io::Error),

    #[error(transparent)]
    Parse(#[from] serde_json::Error),
}

// Usage
fn query_user(id: u64) -> Result<User, DataStoreError> {
    let user = database.query("SELECT * FROM users WHERE id = ?", id)
        .map_err(|e| DataStoreError::Query {
            query: format!("SELECT * FROM users WHERE id = {}", id),
            source: e,
        })?;

    user.ok_or_else(|| DataStoreError::NotFound(format!("User {}", id)))
}
```

### anyhow - For Application Errors

```rust
use anyhow::{Context, Result, bail, ensure};

// Simple error handling with context
fn read_config(path: &str) -> Result<Config> {
    let contents = std::fs::read_to_string(path)
        .context("Failed to read config file")?;

    let config: Config = serde_json::from_str(&contents)
        .context("Failed to parse config")?;

    ensure!(config.port > 0, "Port must be positive");

    Ok(config)
}

// Early return with bail!
fn validate_user(user: &User) -> Result<()> {
    if user.email.is_empty() {
        bail!("Email cannot be empty");
    }

    if user.age < 18 {
        bail!("User must be at least 18 years old");
    }

    Ok(())
}

// Adding dynamic context
fn process_files(paths: &[String]) -> Result<()> {
    for path in paths {
        std::fs::read_to_string(path)
            .with_context(|| format!("Failed to read file: {}", path))?;
    }
    Ok(())
}
```

### Choosing Between thiserror and anyhow

```rust
// ✅ Use thiserror for libraries
pub use thiserror::Error;

#[derive(Error, Debug)]
pub enum MyLibError {
    #[error("Invalid input: {0}")]
    InvalidInput(String),
}

// ✅ Use anyhow for applications
use anyhow::Result;

fn main() -> Result<()> {
    let config = read_config("config.toml")?;
    start_server(config)?;
    Ok(())
}
```

## Error Propagation

### The ? Operator

```rust
// Manual error handling
fn read_file_manual(path: &str) -> Result<String, std::io::Error> {
    let file = match std::fs::File::open(path) {
        Ok(f) => f,
        Err(e) => return Err(e),
    };

    let mut contents = String::new();
    match file.read_to_string(&mut contents) {
        Ok(_) => Ok(contents),
        Err(e) => Err(e),
    }
}

// Using ? operator
fn read_file(path: &str) -> Result<String, std::io::Error> {
    let mut file = std::fs::File::open(path)?;
    let mut contents = String::new();
    file.read_to_string(&mut contents)?;
    Ok(contents)
}

// Even simpler
fn read_file_simple(path: &str) -> Result<String, std::io::Error> {
    std::fs::read_to_string(path)
}
```

### Converting Error Types

```rust
use std::num::ParseIntError;
use std::io;

#[derive(Debug)]
enum AppError {
    Io(io::Error),
    Parse(ParseIntError),
}

// Implement From for automatic conversion with ?
impl From<io::Error> for AppError {
    fn from(err: io::Error) -> Self {
        AppError::Io(err)
    }
}

impl From<ParseIntError> for AppError {
    fn from(err: ParseIntError) -> Self {
        AppError::Parse(err)
    }
}

fn read_and_parse(path: &str) -> Result<i32, AppError> {
    let contents = std::fs::read_to_string(path)?;  // io::Error auto-converted
    let number = contents.trim().parse()?;          // ParseIntError auto-converted
    Ok(number)
}
```

### Manual Error Mapping

```rust
use std::fs;

fn read_config(path: &str) -> Result<Config, ConfigError> {
    // Using map_err for explicit conversion
    let contents = fs::read_to_string(path)
        .map_err(|e| ConfigError::Io(e))?;

    // Or with a closure for more context
    let contents = fs::read_to_string(path)
        .map_err(|e| ConfigError::FileRead {
            path: path.to_string(),
            source: e,
        })?;

    parse_config(&contents)
}
```

## Context and Backtrace

### Adding Context with anyhow

```rust
use anyhow::{Context, Result};

fn load_user_data(user_id: u64) -> Result<UserData> {
    let path = format!("data/user_{}.json", user_id);

    let contents = std::fs::read_to_string(&path)
        .with_context(|| format!("Failed to read user data from {}", path))?;

    let data: UserData = serde_json::from_str(&contents)
        .with_context(|| format!("Failed to parse user data for user {}", user_id))?;

    validate_user_data(&data)
        .context("User data validation failed")?;

    Ok(data)
}
```

### Backtrace Support

```rust
use std::backtrace::Backtrace;

#[derive(Debug)]
pub struct DetailedError {
    message: String,
    backtrace: Backtrace,
}

impl DetailedError {
    pub fn new(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            backtrace: Backtrace::capture(),
        }
    }
}

impl std::fmt::Display for DetailedError {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        write!(f, "{}\n\nBacktrace:\n{}", self.message, self.backtrace)
    }
}

// Enable backtrace with RUST_BACKTRACE=1
```

### Error Chain Printing

```rust
use anyhow::Result;

fn print_error_chain(err: &anyhow::Error) {
    eprintln!("Error: {}", err);

    for cause in err.chain().skip(1) {
        eprintln!("Caused by: {}", cause);
    }
}

fn main() -> Result<()> {
    if let Err(e) = run_app() {
        print_error_chain(&e);
        std::process::exit(1);
    }
    Ok(())
}
```

## Best Practices

### 1. Never Use unwrap() in Production

```rust
// ❌ Bad - will panic on error
let config = load_config().unwrap();

// ✅ Good - handle the error
let config = load_config()
    .context("Failed to load configuration")?;

// ✅ Also good - provide default
let config = load_config()
    .unwrap_or_default();

// ✅ OK for prototyping with expect
let config = load_config()
    .expect("Config is required for this demo");
```

### 2. Provide Meaningful Error Messages

```rust
// ❌ Bad - generic message
return Err("Invalid input".into());

// ✅ Good - specific message
return Err(format!(
    "Invalid port number '{}': must be between 1 and 65535",
    port_str
).into());

// ✅ Better - structured error
return Err(ValidationError {
    field: "port".to_string(),
    value: port_str.to_string(),
    constraint: "Must be between 1 and 65535".to_string(),
});
```

### 3. Don't Swallow Errors

```rust
// ❌ Bad - error information lost
if let Err(_) = operation() {
    return Err("Operation failed".into());
}

// ✅ Good - preserve error chain
operation().context("Operation failed")?;

// ✅ Also good - log and propagate
operation().map_err(|e| {
    log::error!("Operation failed: {}", e);
    e
})?;
```

### 4. Use Type-Specific Errors in Libraries

```rust
// ✅ Good - specific error type for library
pub enum DatabaseError {
    Connection(String),
    Query(String),
    NotFound,
}

pub fn find_user(id: u64) -> Result<User, DatabaseError> {
    // ...
}

// Users can match on specific errors
match db.find_user(42) {
    Ok(user) => println!("Found: {}", user.name),
    Err(DatabaseError::NotFound) => println!("User not found"),
    Err(e) => eprintln!("Database error: {}", e),
}
```

### 5. Use anyhow for Applications

```rust
use anyhow::{Context, Result};

fn main() -> Result<()> {
    let config = load_config()
        .context("Failed to load configuration")?;

    let db = connect_database(&config.db_url)
        .context("Failed to connect to database")?;

    run_migrations(&db)
        .context("Failed to run database migrations")?;

    Ok(())
}
```

### 6. Validate Early

```rust
pub fn create_user(email: &str, age: i32) -> Result<User, ValidationError> {
    // Validate inputs first
    if !email.contains('@') {
        return Err(ValidationError::new("email", "Invalid email format"));
    }

    if age < 0 || age > 150 {
        return Err(ValidationError::new("age", "Age must be between 0 and 150"));
    }

    // Proceed with creation
    Ok(User {
        email: email.to_string(),
        age,
    })
}
```

### 7. Handle Option with ok_or

```rust
// Convert Option to Result with meaningful error
fn get_env_var(key: &str) -> Result<String, EnvError> {
    std::env::var(key)
        .ok()
        .ok_or_else(|| EnvError::Missing(key.to_string()))
}

// Chain operations
fn get_config_port() -> Result<u16, ConfigError> {
    std::env::var("PORT")
        .ok()
        .ok_or(ConfigError::MissingPort)?
        .parse()
        .map_err(|_| ConfigError::InvalidPort)
}
```

### 8. Document Error Conditions

```rust
/// Reads configuration from the specified file.
///
/// # Errors
///
/// Returns `ConfigError::Io` if the file cannot be read.
/// Returns `ConfigError::Parse` if the file content is not valid YAML.
/// Returns `ConfigError::Validation` if required fields are missing.
pub fn read_config(path: &str) -> Result<Config, ConfigError> {
    // ...
}
```

### 9. Use must_use Attribute

```rust
#[must_use]
pub fn validate_input(input: &str) -> Result<(), ValidationError> {
    // Compiler warns if result is ignored
}

// Forces caller to handle the result
validate_input(user_input)?;
```

### 10. Error Recovery Patterns

```rust
// Retry with exponential backoff
fn retry_with_backoff<F, T, E>(mut f: F, max_attempts: u32) -> Result<T, E>
where
    F: FnMut() -> Result<T, E>,
{
    let mut attempt = 0;
    loop {
        match f() {
            Ok(result) => return Ok(result),
            Err(e) if attempt >= max_attempts => return Err(e),
            Err(_) => {
                attempt += 1;
                let delay = Duration::from_millis(100 * 2_u64.pow(attempt));
                std::thread::sleep(delay);
            }
        }
    }
}

// Fallback to default
fn load_config_or_default(path: &str) -> Config {
    load_config(path).unwrap_or_else(|e| {
        log::warn!("Failed to load config: {}. Using defaults.", e);
        Config::default()
    })
}
```

## Error Patterns Summary

| Pattern | Use Case | Example |
|---------|----------|---------|
| `Result<T, E>` | Recoverable errors | File I/O, parsing |
| `Option<T>` | Absence of value | Finding item in collection |
| `panic!` | Unrecoverable errors | Programming bugs, invariant violations |
| `thiserror` | Library errors | Define custom error types |
| `anyhow` | Application errors | Add context, simplify error handling |
| `?` operator | Error propagation | Chain operations |
| `.context()` | Add information | Provide error context |
| `.map_err()` | Transform errors | Convert error types |
| `.unwrap_or()` | Provide default | Non-critical failures |

## Further Reading

- [The Rust Book - Chapter 9: Error Handling](https://doc.rust-lang.org/book/ch09-00-error-handling.html)
- [thiserror Documentation](https://docs.rs/thiserror/)
- [anyhow Documentation](https://docs.rs/anyhow/)
- [Error Handling in Rust - Blog Post](https://blog.burntsushi.net/rust-error-handling/)
- [Rust API Guidelines - Error Handling](https://rust-lang.github.io/api-guidelines/necessities.html#error-types-are-meaningful-and-well-behaved-c-good-err)
