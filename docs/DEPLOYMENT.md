# Deployment Guide

## Milestone Scope

This repository is a static documentation deliverable for Capstone 1. It does not require Redis, PostgreSQL, Node.js, or an API server to render the planning page.

## Vercel

The root `index.html` is a static entry point, so Vercel can deploy this repository without a build command or framework preset.

Recommended settings:

- Framework Preset: **Other** (or no framework)
- Build Command: **None**
- Output Directory: **`.`**
- Install Command: **None**

The deployment serves the architecture landing page only. The planned Redis/PostgreSQL services are not deployed by this Capstone 1 static site.

## Local Preview

From the repository root, any static HTTP server can serve the files. For example:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Later Implementation Milestone

When feature implementation begins, the API, Redis, PostgreSQL, authentication, telemetry, and production secrets must be deployed as separate services with environment variables. Do not put credentials in client-side source code.
