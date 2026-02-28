const OpenAI = require('openai');
const env = require('../../config/env');

let client = null;

function getClient() {
  if (!env.openaiApiKey) return null;
  if (!client) {
    client = new OpenAI({ apiKey: env.openaiApiKey });
  }
  return client;
}

function cleanSummary(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 320);
}

async function generateAiSummary({ title = '', summary = '', source = '' }) {
  const openai = getClient();
  if (!openai) return '';

  const prompt = [
    'You summarize AI/tech news for a product discovery feed.',
    'Return one concise summary in plain English, 1-2 sentences, no markdown, no bullets, max 45 words.',
    'Focus on product/technology implications and avoid hype.',
    `Source: ${source || 'unknown'}`,
    `Title: ${title}`,
    `Snippet: ${summary}`,
  ].join('\n');

  try {
    const response = await openai.responses.create({
      model: 'gpt-4o-mini',
      temperature: 0.2,
      max_output_tokens: 120,
      input: prompt,
    });

    return cleanSummary(response.output_text);
  } catch (_error) {
    return '';
  }
}

module.exports = {
  generateAiSummary,
};
