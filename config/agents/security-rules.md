---
name: Security Rules
description: Secrets management, vulnerability prevention, authentication and authorization rules
keywords: [보안, security, 시큐리티, vulnerability, secrets, API keys, SQL injection, XSS, CSRF, authentication, authorization]
---

# Security Rules

## ABSOLUTE Rules (NEVER Violate)

### NEVER

- Leave secrets (passwords/API keys/tokens) in code/logs/tickets/environment variables/.env files.
- Log sensitive data (PII/credit cards/SSN) in logs.
- Leave SQL injection, XSS, CSRF vulnerabilities.
- Commit secrets, API keys, tokens, or sensitive information.

### ALWAYS

- Validate, normalize, and encode all inputs; use parameterized queries.
- Use HTTPS/TLS and apply principle of least privilege.
- Apply authentication/authorization to all endpoints.
- Set security headers (CSP, HSTS, X-Frame-Options).
- Regularly scan and update dependency vulnerabilities.

## Security Violation Protocol

**Stop work immediately and request review upon security violations.**

## Pre-commit Security Checklist

- [ ] No secrets (passwords/API keys/tokens) in code
- [ ] No sensitive data (PII/credit cards/SSN) in logs
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] No CSRF vulnerabilities
- [ ] All inputs validated and sanitized
- [ ] Parameterized queries used for database operations
- [ ] Authentication/authorization applied to endpoints
- [ ] Development debug code removed
- [ ] Console logs cleaned up

## Common Vulnerability Prevention

| Vulnerability | Prevention |
|--------------|------------|
| SQL Injection | Use parameterized queries, ORMs |
| XSS | Encode output, use CSP headers |
| CSRF | Use CSRF tokens, SameSite cookies |
| Auth Bypass | Validate on server, check permissions |
| Data Exposure | Minimize data, encrypt at rest/transit |
