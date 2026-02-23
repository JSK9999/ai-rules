---
description: Docker and containerization best practices
keywords: [docker, container, dockerfile, compose]
---

# Docker

## Dockerfile
- Use multi-stage builds to minimize image size
- Use specific base image tags, never `latest`
- Order layers by change frequency (least → most changing)
- Combine RUN commands to reduce layers
- Use `.dockerignore` to exclude node_modules, .git, etc.

## Security
- Don't run as root — use `USER` directive
- Don't store secrets in images — use build args or runtime env
- Scan images for vulnerabilities (Trivy, Snyk)
- Use minimal base images (alpine, distroless, slim)

## Example (Node.js)
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production=false
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Docker Compose
- Use `depends_on` with health checks
- Use named volumes for persistent data
- Set resource limits (memory, CPU)
- Use `.env` file for environment variables

## Best Practices
- One process per container
- Log to stdout/stderr, not files
- Use health checks
- Graceful shutdown with SIGTERM handling
- Tag images with version, not just `latest`
