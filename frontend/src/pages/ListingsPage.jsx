import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Mic,
  MicOff,
  MessageSquare,
  Newspaper,
  Rocket,
  TrendingUp,
  TriangleIcon,
  Zap,
} from 'lucide-react';
import api from '../api/client';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import AuthPromptModal from '../components/common/AuthPromptModal';

const FALLBACK_THUMB = 'https://placehold.co/64x64/141b27/6366f1?text=?';
const HERO_IDEA_EXAMPLES = [
  'I want to build a SaaS tool for technical hiring teams to screen candidates faster.',
  'I want to build an AI workspace for small agencies to manage client content and reporting.',
  'I want to build a product research platform for founders exploring new B2B software ideas.',
];

function getFriendlyRequestMessage(error, fallbackMessage) {
  const status = Number(error?.response?.status || 0);
  const message = String(error?.response?.data?.message || error?.message || '').trim();

  if (status === 429 || /too many requests/i.test(message)) {
    return 'Live data is temporarily busy. Please refresh in a minute.';
  }

  return fallbackMessage;
}

// ---- Helpers ----
function normalizeTopics(input) {
  const rows = Array.isArray(input) ? input : [];
  const dedup = new Map();

  for (const item of rows) {
    const slug = String(item?.slug || '').trim();
    const name = String(item?.name || '').trim();
    if (!slug || !name) continue;
    if (dedup.has(slug)) continue;
    dedup.set(slug, { ...item, slug, name });
  }

  return Array.from(dedup.values());
}

function truncate(text, max) {
  const v = String(text || '').trim();
  return v.length <= max ? v : `${v.slice(0, max).trimEnd()}...`;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return '';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatVotes(n) {
  const count = Number(n) || 0;
  return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count);
}

function getSourceLabel(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '');
    const name = host.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  } catch {
    return 'News';
  }
}

const SOURCE_COLORS = {
  techcrunch:  { bg: 'rgba(10,143,8,0.15)',  color: '#4ade80' },
  venturebeat: { bg: 'rgba(0,102,204,0.15)', color: '#60a5fa' },
  theverge:    { bg: 'rgba(224,64,251,0.15)',color: '#e879f9' },
  wired:       { bg: 'rgba(200,200,200,0.1)',color: '#94a3b8' },
  producthunt: { bg: 'rgba(255,97,84,0.15)', color: '#ff6154' },
  default:     { bg: 'rgba(99,102,241,0.15)',color: '#818cf8' },
};

function getSourceColors(url) {
  try {
    const host = new URL(url).hostname.replace('www.', '').split('.')[0];
    return SOURCE_COLORS[host] || SOURCE_COLORS.default;
  } catch {
    return SOURCE_COLORS.default;
  }
}

// ---- Newsletter CTA ----
function NewsletterCTA() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) return;

    setSubmitting(true);
    setError('');

    try {
      await api.post('/api/alerts/subscribe', {
        email: normalizedEmail,
        frequency: 'weekly',
      });
      setSent(true);
      setEmail('');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Failed to subscribe. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="newsletter-section">
      <div className="newsletter-card">
        <p className="newsletter-eyebrow">
          <Zap size={13} /> Stay ahead
        </p>
        <h2 className="newsletter-title">Never miss an AI launch</h2>
        <p className="newsletter-sub">
          Get a weekly roundup of the best new AI tools, products, and startups - curated and delivered to your inbox.
        </p>
        {sent ? (
          <p style={{ color: 'var(--green)', fontWeight: 600 }}>
            âœ“ You're on the list! We'll be in touch.
          </p>
        ) : (
          <form className="newsletter-form" onSubmit={handleSubmit}>
            <input
              type="email"
              className="newsletter-input"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />
            <button type="submit" className="newsletter-btn" disabled={submitting}>
              {submitting ? 'Subscribing...' : <>Subscribe <ArrowRight size={15} /></>}
            </button>
          </form>
        )}
        {error && <p className="form-error" style={{ marginTop: 10 }}>{error}</p>}
      </div>
    </section>
  );
}

// ---- Main Page ----
function ListingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [ideaExampleIndex, setIdeaExampleIndex] = useState(0);
  const [typedIdea, setTypedIdea] = useState('');
  const [isDeletingIdea, setIsDeletingIdea] = useState(false);
  const [ideaInput, setIdeaInput] = useState('');
  const [ideaSubmitLoading, setIdeaSubmitLoading] = useState(false);
  const [ideaSubmitError, setIdeaSubmitError] = useState('');
  const [heroHeadline, setHeroHeadline] = useState('');
  const [showIdeaPrompt, setShowIdeaPrompt] = useState(false);
  const [submitAfterAuth, setSubmitAfterAuth] = useState(false);
  const [launchFormAfterAuth, setLaunchFormAfterAuth] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const baseTranscriptRef = useRef('');
  const interimTranscriptRef = useRef('');
  const speechSupported = typeof window !== 'undefined' &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  const [topics, setTopics] = useState([]);
  const [topToday, setTopToday] = useState([]);
  const [topPage, setTopPage] = useState(1);
  const [topTotalPages, setTopTotalPages] = useState(1);
  const [topPaginationActive, setTopPaginationActive] = useState(false);
  const [newsItems, setNewsItems] = useState([]);
  const [trendingItems, setTrendingItems] = useState([]);

  const [loadingTopics, setLoadingTopics] = useState(false);
  const [loadingTopToday, setLoadingTopToday] = useState(false);
  const [loadingNews, setLoadingNews] = useState(false);
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [topicsError, setTopicsError] = useState('');
  const [topTodayError, setTopTodayError] = useState('');
  const [trendingError, setTrendingError] = useState('');

  const [carouselIdx, setCarouselIdx] = useState(0);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const heroTextareaRef = useRef(null);

  const focusIdeaComposer = () => {
    if (!heroTextareaRef.current) return;
    heroTextareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    heroTextareaRef.current.focus();
  };

  const resizeHeroTextarea = () => {
    if (!heroTextareaRef.current) return;
    heroTextareaRef.current.style.height = 'auto';
    heroTextareaRef.current.style.height = `${heroTextareaRef.current.scrollHeight}px`;
  };

  useEffect(() => {
    resizeHeroTextarea();
  }, [ideaInput]);

  useEffect(() => {
    const activeIdea = HERO_IDEA_EXAMPLES[ideaExampleIndex] || '';
    let timeoutId;

    if (!isDeletingIdea && typedIdea === activeIdea) {
      timeoutId = setTimeout(() => setIsDeletingIdea(true), 1400);
    } else if (isDeletingIdea && typedIdea === '') {
      timeoutId = setTimeout(() => {
        setIsDeletingIdea(false);
        setIdeaExampleIndex((current) => (current + 1) % HERO_IDEA_EXAMPLES.length);
      }, 220);
    } else {
      timeoutId = setTimeout(() => {
        const nextValue = isDeletingIdea
          ? activeIdea.slice(0, Math.max(0, typedIdea.length - 1))
          : activeIdea.slice(0, typedIdea.length + 1);
        setTypedIdea(nextValue);
      }, isDeletingIdea ? 28 : 42);
    }

    return () => clearTimeout(timeoutId);
  }, [ideaExampleIndex, isDeletingIdea, typedIdea]);

  useEffect(() => {
    let mounted = true;
    const phrases = ['WAYB', 'What are you building?'];
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;

    const tick = () => {
      if (!mounted) return;
      const current = phrases[phraseIndex];

      if (!deleting) {
        charIndex += 1;
        setHeroHeadline(current.slice(0, charIndex));
        if (charIndex === current.length) {
          deleting = true;
          setTimeout(tick, 1100);
          return;
        }
      } else {
        charIndex -= 1;
        setHeroHeadline(current.slice(0, Math.max(charIndex, 0)));
        if (charIndex <= 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          setTimeout(tick, 350);
          return;
        }
      }

      setTimeout(tick, deleting ? 45 : 70);
    };

    const start = setTimeout(tick, 400);
    return () => {
      mounted = false;
      clearTimeout(start);
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('compose') === '1' && heroTextareaRef.current) {
      window.setTimeout(() => {
        focusIdeaComposer();
      }, 0);
    }
  }, [location.search]);

  useEffect(() => {
    const handleComposeFocus = () => focusIdeaComposer();
    window.addEventListener('wayb-focus-compose', handleComposeFocus);
    return () => window.removeEventListener('wayb-focus-compose', handleComposeFocus);
  }, []);

  useEffect(() => {
    if (!speechSupported) return;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        if (event.results[i].isFinal) {
          finalText += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      if (finalText.trim()) {
        const nextBase = `${baseTranscriptRef.current} ${finalText}`.trim();
        baseTranscriptRef.current = nextBase;
        interimTranscriptRef.current = '';
        setIdeaInput(nextBase);
      } else if (interim.trim()) {
        interimTranscriptRef.current = interim;
        setIdeaInput(`${baseTranscriptRef.current} ${interim}`.trim());
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [speechSupported]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldResume = params.get('resumeIdea') === '1';
    const savedIdea = sessionStorage.getItem('pendingIdeaSubmission') || '';
    const token = localStorage.getItem('userToken');

    if (!shouldResume || !savedIdea || !token) return;

    setIdeaInput(savedIdea);
    sessionStorage.removeItem('pendingIdeaSubmission');
    navigate('/', { replace: true });
    window.setTimeout(() => {
      setSubmitAfterAuth(false);
      setIdeaSubmitError('');
      submitIdeaForScoring(savedIdea);
    }, 0);
  }, [location.search]);

  // Load categories/topics
  useEffect(() => {
    setLoadingTopics(true);
    setTopicsError('');
    const fetchTopics = async () => {
      let categoryError = null;
      try {
        let data = [];
        try {
          const r = await api.get('/api/producthunt/categories');
          data = Array.isArray(r.data?.data) ? r.data.data : [];
        } catch (error) {
          categoryError = error;
          const r2 = await api.get('/api/producthunt/topics');
          data = Array.isArray(r2.data?.data) ? r2.data.data : [];
        }
        setTopics(normalizeTopics(data));
        setTopicsError('');
        if (categoryError && data.length === 0) {
          setTopicsError(getFriendlyRequestMessage(categoryError, 'Failed to load categories.'));
        }
      } catch (err) {
        setTopicsError(getFriendlyRequestMessage(err, 'Failed to load categories.'));
      } finally {
        setLoadingTopics(false);
      }
    };
    fetchTopics();
  }, []);

  // Load news
  useEffect(() => {
    setLoadingNews(true);
    api.get('/api/news?limit=10&page=1')
      .then((r) => setNewsItems(Array.isArray(r.data?.data) ? r.data.data : []))
      .catch(() => setNewsItems([]))
      .finally(() => setLoadingNews(false));
  }, []);

  // Load trending
  useEffect(() => {
    setLoadingTrending(true);
    setTrendingError('');
    api.get('/api/producthunt/trending?limit=8')
      .then((r) => setTrendingItems(Array.isArray(r.data?.data) ? r.data.data : []))
      .catch((err) => {
        setTrendingItems([]);
        setTrendingError(getFriendlyRequestMessage(err, 'Trending products are temporarily unavailable.'));
      })
      .finally(() => setLoadingTrending(false));
  }, []);

  // Load top today
  useEffect(() => {
    setLoadingTopToday(true);
    setTopTodayError('');
    api.get(`/api/producthunt/top-today?limit=15&page=${topPage}`)
      .then((r) => {
        const payload = r.data?.data || {};
        const data = Array.isArray(payload?.data) ? payload.data : [];
        setTopToday(data);
        setTopTotalPages(Math.max(1, Number(payload?.totalPages || 1)));
        setTopPaginationActive(Boolean(payload?.paginationActive || Number(payload?.total || 0) > 15));
      })
      .catch((err) => {
        setTopToday([]);
        setTopTotalPages(1);
        setTopPaginationActive(false);
        setTopTodayError(getFriendlyRequestMessage(err, 'Unable to load today\'s launches right now.'));
      })
      .finally(() => setLoadingTopToday(false));
  }, [topPage]);

  // Carousel auto-rotate
  useEffect(() => {
    if (carouselPaused || trendingItems.length <= 1) return;
    const id = setInterval(() => {
      setCarouselIdx((i) => (i + 1) % trendingItems.length);
    }, 5000);
    return () => clearInterval(id);
  }, [carouselPaused, trendingItems.length]);

  const visibleProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return [...topToday]
      .filter((p) => {
        if (!term) return true;
        return (
          String(p?.name || '').toLowerCase().includes(term) ||
          String(p?.tagline || '').toLowerCase().includes(term)
        );
      })
      .sort((a, b) => Number(b?.votesCount || 0) - Number(a?.votesCount || 0));
  }, [topToday, searchTerm]);

  const activeTrending = trendingItems[carouselIdx] || null;

  const prevCarousel = () => {
    if (!trendingItems.length) return;
    setCarouselIdx((i) => (i - 1 + trendingItems.length) % trendingItems.length);
  };
  const nextCarousel = () => {
    if (!trendingItems.length) return;
    setCarouselIdx((i) => (i + 1) % trendingItems.length);
  };

  const submitIdeaForScoring = async (ideaOverride) => {
    const idea = String(ideaOverride ?? ideaInput).trim();
    if (!idea) {
      setShowIdeaPrompt(true);
      heroTextareaRef.current?.focus();
      return;
    }

    setIdeaSubmitLoading(true);
    setIdeaSubmitError('');

    try {
      const response = await api.post('/api/idea-reports', { idea });
      const reportId = response.data?.data?._id;
      if (!reportId) {
        throw new Error('Idea report was created without an id');
      }
      setIdeaInput('');
      navigate(`/idea-report/${reportId}`);
    } catch (requestError) {
      setIdeaSubmitError(requestError?.response?.data?.message || 'We could not evaluate your idea right now.');
    } finally {
      setIdeaSubmitLoading(false);
    }
  };

  const handleHeroSubmit = () => {
    const idea = String(ideaInput || '').trim();
    if (!idea) {
      setShowIdeaPrompt(true);
      heroTextareaRef.current?.focus();
      return;
    }

    if (localStorage.getItem('userToken')) {
      submitIdeaForScoring(idea);
      return;
    }

    setSubmitAfterAuth(true);
    setShowAuthPrompt(true);
  };

  const handleLaunchCta = () => {
    setSubmitAfterAuth(false);
    setLaunchFormAfterAuth(true);
    if (localStorage.getItem('userToken')) {
      navigate('/submit');
      return;
    }
    setShowAuthPrompt(true);
  };

  const handleExploreScroll = () => {
    const section = document.getElementById('products');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (window?.history?.replaceState) {
        window.history.replaceState(null, '', '#products');
      } else {
        window.location.hash = 'products';
      }
      return;
    }
    navigate('/#products');
  };

  const toggleVoice = () => {
    if (!speechSupported || !recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    baseTranscriptRef.current = ideaInput.trim();
    interimTranscriptRef.current = '';
    setIsListening(true);
    recognitionRef.current.start();
  };

  return (
    <div>
      <Helmet>
        <title>wayb - Discover the Hottest AI Tools &amp; Startups</title>
        <meta name="description" content="Real-time discovery of the hottest AI tools, products, and startups from Product Hunt and beyond. Track every AI launch as it happens." />
        <meta property="og:title" content="wayb - Discover the Hottest AI Tools & Startups" />
        <meta property="og:description" content="Real-time discovery of the hottest AI tools, products, and startups from Product Hunt and beyond." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://launchradar.io/" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="wayb - Discover the Hottest AI Tools & Startups" />
        <meta name="twitter:description" content="Track every AI launch in real-time. Trending tools, crypto, agents, and airdrops." />
      </Helmet>

      <Navbar searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      {/* ---- HERO ---- */}
      <section className="hero hero-clean">
        <div className="hero-clean-bg" />
        <div className="hero-content hero-clean-content fade-up">
          <span className="hero-badge hero-clean-badge">
            <span className="hero-live-dot" />
            Live - WAYB | What are you building?
          </span>
          <h1 className="hero-title hero-clean-title hero-typing" aria-live="polite">
            {heroHeadline}
            <span className="hero-typing-caret" aria-hidden="true">|</span>
          </h1>
          <p className="hero-sub hero-clean-sub">
            Builders, this is your chance to share what you’re building and get featured on the leaderboard to win grants and bounties.
          </p>

          <div className="hero-chat-shell">
            <div className="hero-chat-bar">
              <textarea
                ref={heroTextareaRef}
                rows={1}
                className="hero-chat-input"
                placeholder={typedIdea || 'I want to build a SaaS tool for…'}
                value={ideaInput}
                onChange={(event) => {
                  setIdeaInput(event.target.value);
                  baseTranscriptRef.current = event.target.value;
                  interimTranscriptRef.current = '';
                  if (ideaSubmitError) setIdeaSubmitError('');
                }}
              />
              <div className="hero-chat-actions">
                <button
                  type="button"
                  className={`hero-chat-voice${isListening ? ' active' : ''}`}
                  onClick={toggleVoice}
                  disabled={!speechSupported}
                  title={speechSupported ? 'Use voice input' : 'Voice input not supported'}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button
                  type="button"
                  className="hero-chat-submit"
                  onClick={handleHeroSubmit}
                  disabled={ideaSubmitLoading}
                  aria-label="Submit idea"
                >
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </div>
            {ideaSubmitError && <p className="form-error" style={{ marginTop: 10 }}>{ideaSubmitError}</p>}
          </div>

          <div className="hero-actions hero-clean-actions">
            <a href="#products" className="btn btn-primary">
              Explore Products <ArrowRight size={15} />
            </a>
            <button type="button" className="btn btn-ghost" onClick={handleLaunchCta}>
              <Rocket size={15} /> Submit a Launch
            </button>
          </div>

          <div className="hero-feature-grid">
            <button type="button" className="hero-feature-card" onClick={handleExploreScroll}>
              <span className="hero-feature-icon"><Compass size={16} /></span>
              <span className="hero-feature-title">Explore Products</span>
              <span className="hero-feature-sub">Discover new tools built by the community.</span>
            </button>
            <button type="button" className="hero-feature-card" onClick={handleLaunchCta}>
              <span className="hero-feature-icon"><Rocket size={16} /></span>
              <span className="hero-feature-title">Submit a Launch</span>
              <span className="hero-feature-sub">Launch your product to thousands of users.</span>
            </button>
            <button type="button" className="hero-feature-card" onClick={() => navigate('/leaderboard')}>
              <span className="hero-feature-icon"><TrendingUp size={16} /></span>
              <span className="hero-feature-title">Leaderboard</span>
              <span className="hero-feature-sub">See the top ranked projects this week.</span>
            </button>
            <button type="button" className="hero-feature-card" onClick={() => navigate('/workspace')}>
              <span className="hero-feature-icon"><MessageSquare size={16} /></span>
              <span className="hero-feature-title">Workspace</span>
              <span className="hero-feature-sub">Manage your projects and builder profile.</span>
            </button>
          </div>

          <div className="hero-scroll-hint" aria-hidden="true">
            <span className="hero-scroll-pointer" />
            <span className="hero-scroll-text">Page scroll</span>
          </div>
        </div>
      </section>

      {/* ---- CATEGORY CHIPS ---- */}
      <section className="category-section">
        <div className="category-inner">
          {topicsError && topics.length === 0 && <p className="form-error" style={{ marginBottom: 12 }}>{topicsError}</p>}
          <div className="category-chips">
            {loadingTopics && (
              <>
                {[1, 2, 3, 4, 5].map((k) => (
                  <span key={k} className="cat-chip skeleton" style={{ width: 80, height: 32 }} />
                ))}
              </>
            )}
            {!loadingTopics && topics.map((topic) => (
              <button
                key={topic.id || topic.slug}
                type="button"
                className="cat-chip"
                onClick={() => navigate(`/category/${topic.slug}`)}
              >
                {topic.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CONTENT GRID ---- */}
      <div className="content-layout" id="products">
        {/* MAIN */}
        <main className="content-main">

          {/* Trending Carousel */}
          <section>
            <div className="section-head">
              <h2 className="section-title">
                <TrendingUp size={18} className="section-icon" />
                Trending Now
              </h2>
            </div>

            {loadingTrending && (
              <div className="carousel-card skeleton" style={{ height: 120 }} />
            )}

            {!loadingTrending && activeTrending && (
              <>
                <div
                  className="carousel-card"
                  key={carouselIdx}
                  onMouseEnter={() => setCarouselPaused(true)}
                  onMouseLeave={() => setCarouselPaused(false)}
                >
                  <img
                    className="carousel-thumb"
                    src={activeTrending.thumbnail || FALLBACK_THUMB}
                    alt={activeTrending.name}
                    loading="lazy"
                    onError={(e) => { e.target.src = FALLBACK_THUMB; }}
                  />
                  <div className="carousel-body">
                    <p className="carousel-kicker">
                      #{carouselIdx + 1} on Product Hunt
                    </p>
                    <h3 className="carousel-name">{activeTrending.name}</h3>
                    <p className="carousel-tagline">
                      {activeTrending.tagline || activeTrending.description || ''}
                    </p>
                    <div className="carousel-footer">
                      <span className="vote-badge">
                        <TriangleIcon size={10} style={{ transform: 'rotate(0deg)' }} />
                        {formatVotes(activeTrending.votesCount)}
                      </span>
                      {(activeTrending.topics || []).slice(0, 2).map((t) => (
                        <span key={t.slug} className="tag-pill">{t.name}</span>
                      ))}
                      {activeTrending.website && (
                        <a
                          href={activeTrending.website}
                          target="_blank"
                          rel="noreferrer"
                          className="visit-link"
                        >
                          Visit <ArrowUpRight size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {trendingItems.length > 1 && (
                  <div className="carousel-controls">
                    <div className="carousel-dots">
                      {trendingItems.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`carousel-dot${i === carouselIdx ? ' active' : ''}`}
                          onClick={() => setCarouselIdx(i)}
                          aria-label={`Trending item ${i + 1}`}
                        />
                      ))}
                    </div>
                    <div className="carousel-nav">
                      <button type="button" className="btn-icon" onClick={prevCarousel} aria-label="Previous">
                        <ChevronLeft size={16} />
                      </button>
                      <button type="button" className="btn-icon" onClick={nextCarousel} aria-label="Next">
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {!loadingTrending && trendingError && trendingItems.length === 0 && (
              <div className="empty-state" style={{ padding: '24px' }}>
                <p>{trendingError}</p>
              </div>
            )}

            {!loadingTrending && !trendingError && !activeTrending && (
              <div className="empty-state" style={{ padding: '24px' }}>
                <p>No trending products yet.</p>
              </div>
            )}
          </section>

          {/* Launching Today */}
          <section>
            <div className="section-head">
              <h2 className="section-title">
                <Rocket size={18} className="section-icon" />
                Launching Today
              </h2>
            </div>

            {topTodayError && topToday.length === 0 && <p className="form-error" style={{ marginBottom: 12 }}>{topTodayError}</p>}

            {loadingTopToday && (
              <div className="product-list">
                {[1, 2, 3, 4, 5].map((k) => (
                  <div key={k} className="product-item skeleton" style={{ height: 68 }} />
                ))}
              </div>
            )}

            {!loadingTopToday && !topTodayError && visibleProducts.length === 0 && (
              <div className="empty-state">
                <Rocket size={28} strokeWidth={1.5} />
                <p>No products found for today.</p>
              </div>
            )}

            {!loadingTopToday && visibleProducts.length > 0 && (
              <div className="product-list">
                {visibleProducts.map((product, index) => (
                  <article key={product.id || index} className="product-item">
                    <span className="product-rank">
                      {product.rank || index + 1}
                    </span>
                    <img
                      className="product-thumb"
                      src={product.thumbnail || FALLBACK_THUMB}
                      alt={product.name}
                      loading="lazy"
                      onError={(e) => { e.target.src = FALLBACK_THUMB; }}
                    />
                    <div className="product-info">
                      <p className="product-name">{product.name}</p>
                      <p className="product-tagline">
                        {truncate(product.tagline || product.description, 90)}
                      </p>
                      <div className="product-tags">
                        {(product.topics || []).slice(0, 3).map((t) => (
                          <span key={`${product.id}-${t.slug}`} className="tag-pill">
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="product-stats">
                      <span className="vote-badge">
                        <TriangleIcon size={10} />
                        {formatVotes(product.votesCount)}
                      </span>
                      {Number(product.commentsCount) > 0 && (
                        <span className="comment-count">
                          <MessageSquare size={11} />
                          {product.commentsCount}
                        </span>
                      )}
                      {product.url && (
                        <a
                          href={product.url}
                          target="_blank"
                          rel="noreferrer"
                          className="visit-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Visit <ArrowUpRight size={12} />
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}

            {!loadingTopToday && topPaginationActive && (
              <div className="pagination">
                <span className="page-info">Page {topPage} of {topTotalPages}</span>
                <div className="page-btns">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={topPage <= 1}
                    onClick={() => setTopPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={topPage >= topTotalPages}
                    onClick={() => setTopPage((p) => Math.min(topTotalPages, p + 1))}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </section>
        </main>

        {/* ASIDE - News Feed */}
        <aside className="content-aside">
          <div className="news-aside">
            <div className="news-aside-header">
              <h2 className="news-aside-title">
                <Newspaper size={16} className="news-aside-icon" />
                AI News
              </h2>
            </div>

            {loadingNews && (
              <div className="news-list">
                {[1, 2, 3, 4].map((k) => (
                  <div key={k} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                    <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 14, marginBottom: 6 }} />
                    <div className="skeleton" style={{ height: 12, width: '70%' }} />
                  </div>
                ))}
              </div>
            )}

            {!loadingNews && newsItems.length === 0 && (
              <div className="empty-state" style={{ margin: 16, padding: 24 }}>
                <p>No news available yet.</p>
              </div>
            )}

            {!loadingNews && newsItems.length > 0 && (
              <div className="news-list">
                {newsItems.map((item) => {
                  const colors = getSourceColors(item.link || '');
                  const source = item.source || getSourceLabel(item.link || '');
                  return (
                    <article key={item._id || item.link} className="news-item">
                      <span
                        className="news-source-badge"
                        style={{ background: colors.bg, color: colors.color }}
                      >
                        {source}
                      </span>
                      <p className="news-title">{item.title}</p>
                      {item.summary && (
                        <p className="news-summary">
                          {truncate(item.summary, 100)}
                        </p>
                      )}
                      <div className="news-meta">
                        <span className="news-time">
                          <Clock size={11} />
                          {timeAgo(item.publishedAt)}
                        </span>
                        {item.link && (
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noreferrer"
                            className="news-read-link"
                          >
                            Read <ArrowUpRight size={11} />
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>

      <NewsletterCTA />
      <Footer />
      <AuthPromptModal
        open={showAuthPrompt}
        onClose={() => {
          setShowAuthPrompt(false);
          setSubmitAfterAuth(false);
          setLaunchFormAfterAuth(false);
        }}
        onSuccess={() => {
          setShowAuthPrompt(false);
          if (launchFormAfterAuth) {
            setLaunchFormAfterAuth(false);
            navigate('/submit');
            return;
          }
          if (submitAfterAuth && (ideaInput || sessionStorage.getItem('pendingIdeaSubmission'))) {
            const idea = String(ideaInput || sessionStorage.getItem('pendingIdeaSubmission') || '').trim();
            if (idea) {
              setSubmitAfterAuth(false);
              window.setTimeout(() => {
                submitIdeaForScoring(idea);
              }, 0);
              return;
            }
          }
          navigate('/?compose=1');
        }}
        onGoogleContinue={() => {
          const shouldResumeIdea = submitAfterAuth && ideaInput.trim();
          const nextPath = launchFormAfterAuth ? '/submit' : (shouldResumeIdea ? '/?resumeIdea=1' : '/?compose=1');
          if (shouldResumeIdea) {
            sessionStorage.setItem('pendingIdeaSubmission', ideaInput.trim());
            setSubmitAfterAuth(false);
          }
          if (launchFormAfterAuth) {
            setLaunchFormAfterAuth(false);
          }
          setShowAuthPrompt(false);
          navigate(`/auth?next=${encodeURIComponent(nextPath)}`);
        }}
      />
      {ideaSubmitLoading && (
        <div className="scoring-popup-backdrop" role="presentation">
          <div className="scoring-popup" role="status" aria-live="polite" aria-label="Scoring your idea">
            Scoring...
          </div>
        </div>
      )}
      {showIdeaPrompt && (
        <div className="idea-alert-backdrop" role="presentation" onClick={() => setShowIdeaPrompt(false)}>
          <div
            className="idea-alert-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="idea-alert-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="idea-alert-title" className="idea-alert-title">Add your idea first</h2>
            <p className="idea-alert-copy">Enter your product idea to generate a score.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setShowIdeaPrompt(false);
                heroTextareaRef.current?.focus();
              }}
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ListingsPage;

