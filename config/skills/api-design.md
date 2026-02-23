---
description: REST API design principles and conventions
keywords: [api, rest, endpoint, http]
---

# API Design

## URL Conventions
- Use nouns, not verbs: `/users`, not `/getUsers`
- Use plural: `/users`, `/orders`
- Nest for relationships: `/users/:id/orders`
- Use kebab-case: `/user-profiles`, not `/userProfiles`
- Keep URLs shallow — max 3 levels deep

## HTTP Methods
- GET: Read (idempotent, cacheable)
- POST: Create
- PUT: Full replace
- PATCH: Partial update
- DELETE: Remove

## Status Codes
- 200: Success
- 201: Created
- 204: No Content (successful delete)
- 400: Bad Request (validation error)
- 401: Unauthorized (no/invalid auth)
- 403: Forbidden (no permission)
- 404: Not Found
- 409: Conflict (duplicate)
- 422: Unprocessable Entity
- 500: Internal Server Error

## Response Format
```json
{
  "data": { ... },
  "meta": { "page": 1, "total": 100 }
}
```

Error:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [{ "field": "email", "issue": "required" }]
  }
}
```

## Best Practices
- Version your API: `/v1/users`
- Paginate lists: `?page=1&limit=20`
- Filter with query params: `?status=active`
- Use consistent date format (ISO 8601)
- Rate limit all endpoints
- Validate all inputs at the boundary
