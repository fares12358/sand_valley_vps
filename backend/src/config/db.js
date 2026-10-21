import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB error:', error.message);
    // On Vercel keep the function alive so requests get a JSON 500 instead of a crash
    if (!process.env.VERCEL) process.exit(1);
  }
};

export default connectDB;
