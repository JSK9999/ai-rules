---
description: Python coding standards and best practices
keywords: [python, py, django, fastapi, flask]
---

# Python

## Style
- Follow PEP 8. Use type hints for all function signatures
- Use f-strings for formatting, not `.format()` or `%`
- Prefer list/dict/set comprehensions over loops when readable
- Use `pathlib.Path` over `os.path`

## Types
- Add type hints to all functions: parameters and return types
- Use `Optional[T]` for nullable values
- Use `TypedDict` for dictionary shapes
- Use `Protocol` for structural subtyping (duck typing)

## Patterns
- Use dataclasses or Pydantic models for structured data
- Prefer `with` statements for resource management
- Use generators for large datasets (`yield` over building lists)
- Use `enum.Enum` for fixed choices

## Error Handling
- Use specific exception types, not bare `except`
- Use `raise ... from` to preserve exception chains
- Define custom exceptions for domain errors
- Use `contextlib.suppress()` for expected exceptions

## Project Structure
```
src/
  __init__.py
  models/
  services/
  api/
tests/
  conftest.py
  test_models/
pyproject.toml
```

## Dependencies
- Use `pyproject.toml` for project config
- Pin dependency versions in production
- Use virtual environments (venv, uv, poetry)
- Separate dev and production dependencies
