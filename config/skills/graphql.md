---
description: GraphQL API design and resolver best practices
---

# GraphQL API Design & Resolver Best Practices

## Schema Design

- Design schemas around domain models, not database tables.
- Use clear and descriptive type names (User, Post, Comment).
- Use `ID` for identifiers.
- Prefer nested relationships instead of exposing foreign key IDs.

Correct example:

```graphql
type User {
  id: ID!
  name: String!
  posts: [Post!]!
}
```

Avoid:

```graphql
type User {
  user_id: String
  post_ids: [String]
}
```

## Query and Mutation Structure

- Queries must be read-only and side-effect free.
- Mutations should represent intent (createPost, updateProfile).
- Return the modified object from mutations.

Example:

```graphql
type Mutation {
  createPost(input: CreatePostInput!): Post!
}
```

## Resolver Design

- Keep resolvers thin.
- Move business logic to services or data layers.
- Avoid database queries directly inside resolvers.

Example:

```javascript
const resolvers = {
  Query: {
    user: (_, { id }, { services }) => {
      return services.user.getById(id)
    }
  }
}
```

## Prevent N+1 Queries

- Use batching utilities like DataLoader.
- Batch database calls when resolving nested fields.

Example pattern:

```javascript
Post: {
  author: (post, _, { loaders }) => {
    return loaders.userLoader.load(post.authorId)
  }
}
```

## Authentication

- Perform authentication when building the GraphQL context.
- Pass the authenticated user through the context.

Example:

```javascript
const context = ({ req }) => {
  const user = authenticate(req.headers.authorization)
  return { user }
}
```

## Authorization

- Check permissions inside resolvers or service layer.

Example:

```javascript
if (!context.user) {
  throw new Error("Unauthorized")
}
```

## Error Handling

- Return meaningful GraphQL errors.
- Avoid exposing internal database errors or stack traces.

## Performance

- Use pagination for large datasets.
- Limit query depth and complexity.
- Avoid returning deeply nested graphs by default.

Example pagination:

```graphql
type Query {
  posts(limit: Int, cursor: String): PostConnection!
}
```

## Schema Evolution

- Maintain backward compatibility.
- Use `@deprecated` when removing fields.

Example:

```graphql
type User {
  username: String @deprecated(reason: "Use handle instead")
  handle: String!
}
```
