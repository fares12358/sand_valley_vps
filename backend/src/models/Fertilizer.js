// fertilizer_categories -> fertilizer_types (level 1, parent null) -> fertilizer_types (level 2, parent = level-1 type)
import mongoose from 'mongoose';
import { img, ObjectId, options } from './shared.js';

const categorySchema = new mongoose.Schema({
  name: { type: String },
  img,
}, { ...options, collection: 'fertilizer_categories' });

const typeSchema = new mongoose.Schema({
  category: { type: ObjectId, ref: 'FertilizerCategory', required: true },
  parent: { type: ObjectId, ref: 'FertilizerType', default: null },
  name: { type: String },
  img,
  company: { type: String },
  description: { type: String },
}, { ...options, collection: 'fertilizer_types' });
typeSchema.index({ category: 1, parent: 1 });

export const FertilizerCategory = mongoose.model('FertilizerCategory', categorySchema);
export const FertilizerType = mongoose.model('FertilizerType', typeSchema);
