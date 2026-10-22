// main_images collection: the four home-screen pictures, one document per section.
import mongoose from 'mongoose';
import { img, options } from './shared.js';

export const MAIN_SECTIONS = ['seeds', 'Fertilizer', 'Insecticide', 'Communication'];

const mainImageSchema = new mongoose.Schema({
  section: { type: String, enum: MAIN_SECTIONS, required: true, unique: true },
  img,
}, { ...options, collection: 'main_images' });

export default mongoose.model('MainImage', mainImageSchema);
