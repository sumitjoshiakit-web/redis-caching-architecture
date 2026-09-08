import { Redis } from "@upstash/redis";

const INDEX_KEY = "property-listings:cache:index";
const ENTRY_PREFIX = "property-listings:cache:entry:";

function send(res, data, status = 200) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.status(status).setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(data));
}

function clean(value) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim()
    : "";
}

function validate(body) {
  const cacheKey = clean(body?.cacheKey);
  const cacheValue = clean(body?.cacheValue);
  const ttlSeconds = Number(body?.ttlSeconds);
  if (!cacheKey || cacheKey.length > 255) return "Cache key is required and must be 1–255 characters.";
  if (!cacheValue) return "Cache value is required.";
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) return "TTL must be a positive integer.";
  try { JSON.parse(cacheValue); } catch { return "Cache value must be valid JSON."; }
  return null;
}

function getRedis() {
  return Redis.fromEnv();
}

async function readEntries(redis) {
  const ids = await redis.smembers(INDEX_KEY);
  const values = await Promise.all(ids.map((id) => redis.get(ENTRY_PREFIX + id)));
  const entries = [];

  for (let i = 0; i < ids.length; i += 1) {
    const value = values[i];
    if (!value) {
      await redis.srem(INDEX_KEY, ids[i]);
      continue;
    }

    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      entries.push({ id: ids[i], ...parsed });
    } catch {
      await redis.srem(INDEX_KEY, ids[i]);
    }
  }
  return entries;
}

export default async function handler(req, res) {
  try {
    const redis = getRedis();
    const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));

    if (req.method === "GET") {
      const search = clean(url.searchParams.get("search") || "").toLowerCase();
      const entries = (await readEntries(redis)).filter(
        (entry) => !search || entry.cacheKey.toLowerCase().includes(search)
      );
      return send(res, { success: true, data: entries });
    }

    let body = req.body || {};
    if (typeof body === "string") {
      try { body = JSON.parse(body); }
      catch { return send(res, { success: false, message: "Invalid JSON request body." }, 400); }
    }

    if (req.method === "POST") {
      const error = validate(body);
      if (error) return send(res, { success: false, message: error }, 400);

      const id = "entry-" + crypto.randomUUID();
      const record = {
        cacheKey: clean(body.cacheKey),
        cacheValue: clean(body.cacheValue),
        ttlSeconds: Number(body.ttlSeconds),
        createdAt: new Date().toISOString(),
      };

      await redis.set(ENTRY_PREFIX + id, JSON.stringify(record), { ex: record.ttlSeconds });
      await redis.sadd(INDEX_KEY, id);
      return send(res, { success: true, data: { id, ...record } }, 201);
    }

    const id = url.searchParams.get("id");
    if (!id) return send(res, { success: false, message: "Entry id is required." }, 400);

    const redisKey = ENTRY_PREFIX + id;

    if (req.method === "PATCH") {
      const currentRaw = await redis.get(redisKey);
      if (!currentRaw) return send(res, { success: false, message: "Cache entry not found." }, 404);

      const current = typeof currentRaw === "string" ? JSON.parse(currentRaw) : currentRaw;
      const next = { ...current, ...(body || {}) };
      const error = validate(next);
      if (error) return send(res, { success: false, message: error }, 400);

      const record = {
        cacheKey: clean(next.cacheKey),
        cacheValue: clean(next.cacheValue),
        ttlSeconds: Number(next.ttlSeconds),
        createdAt: current.createdAt,
      };
      await redis.set(redisKey, JSON.stringify(record), { ex: record.ttlSeconds });
      return send(res, { success: true, data: { id, ...record } });
    }

    if (req.method === "DELETE") {
      const deleted = await redis.del(redisKey);
      await redis.srem(INDEX_KEY, id);
      if (!deleted) return send(res, { success: false, message: "Cache entry not found." }, 404);
      return send(res, { success: true, data: { id } });
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return send(res, { success: false, message: "Method not allowed." }, 405);
  } catch (error) {
    console.error("[Redis API]", error);
    return send(res, {
      success: false,
      message: "Redis service unavailable. Check the Vercel environment variables and Redis connection."
    }, 503);
  }
}