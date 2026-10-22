import mongoose from 'mongoose';

// MongoDB Atlas (mongodb+srv://...). MONGO_DB is optional: it overrides the database name when the
// connection string has none (Atlas then falls back to a database called "test").
const LOCAL = /^mongodb:\/\/(localhost|127\.0\.0\.1|\[::1\])([:/]|$)/i;

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI is not set (use your MongoDB Atlas connection string)');
    if (LOCAL.test(uri) && process.env.ALLOW_LOCAL_MONGO !== '1') {
      throw new Error('MONGO_URI points to a local MongoDB; use MongoDB Atlas (or set ALLOW_LOCAL_MONGO=1 for automated tests)');
    }
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      ...(process.env.MONGO_DB ? { dbName: process.env.MONGO_DB } : {}),
    });
    console.log(`✅ MongoDB connected (${mongoose.connection.host}/${mongoose.connection.name})`);
  } catch (error) {
    console.error('❌ MongoDB error:', error.message);
    // On Vercel keep the function alive so requests get a JSON 500 instead of a crash
    if (!process.env.VERCEL) process.exit(1);
  }
};

export default connectDB;
