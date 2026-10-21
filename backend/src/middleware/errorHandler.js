import multer from 'multer';

const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

/** Unknown route -> JSON 404 (instead of Express's HTML page). */
export const notFound = (req, res) => {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

/**
 * Express error handler. Maps known failures to friendly 4xx responses and
 * never leaks internals on 5xx. Response keys stay `{ message, error? }`.
 */
export const errorHandler = (err, req, res, next) => {
    if (res.headersSent) return next(err);

    // Malformed JSON body
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Invalid JSON in request body' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ message: 'Request body is too large' });
    }

    // Upload problems (size limit, wrong field name, wrong type)
    if (err instanceof multer.MulterError) {
        const messages = {
            LIMIT_FILE_SIZE: 'Image is too large (max 10 MB)',
            LIMIT_UNEXPECTED_FILE: 'Unexpected file field, use "image"',
        };
        return res.status(400).json({ message: messages[err.code] || `Upload error: ${err.message}` });
    }
    if (err.code === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ message: err.message });
    }

    // Mongoose
    if (err.name === 'ValidationError') {
        return res.status(400).json({ message: 'Some fields are invalid or missing' });
    }
    if (err.name === 'CastError') {
        return res.status(400).json({ message: 'Invalid id format' });
    }
    if (err.name === 'VersionError' || err.name === 'ParallelSaveError') {
        return res.status(409).json({ message: 'The data was changed by someone else, please try again' });
    }

    console.error(`[error] ${req.method} ${req.originalUrl}:`, err);
    res.status(err.status || 500).json({
        message: 'Something went wrong on our side, please try again later',
        ...(isProd ? {} : { error: err.message }),
    });
};

/**
 * Wraps res.json so every 5xx body produced by the legacy controllers
 * (`{ message, error: error.message }`) is logged server-side and the raw
 * `error` text is replaced with a generic one. Keys/status are unchanged.
 */
export const sanitizeServerErrors = (req, res, next) => {
    const json = res.json.bind(res);
    res.json = (body) => {
        if (res.statusCode >= 500 && body && typeof body === 'object' && 'error' in body) {
            console.error(`[${res.statusCode}] ${req.method} ${req.originalUrl}: ${body.message} -> ${body.error}`);
            if (isProd) body = { ...body, error: 'Internal server error' };
        }
        return json(body);
    };
    next();
};
