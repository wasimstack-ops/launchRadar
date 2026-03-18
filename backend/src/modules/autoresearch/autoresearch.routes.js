const express = require('express');
const requireAdminAccess = require('../../middleware/adminAccess.middleware');
const { runAutoresearch, getActiveVariant } = require('./autoresearch.service');
const { VARIANTS } = require('./prompt-variants');

const router = express.Router();
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// GET /admin/ops/autoresearch/status — current active variant
router.get(
  '/admin/ops/autoresearch/status',
  requireAdminAccess,
  asyncHandler(async (_req, res) => {
    const active = getActiveVariant();
    res.status(200).json({
      success: true,
      data: {
        activeVariant: active,
        allVariants: VARIANTS.map((v) => ({ id: v.id, description: v.description, temperature: v.temperature })),
      },
    });
  })
);

// POST /admin/ops/autoresearch/run — trigger experiment manually
router.post(
  '/admin/ops/autoresearch/run',
  requireAdminAccess,
  asyncHandler(async (_req, res) => {
    const result = await runAutoresearch();
    res.status(200).json({ success: true, data: result });
  })
);

module.exports = router;
