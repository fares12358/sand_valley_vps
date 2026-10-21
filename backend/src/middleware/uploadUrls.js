import { UPLOAD_URL_PREFIX } from '../utils/uploader/upload.js';

// The database stores image urls as '/uploads/<file>.webp' (independent of the domain).
// Clients (the Flutter app) load `img.url` directly, so every JSON response gets them made absolute.

export const publicBaseUrl = (req) =>
  (process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');

const absolutize = (node, base) => {
  if (Array.isArray(node)) {
    node.forEach((v, i) => {
      node[i] = absolutize(v, base);
    });
  } else if (node && typeof node === 'object') {
    for (const key of Object.keys(node)) {
      const v = node[key];
      if (key === 'url' && typeof v === 'string' && v.startsWith(UPLOAD_URL_PREFIX)) node[key] = base + v;
      else node[key] = absolutize(v, base);
    }
  }
  return node;
};

/** Wraps res.json. Works on a copy, so cached response bodies keep their relative urls. */
export function uploadUrls(req, res, next) {
  const json = res.json.bind(res);
  res.json = (body) => {
    if (body && typeof body === 'object') {
      // the round trip also turns Mongoose documents into plain objects (toJSON)
      body = absolutize(JSON.parse(JSON.stringify(body)), publicBaseUrl(req));
    }
    return json(body);
  };
  next();
}
