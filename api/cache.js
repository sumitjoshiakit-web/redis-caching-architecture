import { Redis } from "@upstash/redis";

const INDEX_KEY = "property-listings:cache:index";
const ENTRY_PREFIX = "property-listings:cache:entry:";

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
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

  try {
    JSON.parse(cacheValue);
  } catch {
    return "Cache value must be valid JSON.";
  }

  return null;
}

function getRedis() {
  return Redis.fromEnv();
}

async function readEntries(redis) {
  const ids = await redis.smembers(INDEX_KEY);
  const values = await Promise.all(ids.map((id) => redis.get(`${ENTRY_PREFIX}${id}`)));
  const entries = [];

  for (let i = 0; i < ids.length; i += 1) {
    if (!values[i]) {
      await redis.srem(INDEX_KEY, ids[i]);
      continue;
    }

    try {
      entries.push({ id: ids[i], ...JSON.parse(values[i]) });
    } catch {
      await redis.srem(INDEX_KEY, ids[i]);
    }
  }

  return entries;
}

export default async function handler(req) {
  try {
    const redis = getRedis();

    if (req.method === "GET") {
      const search = clean(new URL(req.url).searchParams.get("search") || "").toLowerCase();
      const entries = (await readEntries(redis)).filter(
        (entry) => !search || entry.cacheKey.toLowerCase().includes(search)
      );
      return jsonResponse({ success: true, data: entries });
    }

    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return jsonResponse({ success: false, message: "Invalid JSON request body." }, 400);
      }
    }

    if (req.method === "POST") {
      const error = validate(body);
      if (error) return jsonResponse({ success: false, message: error }, 400);

      const id = `entry-${crypto.randomUUID()}`;
      const record = {
        cacheKey: clean(body.cacheKey),
        cacheValue: clean(body.cacheValue),
        ttlSeconds: Number(body.ttlSeconds),
        createdAt: new Date().toISOString(),
      };

      await redis.set(`${ENTRY_PREFIX}${id}`, JSON.stringify(record), { ex: record.ttlSeconds });
      await redis.sadd(INDEX_KEY, id);
      return jsonResponse({ success: true, data: { id, ...record } }, 201);
    }

    const id = new URL(req.url).searchParams.get("id");
    if (!id) return jsonResponse({ success: false, message: "Entry id is required." }, 400);

    const redisKey = `${ENTRY_PREFIX}${id}`;

    if (req.method === "PATCH") {
      const currentRaw = await redis.get(redisKey);
      if (!currentRaw) return jsonResponse({ success: false, message: "Cache entry not found." }, 404);

      const current = JSON.parse(currentRaw);
      const next = { ...current, ...(body || {}) };
      const error = validate(next);
      if (error) return jsonResponse({ success: false, message: error }, 400);

      const record = {
        cacheKey: clean(next.cacheKey),
        cacheValue: clean(next.cacheValue),
        ttlSeconds: Number(next.ttlSeconds),
        createdAt: current.createdAt,
      };

      await redis.set(redisKey, JSON.stringify(record), { ex: record.ttlSeconds });
      return jsonResponse({ success: true, data: { id, ...record } });
    }

    if (req.method === "DELETE") {
      const deleted = await redis.del(redisKey);
      await redis.srem(INDEX_KEY, id);

      if (!deleted) return jsonResponse({ success: false, message: "Cache entry not found." }, 404);
      return jsonResponse({ success: true, data: { id } });
    }

    return jsonResponse({ success: false, message: "Method not allowed." }, 405);
  } catch {
    return jsonResponse(
      { success: false, message: "Redis service unavailable. Check the connection and try again." },
      503
    );
  }
}