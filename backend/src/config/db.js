import mongoose from 'mongoose';

// MongoDB Atlas (mongodb+srv://...). MONGO_DB is optional: it overrides the database name when the
// connection string has none (Atlas then falls back to a database called "test").
const LOCAL = /^mongodb:\/\/(localhost|127\.0\.0\.1|\[::1\])([:/]|$)/i;

// The old single-document design left indexes such as `users.username_1` (unique) on the users
// collection. Real user documents have no `users.*` field, so every account after the first
// collides on null. Drop any index on a `users.*` path; never fails the start-up.
const dropLegacyUserIndexes = async () => {
  try {
    const coll = mongoose.connection.collection('users');
    for (const idx of await coll.indexes()) {
      if (Object.keys(idx.key).some((k) => k.startsWith('users.'))) {
        await coll.dropIndex(idx.name);
        console.log(`🧹 Dropped legacy index users.${idx.name}`);
      }
    }
  } catch (e) {
    if (e.codeName !== 'NamespaceNotFound') console.warn('Legacy index check skipped:', e.message);
  }
};

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is not set (use your MongoDB Atlas connection string)');
    if (LOCAL.test(uri) && process.env.ALLOW_LOCAL_MONGO !== '1') {
      throw new Error('MONGO_URI points to a local MongoDB; use MongoDB Atlas (or set ALLOW_LOCAL_MONGO=1 for automated tests)');
    }
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      ...(process.env.MONGO_DB ? { dbName: process.env.MONGO_DB } : {}),
    });
    console.log(`✅ MongoDB connected (${mongoose.connection.host}/${mongoose.connection.name})`);
    await dropLegacyUserIndexes();
  } catch (error) {
    console.error('❌ MongoDB error:', error.message);
    // On Vercel keep the function alive so requests get a JSON 500 instead of a crash
    if (!process.env.VERCEL) process.exit(1);
  }
};

export default connectDB;
