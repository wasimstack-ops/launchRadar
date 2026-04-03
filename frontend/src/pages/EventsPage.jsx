import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, Globe, MapPin, ThumbsUp } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import styles from '../components/events/Events.module.css';
import eventsData from '../data/events.json';

const COIN_FALLBACK = 'https://placehold.co/38x38/1e293b/94a3b8?text=?';
const LIMIT = 20;
const MONTHS = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

function createUTCDate(year, monthIndex, day) {
  return new Date(Date.UTC(year, monthIndex, day));
}

function toUTCKey(date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';

  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}-${String(parsed.getUTCDate()).padStart(2, '0')}`;
}

function sameUTCDay(a, b) {
  return toUTCKey(a) === toUTCKey(b);
}

function getDateLabel(date) {
  const parsed = new Date(date);
  const now = new Date();
  const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));

  if (sameUTCDay(parsed, now)) return 'Today';
  if (sameUTCDay(parsed, tomorrow)) return 'Tomorrow';

  return `${parsed.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })} UTC`;
}

function getDateSub(date) {
  return `${new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })} UTC`;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function getMonthIndex(value) {
  return MONTHS[String(value || '').trim().toLowerCase()] ?? null;
}

function getLastDayOfMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function parseEventDateLabel(rawValue) {
  const rawLabel = String(rawValue || '').replace(/\s+/g, ' ').trim();
  if (!rawLabel) return null;

  const normalized = rawLabel.replace(/[–—]/g, '-');
  let match = normalized.match(/^([A-Za-z]+)\s+(\d{1,2})\s*-\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/i);

  if (match) {
    const startMonth = getMonthIndex(match[1]);
    const endMonth = getMonthIndex(match[3]);
    const year = Number(match[5]);

    if (startMonth !== null && endMonth !== null) {
      const start = createUTCDate(year, startMonth, Number(match[2]));
      const end = createUTCDate(year, endMonth, Number(match[4]));
      return {
        rawLabel,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        sortDate: start.toISOString(),
        calendarKey: toUTCKey(start),
        groupKey: toUTCKey(start),
        groupLabel: getDateLabel(start),
        groupSubLabel: getDateSub(start),
      };
    }
  }

  match = normalized.match(/^([A-Za-z]+)\s+(\d{1,2})\s*-\s*(\d{1,2}),\s*(\d{4})$/i);
  if (match) {
    const month = getMonthIndex(match[1]);
    const year = Number(match[4]);

    if (month !== null) {
      const start = createUTCDate(year, month, Number(match[2]));
      const end = createUTCDate(year, month, Number(match[3]));
      return {
        rawLabel,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        sortDate: start.toISOString(),
        calendarKey: toUTCKey(start),
        groupKey: toUTCKey(start),
        groupLabel: getDateLabel(start),
        groupSubLabel: getDateSub(start),
      };
    }
  }

  match = normalized.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/i);
  if (match) {
    const month = getMonthIndex(match[1]);
    const year = Number(match[3]);

    if (month !== null) {
      const start = createUTCDate(year, month, Number(match[2]));
      return {
        rawLabel,
        startDate: start.toISOString(),
        endDate: null,
        sortDate: start.toISOString(),
        calendarKey: toUTCKey(start),
        groupKey: toUTCKey(start),
        groupLabel: getDateLabel(start),
        groupSubLabel: getDateSub(start),
      };
    }
  }

  match = normalized.match(/^(Early|Mid|Late)\s+([A-Za-z]+)\s+(\d{4})$/i);
  if (match) {
    const month = getMonthIndex(match[2]);
    const year = Number(match[3]);

    if (month !== null) {
      const dayMap = { early: 5, mid: 15, late: 25 };
      const anchor = createUTCDate(year, month, dayMap[match[1].toLowerCase()]);
      return {
        rawLabel,
        startDate: anchor.toISOString(),
        endDate: null,
        sortDate: anchor.toISOString(),
        calendarKey: null,
        groupKey: `approx-${slugify(rawLabel)}`,
        groupLabel: rawLabel,
        groupSubLabel: 'Schedule window',
      };
    }
  }

  match = normalized.match(/^([A-Za-z]+)\s+(\d{4})$/i);
  if (match) {
    const month = getMonthIndex(match[1]);
    const year = Number(match[2]);

    if (month !== null) {
      const start = createUTCDate(year, month, 15);
      const end = createUTCDate(year, month, getLastDayOfMonth(year, month));
      return {
        rawLabel,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        sortDate: start.toISOString(),
        calendarKey: null,
        groupKey: `approx-${slugify(rawLabel)}`,
        groupLabel: rawLabel,
        groupSubLabel: 'Schedule window',
      };
    }
  }

  const fallback = new Date(rawLabel);
  if (!Number.isNaN(fallback.getTime())) {
    return {
      rawLabel,
      startDate: fallback.toISOString(),
      endDate: null,
      sortDate: fallback.toISOString(),
      calendarKey: toUTCKey(fallback),
      groupKey: toUTCKey(fallback),
      groupLabel: getDateLabel(fallback),
      groupSubLabel: getDateSub(fallback),
    };
  }

  return null;
}

function parseLocation(rawValue) {
  const label = String(rawValue || '').trim();
  const normalized = label.toLowerCase();
  const isOnline = /\bonline\b|\bvirtual\b|\bglobal\b/.test(normalized);

  if (!label) {
    return { label: '', online: false, city: '', country: '' };
  }

  if (isOnline) {
    return {
      label,
      online: true,
      city: '',
      country: '',
    };
  }

  const parts = label
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return {
      label,
      online: false,
      city: parts.slice(0, -1).join(', '),
      country: parts[parts.length - 1],
    };
  }

  return {
    label,
    online: false,
    city: label,
    country: '',
  };
}

function groupCryptoEvents(events) {
  const grouped = new Map();

  for (const event of events) {
    const key = toUTCKey(event.dateEvent);
    if (!key) continue;

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        sortDate: new Date(event.dateEvent),
        label: getDateLabel(event.dateEvent),
        subLabel: getDateSub(event.dateEvent),
        items: [],
      });
    }

    grouped.get(key).items.push(event);
  }

  return Array.from(grouped.values()).sort((a, b) => a.sortDate - b.sortDate);
}

function groupTechEvents(events) {
  const grouped = new Map();

  for (const event of events) {
    const key = event.groupKey;
    if (!key) continue;

    if (!grouped.has(key)) {
      grouped.set(key, {
        key,
        sortDate: new Date(event.sortDate),
        label: event.groupLabel,
        subLabel: event.groupSubLabel,
        items: [],
      });
    }

    grouped.get(key).items.push(event);
  }

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => {
        const diff = new Date(a.sortDate) - new Date(b.sortDate);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      }),
    }))
    .sort((a, b) => a.sortDate - b.sortDate);
}

function normalizeCryptoEvents(rows) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((event, index) => {
      const dateEvent = event?.dateEvent || event?.date || event?.startDate;
      const key = toUTCKey(dateEvent);
      if (!key) return null;

      return {
        _id: event?._id || event?.externalId || `crypto-${index}`,
        externalId: event?.externalId || `crypto-${index}`,
        title: String(event?.title || event?.name || '').trim(),
        description: String(event?.description || '').trim(),
        proof: String(event?.proof || event?.url || '').trim(),
        dateEvent: new Date(dateEvent).toISOString(),
        isHot: Boolean(event?.isHot),
        voteCount: Number(event?.voteCount || 0),
        coins: Array.isArray(event?.coins) ? event.coins : [],
        categories: Array.isArray(event?.categories) ? event.categories : [],
      };
    })
    .filter((event) => event && event.title);
}

function normalizeRoadmapEvents(payload) {
  const rows = Array.isArray(payload?.events_database) ? payload.events_database : [];

  return rows
    .map((event, index) => {
      const dateMeta = parseEventDateLabel(event?.date);
      if (!dateMeta) return null;

      const locationMeta = parseLocation(event?.location);
      const category = String(event?.category || 'Technology').trim() || 'Technology';
      const name = String(event?.name || '').trim();
      if (!name) return null;

      const identity = slugify(`${name}-${event?.date}-${event?.location}-${category}`) || `roadmap-${index}`;

      return {
        _id: identity,
        externalId: identity,
        name,
        url: String(event?.link || '').trim(),
        startDate: dateMeta.startDate,
        endDate: dateMeta.endDate,
        sortDate: dateMeta.sortDate,
        dateLabel: dateMeta.rawLabel,
        groupKey: dateMeta.groupKey,
        groupLabel: dateMeta.groupLabel,
        groupSubLabel: dateMeta.groupSubLabel,
        calendarKey: dateMeta.calendarKey,
        online: locationMeta.online,
        city: locationMeta.city,
        country: locationMeta.country,
        locationLabel: locationMeta.label,
        format: locationMeta.online ? 'online' : 'in-person',
        topics: [category],
        category,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const diff = new Date(a.sortDate) - new Date(b.sortDate);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
}

function paginateRows(rows, page) {
  const end = page * LIMIT;
  return {
    rows: rows.slice(0, end),
    hasMore: rows.length > end,
  };
}

function CalendarWidget({ eventDates, selectedDate, onSelectDate }) {
  const today = new Date();
  const [yr, setYr] = useState(today.getUTCFullYear());
  const [mo, setMo] = useState(today.getUTCMonth());
  const eventSet = new Set(eventDates);
  const firstDay = new Date(Date.UTC(yr, mo, 1));
  const daysInMonth = new Date(Date.UTC(yr, mo + 1, 0)).getUTCDate();
  const startPad = firstDay.getUTCDay();
  const monthLabel = firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const cells = [];

  const prevMo = () => {
    if (mo === 0) {
      setYr((value) => value - 1);
      setMo(11);
      return;
    }

    setMo((value) => value - 1);
  };

  const nextMo = () => {
    if (mo === 11) {
      setYr((value) => value + 1);
      setMo(0);
      return;
    }

    setMo((value) => value + 1);
  };

  for (let i = 0; i < startPad; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);

  return (
    <div className={styles.calendar}>
      <div className={styles.calendarHeader}>
        <button type="button" className={styles.calNavBtn} onClick={prevMo}>
          <ChevronLeft size={15} />
        </button>
        <span className={styles.calMonthLabel}>{monthLabel}</span>
        <button type="button" className={styles.calNavBtn} onClick={nextMo}>
          <ChevronRight size={15} />
        </button>
      </div>
      <div className={styles.calGrid}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <span key={day} className={styles.calDayName}>
            {day}
          </span>
        ))}
        {cells.map((day, index) => {
          if (!day) return <span key={`empty-${index}`} />;

          const key = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = key === toUTCKey(today);
          const isSelected = key === selectedDate;
          const hasEvents = eventSet.has(key);

          return (
            <button
              key={key}
              type="button"
              className={[styles.calDay, isToday ? styles.calDayToday : '', isSelected ? styles.calDaySelected : '', hasEvents ? styles.calDayHasEvent : '']
                .filter(Boolean)
                .join(' ')}
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

function CryptoEventCard({ event }) {
  const coin = event.coins?.[0];

  return (
    <div className={styles.card}>
      <div className={styles.cardCoin}>
        <img
          className={styles.coinLogo}
          src={coin?.icon || COIN_FALLBACK}
          alt={coin?.fullname || 'Coin'}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = COIN_FALLBACK;
          }}
        />
        <span className={styles.coinName}>
          {coin?.fullname || '-'}
          {event.coins?.length > 1 ? ` +${event.coins.length - 1}` : ''}
        </span>
      </div>

      <div className={styles.cardBody}>
        <p className={styles.cardTitle}>{event.title}</p>
        {event.description ? <p className={styles.cardDesc}>{event.description}</p> : null}
        <div className={styles.cardTags}>
          {event.categories?.map((category) => (
            <span key={category.categoryId || category.name} className={`${styles.tag}${event.isHot ? ` ${styles.tagHot}` : ''}`}>
              {event.isHot ? 'Hot ' : ''}
              {category.name}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.cardRight}>
        <div className={styles.likeBox}>
          <ThumbsUp size={13} className={styles.likeIcon} />
          {event.voteCount > 0 ? <span className={styles.likeCount}>{event.voteCount}</span> : null}
        </div>
        {event.proof ? (
          <a className={styles.sourceBtn} href={event.proof} target="_blank" rel="noreferrer" title="Source">
            <ExternalLink size={13} />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function TechEventCard({ event }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardCoin}>
        <div className={styles.confBadge}>{event.online ? <Globe size={18} /> : <MapPin size={18} />}</div>
        <span className={styles.coinName} style={{ fontSize: '0.78rem' }}>
          {event.online ? 'Online' : event.city || event.country || 'In-Person'}
        </span>
      </div>

      <div className={styles.cardBody}>
        <p className={styles.cardTitle}>{event.name}</p>
        <p className={styles.cardDesc} style={{ marginBottom: 6 }}>
          {event.dateLabel}
          {event.locationLabel ? ` · ${event.locationLabel}` : ''}
        </p>
        <div className={styles.cardTags}>
          {event.topics?.map((topic) => (
            <span key={topic} className={styles.tag} style={{ textTransform: 'capitalize' }}>
              {topic}
            </span>
          ))}
        </div>
      </div>

      <div className={styles.cardRight}>
        {event.url ? (
          <a className={styles.sourceBtn} href={event.url} target="_blank" rel="noreferrer" title="Website">
            <ExternalLink size={13} />
          </a>
        ) : null}
      </div>
    </div>
  );
}

function CryptoEventsTab({ rows }) {
  const allEvents = useMemo(() => normalizeCryptoEvents(rows), [rows]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [page, setPage] = useState(1);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      if (!selectedDate) return true;
      return toUTCKey(event.dateEvent) === selectedDate;
    });
  }, [allEvents, selectedDate]);

  const eventDates = useMemo(() => {
    return [...new Set(allEvents.map((event) => toUTCKey(event.dateEvent)).filter(Boolean))];
  }, [allEvents]);

  const { rows: visibleRows, hasMore } = useMemo(() => paginateRows(filteredEvents, page), [filteredEvents, page]);
  const groups = useMemo(() => groupCryptoEvents(visibleRows), [visibleRows]);

  useEffect(() => {
    setPage(1);
  }, [selectedDate]);

  return (
    <div className={styles.layout}>
      <div className={styles.eventsList}>
        {visibleRows.length === 0 ? (
          <p className={styles.empty}>No crypto events found{selectedDate ? ' for this date' : ''}.</p>
        ) : (
          <>
            {groups.map((group) => (
              <div key={group.key}>
                <div className={styles.dateHeader}>
                  <span className={styles.dateLabel}>{group.label}</span>
                  <span className={styles.dateSubLabel}>{group.subLabel}</span>
                </div>
                {group.items.map((event) => (
                  <CryptoEventCard key={event._id || event.externalId} event={event} />
                ))}
              </div>
            ))}
            {hasMore ? (
              <button type="button" className={styles.loadMoreBtn} onClick={() => setPage((value) => value + 1)}>
                Load More
              </button>
            ) : null}
          </>
        )}
      </div>
      <aside className={styles.sidebar}>
        <CalendarWidget
          eventDates={eventDates}
          selectedDate={selectedDate}
          onSelectDate={(key) => {
            setSelectedDate(key);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </aside>
    </div>
  );
}

function RoadmapEventsTab({ metadata, rows }) {
  const allEvents = useMemo(() => normalizeRoadmapEvents({ events_database: rows }), [rows]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selectedDate, setSelectedDate] = useState(null);
  const searchTimer = useRef(null);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const categories = useMemo(() => {
    const rawCategories = Array.isArray(metadata?.categories_used) ? metadata.categories_used : allEvents.map((event) => event.category);
    return ['All', ...new Set(rawCategories.filter(Boolean))];
  }, [allEvents, metadata]);

  const eventDates = useMemo(() => {
    return [...new Set(allEvents.map((event) => event.calendarKey).filter(Boolean))];
  }, [allEvents]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((event) => {
      if (selectedDate && event.calendarKey !== selectedDate) return false;
      if (category !== 'All' && event.category !== category) return false;

      if (!search) return true;

      const haystack = [event.name, event.category, event.locationLabel, ...(event.topics || [])]
        .join(' ')
        .toLowerCase();

      return haystack.includes(search.toLowerCase());
    });
  }, [allEvents, category, search, selectedDate]);

  const { rows: visibleRows, hasMore } = useMemo(() => paginateRows(filteredEvents, page), [filteredEvents, page]);
  const groups = useMemo(() => groupTechEvents(visibleRows), [visibleRows]);

  useEffect(() => {
    setPage(1);
  }, [category, search, selectedDate]);

  const handleSearch = (value) => {
    setSearchInput(value);

    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(value.trim());
    }, 250);
  };

  return (
    <div>
      <div className={styles.confFilters}>
        <input
          type="search"
          placeholder="Search event, category, city, or country..."
          className={styles.confSearch}
          value={searchInput}
          onChange={(e) => handleSearch(e.target.value)}
        />
        <div className={styles.confToggle}>
          {categories.map((value) => (
            <button
              key={value}
              type="button"
              className={`${styles.confToggleBtn}${category === value ? ` ${styles.confToggleActive}` : ''}`}
              onClick={() => setCategory(value)}
            >
              {value}
            </button>
          ))}
        </div>
        {selectedDate ? (
          <button type="button" className={styles.clearFilter} onClick={() => setSelectedDate(null)}>
            Clear Calendar Filter
          </button>
        ) : null}
      </div>

      <div className={styles.layout}>
        <div className={styles.eventsList}>
          {visibleRows.length === 0 ? (
            <p className={styles.empty}>No events found with the current filters.</p>
          ) : (
            <>
              {groups.map((group) => (
                <div key={group.key}>
                  <div className={styles.dateHeader}>
                    <span className={styles.dateLabel}>{group.label}</span>
                    <span className={styles.dateSubLabel}>{group.subLabel}</span>
                  </div>
                  {group.items.map((event) => (
                    <TechEventCard key={event._id || event.externalId} event={event} />
                  ))}
                </div>
              ))}
              {hasMore ? (
                <button type="button" className={styles.loadMoreBtn} onClick={() => setPage((value) => value + 1)}>
                  Load More
                </button>
              ) : null}
            </>
          )}
        </div>
        <aside className={styles.sidebar}>
          <CalendarWidget
            eventDates={eventDates}
            selectedDate={selectedDate}
            onSelectDate={(key) => {
              setSelectedDate(key);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </aside>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const cryptoEvents = Array.isArray(eventsData.cryptoEvents) ? eventsData.cryptoEvents : [];
  const roadmapEvents = Array.isArray(eventsData.events_database) ? eventsData.events_database : [];
  const metadata = eventsData.report_metadata || {};
  const hasCryptoEvents = cryptoEvents.length > 0;
  const hasRoadmapEvents = roadmapEvents.length > 0;
  const defaultTab = hasRoadmapEvents ? 'roadmap' : 'crypto';
  const [activeTab, setActiveTab] = useState(defaultTab);

  const summaryText = hasRoadmapEvents
    ? `${metadata.total_events_verified || roadmapEvents.length} curated ${metadata.date_range || '2026'} events across ${(metadata.categories_used || [])
        .join(', ')
        .replace(/, ([^,]*)$/, ', and $1')}.`
    : 'Track upcoming blockchain events, AI summits, token unlocks, and tech conferences.';

  useEffect(() => {
    if (activeTab === 'crypto' && !hasCryptoEvents && hasRoadmapEvents) {
      setActiveTab('roadmap');
    }
  }, [activeTab, hasCryptoEvents, hasRoadmapEvents]);

  return (
    <div>
      <Helmet>
        <title>Events - Global Tech Roadmap 2026 | wayb</title>
        <meta name="description" content="Browse curated AI, Web3, SaaS, and technology events with calendar navigation and direct source links." />
      </Helmet>
      <Navbar />
      <main className={styles.page}>
        <div className="container">
          <header className={styles.header}>
            <div>
              <h1 className={styles.titleMain}>{metadata.title || 'Events'}</h1>
              <p className={styles.subtitle}>{summaryText}</p>
            </div>
          </header>

          {hasCryptoEvents && hasRoadmapEvents ? (
            <div className={styles.tabBar}>
              <button
                type="button"
                className={`${styles.tabBtn}${activeTab === 'crypto' ? ` ${styles.tabBtnActive}` : ''}`}
                onClick={() => setActiveTab('crypto')}
              >
                Crypto Events
              </button>
              <button
                type="button"
                className={`${styles.tabBtn}${activeTab === 'roadmap' ? ` ${styles.tabBtnActive}` : ''}`}
                onClick={() => setActiveTab('roadmap')}
              >
                Global Tech Roadmap
              </button>
            </div>
          ) : null}

          {activeTab === 'crypto' && hasCryptoEvents ? <CryptoEventsTab rows={cryptoEvents} /> : <RoadmapEventsTab metadata={metadata} rows={roadmapEvents} />}
        </div>
      </main>
      <Footer />
    </div>
  );
}
