import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Code2,
  Database,
  LockKeyhole,
  Megaphone,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import styles from '../components/agents/Agents.module.css';
import { STATIC_AGENT_DATA } from '../data/agentsCatalog';

const PAGE_SIZE = 12;

const TABS = [
  {
    key: 'ai',
    label: 'AI Agents',
    title: 'Explore AI Agents',
    subtitle: 'Discover and deploy the best autonomous tools for your workflow.',
  },
  {
    key: 'repos',
    label: 'GitHub Repos',
    title: 'Explore GitHub Repositories',
    subtitle: 'Browse open-source AI agent repos, frameworks, and developer tooling.',
  },
];

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'votes', label: 'Most Votes' },
  { value: 'activity', label: 'Most Activity' },
];

const CATEGORY_CONFIG = [
  { key: 'all', label: 'All Agents', icon: Sparkles },
  { key: 'productivity', label: 'Productivity', icon: Boxes },
  { key: 'marketing', label: 'Marketing', icon: Megaphone },
  { key: 'development', label: 'Development', icon: Code2 },
  { key: 'data-science', label: 'Data Science', icon: Database },
  { key: 'security', label: 'Security', icon: LockKeyhole },
];

const REFINE_OPTIONS = [
  { key: 'openSource', label: 'Open Source' },
  { key: 'freeTier', label: 'Free Tier Available' },
  { key: 'verified', label: 'Verified Agents' },
];

function formatMetric(value) {
  const numeric = Number(value || 0);
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(1)}k`;
  return String(numeric);
}

function getInitials(title) {
  const words = String(title || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'A';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

function buildCategoryMatches(item) {
  const haystack = [item.title, item.description, item.language, ...(Array.isArray(item.tags) ? item.tags : [])]
    .join(' ')
    .toLowerCase();

  const matches = [];
  if (/(productivity|workflow|assistant|automation|writing|document|notes|task|scheduling)/.test(haystack)) matches.push('productivity');
  if (/(marketing|growth|seo|campaign|social|sales|ads|content|brand)/.test(haystack)) matches.push('marketing');
  if (/(developer|development|coding|code|programming|repo|github|sdk|api|mcp|devops)/.test(haystack)) matches.push('development');
  if (/(data|analytics|machine learning|ml|ai model|dataset|research|forecast|nlp|science)/.test(haystack)) matches.push('data-science');
  if (/(security|secure|threat|compliance|privacy|auth|vulnerability|guard|scan)/.test(haystack)) matches.push('security');

  if (matches.length === 0) {
    matches.push(item.category === 'repo' ? 'development' : 'productivity');
  }

  return Array.from(new Set(matches));
}

function normalizeAgent(item) {
  const categories = buildCategoryMatches(item);
  const stars = Number(item.stars || 0);
  const forks = Number(item.forks || 0);

  return {
    ...item,
    derivedCategories: categories,
    primaryCategory: categories[0],
    isOpenSource: item.sourceType === 'open_source' || item.category === 'repo',
    hasFreeTier: item.category === 'agent' || item.sourceType === 'open_source',
    isVerified: Boolean(item.logoUrl && item.description && (stars >= 120 || forks >= 20)),
    scoreVotes: stars,
    scoreActivity: Number(item.trendingScore || 0) || stars + forks,
    scoreRecent: new Date(item.pushedAt || item.createdAt || 0).getTime() || 0,
  };
}

const STATIC_ITEMS = {
  ai: (Array.isArray(STATIC_AGENT_DATA?.ai) ? STATIC_AGENT_DATA.ai : []).map(normalizeAgent),
  repos: (Array.isArray(STATIC_AGENT_DATA?.repos) ? STATIC_AGENT_DATA.repos : []).map(normalizeAgent),
};

function AgentsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [refine, setRefine] = useState({ openSource: false, freeTier: false, verified: false });
  const [sectionsOpen, setSectionsOpen] = useState({ categories: true, refine: true });

  const activeView = TABS[activeTab];
  const items = STATIC_ITEMS[activeView.key] || [];
  const loading = false;
  const error = '';

  const categoryCounts = useMemo(() => {
    const counts = new Map(CATEGORY_CONFIG.filter((item) => item.key !== 'all').map((item) => [item.key, 0]));
    for (const item of items) {
      for (const category of item.derivedCategories || []) {
        counts.set(category, (counts.get(category) || 0) + 1);
      }
    }
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = items
      .filter((item) => {
        if (!query) return true;
        return [item.title, item.description, item.language, ...(item.tags || [])]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .filter((item) => {
        if (selectedCategories.length === 0) return true;
        return selectedCategories.some((category) => item.derivedCategories?.includes(category));
      })
      .filter((item) => (refine.openSource ? item.isOpenSource : true))
      .filter((item) => (refine.freeTier ? item.hasFreeTier : true))
      .filter((item) => (refine.verified ? item.isVerified : true));

    return [...result].sort((a, b) => {
      if (sort === 'votes') return b.scoreVotes - a.scoreVotes;
      if (sort === 'activity') return b.scoreActivity - a.scoreActivity;
      return b.scoreRecent - a.scoreRecent;
    });
  }, [items, search, selectedCategories, refine, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const paginatedItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [activeTab, search, selectedCategories, refine, sort]);

  useEffect(() => {
    setSearch('');
    setSelectedCategories([]);
    setRefine({ openSource: false, freeTier: false, verified: false });
  }, [activeTab]);

  const toggleCategory = (category) => {
    if (category === 'all') {
      setSelectedCategories([]);
      return;
    }

    setSelectedCategories((current) =>
      current.includes(category) ? current.filter((item) => item !== category) : [...current, category]
    );
  };

  const toggleRefine = (key) => {
    setRefine((current) => ({ ...current, [key]: !current[key] }));
  };

  const toggleSection = (key) => {
    setSectionsOpen((current) => ({ ...current, [key]: !current[key] }));
  };

  const pageButtons = useMemo(() => {
    const buttons = [];
    const start = Math.max(1, page - 1);
    const end = Math.min(totalPages, start + 2);
    for (let value = start; value <= end; value += 1) buttons.push(value);
    return buttons;
  }, [page, totalPages]);

  return (
    <div>
      <Helmet>
        <title>AI Agents &amp; Repositories - Trending Tools | wayb</title>
        <meta name="description" content="Discover trending AI agent frameworks, autonomous agents, and open-source repositories in a static curated catalog." />
        <meta property="og:title" content="AI Agents & Repositories - Trending Tools | wayb" />
        <meta property="og:description" content="Discover trending AI agent frameworks and open-source repos in a static curated catalog." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="AI Agents & Repos | wayb" />
        <meta name="twitter:description" content="Trending AI agents and open-source repositories in a static curated catalog." />
      </Helmet>

      <Navbar />

      <main className={styles.page}>
        <div className={styles.layout}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarCard}>
              <button type="button" className={styles.sidebarSectionHead} onClick={() => toggleSection('categories')}>
                <span className={styles.sidebarLabel}>Categories</span>
                <ChevronDown size={14} className={`${styles.sectionChevron}${sectionsOpen.categories ? ` ${styles.sectionChevronOpen}` : ''}`} />
              </button>
              {sectionsOpen.categories && (
                <div className={styles.categoryList}>
                  {CATEGORY_CONFIG.map((category) => {
                    const Icon = category.icon;
                    const count = category.key === 'all' ? items.length : Number(categoryCounts.get(category.key) || 0);
                    const active = category.key === 'all' ? selectedCategories.length === 0 : selectedCategories.includes(category.key);
                    return (
                      <button
                        key={category.key}
                        type="button"
                        className={`${styles.catItem}${active ? ` ${styles.catActive}` : ''}`}
                        onClick={() => toggleCategory(category.key)}
                      >
                        <span className={styles.catLead}>
                          <Icon size={14} />
                          <span className={styles.catLabel}>{category.label}</span>
                        </span>
                        <span className={styles.catCount}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={styles.sidebarCard}>
              <button type="button" className={styles.sidebarSectionHead} onClick={() => toggleSection('refine')}>
                <span className={styles.sidebarLabel}>Refine Filters</span>
                <ChevronDown size={14} className={`${styles.sectionChevron}${sectionsOpen.refine ? ` ${styles.sectionChevronOpen}` : ''}`} />
              </button>
              {sectionsOpen.refine && (
                <div className={styles.refineList}>
                  {REFINE_OPTIONS.map((option) => (
                    <label key={option.key} className={styles.refineItem}>
                      <input
                        type="checkbox"
                        checked={Boolean(refine[option.key])}
                        onChange={() => toggleRefine(option.key)}
                        className={styles.refineCheckbox}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <section className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <h1 className={styles.pageTitle}>{activeView.title}</h1>
                <p className={styles.pageSubtitle}>{activeView.subtitle}</p>
              </div>
              <div className={styles.headerControls}>
                <div className={styles.searchWrap}>
                  <Search size={14} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search within agents..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className={styles.searchInput}
                  />
                </div>
                <div className={styles.sortWrap}>
                  <SlidersHorizontal size={14} className={styles.sortIcon} />
                  <select value={sort} onChange={(event) => setSort(event.target.value)} className={styles.sortSelect}>
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.tabBar}>
              {TABS.map((tab, index) => (
                <button
                  key={tab.label}
                  type="button"
                  className={`${styles.tab}${activeTab === index ? ` ${styles.tabActive}` : ''}`}
                  onClick={() => setActiveTab(index)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className={styles.tableToolbar}>
              <div className={styles.tableMeta}>
                <span>{filteredItems.length} results</span>
                {(selectedCategories.length > 0 || search || Object.values(refine).some(Boolean)) && (
                  <button
                    type="button"
                    className={styles.clearBtn}
                    onClick={() => {
                      setSearch('');
                      setSelectedCategories([]);
                      setRefine({ openSource: false, freeTier: false, verified: false });
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
              <span className={styles.tableHint}>Most Visits is not available in the current dataset, so activity is used instead.</span>
            </div>

            {error && <p className={styles.errorMsg}>{error}</p>}

            {loading ? (
              <div className={styles.tableSkeleton}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className={styles.skeletonRow} />
                ))}
              </div>
            ) : paginatedItems.length === 0 ? (
              <div className={styles.emptyState}>
                <p>
                  {items.length === 0
                    ? 'No agents are available in this static catalog yet.'
                    : 'No agents match your filters. Try adjusting your search or categories.'}
                </p>
              </div>
            ) : (
              <div className={styles.tableShell}>
                <div className={styles.tableWrap}>
                  <table className={styles.agentTable}>
                    <thead>
                      <tr>
                        <th>Agent Name</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Metrics</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.map((item) => {
                        const primaryLabel = CATEGORY_CONFIG.find((category) => category.key === item.primaryCategory)?.label || 'General';
                        return (
                          <tr key={item._id || item.link}>
                            <td>
                              <div className={styles.agentCell}>
                                <div className={styles.agentAvatar}>
                                  {item.logoUrl ? (
                                    <img src={item.logoUrl} alt={item.title} className={styles.agentAvatarImg} loading="lazy" />
                                  ) : (
                                    <span>{getInitials(item.title)}</span>
                                  )}
                                </div>
                                <div>
                                  <div className={styles.agentName}>{item.title}</div>
                                  <div className={styles.agentSubline}>
                                    {item.language || (item.sourceType === 'open_source' ? 'Open Source Agent' : 'AI Agent')}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <p className={styles.agentDescription}>{item.description || 'No description available.'}</p>
                            </td>
                            <td>
                              <span className={styles.categoryBadge}>{primaryLabel}</span>
                            </td>
                            <td>
                              <div className={styles.metricStack}>
                                <div>
                                  <strong>{formatMetric(item.scoreVotes)}</strong>
                                  <span>votes</span>
                                </div>
                                <div>
                                  <strong>{formatMetric(item.scoreActivity)}</strong>
                                  <span>activity</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className={styles.pagination}>
                  <div className={styles.pageInfo}>
                    Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filteredItems.length)} of {filteredItems.length} agents
                  </div>
                  <div className={styles.pageControls}>
                    <button
                      type="button"
                      className={styles.pageBtn}
                      onClick={() => setPage((current) => Math.max(1, current - 1))}
                      disabled={page <= 1 || loading}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    {pageButtons.map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`${styles.pageNumber}${value === page ? ` ${styles.pageNumberActive}` : ''}`}
                        onClick={() => setPage(value)}
                      >
                        {value}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={styles.pageBtn}
                      onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                      disabled={page >= totalPages || loading}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default AgentsPage;
