import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Globe, MapPin, ThumbsUp } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import api from '../api/client';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import styles from '../components/events/Events.module.css';

const COIN_FALLBACK = 'https://placehold.co/38x38/1e293b/94a3b8?text=?';
const LIMIT = 20;

// ── shared helpers ────────────────────────────────────────────────────────────
function toUTCKey(date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}
function sameUTCDay(a, b) { return toUTCKey(a) === toUTCKey(b); }

function getDateLabel(date) {
  const d    = new Date(date);
  const now  = new Date();
  const tmrw = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()+1));
  if (sameUTCDay(d, now))  return 'Today';
  if (sameUTCDay(d, tmrw)) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { day:'numeric', month:'long', year:'numeric', timeZone:'UTC' }) + ' UTC';
}
function getDateSub(date) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'UTC',
  }) + ' UTC';
}
function groupByDate(events, dateField) {
  const map = new Map();
  for (const e of events) {
    const key = toUTCKey(e[dateField]);
    if (!map.has(key)) map.set(key, { key, date: new Date(e[dateField]), items: [] });
    map.get(key).items.push(e);
  }
  return Array.from(map.values()).sort((a,b) => a.date - b.date);
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function CalendarWidget({ eventDates, selectedDate, onSelectDate }) {
  const today = new Date();
  const [yr, setYr] = useState(today.getUTCFullYear());
  const [mo, setMo] = useState(today.getUTCMonth());
  const eventSet = new Set(eventDates);
  const firstDay = new Date(Date.UTC(yr, mo, 1));
  const daysInMonth = new Date(Date.UTC(yr, mo+1, 0)).getUTCDate();
  const startPad = firstDay.getUTCDay();
  const prevMo = () => mo===0 ? (setYr(y=>y-1), setMo(11)) : setMo(m=>m-1);
  const nextMo = () => mo===11 ? (setYr(y=>y+1), setMo(0)) : setMo(m=>m+1);
  const monthLabel = firstDay.toLocaleDateString('en-US', { month:'long', year:'numeric', timeZone:'UTC' });
  const cells = [];
  for (let i=0; i<startPad; i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);

  return (
    <div className={styles.calendar}>
      <div className={styles.calendarHeader}>
        <button type="button" className={styles.calNavBtn} onClick={prevMo}><ChevronLeft size={15}/></button>
        <span className={styles.calMonthLabel}>{monthLabel}</span>
        <button type="button" className={styles.calNavBtn} onClick={nextMo}><ChevronRight size={15}/></button>
      </div>
      <div className={styles.calGrid}>
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=><span key={d} className={styles.calDayName}>{d}</span>)}
        {cells.map((day,i) => {
          if (!day) return <span key={`e${i}`}/>;
          const key = `${yr}-${String(mo+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const isToday    = key === toUTCKey(today);
          const isSelected = key === selectedDate;
          const hasEvents  = eventSet.has(key);
          return (
            <button key={key} type="button"
              className={[styles.calDay, isToday?styles.calDayToday:'', isSelected?styles.calDaySelected:'', hasEvents?styles.calDayHasEvent:''].filter(Boolean).join(' ')}
              onClick={() => onSelectDate(isSelected ? null : key)}
            >{day}</button>
          );
        })}
      </div>
      <div className={styles.calLegend}><span className={styles.calLegendDot}/>Days with events</div>
    </div>
  );
}

// ── Crypto event card ─────────────────────────────────────────────────────────
function CryptoEventCard({ event }) {
  const coin = event.coins?.[0];
  return (
    <div className={styles.card}>
      <div className={styles.cardCoin}>
        <img className={styles.coinLogo} src={coin?.icon||COIN_FALLBACK} alt={coin?.fullname||'Coin'} loading="lazy"
          onError={e=>{ e.currentTarget.src=COIN_FALLBACK; }}/>
        <span className={styles.coinName}>
          {coin?.fullname||'—'}
          {event.coins?.length>1 && <> +{event.coins.length-1}</>}
        </span>
      </div>
      <div className={styles.cardBody}>
        <p className={styles.cardTitle}>{event.title}</p>
        {event.description && <p className={styles.cardDesc}>{event.description}</p>}
        <div className={styles.cardTags}>
          {event.categories?.map(cat=>(
            <span key={cat.categoryId||cat.name} className={`${styles.tag}${event.isHot?` ${styles.tagHot}`:''}`}>
              {event.isHot?'🔥 ':''}{cat.name}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.cardRight}>
        <div className={styles.likeBox}>
          <ThumbsUp size={13} className={styles.likeIcon}/>
          {event.voteCount>0 && <span className={styles.likeCount}>{event.voteCount}</span>}
        </div>
        {event.proof && (
          <a className={styles.sourceBtn} href={event.proof} target="_blank" rel="noreferrer" title="Source">
            <ExternalLink size={13}/>
          </a>
        )}
      </div>
    </div>
  );
}

// ── Tech conference card ──────────────────────────────────────────────────────
function TechEventCard({ event }) {
  const end = event.endDate ? new Date(event.endDate) : null;
  const start = new Date(event.startDate);
  const dateRange = end && toUTCKey(start) !== toUTCKey(end)
    ? `${start.toLocaleDateString('en-US',{month:'short',day:'numeric',timeZone:'UTC'})} – ${end.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})}`
    : start.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'});

  return (
    <div className={styles.card}>
      {/* Left — type badge */}
      <div className={styles.cardCoin}>
        <div className={styles.confBadge}>
          {event.online ? <Globe size={18}/> : <MapPin size={18}/>}
        </div>
        <span className={styles.coinName} style={{ fontSize:'0.78rem' }}>
          {event.online ? 'Online' : (event.city || event.country || 'In-Person')}
        </span>
      </div>

      {/* Middle */}
      <div className={styles.cardBody}>
        <p className={styles.cardTitle}>{event.name}</p>
        <p className={styles.cardDesc} style={{ marginBottom: 6 }}>
          {dateRange}{event.city && !event.online ? ` · ${event.city}${event.country ? ', '+event.country : ''}` : ''}
        </p>
        <div className={styles.cardTags}>
          {event.topics?.map(t=>(
            <span key={t} className={styles.tag} style={{ textTransform:'capitalize' }}>{t}</span>
          ))}
          {event.cfpUrl && event.cfpEndDate && new Date(event.cfpEndDate) >= new Date() && (
            <a href={event.cfpUrl} target="_blank" rel="noreferrer" className={`${styles.tag} ${styles.tagCfp}`}>
              CFP Open ↗
            </a>
          )}
        </div>
      </div>

      {/* Right */}
      <div className={styles.cardRight}>
        {event.url && (
          <a className={styles.sourceBtn} href={event.url} target="_blank" rel="noreferrer" title="Website">
            <ExternalLink size={13}/>
          </a>
        )}
      </div>
    </div>
  );
}

// ── Crypto Events tab ─────────────────────────────────────────────────────────
function CryptoEventsTab() {
  const [events, setEvents]         = useState([]);
  const [eventDates, setEventDates] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]           = useState('');
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    api.get('/api/events/dates').then(r=>setEventDates(Array.isArray(r.data?.dates)?r.data.dates:[])).catch(()=>{});
  }, []);

  const load = useCallback((pg, dateKey, replace) => {
    const params = { limit: LIMIT, page: pg, filter: 'upcoming' };
    if (dateKey) params.date = dateKey;
    replace ? setLoading(true) : setLoadingMore(true);
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

  const groups = groupByDate(events, 'dateEvent');

  return (
    <div className={styles.layout}>
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
                {group.items.map(event => <CryptoEventCard key={event._id||event.externalId} event={event}/>)}
              </div>
            ))}
            {hasMore && (
              <button type="button" className={styles.loadMoreBtn} disabled={loadingMore}
                onClick={() => { const next=page+1; setPage(next); load(next, selectedDate, false); }}>
                {loadingMore ? 'Loading…' : 'Load More'}
              </button>
            )}
          </>
        )}
      </div>
      <aside className={styles.sidebar}>
        <CalendarWidget eventDates={eventDates} selectedDate={selectedDate}
          onSelectDate={k => { setSelectedDate(k); window.scrollTo({top:0,behavior:'smooth'}); }}/>
      </aside>
    </div>
  );
}

// ── Tech Conferences tab ──────────────────────────────────────────────────────
function TechConferencesTab() {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]     = useState('');
  const [page, setPage]       = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch]   = useState('');
  const [online, setOnline]   = useState('all');
  const [eventDates, setEventDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const searchTimer = useRef(null);

  const load = useCallback((pg, q, onl, replace) => {
    const params = { limit: LIMIT, page: pg };
    if (q)           params.search = q;
    if (onl !== 'all') params.format = onl;
    replace ? setLoading(true) : setLoadingMore(true);
    setError('');
    api.get('/api/tech-events', { params })
      .then(r => {
        const rows = Array.isArray(r.data?.data) ? r.data.data : [];
        setEvents(prev => replace ? rows : [...prev, ...rows]);
        setHasMore(r.data?.pagination?.hasMore ?? false);
        // build event dates for calendar
        if (replace) {
          const dates = [...new Set(rows.map(e => toUTCKey(e.startDate)))];
          setEventDates(dates);
        }
      })
      .catch(err => setError(err?.response?.data?.message || 'Failed to load conferences.'))
      .finally(() => { setLoading(false); setLoadingMore(false); });
  }, []);

  useEffect(() => { setPage(1); load(1, search, online, true); }, [online, load]);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); load(1, val, online, true); }, 400);
  };

  const groups = groupByDate(events, 'startDate');

  return (
    <div>
      {/* filters */}
      <div className={styles.confFilters}>
        <input
          type="search"
          placeholder="Search AI, DevOps, Python, city…"
          className={styles.confSearch}
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />
        <div className={styles.confToggle}>
          {['all','online','in-person'].map(v => (
            <button key={v} type="button"
              className={`${styles.confToggleBtn}${online===v?` ${styles.confToggleActive}`:''}`}
              onClick={() => setOnline(v)}
              style={{ textTransform:'capitalize' }}
            >{v==='all'?'All':v==='online'?'Online':'In-Person'}</button>
          ))}
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.eventsList}>
          {error && <p className={styles.error}>{error}</p>}
          {loading ? (
            <p className={styles.empty}>Loading conferences…</p>
          ) : events.length === 0 ? (
            <p className={styles.empty}>No conferences found{search ? ` for "${search}"` : ''}.</p>
          ) : (
            <>
              {groups.map(group => (
                <div key={group.key}>
                  <div className={styles.dateHeader}>
                    <span className={styles.dateLabel}>{getDateLabel(group.date)}</span>
                    <span className={styles.dateSubLabel}>{getDateSub(group.date)}</span>
                  </div>
                  {group.items.map(event => <TechEventCard key={event._id||event.externalId} event={event}/>)}
                </div>
              ))}
              {hasMore && (
                <button type="button" className={styles.loadMoreBtn} disabled={loadingMore}
                  onClick={() => { const next=page+1; setPage(next); load(next, search, online, false); }}>
                  {loadingMore ? 'Loading…' : 'Load More'}
                </button>
              )}
            </>
          )}
        </div>
        <aside className={styles.sidebar}>
          <CalendarWidget eventDates={eventDates} selectedDate={selectedDate}
            onSelectDate={k => { setSelectedDate(k); window.scrollTo({top:0,behavior:'smooth'}); }}/>
        </aside>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function EventsPage() {
  const [activeTab, setActiveTab] = useState('crypto');

  return (
    <div>
      <Helmet>
        <title>Events — Crypto & Tech Conferences | wayb</title>
        <meta name="description" content="Track upcoming blockchain events, AI summits, token unlocks, and tech conferences." />
      </Helmet>
      <Navbar/>
      <main className={styles.page}>
        <div className="container">

          <header className={styles.header}>
            <div>
              <h1 className={styles.titleMain}>Events</h1>
              <p className={styles.subtitle}>Blockchain milestones, AI summits, and real-world tech conferences.</p>
            </div>
          </header>

          {/* Tab switcher */}
          <div className={styles.tabBar}>
            <button type="button"
              className={`${styles.tabBtn}${activeTab==='crypto'?` ${styles.tabBtnActive}`:''}`}
              onClick={() => setActiveTab('crypto')}>
              🪙 Crypto Events
            </button>
            <button type="button"
              className={`${styles.tabBtn}${activeTab==='tech'?` ${styles.tabBtnActive}`:''}`}
              onClick={() => setActiveTab('tech')}>
              🤖 AI & Tech Conferences
            </button>
          </div>

          {activeTab === 'crypto' ? <CryptoEventsTab/> : <TechConferencesTab/>}

        </div>
      </main>
      <Footer/>
    </div>
  );
}
