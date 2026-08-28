# Database Schema & ERD

## Database

PostgreSQL 15+ is the durable relational store. Redis is the cache layer and is not represented as the source-of-record database in this relational schema.

## Entity Relationship Diagram

```text
┌──────────────┐        ┌──────────────────┐        ┌──────────────┐
│    users     │        │   cache_entries  │        │  cache_tags  │
├──────────────┤        ├──────────────────┤        ├──────────────┤
│ id PK        │1      *│ id PK            │*      *│ id PK        │
│ username     │────────│ created_by FK    │        │ name         │
│ email        │        │ cache_key        │        │ created_at   │
│ role         │        │ cache_value      │        └──────────────┘
│ password_hash│        │ ttl              │               *
│ is_active    │        │ expires_at       │               │
│ created_at   │        │ hit_count        │        ┌──────┴────────┐
│ updated_at   │        │ version          │        │cache_entry_tags│
└──────────────┘        │ created_at       │        ├───────────────┤
        │               │ updated_at       │        │ cache_entry FK│
        │               └──────────────────┘        │ tag FK        │
        │                       │                   └───────────────┘
        │                       │
        │1                      │*
        v                       v
┌──────────────────────────────────┐
│            audit_log             │
├──────────────────────────────────┤
│ id PK                            │
│ user_id FK                       │
│ action                           │
│ resource_type                    │
│ resource_id                      │
│ changes JSONB                    │
│ ip_address                       │
│ user_agent                       │
│ created_at                       │
└──────────────────────────────────┘

┌──────────────────────┐
│    cache_metrics     │
├──────────────────────┤
│ id PK                │
│ cache_key            │
│ operation            │
│ response_time_ms     │
│ status               │
│ recorded_at          │
└──────────────────────┘
```

## Tables

### users
Stores staff identities and authorization roles.

### cache_entries
Durable metadata and values associated with Redis cache keys. `cache_key` is unique.

### cache_tags
Reusable labels for organizing cache entries.

### cache_entry_tags
Many-to-many junction between cache entries and tags.

### audit_log
Records security-sensitive and operational actions performed against resources.

### cache_metrics
Stores operational telemetry such as operation type, response time, and status.

## Integrity Rules

- Primary keys use UUIDs.
- User email and username are unique.
- Cache keys are unique and required.
- Cache values are stored as JSONB.
- Foreign keys use explicit delete behavior.
- TTL must be non-negative.
- `expires_at` is required for cache expiration decisions.
- Audit records are retained independently from cache records.

## Index Strategy

Indexes are created separately from `CREATE TABLE` statements so the schema is valid PostgreSQL syntax.

- `cache_entries.cache_key` — unique lookup.
- `cache_entries.expires_at` — expiration/cleanup queries.
- `audit_log.user_id` and `audit_log.created_at` — activity queries.
- `cache_metrics.cache_key` and `cache_metrics.recorded_at` — operational analysis.
