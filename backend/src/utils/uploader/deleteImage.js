import fs from 'node:fs/promises';
import path from 'node:path';
import { afterSuccess } from './cleanup.js';
import { UPLOAD_DIR, isLocalImageId } from './upload.js';

async function unlinkWithRetry(file) {
  // Windows (and antivirus / indexers) can hold a file for a moment: retry briefly before giving up
  for (let attempt = 1; ; attempt++) {
    try {
      await fs.unlink(file);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') return false;
      const transient = err.code === 'EBUSY' || err.code === 'EPERM';
      if (!transient || attempt >= 4) throw new Error('Image deletion failed: ' + err.message);
      await new Promise((r) => setTimeout(r, 60 * attempt));
    }
  }
}

/**
 * Removes a stored image. Idempotent: a file that is already gone is fine, and ids that are not
 * ours (legacy ids, anything with path characters) are ignored instead of touching disk.
 * Inside a request the file is only removed after the request succeeded (see cleanup.js).
 */
const deleteImage = async (publicId) => {
  if (!isLocalImageId(publicId)) return false;
  return afterSuccess(() => unlinkWithRetry(path.join(UPLOAD_DIR, publicId)));
};

export default deleteImage;
