const express = require('express');
const router = express.Router();
const { getSection, updateContentKey, uploadImage, deleteImage } = require('../controllers/aboutController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roles');
const { uploadSingle } = require('../middlewares/upload');

// Public route - get section content
router.get('/:section', getSection);

// Admin routes
router.put('/:section/:contentKey', authenticate, authorize('admin', 'super_admin'), updateContentKey);
router.post('/upload', authenticate, authorize('admin', 'super_admin'), uploadSingle('image'), uploadImage);
router.delete('/upload/:filename', authenticate, authorize('admin', 'super_admin'), deleteImage);

module.exports = router;
