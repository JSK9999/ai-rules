---
description: Best practices for creating CI/CD pipelines using GitHub Actions for testing, building, and deployment
---

# CI/CD with GitHub Actions

Guidelines for building reliable CI/CD pipelines using GitHub Actions.

## Workflow Structure

Use a clear workflow layout.

- Define triggers using `on:` (push, pull_request, workflow_dispatch)
- Separate concerns with multiple jobs
- Control job order with `needs`
- Use matrix builds to test multiple environments

Example:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test
```

## Common CI Pipeline Pattern

Typical pipeline stages:

1. Install dependencies
2. Lint or formatting checks
3. Run automated tests
4. Build application artifacts
5. Deploy from the main branch

Use `needs:` to enforce job order such as:

test → build → deploy

## Dependency Caching

Use caching to speed up workflows.

```yaml
- uses: actions/cache@v4
  with:
    path: ~/.npm
    key: ${{ runner.os }}-npm-${{ hashFiles('package-lock.json') }}
```

Best practices:

- Cache dependency directories
- Use lockfiles for cache keys
- Avoid caching compiled artifacts

## Artifacts

Artifacts allow sharing files between jobs.

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: build
    path: dist/
```

Use artifacts for:

- Build outputs
- Test reports
- Logs or compiled binaries

## Secrets and Environment Management

Never store secrets in code.

Use:

- `secrets.*` for credentials
- `env:` for non-sensitive configuration

Example:

```yaml
- name: Deploy
  run: ./deploy.sh
  env:
    API_KEY: ${{ secrets.API_KEY }}
```

Best practices:

- Store secrets in repository settings
- Protect production environments
- Rotate credentials regularly
