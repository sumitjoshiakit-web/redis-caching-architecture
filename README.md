# Redis Caching Architecture

Architecture and database planning for the Property Listings Redis Caching module.

## Scope

This repository intentionally contains **no feature implementation code**. It is the Capstone 1 architectural-planning deliverable for the Redis Caching module.

The design addresses:

- Clear staff-facing Redis Caching interface requirements
- Consistent data structures
- Empty states
- Slow/spotty connectivity and loading behavior
- Invalid-input handling
- Accessibility requirements
- Simulated analytics telemetry
- XSS-safe text handling
- PostgreSQL persistence and Redis caching
- API contracts and error responses

## Repository Structure

```text
redis-caching-architecture/
├── database/
│   └── schema.sql
├── design/
│   └── design-system.css
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── ERD.md
│   └── ACCEPTANCE-CRITERIA.md
├── .env.example
├── .gitignore
└── README.md
```

## Architecture Summary

```text
Staff UI
   |
   v
API Layer
   |
   +------------------+
   |                  |
   v                  v
Redis Cache       PostgreSQL
   |                  |
   +--------+---------+
            |
            v
       Audit / Metrics
```

Redis is the fast-access caching layer; PostgreSQL is the durable source of record. Redis is appropriate for caching because it provides in-memory data structures, expiration, and cache-oriented access patterns. See the official Redis project documentation for background. 

## Key Planning Decisions

1. **PostgreSQL** is the persistent relational database.
2. **Redis** is the caching layer, not the source of record.
3. API contracts are defined before feature implementation.
4. Validation is required at the API boundary.
5. User-facing text must be safely handled before persistence.
6. Every asynchronous UI operation has a loading state and failure state.
7. Accessibility is treated as a release gate, with a target Lighthouse accessibility score of 100.
8. No real credentials or secrets belong in this repository.

## Verification Before Implementation

Before feature code is introduced in a later milestone, verify:

- `schema.sql` executes successfully on PostgreSQL.
- Every API contract has request, response, validation, and error definitions.
- Lighthouse accessibility reaches 100.
- ESLint reports 0 errors and 0 warnings once implementation code exists.
- No real secrets or PII are committed.

## Current Milestone

**Capstone 1 — Database Schema & API Architecture**

No feature code is intentionally included in this milestone.
