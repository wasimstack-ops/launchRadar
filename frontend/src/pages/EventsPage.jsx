import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, ThumbsUp } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import api from '../api/client';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import styles from '../components/events/Events.module.css';

const COIN_FALLBACK = 'https://placehold.co/38x38/1e293b/94a3b8?text=?';
const LIMIT = 20;

// ── helpers ──────────────────────────────────────────────────────────────────
function toUTCKey(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function sameUTCDay(a, b) {
  return toUTCKey(a) === toUTCKey(b);
}

function getDateLabel(date) {
  const d = new Date(date);
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  if (sameUTCDay(d, now)) return 'Today';
  if (sameUTCDay(d, tomorrow)) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) + ' UTC';
}

function getDateSub(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }) + ' UTC';
}

function groupByDate(events) {
  const map = new Map();
  for (const e of events) {
    const key = toUTCKey(e.dateEvent);
    if (!map.has(key)) map.set(key, { key, date: new Date(e.dateEvent), items: [] });
    map.get(key).items.push(e);
  }
  return Array.from(map.values()).sort((a, b) => a.date - b.date);
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function CalendarWidget({ eventDates, selectedDate, onSelectDate }) {
  const today = new Date();
  const [yr, setYr] = useState(today.getUTCFullYear());
  const [mo, setMo] = useState(today.getUTCMonth());

  const eventSet = new Set(eventDates);

  const firstDay = new Date(Date.UTC(yr, mo, 1));
  const daysInMonth = new Date(Date.UTC(yr, mo + 1, 0)).getUTCDate();
  const startPad = firstDay.getUTCDay();

  const prevMo = () => { if (mo === 0) { setYr(y => y - 1); setMo(11); } else setMo(m => m - 1); };
  const nextMo = () => { if (mo === 11) { setYr(y => y + 1); setMo(0); } else setMo(m => m + 1); };

  const monthLabel = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className={styles.calendar}>
      <div className={styles.calendarHeader}>
        <button type="button" className={styles.calNavBtn} onClick={prevMo} aria-label="Previous month">
          <ChevronLeft size={15} />
        </button>
        <span className={styles.calMonthLabel}>{monthLabel}</span>
        <button type="button" className={styles.calNavBtn} onClick={nextMo} aria-label="Next month">
          <ChevronRight size={15} />
        </button>
      </div>

      <div className={styles.calGrid}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <span key={d} className={styles.calDayName}>{d}</span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={`e${i}`} />;
          const key = `${yr}-${String(mo + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isToday    = key === toUTCKey(today);
          const isSelected = key === selectedDate;
          const hasEvents  = eventSet.has(key);
          return (
            <button
              key={key}
              type="button"
              className={[
                styles.calDay,
                isToday    ? styles.calDayToday    : '',
                isSelected ? styles.calDaySelected : '',
                hasEvents  ? styles.calDayHasEvent : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSelectDate(isSelected ? null : key)}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className={styles.calLegend}>
        <span className={styles.calLegendDot} />
        Days with events
      </div>
    </div>
  );
}

// ── Event card ────────────────────────────────────────────────────────────────
function EventCard({ event }) {
  const coin = event.coins?.[0];
  return (
    <div className={styles.card}>
      {/* Left — coin */}
      <div className={styles.cardCoin}>
        <img
          className={styles.coinLogo}
          src={coin?.icon || COIN_FALLBACK}
          alt={coin?.fullname || 'Coin'}
          loading="lazy"
          onError={e => { e.currentTarget.src = COIN_FALLBACK; }}
        />
        <span className={styles.coinName}>
          {coin?.fullname || '—'}
          {event.coins?.length > 1 && (
            <> +{event.coins.length - 1}</>
          )}
        </span>
      </div>

      {/* Middle — content */}
      <div className={styles.cardBody}>
        <p className={styles.cardTitle}>{event.title}</p>
        {event.description ? (
          <p className={styles.cardDesc}>{event.description}</p>
        ) : null}
        <div className={styles.cardTags}>
          {event.categories?.map(cat => (
            <span
              key={cat.categoryId || cat.name}
              className={`${styles.tag}${event.isHot ? ` ${styles.tagHot}` : ''}`}
            >
              {event.isHot ? '🔥 ' : ''}{cat.name}
            </span>
          ))}
        </div>
      </div>

      {/* Right — actions */}
      <div className={styles.cardRight}>
        <div className={styles.likeBox}>
          <ThumbsUp size={13} className={styles.likeIcon} />
          {event.voteCount > 0 && (
            <span className={styles.likeCount}>{event.voteCount}</span>
          )}
        </div>
        {event.proof ? (
          <a className={styles.sourceBtn} href={event.proof} target="_blank" rel="noreferrer noopener" title="Source">
            <ExternalLink size={13} />
          </a>
        ) : null}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EventsPage() {
  const [events, setEvents]           = useState([]);
  const [eventDates, setEventDates]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState('');
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    api.get('/api/events/dates')
      .then(r => setEventDates(Array.isArray(r.data?.dates) ? r.data.dates : []))
      .catch(() => {});
  }, []);

  const load = useCallback((pg, dateKey, replace) => {
    const params = { limit: LIMIT, page: pg, filter: 'upcoming' };
    if (dateKey) params.date = dateKey;
    if (replace) setLoading(true); else setLoadingMore(true);
    setError('');
    api.get('/api/events', { params })
      .then(r => {
        const rows = Array.isArray(r.data?.data) ? r.data.data : [];
        setEvents(prev => replace ? rows : [...prev, ...rows]);
        setHasMore(r.data?.pagination?.hasMore ?? false);
      })
      .catch(err => setError(err?.response?.data?.message || 'Failed to load events.'))
      .finally(() => { setLoading(false); setLoadingMore(false); });
  }, []);

  useEffect(() => { setPage(1); load(1, selectedDate, true); }, [selectedDate, load]);

  const handleLoadMore = () => { const next = page + 1; setPage(next); load(next, selectedDate, false); };
  const handleDate = key => { setSelectedDate(key); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const groups = groupByDate(events);

  return (
    <div>
      <Helmet>
        <title>Crypto Events — Calendar & Milestones | wayb</title>
        <meta name="description" content="Track upcoming blockchain events, token unlocks, AMAs, and launches grouped by date." />
      </Helmet>

      <Navbar />

      <main className={styles.page}>
        <div className="container">

          <header className={styles.header}>
            <div>
              <h1 className={styles.titleMain}>Crypto Events</h1>
              <p className={styles.subtitle}>Upcoming blockchain milestones, token unlocks, AMAs, and launches.</p>
            </div>
            {selectedDate && (
              <button type="button" className={styles.clearFilter} onClick={() => setSelectedDate(null)}>
                Clear filter ✕
              </button>
            )}
          </header>

          <div className={styles.layout}>

            {/* Events list */}
            <div className={styles.eventsList}>
              {error && <p className={styles.error}>{error}</p>}

              {loading ? (
                <p className={styles.empty}>Loading events…</p>
              ) : events.length === 0 ? (
                <p className={styles.empty}>No events found{selectedDate ? ' for this date' : ''}.</p>
              ) : (
                <>
                  {groups.map(group => (
                    <div key={group.key}>
                      <div className={styles.dateHeader}>
                        <span className={styles.dateLabel}>{getDateLabel(group.date)}</span>
                        <span className={styles.dateSubLabel}>{getDateSub(group.date)}</span>
                      </div>
                      {group.items.map(event => (
                        <EventCard key={event._id || event.externalId} event={event} />
                      ))}
                    </div>
                  ))}

                  {hasMore && (
                    <button type="button" className={styles.loadMoreBtn} onClick={handleLoadMore} disabled={loadingMore}>
                      {loadingMore ? 'Loading…' : 'Load More'}
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Calendar sidebar */}
            <aside className={styles.sidebar}>
              <CalendarWidget
                eventDates={eventDates}
                selectedDate={selectedDate}
                onSelectDate={handleDate}
              />
            </aside>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
