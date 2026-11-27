const AboutContent = require('../models/AboutContent');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

const VALID_SECTIONS = ['team', 'store', 'qmf', 'kaercher'];

// Team list: [{ department, label, members: [{ name, position, phone, image, imageUrl }] }]
const TEXT_MAX = 120;
function teamProblem(list) {
  if (!Array.isArray(list) || list.length > 40) return 'Die Teamliste ist ungültig';
  for (const d of list) {
    if (!d || typeof d !== 'object' || !Array.isArray(d.members) || d.members.length > 80) return 'Die Teamliste ist ungültig';
    if (!String(d.label || d.department || '').trim()) return 'Jede Abteilung braucht einen Namen';
    for (const k of ['key', 'department', 'label', 'color', 'icon']) {
      if (d[k] != null && (typeof d[k] !== 'string' || d[k].length > TEXT_MAX)) return 'Ein Abteilungsname ist zu lang oder ungültig';
    }
    for (const m of d.members) {
      if (!m || typeof m !== 'object' || !String(m.name || '').trim()) return 'Jede Person braucht einen Namen';
      for (const k of ['name', 'position', 'phone', 'image']) {
        if (m[k] != null && (typeof m[k] !== 'string' || m[k].length > TEXT_MAX)) return `Ein Eintrag (${k}) ist zu lang oder ungültig`;
      }
      if (m.imageUrl != null && (typeof m.imageUrl !== 'string' || !/^(https:\/\/|\/uploads\/)[^\s"'<>]{1,400}$/.test(m.imageUrl))) return 'Ein Foto-Link ist ungültig';
    }
  }
  return null;
}

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
    // The team list is shown in the app and on the website: keep its shape
    if (section === 'team' && contentKey === 'departments') {
      const bad = teamProblem(content);
      if (bad) return res.status(400).json({ error: bad });
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

    // The website shows the team (portraits, names, positions)
    if (section === 'team') require('../services/websiteBuilder').schedule('Team geändert', 60 * 1000);

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

// Team photo from the PC program: a data URL (scaled down in the browser),
// checked and re-encoded here, then stored like the app's uploads.
const uploadPhotoData = async (req, res) => {
  try {
    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(req.body?.data || ''));
    if (!m) return res.status(400).json({ error: 'Bitte ein Bild (JPG, PNG, WebP) auswählen' });
    const buf = Buffer.from(m[2], 'base64');
    let jpg;
    try {
      jpg = await require('sharp')(buf).rotate()
        .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
        .flatten({ background: '#ffffff' }).jpeg({ quality: 85 }).toBuffer();
    } catch {
      return res.status(400).json({ error: 'Das Bild konnte nicht gelesen werden' });
    }
    const filename = `team-${Date.now()}-${require('crypto').randomBytes(4).toString('hex')}.jpg`;
    const file = path.resolve(__dirname, '../../uploads', filename);
    fs.writeFileSync(file, jpg);
    const { uploadFile } = require('../services/uploadService');
    const url = await uploadFile({ path: file, filename }, 'about');
    res.json({ success: true, data: { url } });
  } catch (error) {
    logger.error('Error uploading team photo:', error);
    res.status(500).json({ error: 'Das Foto konnte nicht gespeichert werden' });
  }
};

module.exports = { getSection, updateContentKey, uploadImage, deleteImage, uploadPhotoData, teamProblem };
