const express = require('express');
const router = express.Router();
const { getSection, updateContentKey, uploadImage, deleteImage } = require('../controllers/aboutController');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/roles');
const { uploadSingle } = require('../middlewares/upload');

// Public route - get section content
router.get('/:section', getSection);

// Admin and Verkauf (team in the app and in the PC program)
const EDITORS = ['admin', 'super_admin', 'sales_manager'];
router.put('/:section/:contentKey', authenticate, authorize(...EDITORS), updateContentKey);
router.post('/upload', authenticate, authorize(...EDITORS), uploadSingle('image'), uploadImage);
router.delete('/upload/:filename', authenticate, authorize('admin', 'super_admin'), deleteImage);

module.exports = router;
