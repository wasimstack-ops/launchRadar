const mongoose = require('mongoose');

const techEventSchema = new mongoose.Schema(
  {
    externalId:  { type: String, required: true, unique: true, index: true },
    name:        { type: String, default: '' },
    url:         { type: String, default: '' },
    startDate:   { type: Date, index: true },
    endDate:     { type: Date },
    city:        { type: String, default: '' },
    country:     { type: String, default: '' },
    online:      { type: Boolean, default: false },
    locales:     { type: String, default: 'EN' },
    cfpUrl:      { type: String, default: '' },
    cfpEndDate:  { type: Date },
    twitter:     { type: String, default: '' },
    bluesky:     { type: String, default: '' },
    topics:      { type: [String], default: [] },
    format:      { type: String, enum: ['in-person','online','hybrid'], default: 'in-person' },
    source:      { type: String, default: 'github' }, // github | dev.events
    description: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'tech_events',
  }
);

module.exports = mongoose.model('TechEvent', techEventSchema);
