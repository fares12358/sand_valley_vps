// src/routes/uploadRoute.js
import express from 'express';
import upload from '../middleware/upload.js';
import { protect } from '../middleware/authMiddleware.js';
import { publicBaseUrl } from '../middleware/uploadUrls.js';
import uploadImage from '../utils/uploader/upload.js';

const router = express.Router();

router.post('/upload', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Image file is required' });
    const { url } = await uploadImage(req.file.buffer);
    res.status(200).json({
      message: 'Image uploaded successfully',
      imageUrl: publicBaseUrl(req) + url,
    });
  } catch (err) {
    res.status(err.status || 500).json({ message: err.status ? err.message : 'Upload failed', error: err.message });
  }
});

export default router;
