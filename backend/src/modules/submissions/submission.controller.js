const submissionService = require('./submission.service');

const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function validateSubmissionPayload(body) {
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const category = String(body.category || '').trim();
  const link = String(body.link || '').trim();

  if (!title || !description || !category || !link) {
    const error = new Error('title, description, category, and link are required');
    error.statusCode = 400;
    throw error;
  }
}

const createSubmissionController = asyncHandler(async (req, res) => {
  validateSubmissionPayload(req.body || {});

  const data = await submissionService.createSubmission(req.body, req.user);

  res.status(201).json({
    success: true,
    data,
  });
});

const getSubmissionsController = asyncHandler(async (req, res) => {
  const data = await submissionService.getSubmissions({
    status: req.query.status,
    category: req.query.category,
    search: req.query.search,
    sort: req.query.sort,
  });

  res.status(200).json({
    success: true,
    data,
  });
});

const approveSubmissionController = asyncHandler(async (req, res) => {
  const data = await submissionService.approveSubmission(req.params.id);

  res.status(200).json({
    success: true,
    data,
  });
});

const rejectSubmissionController = asyncHandler(async (req, res) => {
  const data = await submissionService.rejectSubmission(req.params.id);

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  createSubmissionController,
  getSubmissionsController,
  approveSubmissionController,
  rejectSubmissionController,
};
