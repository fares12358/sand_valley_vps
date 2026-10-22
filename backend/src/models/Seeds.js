// seed_categories -> seed_types (each type carries one description block)
import mongoose from 'mongoose';
import { img, ObjectId, options } from './shared.js';

const categorySchema = new mongoose.Schema({
  name: { type: String },
  img,
}, { ...options, collection: 'seed_categories' });

const descriptionSchema = new mongoose.Schema({
  img,
  name: { type: String },
  company: { type: String },
  description: { type: String },
}, { _id: false });

const typeSchema = new mongoose.Schema({
  category: { type: ObjectId, ref: 'SeedCategory', required: true, index: true },
  name: { type: String },
  img,
  description: { type: descriptionSchema, default: undefined },
}, { ...options, collection: 'seed_types' });

export const SeedCategory = mongoose.model('SeedCategory', categorySchema);
export const SeedType = mongoose.model('SeedType', typeSchema);
