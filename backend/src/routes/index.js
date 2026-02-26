const express = require('express');
const listingRoutes = require('../modules/listings/listing.routes');
const leadRoutes = require('../modules/leads/lead.routes');
const authRoutes = require('../modules/auth/auth.routes');
const submissionRoutes = require('../modules/submissions/submission.routes');
const githubAutomationRoutes = require('../modules/automation/github/github.routes');
const rssAutomationRoutes = require('../modules/automation/rss/rss.routes');
const productHuntAutomationRoutes = require('../modules/automation/producthunt/producthunt.routes');

const router = express.Router();

router.use(listingRoutes);
router.use(leadRoutes);
router.use(authRoutes);
router.use(submissionRoutes);
router.use(githubAutomationRoutes);
router.use(rssAutomationRoutes);
router.use(productHuntAutomationRoutes);

module.exports = router;
