---
name: ratatui
description: Build terminal UIs in Rust with Ratatui. Use when creating TUI applications, immediate-mode rendering, high-performance terminal interfaces, or production Rust CLIs.
---

# Ratatui (Rust TUI)

Immediate-mode terminal UI framework for Rust using Crossterm backend.

## Project Setup

**Always use Edition 2024:**

```toml
[package]
name = "my-tui-app"
version = "0.1.0"
edition = "2024"
rust-version = "1.85"

[dependencies]
ratatui = "0.30"
crossterm = "0.29"
# Optional: Enhanced error handling
anyhow = "1.0"
thiserror = "2.0"
```

**Why Edition 2024 for TUI apps:**
- ✅ Better async support for background tasks
- ✅ Improved pattern matching for event handling
- ✅ Cleaner error handling with if let chains
- ✅ Native async traits for plugins/extensions

## Basic Application

```rust
use crossterm::{
    event::{self, Event, KeyCode},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{backend::CrosstermBackend, widgets::{Block, Borders, Paragraph}, Terminal};
use std::io;

struct App {
    counter: i32,
}

impl App {
    fn new() -> App {
        App { counter: 0 }
    }

    fn on_key(&mut self, key: KeyCode) {
        match key {
            KeyCode::Up => self.counter += 1,
            KeyCode::Down => self.counter -= 1,
            _ => {}
        }
    }
}

fn main() -> Result<(), io::Error> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;

    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let mut app = App::new();

    loop {
        terminal.draw(|f| {
            let block = Block::default().title("Counter").borders(Borders::ALL);
            let paragraph = Paragraph::new(format!("Count: {}", app.counter)).block(block);
            f.render_widget(paragraph, f.area());
        })?;

        if let Event::Key(key) = event::read()? {
            match key.code {
                KeyCode::Char('q') => break,
                code => app.on_key(code),
            }
        }
    }

    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    Ok(())
}
```

## Event Loop with Polling

```rust
use std::time::Duration;

fn run_app<B: Backend>(terminal: &mut Terminal<B>, app: &mut App) -> io::Result<()> {
    loop {
        terminal.draw(|f| ui(f, app))?;

        if event::poll(Duration::from_millis(100))? {
            if let Event::Key(key) = event::read()? {
                match key.code {
                    KeyCode::Char('q') => return Ok(()),
                    KeyCode::Up => app.increment(),
                    KeyCode::Down => app.decrement(),
                    _ => {}
                }
            }
        }
    }
}
```

## Layout

```rust
use ratatui::layout::{Constraint, Direction, Layout};

let chunks = Layout::default()
    .direction(Direction::Vertical)
    .constraints([
        Constraint::Length(3),  // Fixed height
        Constraint::Min(0),     // Fill remaining
        Constraint::Length(1),  // Status bar
    ])
    .split(f.area());
```

## Edition 2024 Patterns for TUI

### Using if let chains for cleaner event handling

```rust
use crossterm::event::{Event, KeyCode, KeyModifiers};

// ✅ Edition 2024: Cleaner conditional logic
fn handle_event(event: Event, app: &mut App) -> bool {
    if let Event::Key(key) = event
        && key.code == KeyCode::Char('q')
        && key.modifiers.contains(KeyModifiers::CONTROL) {
        return false; // Quit
    }

    if let Event::Key(key) = event
        && key.code == KeyCode::Enter
        && app.input.len() > 0 {
        app.submit_input();
    }

    true
}
```

### Async background tasks

```rust
use tokio::sync::mpsc;

// ✅ Edition 2024: Native async for background processing
enum AppEvent {
    Tick,
    DataUpdate(Vec<String>),
    Error(String),
}

async fn run_background_task(tx: mpsc::Sender<AppEvent>) {
    loop {
        tokio::time::sleep(Duration::from_secs(1)).await;

        match fetch_data().await {
            Ok(data) => tx.send(AppEvent::DataUpdate(data)).await.unwrap(),
            Err(e) => tx.send(AppEvent::Error(e.to_string())).await.unwrap(),
        }
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let (tx, mut rx) = mpsc::channel(100);

    // Spawn background task
    tokio::spawn(run_background_task(tx));

    // Main TUI loop
    loop {
        terminal.draw(|f| ui(f, &app))?;

        if event::poll(Duration::from_millis(100))? {
            if let Event::Key(key) = event::read()? {
                if !handle_key_event(key, &mut app) {
                    break;
                }
            }
        }

        // Handle background events
        while let Ok(event) = rx.try_recv() {
            app.handle_app_event(event);
        }
    }

    Ok(())
}
```

### Type-safe state management

```rust
// ✅ Edition 2024: Strong typing with const generics
#[derive(Debug)]
enum AppState {
    Loading,
    Ready(Data),
    Error(String),
}

struct App {
    state: AppState,
}

impl App {
    fn render(&self, f: &mut Frame) {
        match &self.state {
            AppState::Loading => render_loading(f),
            AppState::Ready(data) => render_data(f, data),
            AppState::Error(msg) => render_error(f, msg),
        }
    }

    fn update(&mut self, event: Event) {
        // Pattern match with guards
        if let Event::Key(key) = event
            && matches!(self.state, AppState::Ready(_)) {
            self.handle_input(key);
        }
    }
}
```

## References

- **Widgets**: See [references/widgets.md](references/widgets.md) for List, Table, Paragraph, Gauge
- **Best Practices**: See [references/best-practices.md](references/best-practices.md) for keyboard, accessibility, performance
- **Edition 2024**: See rust-best-practices skill for comprehensive Edition 2024 guide