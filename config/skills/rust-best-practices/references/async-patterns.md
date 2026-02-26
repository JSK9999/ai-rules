# Async Programming Patterns

Comprehensive guide to asynchronous programming in Rust with async/await, futures, and async runtimes.

## Table of Contents

1. [Async Fundamentals](#async-fundamentals)
2. [Choosing an Async Runtime](#choosing-an-async-runtime)
3. [Basic Async Patterns](#basic-async-patterns)
4. [Concurrency Patterns](#concurrency-patterns)
5. [Channels and Communication](#channels-and-communication)
6. [Error Handling](#error-handling)
7. [Cancellation and Timeouts](#cancellation-and-timeouts)
8. [Common Pitfalls](#common-pitfalls)
9. [Best Practices](#best-practices)

## Async Fundamentals

### What is async/await?

```rust
// Synchronous code - blocks thread
fn fetch_data() -> String {
    std::thread::sleep(Duration::from_secs(1));
    "data".to_string()
}

// Asynchronous code - doesn't block thread
async fn fetch_data_async() -> String {
    tokio::time::sleep(Duration::from_secs(1)).await;
    "data".to_string()
}

// async fn returns a Future
fn example() {
    let future = fetch_data_async();  // Does nothing yet
    // Need to await or spawn the future to execute it
}
```

### Futures and Polling

```rust
use std::future::Future;
use std::pin::Pin;
use std::task::{Context, Poll};

// Futures are polled by the runtime
struct MyFuture;

impl Future for MyFuture {
    type Output = i32;

    fn poll(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<Self::Output> {
        // Do work
        Poll::Ready(42)  // Or Poll::Pending if not ready
    }
}

// Usually you use async/await instead of implementing Future manually
```

### Basic async Function

```rust
use tokio;

async fn say_hello() {
    println!("Hello");
}

#[tokio::main]
async fn main() {
    say_hello().await;  // Actually executes the async function
}
```

## Choosing an Async Runtime

### Tokio - Most Popular

```toml
[dependencies]
tokio = { version = "1", features = ["full"] }
```

```rust
// Single-threaded runtime
#[tokio::main(flavor = "current_thread")]
async fn main() {
    // Your async code
}

// Multi-threaded runtime (default)
#[tokio::main]
async fn main() {
    // Your async code
}

// Manual runtime setup
use tokio::runtime::Runtime;

fn main() {
    let rt = Runtime::new().unwrap();
    rt.block_on(async {
        // Your async code
    });
}
```

### async-std - Similar to std API

```toml
[dependencies]
async-std = { version = "1", features = ["attributes"] }
```

```rust
#[async_std::main]
async fn main() {
    // Your async code
}
```

### smol - Lightweight

```toml
[dependencies]
smol = "2"
```

```rust
fn main() {
    smol::block_on(async {
        // Your async code
    });
}
```

### Comparison

| Runtime | Use Case | Ecosystem | Performance |
|---------|----------|-----------|-------------|
| **tokio** | Production, I/O-heavy | Largest | Excellent |
| **async-std** | Familiar std API | Growing | Good |
| **smol** | Embedded, minimalism | Small | Excellent |

## Basic Async Patterns

### Sequential Execution

```rust
async fn sequential_operations() -> Result<(), Error> {
    // Operations run one after another
    let data1 = fetch_data("url1").await?;
    let data2 = fetch_data("url2").await?;
    let data3 = fetch_data("url3").await?;

    process_data(data1, data2, data3).await?;
    Ok(())
}
```

### Concurrent Execution with join!

```rust
use tokio::join;

async fn concurrent_operations() -> Result<(), Error> {
    // Run multiple operations concurrently
    let (result1, result2, result3) = join!(
        fetch_data("url1"),
        fetch_data("url2"),
        fetch_data("url3")
    );

    // Handle results
    let data1 = result1?;
    let data2 = result2?;
    let data3 = result3?;

    Ok(())
}
```

### Concurrent Execution with try_join!

```rust
use tokio::try_join;

async fn concurrent_operations() -> Result<(), Error> {
    // Stops on first error
    let (data1, data2, data3) = try_join!(
        fetch_data("url1"),
        fetch_data("url2"),
        fetch_data("url3")
    )?;

    process_data(data1, data2, data3).await?;
    Ok(())
}
```

### Dynamic Number of Tasks with join_all

```rust
use futures::future::join_all;

async fn fetch_multiple(urls: Vec<String>) -> Vec<Result<String, Error>> {
    let futures: Vec<_> = urls
        .into_iter()
        .map(|url| fetch_data(url))
        .collect();

    join_all(futures).await
}
```

### Race Patterns with select!

```rust
use tokio::select;

async fn race_pattern() -> String {
    let server1 = fetch_from_server("server1");
    let server2 = fetch_from_server("server2");

    // Return result from whichever completes first
    select! {
        result1 = server1 => result1,
        result2 = server2 => result2,
    }
}

// More complex select with multiple branches
async fn complex_select() {
    let mut interval = tokio::time::interval(Duration::from_secs(1));
    let mut shutdown_rx = get_shutdown_receiver();

    loop {
        select! {
            _ = interval.tick() => {
                println!("Tick");
            }
            _ = shutdown_rx.recv() => {
                println!("Shutting down");
                break;
            }
        }
    }
}
```

## Concurrency Patterns

### Spawning Tasks

```rust
use tokio::task;

async fn spawn_tasks() {
    // Spawn background task
    let handle = task::spawn(async {
        expensive_computation().await
    });

    // Do other work
    other_work().await;

    // Wait for spawned task
    let result = handle.await.unwrap();
}

// Spawn multiple tasks
async fn spawn_multiple() -> Vec<i32> {
    let handles: Vec<_> = (0..10)
        .map(|i| {
            task::spawn(async move {
                compute(i).await
            })
        })
        .collect();

    // Collect results
    let mut results = Vec::new();
    for handle in handles {
        results.push(handle.await.unwrap());
    }
    results
}
```

### Spawn Blocking for CPU-Intensive Work

```rust
use tokio::task;

async fn cpu_intensive_work() -> Result<Vec<u8>, Error> {
    // ❌ Bad - blocks the async runtime
    let data = expensive_cpu_work();

    // ✅ Good - runs on blocking thread pool
    let data = task::spawn_blocking(|| {
        expensive_cpu_work()
    }).await?;

    Ok(data)
}
```

### Task Coordination with Barriers

```rust
use tokio::sync::Barrier;
use std::sync::Arc;

async fn barrier_example() {
    let barrier = Arc::new(Barrier::new(3));

    let mut handles = vec![];
    for i in 0..3 {
        let b = barrier.clone();
        handles.push(tokio::spawn(async move {
            println!("Worker {} preparing", i);
            // Simulate work
            tokio::time::sleep(Duration::from_millis(i * 100)).await;

            // Wait for all workers to reach this point
            b.wait().await;

            println!("Worker {} proceeding", i);
        }));
    }

    for handle in handles {
        handle.await.unwrap();
    }
}
```

### Fan-Out/Fan-In Pattern

```rust
async fn fan_out_fan_in(items: Vec<Item>) -> Result<Vec<Result>, Error> {
    // Fan-out: Process items concurrently
    let handles: Vec<_> = items
        .into_iter()
        .map(|item| {
            tokio::spawn(async move {
                process_item(item).await
            })
        })
        .collect();

    // Fan-in: Collect results
    let mut results = Vec::new();
    for handle in handles {
        results.push(handle.await?);
    }

    Ok(results)
}
```

### Worker Pool Pattern

```rust
use tokio::sync::mpsc;

async fn worker_pool(tasks: Vec<Task>, num_workers: usize) {
    let (tx, mut rx) = mpsc::channel(100);

    // Spawn workers
    let mut workers = Vec::new();
    for id in 0..num_workers {
        let mut rx = rx.clone();
        workers.push(tokio::spawn(async move {
            while let Some(task) = rx.recv().await {
                println!("Worker {} processing task", id);
                process_task(task).await;
            }
        }));
    }

    // Send tasks
    for task in tasks {
        tx.send(task).await.unwrap();
    }

    // Close channel and wait for workers
    drop(tx);
    for worker in workers {
        worker.await.unwrap();
    }
}
```

## Channels and Communication

### mpsc - Multiple Producer, Single Consumer

```rust
use tokio::sync::mpsc;

async fn mpsc_example() {
    let (tx, mut rx) = mpsc::channel(32);  // Buffer size 32

    // Producer
    tokio::spawn(async move {
        for i in 0..10 {
            tx.send(i).await.unwrap();
        }
    });

    // Consumer
    while let Some(value) = rx.recv().await {
        println!("Received: {}", value);
    }
}

// Multiple producers
async fn multi_producer() {
    let (tx, mut rx) = mpsc::channel(32);

    for i in 0..3 {
        let tx_clone = tx.clone();
        tokio::spawn(async move {
            tx_clone.send(i).await.unwrap();
        });
    }

    drop(tx);  // Drop original to close channel

    while let Some(value) = rx.recv().await {
        println!("Received: {}", value);
    }
}
```

### broadcast - Multiple Consumers

```rust
use tokio::sync::broadcast;

async fn broadcast_example() {
    let (tx, mut rx1) = broadcast::channel(16);
    let mut rx2 = tx.subscribe();

    tokio::spawn(async move {
        for i in 0..5 {
            tx.send(i).unwrap();
        }
    });

    // Both receivers get all messages
    tokio::spawn(async move {
        while let Ok(value) = rx1.recv().await {
            println!("Receiver 1: {}", value);
        }
    });

    tokio::spawn(async move {
        while let Ok(value) = rx2.recv().await {
            println!("Receiver 2: {}", value);
        }
    });
}
```

### oneshot - Single Value

```rust
use tokio::sync::oneshot;

async fn oneshot_example() {
    let (tx, rx) = oneshot::channel();

    tokio::spawn(async move {
        let result = expensive_computation().await;
        tx.send(result).unwrap();
    });

    match rx.await {
        Ok(result) => println!("Got result: {}", result),
        Err(_) => println!("Sender dropped"),
    }
}
```

### watch - Single Producer, Multiple Subscribers

```rust
use tokio::sync::watch;

async fn watch_example() {
    let (tx, mut rx) = watch::channel("initial");

    tokio::spawn(async move {
        loop {
            if rx.changed().await.is_ok() {
                println!("Value changed to: {}", *rx.borrow());
            }
        }
    });

    tx.send("update 1").unwrap();
    tx.send("update 2").unwrap();
}
```

## Error Handling

### Propagating Errors

```rust
async fn fetch_and_parse(url: &str) -> Result<Data, Error> {
    let response = reqwest::get(url).await?;
    let text = response.text().await?;
    let data = serde_json::from_str(&text)?;
    Ok(data)
}
```

### Error Handling in Spawned Tasks

```rust
async fn handle_task_errors() {
    let handle = tokio::spawn(async {
        // Task can return Result
        fetch_data().await
    });

    match handle.await {
        Ok(Ok(data)) => println!("Success: {:?}", data),
        Ok(Err(e)) => eprintln!("Task error: {}", e),
        Err(e) => eprintln!("Join error: {}", e),
    }
}
```

### Fallback on Error

```rust
async fn fetch_with_fallback(primary_url: &str, fallback_url: &str) -> Result<String, Error> {
    match fetch_data(primary_url).await {
        Ok(data) => Ok(data),
        Err(e) => {
            log::warn!("Primary fetch failed: {}. Trying fallback.", e);
            fetch_data(fallback_url).await
        }
    }
}
```

## Cancellation and Timeouts

### Timeout with timeout()

```rust
use tokio::time::{timeout, Duration};

async fn with_timeout() -> Result<String, Error> {
    let result = timeout(
        Duration::from_secs(5),
        fetch_data("url")
    ).await;

    match result {
        Ok(Ok(data)) => Ok(data),
        Ok(Err(e)) => Err(e),
        Err(_) => Err(Error::Timeout),
    }
}
```

### Graceful Shutdown

```rust
use tokio::sync::broadcast;
use tokio::select;

async fn worker(mut shutdown_rx: broadcast::Receiver<()>) {
    loop {
        select! {
            // Normal work
            _ = process_next_item() => {
                println!("Processed item");
            }

            // Shutdown signal
            _ = shutdown_rx.recv() => {
                println!("Shutting down gracefully");
                cleanup().await;
                break;
            }
        }
    }
}

async fn main_with_shutdown() {
    let (shutdown_tx, _) = broadcast::channel(1);

    let mut workers = Vec::new();
    for _ in 0..5 {
        let shutdown_rx = shutdown_tx.subscribe();
        workers.push(tokio::spawn(worker(shutdown_rx)));
    }

    // Wait for signal
    tokio::signal::ctrl_c().await.unwrap();

    // Broadcast shutdown
    let _ = shutdown_tx.send(());

    // Wait for workers
    for worker in workers {
        worker.await.unwrap();
    }
}
```

### Cancellation Token

```rust
use tokio_util::sync::CancellationToken;

async fn cancellable_task(token: CancellationToken) {
    loop {
        select! {
            _ = do_work() => {
                println!("Work done");
            }

            _ = token.cancelled() => {
                println!("Task cancelled");
                break;
            }
        }
    }
}

async fn main_with_cancellation() {
    let token = CancellationToken::new();

    let task_token = token.clone();
    let handle = tokio::spawn(async move {
        cancellable_task(task_token).await;
    });

    // Cancel after 5 seconds
    tokio::time::sleep(Duration::from_secs(5)).await;
    token.cancel();

    handle.await.unwrap();
}
```

## Common Pitfalls

### ❌ Blocking in Async Code

```rust
// ❌ Bad - blocks the async runtime
async fn bad_async() {
    std::thread::sleep(Duration::from_secs(1));  // Blocks!
    let data = std::fs::read_to_string("file.txt").unwrap();  // Blocks!
}

// ✅ Good - use async alternatives
async fn good_async() {
    tokio::time::sleep(Duration::from_secs(1)).await;
    let data = tokio::fs::read_to_string("file.txt").await.unwrap();
}

// ✅ Good - use spawn_blocking for blocking code
async fn with_blocking() {
    let data = tokio::task::spawn_blocking(|| {
        std::fs::read_to_string("file.txt").unwrap()
    }).await.unwrap();
}
```

### ❌ Not Awaiting Futures

```rust
// ❌ Bad - future is created but never executed
async fn bad() {
    let _ = fetch_data();  // Does nothing!
}

// ✅ Good - await the future
async fn good() {
    let data = fetch_data().await;
}

// ✅ Good - spawn if you don't need the result
async fn spawn_and_forget() {
    tokio::spawn(fetch_data());
}
```

### ❌ Holding Locks Across Await Points

```rust
use tokio::sync::Mutex;

// ❌ Bad - lock held across await
async fn bad_lock(mutex: &Mutex<Data>) {
    let mut data = mutex.lock().await;
    expensive_async_operation().await;  // Lock held here!
    data.update();
}

// ✅ Good - drop lock before await
async fn good_lock(mutex: &Mutex<Data>) {
    let value = {
        let data = mutex.lock().await;
        data.value.clone()
    };  // Lock dropped here

    let result = expensive_async_operation(&value).await;

    let mut data = mutex.lock().await;
    data.update(result);
}
```

### ❌ Creating Too Many Tasks

```rust
// ❌ Bad - spawns thousands of tasks
async fn bad_spawn(items: Vec<Item>) {
    for item in items {  // Could be 10,000 items
        tokio::spawn(async move {
            process(item).await;
        });
    }
}

// ✅ Good - use worker pool with bounded concurrency
use futures::stream::{self, StreamExt};

async fn good_concurrency(items: Vec<Item>) {
    stream::iter(items)
        .for_each_concurrent(10, |item| async move {
            process(item).await;
        })
        .await;
}
```

## Best Practices

### 1. Choose the Right Runtime for Your Use Case

```rust
// For web services and I/O-heavy workloads
#[tokio::main]
async fn main() {
    // tokio is the best choice
}

// For lightweight, embedded use
fn main() {
    smol::block_on(async {
        // smol for minimal overhead
    });
}
```

### 2. Use Structured Concurrency

```rust
// ✅ Good - all tasks complete before function returns
async fn structured() -> Result<(), Error> {
    let (r1, r2, r3) = try_join!(
        task1(),
        task2(),
        task3()
    )?;

    Ok(())
}

// ❌ Bad - spawned tasks may outlive the function
async fn unstructured() {
    tokio::spawn(task1());
    tokio::spawn(task2());
    // Function returns, but tasks still running
}
```

### 3. Limit Concurrent Operations

```rust
use futures::stream::{self, StreamExt};

async fn bounded_concurrency(urls: Vec<String>) {
    stream::iter(urls)
        .map(|url| async move {
            fetch_data(&url).await
        })
        .buffer_unordered(10)  // Maximum 10 concurrent requests
        .for_each(|result| async {
            match result {
                Ok(data) => println!("Got data: {:?}", data),
                Err(e) => eprintln!("Error: {}", e),
            }
        })
        .await;
}
```

### 4. Handle Cancellation Properly

```rust
async fn cancellable_work(token: CancellationToken) -> Result<(), Error> {
    select! {
        result = do_important_work() => {
            result?;
            Ok(())
        }

        _ = token.cancelled() => {
            cleanup().await;
            Err(Error::Cancelled)
        }
    }
}
```

### 5. Use Appropriate Channel Types

```rust
// mpsc for work distribution
let (tx, rx) = mpsc::channel(100);

// broadcast for notifications
let (tx, rx) = broadcast::channel(16);

// oneshot for single response
let (tx, rx) = oneshot::channel();

// watch for shared state updates
let (tx, rx) = watch::channel(initial_value);
```

### 6. Profile and Monitor

```rust
use tokio::runtime::Handle;

async fn monitor_runtime() {
    let handle = Handle::current();
    let metrics = handle.metrics();

    println!("Active workers: {}", metrics.num_workers());
    println!("Blocking threads: {}", metrics.num_blocking_threads());
}
```

## Further Reading

- [Tokio Tutorial](https://tokio.rs/tokio/tutorial)
- [Async Book](https://rust-lang.github.io/async-book/)
- [Tokio Best Practices](https://tokio.rs/tokio/topics)
- [async-std Book](https://book.async.rs/)
- [Understanding Async/Await in Rust](https://rust-lang.github.io/async-book/01_getting_started/01_chapter.html)
