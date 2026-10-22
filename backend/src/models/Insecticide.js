// insecticide_categories -> insecticide_types
import mongoose from 'mongoose';
import { img, ObjectId, options } from './shared.js';

const categorySchema = new mongoose.Schema({
  name: { type: String },
  img,
}, { ...options, collection: 'insecticide_categories' });

const typeSchema = new mongoose.Schema({
  category: { type: ObjectId, ref: 'InsecticideCategory', required: true, index: true },
  name: { type: String },
  img,
  description: { type: String },
  company: { type: String },
}, { ...options, collection: 'insecticide_types' });

export const InsecticideCategory = mongoose.model('InsecticideCategory', categorySchema);
export const InsecticideType = mongoose.model('InsecticideType', typeSchema);
