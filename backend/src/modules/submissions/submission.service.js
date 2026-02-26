const Submission = require('./submission.model');
const Listing = require('../listings/listing.model');

function createNotFoundError(id) {
  const error = new Error(`Submission not found: ${id}`);
  error.statusCode = 404;
  return error;
}

function createBadStatusError(status) {
  const error = new Error(`Submission cannot be processed from status: ${status}`);
  error.statusCode = 409;
  return error;
}

async function createSubmission(data, user) {
  const userId = String(user?.userId || '').trim();
  const userEmail = String(user?.email || '').toLowerCase().trim();

  if (!userId || !userEmail) {
    const error = new Error('Unauthorized');
    error.statusCode = 401;
    throw error;
  }

  const payload = {
    title: String(data.title || '').trim(),
    description: String(data.description || '').trim(),
    category: String(data.category || '').trim(),
    link: String(data.link || '').trim(),
    tags: Array.isArray(data.tags)
      ? data.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : String(data.tags || '')
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
    thumbnail: String(data.thumbnail || '').trim(),
    submittedBy: userId,
    submittedByEmail: userEmail,
  };

  return Submission.create(payload);
}

async function getSubmissions(options = {}) {
  const status = String(options.status || 'all').toLowerCase();
  const search = String(options.search || '').trim();
  const category = String(options.category || 'all').trim();
  const sort = String(options.sort || 'newest').toLowerCase();

  const query = {};
  if (['pending', 'approved', 'rejected'].includes(status)) {
    query.status = status;
  }

  if (category && category.toLowerCase() !== 'all') {
    query.category = category;
  }

  if (search) {
    const regex = new RegExp(search, 'i');
    query.$or = [
      { title: regex },
      { description: regex },
      { category: regex },
      { submittedByEmail: regex },
    ];
  }

  const sortByCreatedAt = sort === 'oldest' ? 1 : -1;

  return Submission.find(query)
    .sort({ createdAt: sortByCreatedAt })
    .populate('submittedBy', 'name email role');
}

async function approveSubmission(id) {
  const submission = await Submission.findById(id);

  if (!submission) {
    throw createNotFoundError(id);
  }

  if (submission.status !== 'pending') {
    throw createBadStatusError(submission.status);
  }

  await Listing.create({
    title: submission.title,
    description: submission.description,
    category: submission.category,
    link: submission.link,
    tags: submission.tags,
    thumbnail: submission.thumbnail,
  });

  submission.status = 'approved';
  await submission.save();

  return submission;
}

async function rejectSubmission(id) {
  const submission = await Submission.findById(id);

  if (!submission) {
    throw createNotFoundError(id);
  }

  if (submission.status !== 'pending') {
    throw createBadStatusError(submission.status);
  }

  submission.status = 'rejected';
  await submission.save();

  return submission;
}

module.exports = {
  createSubmission,
  getSubmissions,
  approveSubmission,
  rejectSubmission,
};
