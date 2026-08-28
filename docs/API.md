# Redis Caching System — API Contracts

## Status

Planning contract only. These endpoints are specified for a later implementation milestone; this repository does not implement them.

## Base URL

```text
https://<deployment-domain>/api/v1
```

## Authentication

Protected endpoints use:

```http
Authorization: Bearer <YOUR_JWT_TOKEN>
```

Never commit a real token, secret, or API key.

## Response Envelope

### Success

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

### Error

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "key": "Key is required"
  }
}
```

## 1. Get Cache Entry

**GET** `/cache/{key}`

Returns a cache entry by its unique key.

**Path parameter**

| Name | Type | Required | Rule |
|---|---|---:|---|
| key | string | yes | 1–255 characters |

**Responses**

- `200 OK` — entry returned.
- `401 Unauthorized` — authentication missing/invalid.
- `404 Not Found` — key does not exist.
- `503 Service Unavailable` — cache/data service unavailable.

## 2. Create Cache Entry

**POST** `/cache`

**Request**

```json
{
  "key": "property:123",
  "value": {
    "id": 123,
    "name": "Example Property"
  },
  "ttl": 3600,
  "tags": ["property"]
}
```

**Validation**

- `key` required, 1–255 characters.
- `value` required and must be valid JSON.
- `ttl` must be an integer greater than or equal to `0`.
- `tags` are optional and must contain valid tag strings.
- Text must be safely handled before persistence.

**Responses**

- `201 Created` — entry created.
- `400 Bad Request` — invalid input.
- `401 Unauthorized` — authentication missing/invalid.
- `409 Conflict` — cache key already exists.
- `503 Service Unavailable` — dependency unavailable.

## 3. Update Cache Entry

**PUT** `/cache/{key}`

**Request**

```json
{
  "value": {
    "id": 123,
    "name": "Updated Property"
  },
  "ttl": 7200,
  "tags": ["property", "updated"]
}
```

**Responses**

- `200 OK` — entry updated.
- `400 Bad Request` — invalid input.
- `401 Unauthorized` — authentication missing/invalid.
- `404 Not Found` — key does not exist.
- `503 Service Unavailable` — dependency unavailable.

## 4. Delete Cache Entry

**DELETE** `/cache/{key}`

**Responses**

- `204 No Content` — entry deleted.
- `401 Unauthorized` — authentication missing/invalid.
- `404 Not Found` — key does not exist.
- `503 Service Unavailable` — dependency unavailable.

## 5. Search Cache Entries

**GET** `/cache/search?q={query}&tag={tag}&limit={limit}`

**Query parameters**

| Name | Type | Required | Rule |
|---|---|---:|---|
| q | string | no | safely handled search text |
| tag | string | no | valid tag |
| limit | integer | no | 1–100; default 20 |

An empty result is a successful response with an empty `data` array; the client displays **No data found**.

## 6. Cache Statistics

**GET** `/cache/stats`

Returns planned operational statistics such as total entries, active entries, expired entries, hit count, and average response time.

**Responses**

- `200 OK` — statistics returned.
- `401 Unauthorized` — authentication missing/invalid.
- `503 Service Unavailable` — metrics dependency unavailable.

## Route Matching Rule

Specific routes must be registered before the dynamic `/:key` route in the eventual Express implementation:

```text
GET /cache/search
GET /cache/stats
GET /cache/:key
```

This prevents `search` or `stats` from being interpreted as cache keys.

## Connectivity Contract

Clients must show a loading indicator during asynchronous operations. A timeout or network failure returns a recoverable error state and may be retried; the UI must not crash or become blank.

## Telemetry Contract

After a primary action completes, the development analytics adapter emits:

```text
[Analytics] User interacted with Redis Caching
```

The event may include an action name such as `cache_created`, `cache_updated`, `cache_deleted`, or `cache_searched`.
