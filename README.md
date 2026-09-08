# Redis Caching — Property Listings (ENG-134560)

A staff-facing interface for the Property Listings Redis caching module.

The application provides search, add, edit, and delete operations against a real
Redis-backed serverless API using Upstash Redis. Redis credentials remain
server-side and are never exposed to browser code.

## Run it

```bash
npm install
npm run start
```

For local development, configure the Redis environment variables below. A local
`.env` file is ignored by Git.

## Environment variables

Set these in Vercel Project Settings → Environment Variables:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

Never commit real credentials.

## Redis data model

Each cache entry is stored under
`property-listings:cache:entry:<id>`. An index set named
`property-listings:cache:index` keeps active entry IDs. Redis TTL expiration
is applied to every entry; expired IDs are removed from the index during reads.

## Project structure

```
redis-caching-architecture/
├── index.html
├── package.json
├── api/cache.js
├── js/app.js
├── js/api.js
├── js/sanitize.js
├── css/design-system.css
├── css/app.css
├── database/schema.sql
└── docs/
    ├── ARCHITECTURE.md
    ├── API.md
    ├── ERD.md
    ├── ACCEPTANCE-CRITERIA.md
    └── DEPLOYMENT.md
```

## Requirements coverage

- Empty lists/searches show a clear `No data found` message.
- Every asynchronous operation displays a loading indicator.
- Invalid input blocks submission and highlights offending fields in red.
- Interactive controls have labels/ARIA attributes and visible keyboard focus.
- Primary actions emit the required `[Analytics]` console message.
- Text is sanitized before entering application state/API payloads and escaped
  before HTML rendering.
- Redis access is server-side only; no Redis credentials are shipped to the browser.
- CSS uses centralized monochromatic design tokens and 16/32px spacing steps.
- Redis errors return a friendly HTTP 503 response instead of crashing the UI.

## Lint

```bash
npm run lint
```

## Deployment

Vercel serves the static frontend and the `api/cache.js` serverless function.
Configure both Upstash variables before deployment.