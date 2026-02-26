const ExternalSource = require('../hackernews/externalSource.model');

async function searchGithubRepositories(q) {
  const params = new URLSearchParams({
    q,
    sort: 'stars',
    order: 'desc',
    per_page: '20',
  });

  const response = await fetch(`https://api.github.com/search/repositories?${params.toString()}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'LaunchRadar-Automation',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub fetch failed: ${response.status}`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload?.items) ? payload.items : [];
  const totalCount = Number(payload?.total_count || 0);

  console.log(`[GitHub AI] total_count=${totalCount}, items.length=${items.length}`);

  return { items, totalCount };
}

async function fetchGithubAITrending() {
  const primaryQuery = 'ai in:name,description';
  const { items: repos, totalCount } = await searchGithubRepositories(primaryQuery);

  const mapped = repos
    .map((repo) => ({
      title: String(repo?.name || '').trim(),
      description: String(repo?.description || '').trim(),
      link: String(repo?.html_url || '').trim(),
      source: 'github',
      rawData: repo,
      status: 'pending',
    }))
    .filter((item) => item.title && item.link);

  if (mapped.length === 0) {
    return { fetched: repos.length, matched: 0, inserted: 0 };
  }

  const uniqueByLink = [];
  const seen = new Set();
  for (const item of mapped) {
    if (seen.has(item.link)) continue;
    seen.add(item.link);
    uniqueByLink.push(item);
  }

  const existing = await ExternalSource.find({ link: { $in: uniqueByLink.map((item) => item.link) } }).select('link');
  const existingLinks = new Set(existing.map((doc) => doc.link));
  const insertable = uniqueByLink.filter((item) => !existingLinks.has(item.link));

  if (insertable.length > 0) {
    await ExternalSource.insertMany(insertable);
  }

  return {
    total_count: totalCount,
    fetched: repos.length,
    matched: mapped.length,
    inserted: insertable.length,
  };
}

module.exports = {
  fetchGithubAITrending,
};
