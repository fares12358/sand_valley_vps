import mongoose from 'mongoose';
import User from '../models/Users.js';

// Never expose credentials, reset codes or tokens to the client
const publicUser = (user) => {
    const { password, accessToken, resetOTP, resetOTPExpires, emailVerificationToken, __v, createdAt, updatedAt, ...rest } = user.toObject();
    return rest;
};

export const getALlUsers = async (req, res) => {
    try {
        // Only users with role "user"
        const users = await User.find({ role: 'user' }).sort({ _id: 1 });

        res.status(200).json({ users: users.map(publicUser) });

    } catch (error) {
        res.status(500).json({ message: 'Failed to get users', error: error.message });
    }
};

export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;

        const user = mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id) ? await User.findById(id) : null;

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ user: publicUser(user) });
    } catch (error) {
        res.status(500).json({ message: 'Failed to get user', error: error.message });
    }
};


export const deleteUserById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid user ID' });
        }

        const user = /^[0-9a-fA-F]{24}$/.test(id) ? await User.findById(id) : null;

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // The master account cannot be deleted through the API
        if (user.role === 'admin') {
            return res.status(403).json({ message: 'The admin account cannot be deleted' });
        }

        await user.deleteOne();

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete user', error: error.message });
    }
};
