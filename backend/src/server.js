import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import connectDB from './config/db.js';
import AuthRoutes from './routes/AuthRoutes.js';
import DataRoutes from './routes/DataRoutes.js';
import uploadRoute from './routes/uploadRoute.js';
import userRoutes from './routes/userRoutes.js';
import { errorHandler, notFound, sanitizeServerErrors } from './middleware/errorHandler.js';
import { readCache } from './middleware/readCache.js';
import { deferImageDeletes } from './utils/uploader/cleanup.js';
import { uploadUrls } from './middleware/uploadUrls.js';
import { UPLOAD_DIR } from './utils/uploader/upload.js';

// CORS_ORIGINS (env, comma separated) = the origins allowed to call the API. Empty = every origin.
const origins = (process.env.CORS_ORIGINS || '').split(',').map((o) => o.trim().replace(/\/+$/, '')).filter(Boolean);

const PORT = process.env.PORT || 5000;
const app = express();

// Vercel / proxies: needed so rate limiting sees the real client IP
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());
app.use(cors(origins.length ? { origin: origins } : {}));
app.use(express.json({ limit: '1mb' }));
// Express 5 leaves req.body undefined when no body was sent; handlers destructure it
app.use((req, res, next) => {
  req.body ??= {};
  next();
});
app.use(sanitizeServerErrors);
// Stored images. File names are random UUIDs and never change, so browsers may cache them for a year.
// helmet's default same-origin policy would block the app/dashboard (other origins) from loading them.
app.use('/uploads', express.static(UPLOAD_DIR, {
  index: false,
  dotfiles: 'ignore',
  maxAge: '365d',
  immutable: true,
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
  },
}));

app.use(uploadUrls); // before readCache: the cache keeps relative urls, responses get absolute ones
app.use(deferImageDeletes);

const tooMany = { message: 'Too many attempts, please wait a few minutes and try again' };
// RATE_LIMIT_OFF=1 is for automated test stacks only (they sign in far more than 30 times)
const limiter = (max, windowMs = 15 * 60 * 1000) =>
  process.env.RATE_LIMIT_OFF === '1'
    ? (req, res, next) => next()
    : rateLimit({ windowMs, max, standardHeaders: true, legacyHeaders: false, message: tooMany });

// Brute-force protection on credential / OTP endpoints, generous cap everywhere else
app.use('/api/auth/login', limiter(30));
app.use('/api/auth/forgot-password', limiter(10));
app.use('/api/auth/verify-otp', limiter(20));
app.use('/api/auth/reset-password', limiter(20));
app.use('/api', limiter(1000, 60 * 1000));

// after the limiters: cache hits are cheap but must still count towards the rate limit
app.use(readCache);

// Connect to MongoDB
connectDB();

// Routes

// Auth routes
app.use('/api/auth', AuthRoutes);
app.use('/api/auth', DataRoutes);
app.use('/api/auth', uploadRoute);
app.use('/api/auth', userRoutes);
app.get('/', (req, res) => {
  res.send('Hello, Modular Backend!');
});

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

export default app;
