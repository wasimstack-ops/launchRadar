const ExternalSource = require('./externalSource.model');
const Listing = require('../../listings/listing.model');

const HN_TOP_STORIES_URL = 'https://hacker-news.firebaseio.com/v0/topstories.json';
const HN_ITEM_URL = 'https://hacker-news.firebaseio.com/v0/item';
const MAX_STORIES = 100;

const AI_KEYWORDS = [
  'ai',
  'artificial intelligence',
  'machine learning',
  'deep learning',
  'neural',
  'llm',
  'large language model',
  'gpt',
  'openai',
  'claude',
  'gemini',
  'anthropic',
  'copilot',
  'rag',
  'vector db',
  'fine-tune',
  'fine tune',
  'inference',
  'prompt',
  'agent',
  'agents',
  'multimodal',
  'diffusion',
  'transformer',
  'mistral',
  'llama',
  'grok',
];

function decodeEntities(value) {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function cleanStoryText(value) {
  const withoutTags = decodeEntities(String(value || '')).replace(/<[^>]*>/g, ' ');
  return withoutTags.replace(/\s+/g, ' ').trim();
}

function isAIRelatedTitle(title) {
  const text = String(title || '').toLowerCase();

  if (/\bai\b/i.test(text)) {
    return true;
  }

  return AI_KEYWORDS.some((keyword) => text.includes(keyword));
}

async function fetchStoryById(id) {
  const response = await fetch(`${HN_ITEM_URL}/${id}.json`);
  if (!response.ok) return null;
  return response.json();
}

async function fetchHackerNewsAI() {
  const topStoriesResponse = await fetch(HN_TOP_STORIES_URL);
  if (!topStoriesResponse.ok) {
    throw new Error('Failed to fetch HackerNews top stories');
  }

  const topStoryIds = await topStoriesResponse.json();
  const storyIds = Array.isArray(topStoryIds) ? topStoryIds.slice(0, MAX_STORIES) : [];

  const storyResults = await Promise.all(storyIds.map((id) => fetchStoryById(id)));

  const normalizedCandidates = storyResults
    .filter((story) => story && isAIRelatedTitle(story.title))
    .map((story) => ({
      title: String(story.title || '').trim(),
      description: cleanStoryText(story.text || ''),
      link: String(story.url || '').trim(),
      category: 'News',
      news: true,
      tags: ['ai', 'hn', 'news'],
      source: 'hackernews',
      popularity: Number(story.score || 0),
      status: 'approved',
      rawData: story,
    }))
    .filter((item) => item.title && item.link);

  if (normalizedCandidates.length === 0) {
    return {
      fetched: storyIds.length,
      matched: 0,
      inserted: 0,
    };
  }

  const uniqueByLink = [];
  const seenLinks = new Set();
  for (const item of normalizedCandidates) {
    if (seenLinks.has(item.link)) continue;
    seenLinks.add(item.link);
    uniqueByLink.push(item);
  }

  const existing = await ExternalSource.find({
    source: 'hackernews',
    link: { $in: uniqueByLink.map((item) => item.link) },
  }).select('link');

  const existingLinks = new Set(existing.map((doc) => doc.link));
  const newItems = uniqueByLink.filter((item) => !existingLinks.has(item.link));

  if (newItems.length > 0) {
    await ExternalSource.insertMany(newItems);
  }

  const listingOps = uniqueByLink.map((item) => ({
    updateOne: {
      filter: { link: item.link },
      update: {
        $set: {
          title: item.title,
          description: item.description || '',
          category: 'News',
          tags: Array.isArray(item.tags) ? item.tags : ['ai', 'hn', 'news'],
        },
        $setOnInsert: {
          link: item.link,
        },
      },
      upsert: true,
    },
  }));

  const listingWriteResult = listingOps.length > 0 ? await Listing.bulkWrite(listingOps) : null;
  const publishedCount = Number(listingWriteResult?.upsertedCount || 0);
  const updatedCount = Number(listingWriteResult?.modifiedCount || 0);

  return {
    fetched: storyIds.length,
    matched: normalizedCandidates.length,
    inserted: newItems.length,
    published: publishedCount,
    updated: updatedCount,
  };
}

module.exports = {
  fetchHackerNewsAI,
};
