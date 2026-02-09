---
description: Security rules - never hardcode secrets, always validate inputs, prevent vulnerabilities
---

# Security Rules

## NEVER

- Hardcode secrets in code/logs/env files
- Leak sensitive data (PII/credit cards/SSN)
- Allow SQL Injection, XSS, CSRF vulnerabilities

## ALWAYS

- Validate all external inputs
- Use parameterized queries
- Apply authentication/authorization checks
- Use HTTPS
- Encode/escape outputs
