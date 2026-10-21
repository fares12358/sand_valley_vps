import { AsyncLocalStorage } from 'node:async_hooks';

// Image files must only be removed once the database change that orphans them has succeeded.
// Handlers delete/replace images *before* doc.save(); if that save then fails (a concurrent write
// raises a version conflict, validation fails) the record would point at a file that is gone.
//
// So inside a request, deletions are queued and only run after a successful response (< 400).
// Outside a request (scripts) they run immediately.

const store = new AsyncLocalStorage();

/** Express middleware: opens the per-request queue and flushes it when the response is done. */
export function deferImageDeletes(req, res, next) {
  const queue = [];
  res.on('finish', () => {
    if (res.statusCode >= 400) return; // failed request: keep every file
    for (const run of queue) run().catch((err) => console.warn('[images] cleanup failed:', err.message));
  });
  store.run(queue, next);
}

/** Runs `fn` now, or after the current request succeeds. */
export function afterSuccess(fn) {
  const queue = store.getStore();
  if (!queue) return fn();
  queue.push(fn);
  return Promise.resolve(true);
}
