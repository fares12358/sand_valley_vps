import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/Users.js';
import { generateAccessToken } from '../utils/tokens.js';
import sendEmail from '../utils/sendEmail.js';
import otpTemplate from '../utils/emailTemplates/otpTemplate.js';
import verifyEmailTemplate from '../utils/emailTemplates/verifyEmailTemplate.js';
import emailVerifiedTemplate from '../utils/emailTemplates/emailVerifiedTemplate.js';
import emailVerificationFailedTemplate from '../utils/emailTemplates/emailVerificationFailedTemplate.js';
import emailInvalidOrExpiredTemplate from '../utils/emailTemplates/emailInvalidOrExpiredTemplate.js';
import { isEmail, isNonEmptyString } from '../utils/validate.js';

// masterAdmin , admin
const PUBLIC_API_URL = () =>
  (process.env.PUBLIC_API_URL || process.env.PUBLIC_BASE_URL || 'https://sand-valley-flutter-app-backend-ver.vercel.app').replace(/\/$/, '');
const verifyLink = (token) => `${PUBLIC_API_URL()}/api/auth/verify-email/${token}`;
const MIN_PASSWORD = 6;
const generateOtp = () => crypto.randomInt(100000, 1000000).toString();
const isDuplicateKey = (e) => e?.code === 11000;
// accounts are looked up by exact username; e-mail comparison ignores letter case (collation index)
const byEmail = (email) => User.findOne({ email }).collation({ locale: 'en', strength: 2 });
// username or e-mail, as typed (both exact, like before)
const byLogin = (input) => User.findOne({ $or: [{ username: input }, { email: input }] });
const ID_RE = /^[0-9a-fA-F]{24}$/;
const byId = (id) => (typeof id === 'string' && ID_RE.test(id) ? User.findById(id) : Promise.resolve(null));

export const loginUser = async (req, res) => {
  const { username, password } = req.body;
  if (!isNonEmptyString(username) || !isNonEmptyString(password))
    return res.status(400).json({ message: 'Username and password are required' });

  try {
    const user = await User.findOne({ username });

    if (!user)
      return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid credentials' });

    const accessToken = generateAccessToken(user);
    user.accessToken = accessToken;

    await user.save(); // Save the updated token

    res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        token: user.accessToken,
        role: user.role,
        email: user.email,
      },
    });

  } catch (error) {
    res.status(500).json({ message: 'Login error', error: error.message });
  }
};

export const registerUser = async (req, res) => {
  const { username, password, email, name } = req.body;
  if (!isNonEmptyString(username) || !isNonEmptyString(password) || !isNonEmptyString(email))
    return res.status(400).json({ message: 'Username, email and password are required' });
  if (!isEmail(email))
    return res.status(400).json({ message: 'Please enter a valid email address' });
  if (password.length < MIN_PASSWORD)
    return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters` });
  try {
    if (await User.exists({ username })) {
      return res.status(409).json({ message: 'username already exist' });
    }
    if (await byEmail(email).select('_id')) {
      return res.status(409).json({ message: 'email already exist' });
    }
    const token = crypto.randomBytes(20).toString('hex');
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      username,
      password: hashedPassword,
      email,
      role: "user",
      isEmailVerified: false,
      emailVerificationToken: token,
    });
    newUser.accessToken = generateAccessToken(newUser);

    try {
      await newUser.save();
    } catch (e) {
      // lost a race with a parallel registration: the unique indexes decide
      if (!isDuplicateKey(e)) throw e;
      const field = e.keyPattern?.username ? 'username' : 'email';
      return res.status(409).json({ message: `${field} already exist` });
    }

    // The account exists even if the mail provider hiccups; the mail can be re-sent from the user page.
    try {
      await sendEmail(email, 'Verify Your Email', verifyEmailTemplate(username, verifyLink(token)));
    } catch (mailError) {
      console.error('Verification email failed:', mailError.message);
    }

    res.status(200).json({
      statusCode: 200,
      message: 'Registration successful',
      user: {
        id: newUser._id,
        name: newUser.name,
        username: newUser.username,
        token: newUser.accessToken,
        role: newUser.role,
        isEmailVerified: newUser.isEmailVerified,
      },
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Registration error', error: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  const { input } = req.body; // input can be username or email
  if (!isNonEmptyString(input))
    return res.status(400).json({ message: 'Username or email is required' });
  try {
    // Find user by username or email
    const user = await byLogin(input);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = generateOtp(); // 6-digit OTP (cryptographically random)
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // expires in 10 minutes

    user.resetOTP = otp;
    user.resetOTPExpires = expiry;

    await sendEmail(user.email, 'Your OTP Code', otpTemplate(user.username, otp));
    await user.save();

    res.json({ message: 'OTP sended check your email' }); // Remove `otp` in prod

  } catch (error) {
    res.status(500).json({ message: 'Error sending OTP', error: error.message });
  }
};

export const verifyOTP = async (req, res) => {
  const { input, otp } = req.body; // input can be username or email
  if (!isNonEmptyString(input) || !isNonEmptyString(String(otp ?? '')))
    return res.status(400).json({ message: 'Username/email and OTP are required' });

  try {
    const user = await byLogin(input);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.resetOTP || !user.resetOTPExpires) {
      return res.status(400).json({ message: 'No OTP generated or expired' });
    }

    if (user.resetOTP !== String(otp)) {
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    if (user.resetOTPExpires < new Date()) {
      return res.status(400).json({ message: 'OTP expired' });
    }

    res.status(200).json({ message: 'OTP verified successfully' });

  } catch (error) {
    res.status(500).json({ message: 'OTP verification failed', error: error.message });
  }
};

export const resetPassword = async (req, res) => {
  const { input, otp, newPassword } = req.body; // "username" can be username OR email
  if (!isNonEmptyString(input) || !isNonEmptyString(String(otp ?? '')) || !isNonEmptyString(newPassword))
    return res.status(400).json({ message: 'Username/email, OTP and new password are required' });
  if (newPassword.length < MIN_PASSWORD)
    return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters` });

  try {
    const user = await byLogin(input);

    if (!user)
      return res.status(404).json({ message: 'User not found' });

    if (!user.resetOTP || !user.resetOTPExpires)
      return res.status(400).json({ message: 'Invalid or expired OTP' });

    if (user.resetOTP !== String(otp))
      return res.status(400).json({ message: 'Incorrect OTP' });

    if (user.resetOTPExpires < new Date())
      return res.status(400).json({ message: 'OTP expired' });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOTP = null;
    user.resetOTPExpires = null;
    user.passwordChangedAt = new Date(); // revokes every token issued before now
    user.accessToken = null;

    await user.save();

    res.json({ message: 'Password reset successful' });

  } catch (error) {
    res.status(500).json({ message: 'Reset failed', error: error.message });
  }
};

export const updateUser = async (req, res) => {
  const { id, username, password, newPassword, email, name } = req.body;
  if (!isNonEmptyString(id)) return res.status(400).json({ message: 'User id is required' });
  // A user may only edit their own account; the master may edit anyone
  if (req.user.role !== 'admin' && String(req.user.userId) !== String(id))
    return res.status(403).json({ message: 'You can only update your own account' });
  if (newPassword && newPassword.length < MIN_PASSWORD)
    return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters` });
  if (email && !isEmail(email))
    return res.status(400).json({ message: 'Please enter a valid email address' });
  // these go into database queries: only plain strings are accepted (no query operators)
  if ([username, password, newPassword, name].some((v) => v !== undefined && typeof v !== 'string'))
    return res.status(400).json({ message: 'Invalid field value' });
  try {
    const user = await byId(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Handle password change if requested
    if (newPassword) {
      if (!password) return res.status(400).json({ message: 'Current password required' });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(401).json({ message: 'Invalid current password' });

      user.password = await bcrypt.hash(newPassword, 10);
    }
    // Handle username update if provided
    if (username && username !== user.username) {
      const usernameTaken = await User.exists({ username, _id: { $ne: user._id } });
      if (usernameTaken) return res.status(409).json({ message: 'Username already in use by another user' });
      user.username = username;
    }
    if (name) {
      user.name = name;
    }

    if (email && email !== user.email) {
      // Check if email already exists in another user
      const emailExists = await byEmail(email).where({ _id: { $ne: user._id } }).select('_id');
      if (emailExists) {
        return res.status(409).json({ message: 'Email already in use by another user' });
      }
      user.email = email;
      user.isEmailVerified = false;
      user.emailVerificationToken = crypto.randomBytes(20).toString('hex');

      // Send verification email
      const verificationLink = verifyLink(user.emailVerificationToken);
      await sendEmail(
        email,
        'Verify Your New Email',
        verifyEmailTemplate(user.username, verificationLink)
      );
    }

    try {
      await user.save();
    } catch (e) {
      if (!isDuplicateKey(e)) throw e;
      return res.status(409).json({ message: e.keyPattern?.username ? 'Username already in use by another user' : 'Email already in use by another user' });
    }

    res.status(200).json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified
        // Only include password if absolutely needed (not recommended)
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Update failed', error: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  const { token } = req.params;

  try {
    const user = typeof token === 'string' && token ? await User.findOne({ emailVerificationToken: token }) : null;
    if (!user) return res.status(400).send(emailInvalidOrExpiredTemplate());

    user.isEmailVerified = true;
    user.emailVerificationToken = null;

    await user.save();

    res.status(200).send(emailVerifiedTemplate(user.username));

  } catch (error) {
    res.status(500).send(emailVerificationFailedTemplate());
  }
};

export const verifyUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await byId(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate and assign verification token
    user.emailVerificationToken = crypto.randomBytes(20).toString('hex');
    user.isEmailVerified = false;

    await user.save();

    const verificationLink = verifyLink(user.emailVerificationToken);

    await sendEmail(
      user.email,
      'Verify Your Email',
      verifyEmailTemplate(user.username, verificationLink)
    );

    res.status(200).json({ message: 'Verification email sent successfully' });

  } catch (error) {
    res.status(500).json({ message: 'Failed to send verification email', error: error.message });
  }
};

// Master-only: set a new password for another user without knowing the old one.
export const adminResetPassword = async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;
  if (!isNonEmptyString(newPassword))
    return res.status(400).json({ message: 'New password is required' });
  if (newPassword.length < MIN_PASSWORD)
    return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD} characters` });

  try {
    const user = await byId(id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin')
      return res.status(403).json({ message: 'The master password is changed from account settings' });

    user.password = await bcrypt.hash(newPassword, 10);
    // an unfinished forgot-password code must not outlive the reset
    user.resetOTP = null;
    user.resetOTPExpires = null;
    user.passwordChangedAt = new Date(); // signs the user out everywhere
    user.accessToken = null;
    await user.save();

    res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: 'Reset failed', error: error.message });
  }
};

// The signed-in account, read from the database (so role changes and deleted accounts show up).
export const getMe = async (req, res) => {
  try {
    if (!req.user.userId) return res.status(404).json({ message: 'User not found' });
    const u = ID_RE.test(String(req.user.userId)) ? await User.findById(req.user.userId).lean() : null;
    if (!u) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({
      user: { id: u._id, name: u.name, username: u.username, email: u.email, role: u.role, isEmailVerified: u.isEmailVerified },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to load account', error: error.message });
  }
};
