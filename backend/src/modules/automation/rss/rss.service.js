const Parser = require('rss-parser');
const ExternalSource = require('../hackernews/externalSource.model');

const parser = new Parser();

const feeds = [
  { url: 'https://news.ycombinator.com/rss', source: 'hackernews' },
  { url: 'https://dev.to/feed/tag/ai', source: 'devto-ai' },
  { url: 'https://techcrunch.com/tag/artificial-intelligence/feed/', source: 'techcrunch-ai' },
  { url: 'https://venturebeat.com/category/ai/feed/', source: 'venturebeat-ai' },
  { url: 'https://www.producthunt.com/feed', source: 'producthunt' },
  { url: 'https://www.reddit.com/r/artificial/.rss', source: 'reddit-ai' },
  { url: 'https://www.reddit.com/r/MachineLearning/.rss', source: 'reddit-ml' },
  { url: 'https://towardsdatascience.com/feed', source: 'tds' },
  { url: 'https://ai.googleblog.com/feeds/posts/default', source: 'google-ai-blog' },
  { url: 'https://openai.com/blog/rss.xml', source: 'openai-blog' },
  { url: 'https://huggingface.co/blog/feed.xml', source: 'huggingface' },
  { url: 'https://www.marktechpost.com/feed/', source: 'marktechpost' },
  { url: 'https://www.analyticsvidhya.com/blog/feed/', source: 'analyticsvidhya' },
  { url: 'https://www.unite.ai/feed/', source: 'unite-ai' },
  { url: 'https://machinelearningmastery.com/blog/feed/', source: 'ml-mastery' },
  { url: 'https://www.theverge.com/ai-artificial-intelligence/rss/index.xml', source: 'theverge-ai' },
  { url: 'https://arxiv.org/rss/cs.AI', source: 'arxiv-ai' },
  { url: 'https://feeds.feedburner.com/kdnuggets', source: 'kdnuggets' },
];

const KEYWORDS = ['ai', 'artificial intelligence', 'machine learning', 'gpt', 'llm', 'startup'];

function matchesKeywords(title, description) {
  const text = `${String(title || '')} ${String(description || '')}`.toLowerCase();
  return KEYWORDS.some((keyword) => text.includes(keyword));
}

async function fetchRSSFeeds() {
  let feedsProcessed = 0;
  let totalFetched = 0;
  let totalMatched = 0;
  let totalInserted = 0;
  const feedResults = [];

  for (const feed of feeds) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = Array.isArray(parsed?.items) ? parsed.items.slice(0, 20) : [];
      feedsProcessed += 1;
      totalFetched += items.length;

      const matchedItems = items.filter((item) =>
        matchesKeywords(item?.title, item?.contentSnippet || item?.summary || item?.content)
      );

      totalMatched += matchedItems.length;

      const normalized = matchedItems
        .map((item) => ({
          title: String(item?.title || '').trim(),
          description: String(item?.contentSnippet || item?.summary || '').trim(),
          link: String(item?.link || '').trim(),
          source: feed.source,
          rawData: item,
          status: 'pending',
        }))
        .filter((item) => item.title && item.link);

      if (normalized.length === 0) {
        continue;
      }

      const existing = await ExternalSource.find({ link: { $in: normalized.map((item) => item.link) } }).select(
        'link'
      );
      const existingLinks = new Set(existing.map((doc) => doc.link));
      const insertable = normalized.filter((item) => !existingLinks.has(item.link));

      if (insertable.length > 0) {
        await ExternalSource.insertMany(insertable);
        totalInserted += insertable.length;
      }

      feedResults.push({
        source: feed.source,
        url: feed.url,
        success: true,
        fetched: items.length,
        matched: normalized.length,
        inserted: insertable.length,
      });
    } catch (error) {
      feedResults.push({
        source: feed.source,
        url: feed.url,
        success: false,
        error: String(error?.message || 'Feed parse failed'),
      });
    }
  }

  return {
    feedsProcessed,
    totalFetched,
    totalMatched,
    totalInserted,
    feedResults,
  };
}

module.exports = {
  feeds,
  fetchRSSFeeds,
};
