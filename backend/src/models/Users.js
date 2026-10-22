// users collection: one document per account (real unique indexes, no shared document).
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String, required: true },
  accessToken: { type: String },
  // set when the password is reset by OTP or by the master: older tokens stop working
  passwordChangedAt: { type: Date },
  role: { type: String, default: 'user' },
  resetOTP: String,
  resetOTPExpires: Date,
  emailVerificationToken: { type: String, index: true, sparse: true },
  isEmailVerified: { type: Boolean, default: false },
}, { timestamps: true, collection: 'users' });

// e-mail addresses are unique regardless of letter case
userSchema.index({ email: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

const User = mongoose.model('User', userSchema);
export default User;
