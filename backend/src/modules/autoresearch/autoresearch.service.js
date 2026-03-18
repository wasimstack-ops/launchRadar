/**
 * Autoresearch Service
 *
 * Runs nightly experiments to find the best scoring prompt variant.
 * Each experiment:
 *   1. Loads 20 real ideas from the DB
 *   2. Re-scores each idea with every variant
 *   3. Picks the winner based on score quality metrics
 *   4. Saves the winner as the active variant
 *
 * Quality metrics:
 *   - Score variance  (higher = ideas are better differentiated)
 *   - Score spread    (scores should range 45-95, not all cluster at 70)
 *   - Parse rate      (variant must reliably produce valid JSON)
 */

const fs = require('node:fs');
const path = require('node:path');
const env = require('../../config/env');
const logger = require('../../config/logger');
const IdeaReport = require('../idea-reports/idea-report.model');
const { VARIANTS } = require('./prompt-variants');

const ACTIVE_VARIANT_PATH = path.join(__dirname, 'active-variant.json');
const MODEL_ENDPOINT = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// ─── Active Variant Store ────────────────────────────────────────────────────

let _activeVariant = null;

function loadActiveVariant() {
  if (_activeVariant) return _activeVariant;
  try {
    if (fs.existsSync(ACTIVE_VARIANT_PATH)) {
      const raw = fs.readFileSync(ACTIVE_VARIANT_PATH, 'utf8');
      _activeVariant = JSON.parse(raw);
      logger.info(`[Autoresearch] Loaded active variant: ${_activeVariant.id}`);
      return _activeVariant;
    }
  } catch (_) {
    // fall through to baseline
  }
  _activeVariant = VARIANTS.find((v) => v.id === 'baseline');
  return _activeVariant;
}

function saveActiveVariant(variant) {
  fs.writeFileSync(ACTIVE_VARIANT_PATH, JSON.stringify(variant, null, 2), 'utf8');
  _activeVariant = variant;
  logger.info(`[Autoresearch] Saved new active variant: ${variant.id}`);
}

function getActiveVariant() {
  return loadActiveVariant();
}

// ─── Prompt Builder ──────────────────────────────────────────────────────────

function buildBreakdownSpec(weights) {
  return Object.entries(weights)
    .map(([key, max]) => `    "${key}": 0-${max}`)
    .join(',\n');
}

function buildPrompt(idea, variant) {
  return `
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
${buildBreakdownSpec(variant.weights)}
  }
}

Constraints:
- Be realistic, investor-minded, and concise.
- Scores must be integers within the specified ranges.
- Memo section bodies must be 2-3 sentences each.
- Playbook items must be concrete and execution-focused.

Idea:
${idea}
  `.trim();
}

// ─── Gemini Scorer ───────────────────────────────────────────────────────────

function stripCodeFences(value) {
  return String(value || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

async function scoreIdeaWithVariant(idea, variant) {
  const prompt = buildPrompt(idea, variant);
  try {
    const response = await fetch(MODEL_ENDPOINT(env.googleAiModel), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': env.googleAiApiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: variant.temperature,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) return null;

    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts
      ?.map((p) => p?.text || '')
      .join('')
      .trim();

    if (!text) return null;

    const parsed = JSON.parse(stripCodeFences(text));
    const breakdown = parsed?.breakdown;
    if (!breakdown || typeof breakdown !== 'object') return null;

    const total = Object.entries(variant.weights).reduce((sum, [key, max]) => {
      const val = Number(breakdown[key]);
      return sum + Math.max(0, Math.min(max, Number.isFinite(val) ? Math.round(val) : 0));
    }, 0);

    return total;
  } catch (_) {
    return null;
  }
}

// ─── Quality Evaluator ───────────────────────────────────────────────────────

/**
 * Computes a quality score for a set of idea scores produced by one variant.
 *
 * Higher is better.
 *   - variance:     Ideas should differ meaningfully (not all score 72)
 *   - spread:       Scores should span a wide range (45–95), not cluster
 *   - parse rate:   Variant must reliably return valid JSON (hard requirement)
 */
function computeQualityScore(scores) {
  const valid = scores.filter((s) => s !== null && Number.isFinite(s));
  const parseRate = valid.length / scores.length;

  // Disqualify if more than 1 parse failure
  if (parseRate < (scores.length - 1) / scores.length) return 0;

  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;

  // Variance (population)
  const variance =
    valid.reduce((sum, s) => sum + (s - mean) ** 2, 0) / valid.length;

  // Spread: ratio of (max - min) to total possible range (100)
  const spread = (Math.max(...valid) - Math.min(...valid)) / 100;

  // Mean reasonableness: ideal mean is 65–75, penalise outside that
  const meanPenalty = Math.max(0, Math.abs(mean - 70) - 10) / 100;

  // Weighted quality score
  const quality = 0.5 * Math.sqrt(variance) + 0.3 * spread * 100 + 0.2 * parseRate * 100 - meanPenalty * 20;

  return quality;
}

// ─── Experiment Runner ───────────────────────────────────────────────────────

async function runAutoresearch() {
  if (!env.googleAiApiKey) {
    logger.warn('[Autoresearch] Skipping — GOOGLE_AI_API_KEY not set');
    return { skipped: true, reason: 'missing_api_key' };
  }

  logger.info('[Autoresearch] Starting experiment run...');

  // Load sample ideas from DB (use real user-submitted ideas)
  const sampleDocs = await IdeaReport.find({})
    .sort({ createdAt: -1 })
    .limit(20)
    .select('idea')
    .lean();

  if (sampleDocs.length < 5) {
    logger.warn('[Autoresearch] Not enough ideas in DB to run experiment (need ≥5)');
    return { skipped: true, reason: 'insufficient_ideas', found: sampleDocs.length };
  }

  const ideas = sampleDocs.map((d) => d.idea);
  logger.info(`[Autoresearch] Loaded ${ideas.length} ideas — testing ${VARIANTS.length} variants`);

  const results = [];

  for (const variant of VARIANTS) {
    logger.info(`[Autoresearch] Testing variant: ${variant.id}`);
    const scores = [];

    for (const idea of ideas) {
      // Small delay to avoid Gemini rate limits
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => { setTimeout(resolve, 300); });
      // eslint-disable-next-line no-await-in-loop
      const score = await scoreIdeaWithVariant(idea, variant);
      scores.push(score);
    }

    const quality = computeQualityScore(scores);
    const valid = scores.filter((s) => s !== null);
    const mean = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;

    results.push({
      variant,
      scores,
      quality,
      parseRate: valid.length / scores.length,
      mean: Math.round(mean * 10) / 10,
      min: valid.length ? Math.min(...valid) : 0,
      max: valid.length ? Math.max(...valid) : 0,
    });

    logger.info(
      `[Autoresearch] ${variant.id} → quality=${quality.toFixed(2)}, mean=${mean.toFixed(1)}, parseRate=${(valid.length / scores.length).toFixed(2)}`
    );
  }

  // Pick winner
  results.sort((a, b) => b.quality - a.quality);
  const winner = results[0];

  logger.info(`[Autoresearch] Winner: ${winner.variant.id} (quality=${winner.quality.toFixed(2)})`);
  saveActiveVariant(winner.variant);

  return {
    skipped: false,
    ideasTested: ideas.length,
    variantsTested: VARIANTS.length,
    winner: {
      id: winner.variant.id,
      description: winner.variant.description,
      quality: Math.round(winner.quality * 100) / 100,
      mean: winner.mean,
      min: winner.min,
      max: winner.max,
      parseRate: winner.parseRate,
    },
    allResults: results.map((r) => ({
      id: r.variant.id,
      quality: Math.round(r.quality * 100) / 100,
      mean: r.mean,
      min: r.min,
      max: r.max,
      parseRate: r.parseRate,
    })),
  };
}

module.exports = { runAutoresearch, getActiveVariant, loadActiveVariant };
