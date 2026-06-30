const taifunSyncService = require('../services/taifunSyncService');
const { asyncHandler, AppError } = require('../middlewares/errorHandler');

const pushXml = asyncHandler(async (req, res) => {
  // Express buffers raw body when middleware is set with type: '*/xml'.
  // req.body is a Buffer.
  if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw new AppError('XML payload is required in request body', 400, 'XML_EMPTY');
  }

  // Soft cap so a malicious push can't OOM us. The express.raw limit also caps,
  // but we want a friendly error message.
  if (req.body.length > 50 * 1024 * 1024) {
    throw new AppError('XML payload too large (max 50 MB)', 413, 'XML_TOO_LARGE');
  }

  const result = await taifunSyncService.importXml(req.body, {
    isFullExport: req.query.mode !== 'delta',
    source: req.ip,
  });

  res.json({ success: true, data: result });
});

const status = asyncHandler(async (req, res) => {
  const s = await taifunSyncService.getStatus();
  res.json({ success: true, data: s });
});

module.exports = { pushXml, status };
