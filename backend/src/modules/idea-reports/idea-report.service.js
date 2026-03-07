const env = require('../../config/env');
const IdeaReport = require('./idea-report.model');

const SCORE_LIMITS = {
  marketFit: 20,
  problemUrgency: 15,
  distributionPotential: 15,
  technicalFeasibility: 10,
  monetizationClarity: 10,
  defensibility: 10,
  founderAdvantage: 10,
  timing: 10,
};

const MODEL_ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

function clampScore(value, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(max, Math.round(numeric)));
}

function stripCodeFences(value) {
  return String(value || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function parseJsonPayload(text) {
  const cleaned = stripCodeFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('Gemini returned an invalid JSON payload');
  }
}

function summarizeIdeaTitle(idea) {
  const firstSentence = String(idea || '').split(/[.!?]/)[0].trim();
  if (!firstSentence) return 'User Idea';
  const words = firstSentence.split(/\s+/).slice(0, 6);
  return words.join(' ');
}

function normalizeMemoSections(items) {
  const fallbackTitles = ['Market Fit', 'Technical Feasibility', 'Scalability'];
  const rows = Array.isArray(items) ? items : [];
  const normalized = rows
    .map((item, index) => ({
      title: String(item?.title || fallbackTitles[index] || `Section ${index + 1}`).trim(),
      body: String(item?.body || '').trim(),
    }))
    .filter((item) => item.title && item.body);

  return normalized.slice(0, 4);
}

function normalizePlaybook(items) {
  const fallback = [
    { title: 'Clarify ICP', body: 'Define the exact user segment and commit to one pain point first.' },
    { title: 'Sharpen Distribution', body: 'Choose one repeatable acquisition channel before broad expansion.' },
    { title: 'De-risk Build', body: 'Validate the highest-risk assumption with a lightweight prototype.' },
    { title: 'Price Early', body: 'Test willingness to pay before scaling product complexity.' },
  ];

  const rows = Array.isArray(items) ? items : fallback;
  const normalized = rows
    .map((item, index) => ({
      title: String(item?.title || fallback[index]?.title || `Play ${index + 1}`).trim(),
      body: String(item?.body || fallback[index]?.body || '').trim(),
    }))
    .filter((item) => item.title && item.body);

  return normalized.slice(0, 4);
}

function normalizeBreakdown(input) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    marketFit: clampScore(source.marketFit, SCORE_LIMITS.marketFit),
    problemUrgency: clampScore(source.problemUrgency, SCORE_LIMITS.problemUrgency),
    distributionPotential: clampScore(source.distributionPotential, SCORE_LIMITS.distributionPotential),
    technicalFeasibility: clampScore(source.technicalFeasibility, SCORE_LIMITS.technicalFeasibility),
    monetizationClarity: clampScore(source.monetizationClarity, SCORE_LIMITS.monetizationClarity),
    defensibility: clampScore(source.defensibility, SCORE_LIMITS.defensibility),
    founderAdvantage: clampScore(source.founderAdvantage, SCORE_LIMITS.founderAdvantage),
    timing: clampScore(source.timing, SCORE_LIMITS.timing),
  };
}

function buildReadinessMetrics(breakdown) {
  return [
    {
      label: 'Capital Efficiency',
      value: Math.min(99, breakdown.technicalFeasibility * 6 + breakdown.monetizationClarity * 3),
    },
    {
      label: 'Viral Potential',
      value: Math.min(99, breakdown.distributionPotential * 5 + breakdown.marketFit * 2),
    },
    {
      label: 'Defensibility',
      value: Math.min(99, breakdown.defensibility * 7 + breakdown.founderAdvantage * 2),
    },
  ];
}

function deriveTrendTier(score) {
  if (score >= 86) return 'Breakout Potential';
  if (score >= 76) return 'High Growth Potential';
  if (score >= 66) return 'Promising but Early';
  return 'Needs Further Validation';
}

async function recalculateLeaderboard() {
  const reports = await IdeaReport.find({})
    .sort({ investorScore: -1, createdAt: 1, _id: 1 })
    .select('_id investorScore createdAt')
    .lean();

  const totalBuilders = Math.max(reports.length, 1);
  const fifthScore = reports.length >= 5 ? Number(reports[4]?.investorScore || 0) : Number(reports[0]?.investorScore || 0);

  if (!reports.length) {
    return { totalBuilders: 0 };
  }

  const operations = reports.map((report, index) => {
    const investorScore = Number(report.investorScore || 0);
    const pointsToTopFive = Math.max(
      0,
      fifthScore - investorScore + (investorScore < fifthScore ? 1 : 0)
    );

    return {
      updateOne: {
        filter: { _id: report._id },
        update: {
          $set: {
            globalRank: index + 1,
            totalBuilders,
            pointsToTopFive,
          },
        },
      },
    };
  });

  await IdeaReport.bulkWrite(operations);

  const rankings = new Map(
    reports.map((report, index) => [
      String(report._id),
      {
        globalRank: index + 1,
        totalBuilders,
        pointsToTopFive: Math.max(
          0,
          fifthScore - Number(report.investorScore || 0) + (Number(report.investorScore || 0) < fifthScore ? 1 : 0)
        ),
      },
    ])
  );

  return { totalBuilders, rankings };
}

async function requestIdeaAnalysis(idea) {
  if (!env.googleAiApiKey) {
    const error = new Error('Missing GOOGLE_AI_API_KEY in backend environment');
    error.statusCode = 500;
    throw error;
  }

  const prompt = `
You are evaluating a startup idea for investor readiness.
Return JSON only with this exact structure:
{
  "title": "string, concise 2-6 words",
  "subtitle": "string, one-line report subtitle",
  "executiveSummary": "string, 2-3 sentences",
  "regionalFocus": "string, city/region or investor hub",
  "regionalNote": "string, 1 sentence",
  "memoSections": [
    { "title": "MARKET FIT", "body": "string" },
    { "title": "TECHNICAL FEASIBILITY", "body": "string" },
    { "title": "SCALABILITY", "body": "string" }
  ],
  "playbook": [
    { "title": "string", "body": "string" },
    { "title": "string", "body": "string" },
    { "title": "string", "body": "string" },
    { "title": "string", "body": "string" }
  ],
  "breakdown": {
    "marketFit": 0-20,
    "problemUrgency": 0-15,
    "distributionPotential": 0-15,
    "technicalFeasibility": 0-10,
    "monetizationClarity": 0-10,
    "defensibility": 0-10,
    "founderAdvantage": 0-10,
    "timing": 0-10
  }
}

Constraints:
- Be realistic, investor-minded, and concise.
- Scores must be integers.
- Memo section bodies must be 2-3 sentences each.
- Playbook items must be concrete and execution-focused.

Idea:
${idea}
  `.trim();

  const response = await fetch(MODEL_ENDPOINT(env.googleAiModel), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.googleAiApiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    const error = new Error(`Gemini request failed: ${response.status} ${payload}`);
    error.statusCode = 502;
    throw error;
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part?.text || '').join('').trim();
  if (!text) {
    const error = new Error('Gemini returned an empty response');
    error.statusCode = 502;
    throw error;
  }

  return parseJsonPayload(text);
}

async function createIdeaReport({ userId, idea }) {
  const cleanIdea = String(idea || '').trim();
  if (!cleanIdea) {
    const error = new Error('idea is required');
    error.statusCode = 400;
    throw error;
  }

  if (cleanIdea.length < 20) {
    const error = new Error('Please provide a more detailed idea so we can score it properly.');
    error.statusCode = 400;
    throw error;
  }

  const rawAnalysis = await requestIdeaAnalysis(cleanIdea);
  const breakdown = normalizeBreakdown(rawAnalysis?.breakdown);
  const investorScore = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const readinessMetrics = buildReadinessMetrics(breakdown);
  const title = String(rawAnalysis?.title || summarizeIdeaTitle(cleanIdea)).trim();
  const subtitle = String(rawAnalysis?.subtitle || 'Project Deal Memo & Investor Readiness Report').trim();
  const executiveSummary = String(rawAnalysis?.executiveSummary || '').trim();
  const memoSections = normalizeMemoSections(rawAnalysis?.memoSections);
  const playbook = normalizePlaybook(rawAnalysis?.playbook);
  const regionalFocus = String(rawAnalysis?.regionalFocus || 'Global Builder Network').trim();
  const regionalNote = String(rawAnalysis?.regionalNote || 'This idea appears most relevant to global early-stage software investors.').trim();
  const trendTier = deriveTrendTier(investorScore);
  const scoreDelta = Math.round((investorScore - 70) / 2);

  const report = await IdeaReport.create({
    user: userId,
    idea: cleanIdea,
    title,
    subtitle,
    executiveSummary,
    investorScore,
    scoreDelta,
    breakdown,
    memoSections,
    playbook,
    readinessMetrics,
    trendTier,
    regionalFocus,
    regionalNote,
    rawAnalysis,
  });

  const { rankings } = await recalculateLeaderboard();
  const persistedRank = rankings?.get(String(report._id));

  return {
    ...report.toObject(),
    globalRank: persistedRank?.globalRank ?? report.globalRank,
    totalBuilders: persistedRank?.totalBuilders ?? report.totalBuilders,
    pointsToTopFive: persistedRank?.pointsToTopFive ?? report.pointsToTopFive,
  };
}

async function getIdeaReportById({ userId, reportId, isAdmin = false }) {
  const report = await IdeaReport.findById(reportId).lean();
  if (!report) {
    const error = new Error('Idea report not found');
    error.statusCode = 404;
    throw error;
  }

  if (!isAdmin && String(report.user) !== String(userId)) {
    const error = new Error('Forbidden');
    error.statusCode = 403;
    throw error;
  }

  return report;
}

async function getIdeaLeaderboard({ page = 1, limit = 25 }) {
  const normalizedPage = Math.max(1, Number(page) || 1);
  const normalizedLimit = Math.max(1, Math.min(50, Number(limit) || 25));
  const skip = (normalizedPage - 1) * normalizedLimit;

  const [total, topThree, rows] = await Promise.all([
    IdeaReport.countDocuments({}),
    IdeaReport.find({})
      .sort({ investorScore: -1, createdAt: 1, _id: 1 })
      .limit(3)
      .populate({ path: 'user', select: 'name email' })
      .lean(),
    IdeaReport.find({})
      .sort({ investorScore: -1, createdAt: 1, _id: 1 })
      .skip(skip)
      .limit(normalizedLimit)
      .populate({ path: 'user', select: 'name email' })
      .lean(),
  ]);

  const formatEntry = (report, indexOffset = 0) => ({
    id: String(report._id),
    rank: indexOffset + 1,
    title: String(report.title || 'Untitled Idea').trim(),
    founderName: String(report?.user?.name || report?.user?.email || 'Anonymous Builder').trim(),
    investorScore: Number(report.investorScore || 0),
    trendTier: String(report.trendTier || '').trim(),
    globalRank: Number(report.globalRank || indexOffset + 1),
    createdAt: report.createdAt,
  });

  return {
    total,
    page: normalizedPage,
    limit: normalizedLimit,
    totalPages: Math.max(1, Math.ceil(total / normalizedLimit)),
    topThree: topThree.map((report, index) => formatEntry(report, index)),
    entries: rows.map((report, index) => formatEntry(report, skip + index)),
  };
}

module.exports = {
  createIdeaReport,
  getIdeaReportById,
  getIdeaLeaderboard,
};
