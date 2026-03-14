const express = require('express');
const authMiddleware = require('../../middleware/auth.middleware');
const requireAdminAccess = require('../../middleware/adminAccess.middleware');
const { createIdeaReport, getIdeaReportById, getIdeaReportPdfBuffer, listUserIdeaReports, getIdeaLeaderboard, listAllIdeaReports } = require('./idea-report.service');

const router = express.Router();

router.post('/idea-reports', authMiddleware, async (req, res, next) => {
  try {
    const data = await createIdeaReport({
      userId: req.user.userId,
      idea: req.body?.idea,
    });

    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/idea-reports/leaderboard', authMiddleware, async (req, res, next) => {
  try {
    const data = await getIdeaLeaderboard({
      page: req.query?.page,
      limit: req.query?.limit,
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/idea-reports/me/list', authMiddleware, async (req, res, next) => {
  try {
    const data = await listUserIdeaReports({
      userId: req.user.userId,
      page: req.query?.page,
      limit: req.query?.limit,
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/admin/idea-reports', requireAdminAccess, async (req, res, next) => {
  try {
    const data = await listAllIdeaReports({
      page: req.query?.page,
      limit: req.query?.limit,
      search: req.query?.search,
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

router.get('/idea-reports/:id/pdf', authMiddleware, async (req, res, next) => {
  try {
    const pdfBuffer = await getIdeaReportPdfBuffer({
      userId: req.user.userId,
      reportId: req.params.id,
      isAdmin: req.user.role === 'admin',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="deal-memo-${req.params.id}.pdf"`);
    res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

router.get('/idea-reports/:id', authMiddleware, async (req, res, next) => {
  try {
    const data = await getIdeaReportById({
      userId: req.user.userId,
      reportId: req.params.id,
      isAdmin: req.user.role === 'admin',
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
