import mongoose from 'mongoose';

// Stored picture: url is `/uploads/<uuid>.webp` (relative), id is the file name.
export const imgSchema = new mongoose.Schema({
  url: { type: String },
  id: { type: String },
}, { _id: false });

export const img = { type: imgSchema, default: undefined };

export const ObjectId = mongoose.Schema.Types.ObjectId;
export const options = { timestamps: true };
