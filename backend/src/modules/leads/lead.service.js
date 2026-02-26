const Lead = require('./lead.model');

async function createLead(email) {
  const normalizedEmail = String(email || '').toLowerCase().trim();

  const existingLead = await Lead.findOne({ email: normalizedEmail });
  if (existingLead) {
    const error = new Error('Email already captured');
    error.statusCode = 409;
    throw error;
  }

  return Lead.create({ email: normalizedEmail });
}

module.exports = {
  createLead,
};
