// places -> engineers (contacts shown per place)
import mongoose from 'mongoose';
import { img, ObjectId, options } from './shared.js';

const placeSchema = new mongoose.Schema({
  name: { type: String },
  img,
}, { ...options, collection: 'places' });

const engineerSchema = new mongoose.Schema({
  place: { type: ObjectId, ref: 'Place', required: true, index: true },
  name: { type: String },
  phone: { type: String },
  img,
}, { ...options, collection: 'engineers' });

export const Place = mongoose.model('Place', placeSchema);
export const Engineer = mongoose.model('Engineer', engineerSchema);
