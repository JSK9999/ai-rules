---
description: Practical MongoDB / NoSQL best practices for schema design, indexing, aggregation pipeline optimization, and secure production usage.
keywords: [mongodb, nosql, mongoose, aggregation, index, indexing, compound, ttl, text, schema, embedding, referencing, sharding, transactions, performance, query, pipeline]
---

# MongoDB (NoSQL)

Practical guidance for building efficient, maintainable, and secure MongoDB-backed applications. Focus is on actionable rules, decision heuristics, and small examples.

## When to activate
- Building or optimizing MongoDB queries or aggregations
- Designing collection/document schemas
- Adding or auditing indexes
- Implementing security for stored data or connections
- Working on sharding, transactions, or time-series data

---

## Indexing: when & which type
- **Single-field**: good for high-cardinality single-field lookups.  
- **Compound**: use when queries filter/sort by multiple fields. Put the most selective / most-filtered field first.
  - Example: `{ age: 1, status: 1 }` helps queries with `age` and `status`.
  - Order matters: `{ status: 1, age: 1 }` won't help a query that only filters by `age`.
- **Text index**: use for full-text search across string fields. Avoid over-indexing — use dedicated search (e.g., Atlas Search) if heavy usage.
- **TTL index**: use for expiring ephemeral data (sessions, caches). Set `expireAfterSeconds`.
- **Wildcard index**: `{ "$**": 1 }` — use sparingly for schemas with many dynamic fields; increases write latency ~15-30% and storage 2-5x.
- **Practical checks**
  - Run `db.collection.explain('executionStats')` to check index usage.
  - Avoid indexes on very high-write, low-read fields.
  - Remove unused indexes (costly on writes & storage): `db.collection.getIndexes()` + `dropIndex()`.

### Mongoose index snippets
```javascript
// Compound index (background build to avoid blocking)
userSchema.index({ email: 1, status: 1 }, { background: true });

// TTL index for auto-expiry (e.g., sessions expire after 24h)
sessionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

// Text index with field weights
postSchema.index({ title: 'text', body: 'text' }, { weights: { title: 3, body: 1 } });

// Sparse index for optional fields (only indexes docs where field exists)
profileSchema.index({ twitterHandle: 1 }, { sparse: true });
```

---

## Embedding vs Referencing — practical decision rules
- **Embed** when:
  - One-to-few relationships (comments on a post <100).
  - Data accessed together most of the time.
  - Example: post with small list of tags, metadata.
- **Reference** when:
  - One-to-many with large or growing lists (orders, logs).
  - The child is large or independently updated.
  - Many-to-many relationships.
- **Hybrid approach**:
  - Denormalize frequently-read fields (e.g., username snapshot on comment) but keep authoritative source in referenced doc.
- **Quick rule**: model around access patterns, not perfectly normalized schema.

### Mongoose embedding example with validation
```javascript
postSchema.add({
  comments: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, maxlength: 500, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  commentCount: { 
    type: Number, 
    validate: { 
      validator: v => v <= 100, 
      message: 'Max 100 embedded comments; use referencing for more' 
    }
  }
});
```

---

## Data modeling patterns (common practical patterns)
- **Bucket pattern**: group many small time-series events into monthly/day buckets to avoid huge arrays.
  ```javascript
  // Example: metrics bucketed by day
  {
    _id: deviceId,
    bucketDate: ISODate("2026-03-08"),
    readings: [ { ts: ..., value: ... }, ... ] // capped at ~1000 docs
  }
  ```
- **Outlier pattern**: keep typical documents compact; move unusually large data to separate collection with reference.
- **Polymorphic / type-discriminator**: use a `type` field + sparse fields per type, index `type` + commonly-queried fields.
- **Time-series**: prefer MongoDB time-series collections (5.0+) or bucket pattern for high-frequency data.

---

## Aggregation pipeline optimization
- **$match early**: filter as soon as possible to reduce pipeline volume.
- **$project early**: drop unneeded fields prior to heavy stages like `$group`.
- **Use indexes before aggregation**: if possible, use `$match` on indexed fields so the engine can use indexes.
- **Avoid memory spikes**: `$group` can be memory heavy; add `$limit` / `$sort` with proper indexes.
- **Use `allowDiskUse:true`** for large jobs, but prefer pre-filtering.
- **Pipeline ordering cheat sheet**: `$match` → `$project` → `$lookup` (if needed) → `$group` → `$sort` → `$limit`.

```javascript
// Example: aggregation to compute per-customer revenue (optimized)
db.orders.aggregate([
  { $match: { status: "completed", createdAt: { $gte: ISODate("2026-01-01") } } }, // indexed filters first
  { $project: { customerId: 1, amount: 1, _id: 0 } }, // remove heavy/unneeded fields
  { $group: { _id: "$customerId", total: { $sum: "$amount" } } },
  { $sort: { total: -1 } },
  { $limit: 100 }
], { allowDiskUse: false });
```

---

## ❌ Common anti-patterns to avoid
- Storing unbounded arrays (e.g., activity logs) → use bucket pattern or separate collection
- Using `$where` or client-side evaluation → blocks indexing, slow, security risk
- Over-using `$lookup` in high-traffic aggregations → denormalize hot paths or pre-aggregate
- Creating indexes on low-cardinality fields alone (e.g., `gender: 1`) → rarely selective, wastes write capacity
- Ignoring document size limit (16MB) → monitor with `$objSize` or schema validation

---

## Transactions, consistency & sharding (practical notes)
- Use multi-document transactions only when necessary — they add latency (~2-3x) and complexity.
- Favor single-document atomic operations (atomic by design) when possible.
- For sharding:
  - Choose shard key based on write and query patterns (avoid monotonically increasing keys like `createdAt` alone).
  - Use hashed shard keys for even distribution if queries don't filter by range.
  - Monitor chunk distribution and balancing via `sh.status()`.
  - Test transactions/sharding in staging with representative data sizes.

---

## Production & security considerations
- Never expose MongoDB directly to the internet — use private networks, VPC peering, or Atlas private endpoints.
- Authentication & RBAC: enable SCRAM / x.509 and use least-privilege roles.
- Field-level encryption: consider for highly sensitive fields (PII, tokens) using MongoDB Client-Side Field Level Encryption (CSFLE).
- Secrets: store connection strings / credentials in environment variables or secret manager; do not embed in code.
- TLS: require TLS for all connections (`tls=true` in connection string).
- Backups & PITR: ensure regular backups; test restore procedures quarterly.
- Audit & logging: enable audit logs for sensitive operations where compliance requires.

---

## Monitoring & performance checks
- Use Profiler and `system.profile` to find slow queries:  
  `db.setProfilingLevel(1, { slowms: 100 })`
- Monitor `db.serverStatus()` metrics: `opcounters`, `asserts`, `connections`, `mem`, `metrics.document`.
- Regularly review index usage: `db.collection.aggregate([{ $indexStats: {} }])`.
- Plan index changes after schema or query changes — test with `explain('executionStats')`.

---

## Quick checklists (for PRs/Code Reviews)
- [ ] Queries have appropriate filters and projections (no `find({})` without limits)
- [ ] Critical fields are indexed (and compound indexes tested with real query patterns)
- [ ] Aggregations place `$match` and `$project` early in pipeline
- [ ] Large arrays or documents have outlier/bucket handling
- [ ] No hardcoded connection strings or secrets in code
- [ ] TLS and authentication are enforced in production config
- [ ] Schema validation rules added for critical collections (optional but recommended)

---

## Example prompts (helps semantic router match this file)
```
"mongodb aggregation pipeline optimization"
"optimize mongoose query performance"
"mongodb ttl index sessions"
"embedding vs referencing mongodb"
"mongo shard key best practices"
"mongodb compound index order best practices"
"how to avoid aggregation memory limit"
"mongoose populate vs embedding performance"
"mongodb field level encryption example"
"time-series collection vs bucket pattern"
```