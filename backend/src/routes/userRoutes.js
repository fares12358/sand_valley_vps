import express from 'express';
import { deleteUserById, getALlUsers, getUserById } from '../controllers/UserControlles.js';
import { protect, requireAdmin } from '../middleware/authMiddleware.js';
const router = express.Router();

router.get('/get-users', protect, requireAdmin, getALlUsers);
router.get('/get-user-by-id/:id', protect, requireAdmin, getUserById);
router.delete('/delete-user-by-id/:id', protect, requireAdmin, deleteUserById);

export default router;
