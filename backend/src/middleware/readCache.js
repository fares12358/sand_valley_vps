// In-memory cache for the public, read-only content routes.
//
// Every content GET reads several collections from MongoDB (MongoDB Atlas, a network hop), which costs a round
// trip each time. The responses only change when someone writes, so we keep them in memory and
// throw the whole cache away after any successful write (POST/PUT/DELETE). Bodies and status
// codes are unchanged; a TTL is a safety net for edits made directly in the database.
//
// This is per-process: with several Node processes (e.g. PM2 cluster mode) a write only clears
// the cache of the process that handled it, so run a single instance or drop the TTL to seconds.

const TTL_MS = Number(process.env.READ_CACHE_TTL_MS ?? 5 * 60 * 1000);
const MAX_ENTRIES = 200;

// Only content routes; user lists and auth endpoints are never cached.
const CACHEABLE =
  /^\/api\/auth\/get-(main-categories|data|seeds-data|seeds-type|seeds-description|communication-data|communication-eng|insecticide-data|insecticide-type|fertilizer-data|fertilizer-type|fertilizer-nested-type)(\/|$)/;

const cache = new Map(); // url -> { body, at }
let generation = 0; // bumped on every clear

export const clearReadCache = () => {
  generation++;
  cache.clear();
};

export function readCache(req, res, next) {
  if (TTL_MS <= 0) return next();

  if (req.method !== 'GET') {
    // any write that succeeded may have changed what the GETs return
    res.on('finish', () => {
      if (res.statusCode < 400) clearReadCache();
    });
    return next();
  }

  if (!CACHEABLE.test(req.path)) return next();

  const key = req.originalUrl;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    res.set('X-Cache', 'HIT');
    return res.status(200).json(hit.body);
  }

  const json = res.json.bind(res);
  const startedAt = generation; // a write that lands while this read is in flight must win
  res.json = (body) => {
    if (res.statusCode === 200 && startedAt === generation) {
      if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
      cache.set(key, { body, at: Date.now() });
    }
    res.set('X-Cache', 'MISS');
    return json(body);
  };
  next();
}
