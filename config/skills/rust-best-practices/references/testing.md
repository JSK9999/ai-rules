# Testing Best Practices

Comprehensive guide to testing in Rust including unit tests, integration tests, property-based testing, and benchmarking.

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [Documentation Tests](#documentation-tests)
5. [Property-Based Testing](#property-based-testing)
6. [Benchmarking](#benchmarking)
7. [Mocking and Test Doubles](#mocking-and-test-doubles)
8. [Test Organization](#test-organization)
9. [Code Coverage](#code-coverage)
10. [Best Practices](#best-practices)

## Testing Philosophy

Rust's testing philosophy emphasizes:
- **Safety**: Catch bugs at compile time where possible
- **Confidence**: Comprehensive test coverage
- **Speed**: Fast test execution
- **Clarity**: Clear test names and assertions

### Test Pyramid

```
       /\
      /  \     E2E Tests (Few)
     /----\
    /      \   Integration Tests (Some)
   /--------\
  /          \ Unit Tests (Many)
 /------------\
```

## Unit Tests

### Basic Unit Tests

```rust
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add() {
        assert_eq!(add(2, 2), 4);
    }

    #[test]
    fn test_add_negative() {
        assert_eq!(add(-1, 1), 0);
    }

    #[test]
    fn test_add_overflow() {
        // Test edge cases
        assert_eq!(add(i32::MAX, 0), i32::MAX);
    }
}
```

### Assertion Macros

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_assertions() {
        // Equality
        assert_eq!(2 + 2, 4);
        assert_ne!(2 + 2, 5);

        // Boolean
        assert!(true);
        assert!(!false);

        // Custom message
        assert_eq!(2 + 2, 4, "Math is broken: {} != {}", 2 + 2, 4);
    }

    #[test]
    fn test_floating_point() {
        let result = 0.1 + 0.2;
        let expected = 0.3;

        // ❌ Don't compare floats directly
        // assert_eq!(result, expected);

        // ✅ Use epsilon comparison
        assert!((result - expected).abs() < 1e-10);

        // ✅ Or use approx crate
        // use approx::assert_relative_eq;
        // assert_relative_eq!(result, expected);
    }
}
```

### Testing Error Conditions

```rust
pub fn divide(a: i32, b: i32) -> Result<i32, String> {
    if b == 0 {
        Err("Division by zero".to_string())
    } else {
        Ok(a / b)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_divide_success() {
        assert_eq!(divide(10, 2), Ok(5));
    }

    #[test]
    fn test_divide_by_zero() {
        assert!(divide(10, 0).is_err());

        // More specific
        match divide(10, 0) {
            Err(msg) => assert_eq!(msg, "Division by zero"),
            Ok(_) => panic!("Expected error"),
        }

        // Using Result in tests
        let result = divide(10, 0);
        assert!(result.is_err());
    }
}
```

### Should Panic Tests

```rust
#[cfg(test)]
mod tests {
    #[test]
    #[should_panic]
    fn test_panic() {
        panic!("This test should panic");
    }

    #[test]
    #[should_panic(expected = "index out of bounds")]
    fn test_specific_panic() {
        let v = vec![1, 2, 3];
        v[99];  // Panics with "index out of bounds"
    }
}
```

### Testing with Result

```rust
#[cfg(test)]
mod tests {
    use std::error::Error;

    #[test]
    fn test_with_result() -> Result<(), Box<dyn Error>> {
        let result = parse_number("42")?;
        assert_eq!(result, 42);
        Ok(())
    }

    #[test]
    fn test_file_operations() -> std::io::Result<()> {
        std::fs::write("test.txt", "content")?;
        let content = std::fs::read_to_string("test.txt")?;
        assert_eq!(content, "content");
        std::fs::remove_file("test.txt")?;
        Ok(())
    }
}
```

### Ignored Tests

```rust
#[cfg(test)]
mod tests {
    #[test]
    #[ignore]
    fn expensive_test() {
        // This test takes a long time
        // Run with: cargo test -- --ignored
    }

    #[test]
    #[ignore = "Requires database"]
    fn database_test() {
        // Needs external setup
    }
}
```

## Integration Tests

### tests/ Directory Structure

```
my-project/
├── src/
│   └── lib.rs
└── tests/
    ├── common/
    │   └── mod.rs         # Shared test utilities
    ├── integration_test.rs
    └── api_test.rs
```

### Integration Test Example

```rust
// tests/integration_test.rs
use my_crate::Config;

#[test]
fn test_config_loading() {
    let config = Config::from_file("tests/fixtures/config.toml")
        .expect("Failed to load config");

    assert_eq!(config.version, "1.0");
    assert_eq!(config.port, 8080);
}

#[test]
fn test_full_workflow() {
    let mut app = my_crate::App::new();
    app.start().expect("Failed to start");

    let result = app.process("input");
    assert_eq!(result, "expected output");

    app.stop();
}
```

### Shared Test Utilities

```rust
// tests/common/mod.rs
use my_crate::Database;

pub fn setup_database() -> Database {
    Database::new_in_memory()
}

pub fn create_test_user() -> User {
    User {
        id: 1,
        name: "Test User".to_string(),
        email: "test@example.com".to_string(),
    }
}

// tests/integration_test.rs
mod common;

#[test]
fn test_with_database() {
    let db = common::setup_database();
    let user = common::create_test_user();

    db.insert_user(&user).unwrap();
    let retrieved = db.get_user(user.id).unwrap();

    assert_eq!(retrieved, user);
}
```

## Documentation Tests

### Basic Doc Tests

```rust
/// Adds two numbers together.
///
/// # Examples
///
/// ```
/// use my_crate::add;
///
/// let result = add(2, 2);
/// assert_eq!(result, 4);
/// ```
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

/// Divides two numbers.
///
/// # Examples
///
/// ```
/// use my_crate::divide;
///
/// let result = divide(10, 2);
/// assert_eq!(result, Ok(5));
/// ```
///
/// # Errors
///
/// ```
/// use my_crate::divide;
///
/// let result = divide(10, 0);
/// assert!(result.is_err());
/// ```
pub fn divide(a: i32, b: i32) -> Result<i32, String> {
    if b == 0 {
        Err("Division by zero".to_string())
    } else {
        Ok(a / b)
    }
}
```

### Doc Test Attributes

```rust
/// This example is only for documentation, not run as test.
///
/// ```no_run
/// use my_crate::start_server;
///
/// start_server(); // Doesn't actually run
/// ```
pub fn start_server() {
    // ...
}

/// This example should fail compilation.
///
/// ```compile_fail
/// use my_crate::add;
///
/// let result = add("not", "numbers"); // Type error
/// ```
pub fn add(a: i32, b: i32) -> i32 {
    a + b
}

/// This example should panic.
///
/// ```should_panic
/// panic!("This panics");
/// ```
pub fn example() {}

/// Hide some setup code.
///
/// ```
/// # use my_crate::Database;
/// # let db = Database::new_in_memory();
/// let users = db.get_all_users();
/// assert!(!users.is_empty());
/// ```
pub fn example2() {}
```

## Property-Based Testing

### Using proptest

```toml
[dev-dependencies]
proptest = "1"
```

```rust
use proptest::prelude::*;

// Property: reversing a string twice gives the original
proptest! {
    #[test]
    fn test_reverse_twice(s in ".*") {
        let reversed = s.chars().rev().collect::<String>();
        let double_reversed = reversed.chars().rev().collect::<String>();
        prop_assert_eq!(s, double_reversed);
    }

    #[test]
    fn test_addition_commutative(a in -1000..1000, b in -1000..1000) {
        prop_assert_eq!(a + b, b + a);
    }

    #[test]
    fn test_vec_length(v in prop::collection::vec(any::<i32>(), 0..100)) {
        let len = v.len();
        let mut v2 = v.clone();
        v2.push(42);
        prop_assert_eq!(v2.len(), len + 1);
    }
}
```

### Custom Generators

```rust
use proptest::prelude::*;

#[derive(Debug, Clone)]
struct User {
    name: String,
    age: u8,
    email: String,
}

fn arb_user() -> impl Strategy<Value = User> {
    (
        "[a-z]{3,10}",           // name: 3-10 lowercase letters
        1u8..=100,                // age: 1-100
        "[a-z]{3,10}@[a-z]{3,10}\\.com", // email
    )
        .prop_map(|(name, age, email)| User { name, age, email })
}

proptest! {
    #[test]
    fn test_user_validation(user in arb_user()) {
        prop_assert!(!user.name.is_empty());
        prop_assert!(user.age > 0);
        prop_assert!(user.email.contains('@'));
    }
}
```

### Shrinking

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_parsing(s in "[0-9]+") {
        // If this fails, proptest will try to find the minimal failing case
        let num: i32 = s.parse().unwrap();
        prop_assert!(num >= 0);
    }
}
```

## Benchmarking

### Criterion Benchmarks

```toml
[dev-dependencies]
criterion = { version = "0.5", features = ["html_reports"] }

[[bench]]
name = "my_benchmark"
harness = false
```

```rust
// benches/my_benchmark.rs
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use my_crate::fibonacci;

fn fibonacci_benchmark(c: &mut Criterion) {
    c.bench_function("fibonacci 20", |b| {
        b.iter(|| fibonacci(black_box(20)))
    });
}

fn comparison_benchmark(c: &mut Criterion) {
    let mut group = c.benchmark_group("sorting");

    group.bench_function("bubble_sort", |b| {
        b.iter(|| bubble_sort(black_box(&vec![5, 2, 8, 1, 9])))
    });

    group.bench_function("quick_sort", |b| {
        b.iter(|| quick_sort(black_box(&vec![5, 2, 8, 1, 9])))
    });

    group.finish();
}

criterion_group!(benches, fibonacci_benchmark, comparison_benchmark);
criterion_main!(benches);
```

### Running Benchmarks

```bash
cargo bench
cargo bench -- --save-baseline before_optimization
cargo bench -- --baseline before_optimization
```

## Mocking and Test Doubles

### Trait-Based Mocking

```rust
pub trait Database {
    fn get_user(&self, id: u64) -> Result<User, Error>;
    fn save_user(&mut self, user: &User) -> Result<(), Error>;
}

// Production implementation
pub struct PostgresDatabase {
    // ...
}

impl Database for PostgresDatabase {
    fn get_user(&self, id: u64) -> Result<User, Error> {
        // Real database query
    }

    fn save_user(&mut self, user: &User) -> Result<(), Error> {
        // Real database insert
    }
}

// Test implementation
#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    struct MockDatabase {
        users: HashMap<u64, User>,
    }

    impl Database for MockDatabase {
        fn get_user(&self, id: u64) -> Result<User, Error> {
            self.users.get(&id)
                .cloned()
                .ok_or(Error::NotFound)
        }

        fn save_user(&mut self, user: &User) -> Result<(), Error> {
            self.users.insert(user.id, user.clone());
            Ok(())
        }
    }

    #[test]
    fn test_user_service() {
        let db = MockDatabase {
            users: HashMap::new(),
        };

        let service = UserService::new(Box::new(db));
        // Test using mock database
    }
}
```

### Using mockall

```toml
[dev-dependencies]
mockall = "0.12"
```

```rust
use mockall::*;

#[automock]
pub trait Database {
    fn get_user(&self, id: u64) -> Result<User, Error>;
    fn save_user(&mut self, user: &User) -> Result<(), Error>;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_with_mock() {
        let mut mock = MockDatabase::new();

        mock.expect_get_user()
            .with(eq(1))
            .times(1)
            .returning(|_| Ok(User {
                id: 1,
                name: "Test".to_string(),
            }));

        let result = mock.get_user(1);
        assert!(result.is_ok());
    }
}
```

## Test Organization

### Module Structure

```rust
// src/lib.rs
pub mod user;
pub mod database;

#[cfg(test)]
mod tests {
    // Tests for private items
    use super::*;

    #[test]
    fn test_internal() {
        // Can access private functions
    }
}

// src/user.rs
pub struct User {
    pub id: u64,
    pub name: String,
}

impl User {
    pub fn new(id: u64, name: String) -> Self {
        Self { id, name }
    }

    fn validate(&self) -> bool {
        // Private validation
        !self.name.is_empty()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_creation() {
        let user = User::new(1, "Alice".to_string());
        assert_eq!(user.id, 1);
    }

    #[test]
    fn test_validation() {
        let user = User::new(1, "".to_string());
        assert!(!user.validate());  // Can test private method
    }
}
```

### Test Fixtures

```rust
#[cfg(test)]
mod tests {
    use super::*;

    struct TestFixture {
        db: Database,
        user: User,
    }

    impl TestFixture {
        fn new() -> Self {
            let db = Database::new_in_memory();
            let user = User::new(1, "Test".to_string());

            Self { db, user }
        }
    }

    impl Drop for TestFixture {
        fn drop(&mut self) {
            // Cleanup
            self.db.close();
        }
    }

    #[test]
    fn test_with_fixture() {
        let mut fixture = TestFixture::new();
        fixture.db.save_user(&fixture.user).unwrap();

        let retrieved = fixture.db.get_user(fixture.user.id).unwrap();
        assert_eq!(retrieved.name, "Test");
    }
}
```

### Test Builders

```rust
#[cfg(test)]
mod tests {
    struct UserBuilder {
        id: u64,
        name: String,
        email: Option<String>,
        age: Option<u8>,
    }

    impl UserBuilder {
        fn new() -> Self {
            Self {
                id: 1,
                name: "Default".to_string(),
                email: None,
                age: None,
            }
        }

        fn id(mut self, id: u64) -> Self {
            self.id = id;
            self
        }

        fn name(mut self, name: impl Into<String>) -> Self {
            self.name = name.into();
            self
        }

        fn email(mut self, email: impl Into<String>) -> Self {
            self.email = Some(email.into());
            self
        }

        fn build(self) -> User {
            User {
                id: self.id,
                name: self.name,
                email: self.email,
                age: self.age,
            }
        }
    }

    #[test]
    fn test_user_builder() {
        let user = UserBuilder::new()
            .name("Alice")
            .email("alice@example.com")
            .build();

        assert_eq!(user.name, "Alice");
    }
}
```

## Code Coverage

### Using cargo-tarpaulin

```bash
# Install
cargo install cargo-tarpaulin

# Run coverage
cargo tarpaulin --out Html

# With specific features
cargo tarpaulin --out Html --all-features

# Exclude files
cargo tarpaulin --out Html --exclude-files "src/generated/*"
```

### Using cargo-llvm-cov

```bash
# Install
cargo install cargo-llvm-cov

# Run coverage
cargo llvm-cov

# Generate HTML report
cargo llvm-cov --html

# Open report
cargo llvm-cov --open
```

### Coverage Attributes

```rust
#[cfg(not(tarpaulin_include))]
fn generated_code() {
    // Excluded from coverage
}

#[derive(Debug)]  // Excluded automatically
struct MyStruct {
    field: i32,
}
```

## Best Practices

### 1. Write Tests First (TDD)

```rust
// Write test first
#[cfg(test)]
mod tests {
    #[test]
    fn test_parse_email() {
        let result = parse_email("user@example.com");
        assert!(result.is_ok());

        let result = parse_email("invalid");
        assert!(result.is_err());
    }
}

// Then implement
fn parse_email(input: &str) -> Result<Email, ParseError> {
    // Implementation
}
```

### 2. Test Edge Cases

```rust
#[cfg(test)]
mod tests {
    #[test]
    fn test_edge_cases() {
        // Empty input
        assert_eq!(process(""), expected_empty);

        // Maximum values
        assert_eq!(process(&"x".repeat(MAX_LEN)), expected_max);

        // Boundary values
        assert_eq!(process_age(0), expected_min);
        assert_eq!(process_age(150), expected_max);
        assert!(process_age(151).is_err());

        // Unicode
        assert_eq!(process("hello 世界"), expected_unicode);
    }
}
```

### 3. Use Descriptive Test Names

```rust
#[cfg(test)]
mod tests {
    // ❌ Bad
    #[test]
    fn test1() { }

    // ✅ Good
    #[test]
    fn should_return_error_when_email_is_invalid() { }

    #[test]
    fn parses_valid_json_successfully() { }

    #[test]
    fn user_creation_fails_with_duplicate_email() { }
}
```

### 4. Keep Tests Isolated

```rust
#[cfg(test)]
mod tests {
    // ❌ Bad - tests affect each other
    static mut COUNTER: i32 = 0;

    #[test]
    fn test_increment() {
        unsafe { COUNTER += 1; }
        assert_eq!(unsafe { COUNTER }, 1);
    }

    // ✅ Good - each test is independent
    #[test]
    fn test_counter_increment() {
        let mut counter = 0;
        counter += 1;
        assert_eq!(counter, 1);
    }
}
```

### 5. Test One Thing Per Test

```rust
#[cfg(test)]
mod tests {
    // ❌ Bad - testing multiple things
    #[test]
    fn test_everything() {
        let user = create_user();
        assert!(!user.name.is_empty());
        assert!(user.email.is_some());
        assert_eq!(user.age, 25);
        assert!(user.is_valid());
    }

    // ✅ Good - focused tests
    #[test]
    fn user_name_should_not_be_empty() {
        let user = create_user();
        assert!(!user.name.is_empty());
    }

    #[test]
    fn user_should_have_email() {
        let user = create_user();
        assert!(user.email.is_some());
    }
}
```

### 6. Fast Tests

```rust
// ✅ Good - fast, in-memory
#[test]
fn test_calculation() {
    let result = calculate(42);
    assert_eq!(result, 84);
}

// ❌ Slow - mark as ignored for normal runs
#[test]
#[ignore]
fn test_external_api() {
    let response = call_external_api();
    assert!(response.is_ok());
}
```

### 7. Deterministic Tests

```rust
// ❌ Bad - non-deterministic
#[test]
fn test_random() {
    let value = rand::random::<i32>();
    assert!(value > 0);  // May fail randomly
}

// ✅ Good - deterministic
#[test]
fn test_with_seed() {
    let mut rng = StdRng::seed_from_u64(42);
    let value: i32 = rng.gen_range(1..100);
    assert!(value > 0);  // Always passes
}
```

## Test Command Cheat Sheet

```bash
# Run all tests
cargo test

# Run tests in parallel
cargo test -- --test-threads=4

# Run specific test
cargo test test_name

# Run tests matching pattern
cargo test parse

# Run ignored tests
cargo test -- --ignored

# Show stdout from tests
cargo test -- --nocapture

# Run doc tests only
cargo test --doc

# Run integration tests only
cargo test --test integration_test

# Run benchmarks
cargo bench

# Generate coverage
cargo tarpaulin --out Html
cargo llvm-cov --html --open
```

## Further Reading

- [The Rust Book - Chapter 11: Writing Automated Tests](https://doc.rust-lang.org/book/ch11-00-testing.html)
- [Rust By Example - Testing](https://doc.rust-lang.org/rust-by-example/testing.html)
- [proptest Documentation](https://altsysrq.github.io/proptest-book/)
- [Criterion.rs Guide](https://bheisler.github.io/criterion.rs/book/)
- [mockall Documentation](https://docs.rs/mockall/)
