---
description: SQL database design and query optimization best practices
keywords: [sql, database, db schema, sql migration, query, index, normalization]
---

# SQL/Database Best Practices

## Schema Design & Normalization

- Normalize to 3NF unless denormalization improves read performance
- Use surrogate keys (UUID, auto-increment) for primary keys
- Avoid nullable columns when a default is meaningful
- Use `CHECK` constraints for domain validation
- Name tables plural (`users`), columns snake_case (`created_at`)

## Query Optimization

- Use `EXPLAIN` / `EXPLAIN ANALYZE` before optimizing
- Select only needed columns — avoid `SELECT *`
- Use `LIMIT` for pagination; prefer cursor-based over offset
- Batch inserts with multi-row `VALUES` or bulk load
- Use `EXISTS` instead of `IN` for subqueries when checking existence

## Index Best Practices

- Index columns in `WHERE`, `JOIN`, `ORDER BY`
- Composite indexes: order by selectivity (most selective first)
- Avoid indexing low-cardinality columns alone
- Use partial indexes for filtered queries (e.g. `WHERE status = 'active'`)
- Monitor index usage; drop unused indexes

## Migration Conventions

- One logical change per migration file
- Use timestamp prefix: `20260224_add_users_table.sql`
- Make migrations reversible (provide `down` when possible)
- Never modify applied migrations — add new ones
- Test migrations on a copy of production data

## Security

- Use parameterized queries — never concatenate user input

## Example (Parameterized Query)
```sql
-- Safe: parameterized query (Node.js/pg)
const result = await db.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

-- Unsafe: never do this
-- db.query('SELECT * FROM users WHERE id = ' + userId)
```
- Apply least-privilege for DB users
- Avoid storing secrets; use connection strings from env
- Audit sensitive operations (DDL, bulk deletes)