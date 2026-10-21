import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/Users.js';

const extractToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return authHeader.split(' ')[1] || null;
};

/**
 * Verifies the Bearer JWT, re-checks the account still exists (so deleting a user
 * revokes their 90-day token) and takes the role from the database, not the token.
 * Status codes/messages are unchanged: 401 no token, 403 invalid token / wrong role.
 */
export const protect = async (req, res, next) => {
    const token = extractToken(req);
    if (!token) return res.status(401).json({ message: 'No token provided' });

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }

    try {
        let role = decoded.role;

        // Tokens issued at login carry userId; legacy tokens (registration) do not.
        if (decoded.userId && mongoose.Types.ObjectId.isValid(decoded.userId)) {
            const doc = await User.findOne(
                { 'users._id': decoded.userId },
                { 'users.$': 1 }
            ).lean();
            const account = doc?.users?.[0];
            if (!account) {
                return res.status(403).json({ message: 'Invalid or expired token' });
            }
            // a password reset (OTP or by the master) invalidates every token issued before it
            const passwordVersion = account.passwordChangedAt ? new Date(account.passwordChangedAt).getTime() : 0;
            if ((decoded.pwv || 0) !== passwordVersion) {
                return res.status(403).json({ message: 'Invalid or expired token' });
            }
            role = account.role || 'user';
        }

        if (role !== 'admin' && role !== 'user') {
            return res.status(403).json({ message: 'Access denied: Admins or Users only' });
        }

        req.user = { ...decoded, role };
        next();
    } catch (error) {
        next(error);
    }
};

/** Use after `protect`: only the master (`admin` role) account may continue. */
export const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied: Admins only' });
    }
    next();
};
