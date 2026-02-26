# Ownership & Borrowing Patterns

Comprehensive guide to Rust's ownership system and borrowing patterns.

## Table of Contents

1. [Ownership Fundamentals](#ownership-fundamentals)
2. [Borrowing Rules](#borrowing-rules)
3. [Common Patterns](#common-patterns)
4. [Lifetimes](#lifetimes)
5. [Smart Pointers](#smart-pointers)
6. [Anti-Patterns](#anti-patterns)

## Ownership Fundamentals

### The Three Rules

1. **Each value has a single owner**
2. **When the owner goes out of scope, the value is dropped**
3. **Values can be moved or borrowed**

### Move Semantics

```rust
// Move happens for non-Copy types
let s1 = String::from("hello");
let s2 = s1;  // s1 is moved to s2
// println!("{}", s1);  // ERROR: s1 is no longer valid

// Copy happens for Copy types (stack-only data)
let x = 5;
let y = x;  // x is copied to y
println!("{}, {}", x, y);  // OK: both are valid
```

**Copy Types**:
- All integers (`i32`, `u64`, etc.)
- Booleans (`bool`)
- Floating point (`f32`, `f64`)
- Characters (`char`)
- Tuples containing only Copy types

### Ownership Transfer Patterns

```rust
// Pattern 1: Return ownership from functions
fn create_string() -> String {
    String::from("hello")
}

let s = create_string();  // Ownership transferred to s

// Pattern 2: Take and return ownership
fn append_suffix(mut s: String) -> String {
    s.push_str(" world");
    s  // Return ownership
}

let s1 = String::from("hello");
let s2 = append_suffix(s1);  // s1 moved, s2 owns the result

// Pattern 3: Clone when you need a copy
fn use_twice(s: String) {
    println!("{}", s);
    println!("{}", s);
}

let s = String::from("hello");
use_twice(s.clone());  // Pass a clone
println!("{}", s);     // s still valid
```

## Borrowing Rules

### Immutable References (&T)

```rust
// Multiple immutable borrows allowed simultaneously
fn calculate_length(s: &String) -> usize {
    s.len()  // Can read but not modify
}

let s = String::from("hello");
let len1 = calculate_length(&s);
let len2 = calculate_length(&s);  // OK: multiple immutable borrows
println!("s: {}, len: {}, {}", s, len1, len2);  // s still valid
```

### Mutable References (&mut T)

```rust
// Only one mutable borrow allowed at a time
fn append_suffix(s: &mut String) {
    s.push_str(" world");
}

let mut s = String::from("hello");
append_suffix(&mut s);
println!("{}", s);  // "hello world"
```

### Borrowing Rules Summary

1. **At any time, you can have either:**
   - One mutable reference, OR
   - Any number of immutable references

2. **References must always be valid** (no dangling references)

```rust
// ❌ ERROR: Cannot have mutable and immutable references simultaneously
let mut s = String::from("hello");
let r1 = &s;      // OK
let r2 = &s;      // OK
let r3 = &mut s;  // ERROR: cannot borrow as mutable while immutable refs exist

// ✅ OK: Non-Lexical Lifetimes (NLL) - references scope ends at last use
let mut s = String::from("hello");
let r1 = &s;
let r2 = &s;
println!("{} {}", r1, r2);  // r1, r2 last used here
let r3 = &mut s;  // OK: r1, r2 are no longer active
```

## Common Patterns

### Pattern 1: Prefer Slices Over Owned Types

```rust
// ✅ Good: Accept string slices
fn first_word(s: &str) -> &str {
    let bytes = s.as_bytes();
    for (i, &byte) in bytes.iter().enumerate() {
        if byte == b' ' {
            return &s[..i];
        }
    }
    s
}

// Works with both String and &str
let s = String::from("hello world");
let word = first_word(&s);  // &String coerces to &str
let word = first_word("hello world");  // &str works directly

// ✅ Good: Accept slices for vectors
fn sum(numbers: &[i32]) -> i32 {
    numbers.iter().sum()
}

let v = vec![1, 2, 3, 4];
let arr = [1, 2, 3, 4];
sum(&v);    // Works with Vec
sum(&arr);  // Works with arrays
```

### Pattern 2: Builder Pattern with Ownership

```rust
pub struct Config {
    host: String,
    port: u16,
    timeout: u64,
}

pub struct ConfigBuilder {
    host: Option<String>,
    port: Option<u16>,
    timeout: Option<u64>,
}

impl ConfigBuilder {
    pub fn new() -> Self {
        Self {
            host: None,
            port: None,
            timeout: None,
        }
    }

    // Take self by value to enable chaining
    pub fn host(mut self, host: String) -> Self {
        self.host = Some(host);
        self
    }

    pub fn port(mut self, port: u16) -> Self {
        self.port = Some(port);
        self
    }

    pub fn timeout(mut self, timeout: u64) -> Self {
        self.timeout = Some(timeout);
        self
    }

    pub fn build(self) -> Result<Config, &'static str> {
        Ok(Config {
            host: self.host.ok_or("host is required")?,
            port: self.port.unwrap_or(8080),
            timeout: self.timeout.unwrap_or(30),
        })
    }
}

// Usage
let config = ConfigBuilder::new()
    .host("localhost".to_string())
    .port(3000)
    .build()?;
```

### Pattern 3: Interior Mutability with Cell and RefCell

```rust
use std::cell::RefCell;

// Use RefCell for runtime-checked borrowing
struct Counter {
    count: RefCell<i32>,
}

impl Counter {
    fn new() -> Self {
        Self {
            count: RefCell::new(0),
        }
    }

    // Can mutate through &self (immutable reference)
    fn increment(&self) {
        *self.count.borrow_mut() += 1;
    }

    fn get(&self) -> i32 {
        *self.count.borrow()
    }
}

let counter = Counter::new();
counter.increment();  // No &mut needed
assert_eq!(counter.get(), 1);
```

```rust
use std::cell::Cell;

// Use Cell for Copy types (no borrowing overhead)
struct Point {
    x: Cell<i32>,
    y: Cell<i32>,
}

impl Point {
    fn move_by(&self, dx: i32, dy: i32) {
        self.x.set(self.x.get() + dx);
        self.y.set(self.y.get() + dy);
    }
}
```

### Pattern 4: Splitting Borrows

```rust
struct Data {
    field1: Vec<i32>,
    field2: Vec<i32>,
}

impl Data {
    // ✅ Good: Borrow fields independently
    fn process(&mut self) {
        Self::helper(&mut self.field1, &mut self.field2);
    }

    fn helper(f1: &mut Vec<i32>, f2: &mut Vec<i32>) {
        // Can mutate both fields simultaneously
        f1.push(1);
        f2.push(2);
    }

    // ❌ Bad: Cannot borrow self twice
    // fn bad_process(&mut self) {
    //     self.helper(&mut self.field1, &mut self.field1);  // ERROR
    // }
}
```

### Pattern 5: Cow (Clone on Write)

```rust
use std::borrow::Cow;

// Avoid unnecessary clones with Cow
fn process_string(s: Cow<str>) -> String {
    if s.contains("world") {
        s.into_owned()  // Convert to owned String
    } else {
        format!("{} world", s)  // Create new String
    }
}

// Works with both owned and borrowed
let owned = String::from("hello");
process_string(Cow::Owned(owned));
process_string(Cow::Borrowed("hello"));

// More idiomatic with into()
fn process_string_v2(s: impl Into<Cow<'static, str>>) -> String {
    let s = s.into();
    // ...
    s.into_owned()
}
```

## Lifetimes

### Lifetime Basics

```rust
// Lifetime annotations describe relationships
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

// The returned reference lives as long as the shortest input
let s1 = String::from("long string");
let result;
{
    let s2 = String::from("short");
    result = longest(&s1, &s2);
    // result valid here
}
// result NOT valid here - s2 was dropped
```

### Lifetime Elision Rules

```rust
// Rule 1: Each parameter gets its own lifetime
fn first_word(s: &str) -> &str {  // Inferred as:
// fn first_word<'a>(s: &'a str) -> &'a str

// Rule 2: If there's exactly one input lifetime, assign it to output
fn get_part(s: &str, i: usize) -> &str {  // Inferred as:
// fn get_part<'a>(s: &'a str, i: usize) -> &'a str

// Rule 3: If there's &self or &mut self, its lifetime is assigned to output
struct Parser {
    text: String,
}

impl Parser {
    fn parse(&self) -> &str {  // Inferred as:
    // fn parse<'a>(&'a self) -> &'a str
        &self.text
    }
}
```

### Struct Lifetimes

```rust
// Struct holding references needs lifetime annotations
struct Excerpt<'a> {
    part: &'a str,
}

impl<'a> Excerpt<'a> {
    fn announce_and_return(&self, announcement: &str) -> &str {
        println!("Attention: {}", announcement);
        self.part  // Returns the part with lifetime 'a
    }
}

// Usage
let novel = String::from("Call me Ishmael. Some years ago...");
let first_sentence = novel.split('.').next().unwrap();
let excerpt = Excerpt { part: first_sentence };
```

### Static Lifetime

```rust
// 'static means the reference lives for the entire program
let s: &'static str = "I have a static lifetime.";

// Common use cases:
const CONSTANT: &str = "constant string";  // Implicitly 'static
static STATIC: &str = "static string";     // Explicitly 'static

// ❌ Don't use 'static to fix lifetime errors
// Instead, understand the actual lifetime relationships
```

## Smart Pointers

### Box<T> - Heap Allocation

```rust
// Use Box for heap allocation
let b = Box::new(5);
println!("{}", b);  // Auto-dereferencing

// Use case 1: Recursive types
enum List {
    Cons(i32, Box<List>),
    Nil,
}

// Use case 2: Trait objects
trait Draw {
    fn draw(&self);
}

let shapes: Vec<Box<dyn Draw>> = vec![
    Box::new(Circle { radius: 10 }),
    Box::new(Square { side: 5 }),
];
```

### Rc<T> - Reference Counting

```rust
use std::rc::Rc;

// Multiple ownership with Rc
let data = Rc::new(vec![1, 2, 3]);
let data2 = Rc::clone(&data);  // Increment reference count
let data3 = Rc::clone(&data);

println!("Count: {}", Rc::strong_count(&data));  // 3

// ❌ Rc is not thread-safe - use Arc for threads
```

### Arc<T> - Atomic Reference Counting

```rust
use std::sync::Arc;
use std::thread;

// Thread-safe reference counting
let data = Arc::new(vec![1, 2, 3]);

let handles: Vec<_> = (0..3)
    .map(|_| {
        let data_clone = Arc::clone(&data);
        thread::spawn(move || {
            println!("Data: {:?}", data_clone);
        })
    })
    .collect();

for handle in handles {
    handle.join().unwrap();
}
```

### Mutex<T> and RwLock<T>

```rust
use std::sync::{Arc, Mutex};
use std::thread;

// Shared mutable state with Mutex
let counter = Arc::new(Mutex::new(0));
let mut handles = vec![];

for _ in 0..10 {
    let counter_clone = Arc::clone(&counter);
    let handle = thread::spawn(move || {
        let mut num = counter_clone.lock().unwrap();
        *num += 1;
    });
    handles.push(handle);
}

for handle in handles {
    handle.join().unwrap();
}

println!("Result: {}", *counter.lock().unwrap());  // 10
```

```rust
use std::sync::RwLock;

// RwLock for multiple readers or single writer
let lock = RwLock::new(5);

// Multiple readers
{
    let r1 = lock.read().unwrap();
    let r2 = lock.read().unwrap();
    println!("{} {}", r1, r2);
}  // Read locks dropped

// One writer
{
    let mut w = lock.write().unwrap();
    *w += 1;
}  // Write lock dropped
```

## Anti-Patterns

### ❌ Excessive Cloning

```rust
// Bad
fn process(data: Vec<String>) -> Vec<String> {
    data.clone()
        .iter()
        .map(|s| s.to_uppercase())
        .collect()
}

// Good
fn process(data: &[String]) -> Vec<String> {
    data.iter()
        .map(|s| s.to_uppercase())
        .collect()
}
```

### ❌ Unnecessary Lifetime Annotations

```rust
// Bad - unnecessary complexity
fn first<'a, 'b>(x: &'a str, _y: &'b str) -> &'a str {
    x
}

// Good - simpler
fn first(x: &str, _y: &str) -> &str {
    x
}
```

### ❌ Fighting the Borrow Checker

```rust
// Bad - trying to hold references too long
fn bad_pattern(v: &mut Vec<i32>) -> &i32 {
    v.push(1);
    &v[0]  // ERROR: cannot return reference to mutably borrowed data
}

// Good - return owned value or use indices
fn good_pattern(v: &mut Vec<i32>) -> i32 {
    v.push(1);
    v[0]  // Copy the value
}

fn good_pattern_index(v: &mut Vec<i32>) -> usize {
    v.push(1);
    0  // Return index instead
}
```

### ❌ Overusing RefCell

```rust
// Bad - overusing interior mutability
struct Data {
    field1: RefCell<i32>,
    field2: RefCell<String>,
    field3: RefCell<Vec<u8>>,
}

// Good - use mutable methods
struct Data {
    field1: i32,
    field2: String,
    field3: Vec<u8>,
}

impl Data {
    fn update(&mut self, value: i32) {
        self.field1 = value;
    }
}
```

## Best Practices Summary

1. **Prefer borrowing over ownership** when you don't need to modify or keep the data
2. **Use `&str` over `String`** for function parameters
3. **Use `&[T]` over `Vec<T>`** for function parameters
4. **Clone only when necessary** - prefer references
5. **Use lifetime elision** - don't add explicit lifetimes unless needed
6. **Prefer `Arc` over `Rc`** if you might need thread-safety later
7. **Use `Mutex` or `RwLock` sparingly** - they have runtime overhead
8. **Interior mutability is a last resort** - prefer `&mut self` methods
9. **Document why you use `unsafe`** if you must use it
10. **Let the compiler guide you** - borrow checker errors are helpful

## Further Reading

- [The Rust Book - Chapter 4: Understanding Ownership](https://doc.rust-lang.org/book/ch04-00-understanding-ownership.html)
- [The Rust Book - Chapter 10: Generic Types, Traits, and Lifetimes](https://doc.rust-lang.org/book/ch10-00-generics.html)
- [The Rustonomicon - Advanced Unsafe Rust](https://doc.rust-lang.org/nomicon/)
- [Rust API Guidelines - Borrowing](https://rust-lang.github.io/api-guidelines/flexibility.html)
