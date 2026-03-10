---
description: Guidelines for building maintainable Java Spring Boot services and REST APIs using common production patterns
---

# Java & Spring Boot Development

## Project Structure

Prefer a clear layered structure.

Typical layout:

src/main/java/com/example/app

- controller → HTTP layer
- service → business logic
- repository → persistence
- entity → JPA models
- dto → request/response objects
- config → security and configuration

Avoid putting business logic in controllers.

## REST Controller Design

Controllers should only handle HTTP concerns.

Responsibilities:

- validate input
- call service layer
- return response objects

Example pattern:

@RestController
@RequestMapping("/api/users")
class UserController {

    private final UserService userService;

    UserController(UserService userService) {
        this.userService = userService;
    }

}

Follow standard REST endpoints:

GET /users  
GET /users/{id}  
POST /users  
PUT /users/{id}  
DELETE /users/{id}

Return appropriate status codes.

## Service Layer

Business logic belongs in services.

Guidelines:

- annotate with `@Service`
- keep controllers thin
- avoid database code in controllers

Example:

@Service
class UserService {

    private final UserRepository repo;

    UserService(UserRepository repo) {
        this.repo = repo;
    }

}

## Persistence with JPA

Use Spring Data JPA repositories.

Guidelines:

- annotate entities with `@Entity`
- use `@Id` and generated IDs
- prefer `FetchType.LAZY` for relations
- avoid exposing entities directly in APIs

Example:

@ManyToOne(fetch = FetchType.LAZY)

Use DTOs for responses.

## Dependency Injection

Prefer constructor injection.

Good:

UserService(UserRepository repo)

Avoid:

@Autowired field injection.

Constructor injection improves testability.

## Configuration

Keep configuration external.

Use:

application.yml

Profiles should separate environments:

- dev
- test
- prod

Example:

spring:
datasource:
url: jdbc:postgresql://localhost:5432/app

## General Practices

- keep classes small and focused
- write meaningful method names
- use validation annotations for request data
- handle errors with `@ControllerAdvice`
- log important application events