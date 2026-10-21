// Prepares a fresh database: creates the single content document and the master admin account.
//
//   ADMIN_PASSWORD='something-long' node scripts/seed.mjs
//   node scripts/seed.mjs --reset-password        set a new password for the existing admin
//
// Reads MONGO_URI from the environment / .env. Optional: ADMIN_USERNAME (admin), ADMIN_PASSWORD
// (generated and printed once when missing), ADMIN_EMAIL, ADMIN_NAME.
// Idempotent: running it again never duplicates anything and never touches existing content.

import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/Users.js';

dotenv.config();

const RESET = process.argv.includes('--reset-password');
const username = (process.env.ADMIN_USERNAME || 'admin').trim();
const email = (process.env.ADMIN_EMAIL || 'admin@example.com').trim();
const name = (process.env.ADMIN_NAME || 'Admin').trim();

let password = process.env.ADMIN_PASSWORD;
let generated = false;
if (!password) {
  password = crypto.randomBytes(12).toString('base64url');
  generated = true;
}
if (password.length < 6) {
  console.error('ADMIN_PASSWORD must be at least 6 characters (the API enforces this too).');
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not set.');
  process.exit(1);
}

await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });

try {
  // The whole app is one document: users + all catalog content. `data: {}` makes Mongoose
  // create every empty list the controllers expect (seeds, Fertilizer, Insecticide, Communication, main).
  let doc = await User.findOne();
  if (!doc) {
    doc = new User({ users: [], data: {} });
    console.log('Created the content document (empty catalog).');
  } else {
    console.log('Content document already exists, leaving the catalog as it is.');
  }

  const existing = doc.users.find((u) => u.username === username);
  if (existing) {
    if (!RESET) {
      console.log(`User "${username}" already exists. Use --reset-password to set a new password.`);
    } else {
      existing.password = await bcrypt.hash(password, 10);
      existing.resetOTP = null;
      existing.resetOTPExpires = null;
      await doc.save();
      console.log(`Password for "${username}" updated.`);
      if (generated) console.log(`New password: ${password}`);
    }
  } else {
    if (doc.users.some((u) => u.email && u.email.toLowerCase() === email.toLowerCase())) {
      console.error(`The email ${email} is already used by another account. Set ADMIN_EMAIL.`);
      process.exit(1);
    }
    doc.users.push({
      name,
      username,
      email,
      password: await bcrypt.hash(password, 10),
      role: 'admin',
      isEmailVerified: true,
    });
    await doc.save();
    console.log(`Admin account created: username "${username}", email ${email}.`);
    if (generated) console.log(`Generated password (shown once, change it after signing in): ${password}`);
  }
} finally {
  await mongoose.disconnect();
}
