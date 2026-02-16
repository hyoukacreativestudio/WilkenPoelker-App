const fs = require('fs');
const path = require('path');
const config = require('../config/env');
const logger = require('../utils/logger');

let cloudinary = null;

// Initialize Cloudinary if configured
if (config.cloudinary.isConfigured) {
  try {
    const { v2 } = require('cloudinary');
    v2.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
    });
    cloudinary = v2;
    logger.info('Cloudinary configured for file uploads');
  } catch (err) {
    logger.warn('Cloudinary package not installed, using local storage');
  }
}

/**
 * Upload a file (from multer) to Cloudinary or keep locally.
 * Returns the public URL of the file.
 */
async function uploadFile(file, folder = 'uploads') {
  if (!file) return null;

  // If Cloudinary is configured, upload there
  if (cloudinary) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: `wilkenpoelker/${folder}`,
        resource_type: 'auto',
        transformation: folder === 'avatars'
          ? [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }]
          : [{ quality: 'auto', fetch_format: 'auto' }],
      });

      // Remove local temp file
      try { fs.unlinkSync(file.path); } catch {}

      logger.debug('File uploaded to Cloudinary', { url: result.secure_url });
      return result.secure_url;
    } catch (err) {
      logger.error('Cloudinary upload failed, falling back to local', { error: err.message });
      // Fall through to local storage
    }
  }

  // Local storage: return relative path
  return `/uploads/${file.filename}`;
}

/**
 * Delete a file from Cloudinary or local storage.
 */
async function deleteFile(fileUrl) {
  if (!fileUrl) return;

  // Cloudinary URL
  if (fileUrl.includes('cloudinary.com') && cloudinary) {
    try {
      // Extract public_id from URL
      const urlParts = fileUrl.split('/upload/');
      if (urlParts[1]) {
        // Remove version and extension: v1234567890/wilkenpoelker/folder/filename.jpg
        const pathAfterUpload = urlParts[1];
        const publicId = pathAfterUpload
          .replace(/^v\d+\//, '')
          .replace(/\.[^.]+$/, '');
        await cloudinary.uploader.destroy(publicId);
        logger.debug('File deleted from Cloudinary', { publicId });
      }
    } catch (err) {
      logger.error('Cloudinary delete failed', { error: err.message, fileUrl });
    }
    return;
  }

  // Local file
  if (fileUrl.startsWith('/uploads/')) {
    const filePath = path.resolve(__dirname, '../../', fileUrl.substring(1));
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.debug('Local file deleted', { filePath });
      }
    } catch (err) {
      logger.error('Local file delete failed', { error: err.message, filePath });
    }
  }
}

module.exports = { uploadFile, deleteFile };
