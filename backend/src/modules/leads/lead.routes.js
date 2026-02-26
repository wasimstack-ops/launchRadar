const express = require('express');
const { createLeadController } = require('./lead.controller');

const router = express.Router();

router.post('/leads', createLeadController);

module.exports = router;
