const AboutContent = require('../models/AboutContent');
const path = require('path');
const fs = require('fs');

const VALID_SECTIONS = ['team', 'store', 'qmf', 'kaercher'];

// Get all content for a section (public)
const getSection = async (req, res) => {
  try {
    const { section } = req.params;
    if (!VALID_SECTIONS.includes(section)) {
      return res.status(400).json({ error: 'Invalid section' });
    }

    const rows = await AboutContent.findAll({
      where: { section },
      attributes: ['contentKey', 'content', 'updatedAt'],
    });

    const result = {};
    rows.forEach((row) => {
      result[row.contentKey] = row.content;
    });

    res.json({
      section,
      data: result,
      updatedAt: rows.length > 0
        ? rows.reduce((latest, r) => r.updatedAt > latest ? r.updatedAt : latest, rows[0].updatedAt)
        : null,
    });
  } catch (error) {
    console.error('Error fetching about section:', error);
    res.status(500).json({ error: 'Could not fetch about content' });
  }
};

// Update a specific content key in a section (admin)
const updateContentKey = async (req, res) => {
  try {
    const { section, contentKey } = req.params;
    const { content } = req.body;

    if (!VALID_SECTIONS.includes(section)) {
      return res.status(400).json({ error: 'Invalid section' });
    }
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const [row, created] = await AboutContent.findOrCreate({
      where: { section, contentKey },
      defaults: {
        content,
        updatedBy: req.user?.id,
      },
    });

    if (!created) {
      await row.update({
        content,
        updatedBy: req.user?.id,
      });
    }

    res.json({
      message: created ? 'Content created' : 'Content updated',
      section,
      contentKey,
      content: row.content,
    });
  } catch (error) {
    console.error('Error updating about content:', error);
    res.status(500).json({ error: 'Could not update about content' });
  }
};

// Upload an image (admin)
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { uploadFile } = require('../services/uploadService');
    const imageUrl = await uploadFile(req.file, 'about');
    res.json({
      message: 'Image uploaded',
      url: imageUrl,
      filename: req.file.filename,
    });
  } catch (error) {
    logger.error('Error uploading image:', error);
    res.status(500).json({ error: 'Could not upload image' });
  }
};

// Delete an uploaded image (admin)
const deleteImage = async (req, res) => {
  try {
    const { filename } = req.params;

    // Prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filePath = path.resolve(__dirname, '../../uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);
    res.json({ message: 'Image deleted' });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Could not delete image' });
  }
};

module.exports = { getSection, updateContentKey, uploadImage, deleteImage };
