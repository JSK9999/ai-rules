--- 
description: Database design, SQL and NoSQL query optimization and best practices
keywords: [database, sql, nosql, query, queries, optimization, performance, index, indexing, mongodb, aggregation, pipeline]
---
# Database

## General Principles
- Design schema based on query patterns
- Add indexes to frequently filtered or sorted fields
- Avoid unnecessary joins or large scans
- Monitor slow queries and optimize them

## SQL Databases
- Use proper indexes
- Use EXPLAIN to analyze query plans
- Avoid SELECT * in large tables
- Prefer prepared statements for repeated queries

## MongoDB

### Query Optimization
- Create indexes on frequently queried fields
- Use projections to return only required fields
- Avoid full collection scans

### Aggregation Pipeline
- Place $match as early as possible
- Use $project to remove unnecessary fields
- Avoid large $group operations without indexes
- Use $limit and $sort 

### Example Aggregation

```javascript
db.orders.aggregate([
  { $match: { status: "completed" } },
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
  { $sort: { total: -1 } }
])
```

### Schema Design
- Design documents around access patterns
- Avoid deeply nested structures when possible
- Use embedding vs referencing depending on query needs