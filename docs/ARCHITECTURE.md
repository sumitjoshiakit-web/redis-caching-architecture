# Redis Caching System — Architecture

## 1. Scope

This Capstone 1 deliverable is architecture planning only. No Redis CRUD, authentication, frontend, or backend feature implementation is included.

## 2. High-Level Architecture

```text
Floor Staff
   |
   v
Staff UI / Planned Client
   |
   v
API Gateway
   |
   v
Application Services
   |
   +-------------------+
   |                   |
   v                   v
Redis Cache        PostgreSQL
   |                   |
   +---------+---------+
             |
             v
       Audit / Metrics
```

## 3. Responsibilities

### Client
- Clear primary Redis Caching workflow.
- Immediate visual feedback for user actions.
- Loading state for every asynchronous operation.
- Empty-state message when no records exist.
- Field-level validation errors for invalid input.
- Keyboard navigation and accessible names/labels.
- Retry/recovery UI for unreliable connectivity.

### API Gateway
- Authentication and authorization.
- Request validation.
- Rate limiting.
- Consistent JSON response envelopes.
- Centralized error handling.

### Cache Service
- Read-through cache behavior.
- Cache writes with TTL.
- Cache invalidation on updates/deletes.
- Search and statistics contracts.

### Redis
- Fast cache access.
- TTL/expiration support.
- Cache keys and values only; it is not the durable source of record.

### PostgreSQL
- Durable persistence for users, cache entries, tags, audit events, and metrics.

## 4. Data Flow

### Cache Read
```text
Request → Validate/Auth → Redis
                    |
              cache miss
                    v
                PostgreSQL
                    |
              populate Redis
                    v
                Response
```

### Cache Write
```text
Request → Validate/Sanitize → PostgreSQL
                         |
                         v
                    Redis update
                         |
                         v
                      Response
```

The database write is the durable operation; Redis is updated as the cache layer.

## 5. Failure Handling

### Spotty Internet
```text
API request
   |
   +-- success → update UI
   +-- timeout → loading/retry state
   +-- retry exhausted → recoverable offline/error state
```

The planned client must never replace a failure with a blank screen.

### Empty Results
```text
Query → zero records → show "No data found"
```

### Invalid Input
```text
Input → validate → invalid → prevent submission + mark offending fields
```

## 6. Security

- Validate and safely handle text at the API boundary.
- Escape/encode output through safe rendering mechanisms; never inject untrusted HTML.
- Store secrets only in environment variables.
- JWT authentication is planned for protected API endpoints.
- Rate limiting protects the API from abusive request volume.

## 7. Accessibility

- Semantic landmarks.
- Keyboard-accessible controls.
- Visible focus indicators.
- Accessible labels for form controls.
- Live regions for asynchronous status updates.
- No information conveyed by color alone.
- Release target: 100% Lighthouse Accessibility.

## 8. Telemetry

After a primary action completes, the planned analytics adapter logs:

```text
[Analytics] User interacted with Redis Caching
```

Production telemetry can later replace the console adapter without changing the UI contract.

## 9. Scalability

The design allows horizontal API scaling, Redis replication/managed Redis, PostgreSQL connection pooling, and read replicas when traffic requires them. These are architectural options, not current feature implementations.
