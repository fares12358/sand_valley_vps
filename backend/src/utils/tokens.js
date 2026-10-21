import jwt from 'jsonwebtoken';

export const generateAccessToken = (user) => {
  return jwt.sign(
    // pwv: password version. A reset bumps passwordChangedAt, which orphans every older token exactly.
    { userId: user._id, email: user.email, role: user.role || "user", pwv: user.passwordChangedAt ? new Date(user.passwordChangedAt).getTime() : 0 },
    process.env.JWT_SECRET,
    { expiresIn: '90d' }
  );
};
