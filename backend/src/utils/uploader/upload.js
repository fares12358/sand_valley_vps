import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Local image store. Every upload is validated, re-encoded as WebP and written under a random
// name in UPLOAD_DIR; the database keeps `img: { url: '/uploads/<name>', id: '<name>' }`.
// The API turns the relative url into an absolute one on the way out (middleware/uploadUrls.js).

export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : fileURLToPath(new URL('../../../uploads', import.meta.url));

export const UPLOAD_URL_PREFIX = '/uploads/';

// What the clients need: the app shows these at 110-220 px, the dashboard a bit larger.
const MAX_EDGE = 1000; // px, longest side; smaller images are never enlarged
const WEBP_QUALITY = 80;
const WEBP_EFFORT = 5; // 0-6: slower encode, smaller file
const MAX_INPUT_PIXELS = 50_000_000; // rejects decompression bombs (a 5 MB PNG can expand hugely)

// Only raster formats. SVG is refused on purpose: it can carry scripts.
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'heif', 'tiff']);

// Our own file names: a UUID + .webp. Anything else (e.g. old Cloudinary ids) is never touched on disk.
const FILE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/i;
export const isLocalImageId = (id) => typeof id === 'string' && FILE_NAME.test(id);

export class InvalidImageError extends Error {
  constructor(message = 'Invalid or unsupported image file') {
    super(message);
    this.name = 'InvalidImageError';
    this.status = 400;
  }
}

const open = (buffer) => sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'truncated' });

/** Throws InvalidImageError unless the bytes really are an allowed raster image (checks content, not the filename). */
export async function assertImage(buffer) {
  try {
    const meta = await open(buffer).metadata();
    if (!ALLOWED_FORMATS.has(meta.format)) throw new InvalidImageError('Only jpg, png, webp, gif or avif images are allowed');
    // iPhone HEIC (HEVC) photos: the bundled image library cannot decode them
    if (meta.format === 'heif' && meta.compression === 'hevc') throw new InvalidImageError('HEIC photos are not supported. Export the picture as JPG or PNG.');
    if (!meta.width || !meta.height) throw new InvalidImageError();
  } catch (err) {
    throw err instanceof InvalidImageError ? err : new InvalidImageError();
  }
}

// Buffers that toWebp() already produced; uploadImage() must not re-encode them (quality loss).
const optimized = new WeakSet();

/** Buffer in (any allowed image), optimized WebP buffer out. */
export async function toWebp(buffer) {
  try {
    const out = await open(buffer)
      .rotate() // honour the EXIF orientation, then metadata is dropped (location, camera...)
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: WEBP_EFFORT })
      .toBuffer();
    optimized.add(out);
    return out;
  } catch {
    throw new InvalidImageError();
  }
}

/** Writes an already-optimized WebP buffer; returns { url, public_id } like the old Cloudinary helper. */
export async function saveWebp(webp) {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}.webp`;
  const target = path.join(UPLOAD_DIR, name);
  const temp = `${target}.tmp`;
  // write then rename: a request can never be served a half-written file
  await fs.writeFile(temp, webp, { flag: 'wx' });
  await fs.rename(temp, target);
  return { url: `${UPLOAD_URL_PREFIX}${name}`, public_id: name };
}

const uploadImage = async (buffer) => saveWebp(optimized.has(buffer) ? buffer : await toWebp(buffer));

export default uploadImage;
