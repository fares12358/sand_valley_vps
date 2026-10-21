import multer from 'multer';
import { assertImage, toWebp } from '../utils/uploader/upload.js';

// Phone photos are big; they are shrunk to ~100 KB afterwards, so the limit only guards memory.
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const multerUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    // first, cheap filter on the declared type; the real check is on the bytes below
    fileFilter: (req, file, cb) => {
        if (/^image\/(jpe?g|png|webp|gif|avif|heic|heif|tiff)$/i.test(file.mimetype)) return cb(null, true);
        const err = new Error('Only image files are allowed (jpg, png, webp)');
        err.code = 'INVALID_FILE_TYPE';
        cb(err);
    },
});

/**
 * After multer: reject files whose content is not a real, allowed image (a renamed .exe, an SVG, a bomb,
 * a corrupt or HEIC file), then replace the upload by its optimized WebP. Every failure is a clean 400
 * here, so the content handlers never see an undecodable file.
 */
const verifyImage = async (req, res, next) => {
    if (!req.file) return next();
    try {
        await assertImage(req.file.buffer);
        req.file.buffer = await toWebp(req.file.buffer);
        req.file.mimetype = 'image/webp';
        req.file.size = req.file.buffer.length;
        next();
    } catch (err) {
        res.status(err.status || 400).json({ message: err.message });
    }
};

/**
 * Drop-in for the old multer instance: `upload.single('image')` still works in every route,
 * but now also checks the file's content (Express runs an array of middleware in order).
 */
const upload = {
    single: (field) => [multerUpload.single(field), verifyImage],
};

export default upload;
