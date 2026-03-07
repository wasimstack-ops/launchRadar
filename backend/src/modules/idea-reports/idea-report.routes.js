const express = require('express');
const authMiddleware = require('../../middleware/auth.middleware');
const { createIdeaReport, getIdeaReportById, getIdeaLeaderboard } = require('./idea-report.service');

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
