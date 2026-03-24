import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';

function fmt(date) {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', {
    month:'short', day:'numeric', year:'numeric',
    hour:'2-digit', minute:'2-digit', timeZone:'UTC', timeZoneName:'short',
  });
}
function fmtDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', {
    weekday:'short', month:'short', day:'numeric', year:'numeric', timeZone:'UTC',
  });
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatGrid({ stats, fields }) {
  return (
    <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
      {fields.map(({ key, label, small }) => (
        <div key={key} className="admin-stat-card">
          <p className="admin-stat-title">{label}</p>
          <p className="admin-stat-value" style={small ? { fontSize:'0.78rem', fontWeight:600 } : {}}>
            {stats ? (stats[key] ?? '—') : '—'}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Job card ──────────────────────────────────────────────────────────────────
function JobCard({ job, running, output, onRun }) {
  const isRunning = running[job.key];
  const result    = output[job.key];
  return (
    <div className="admin-job-card">
      <p className="admin-job-label">{job.label}</p>
      <p className="admin-job-meta" style={{ marginBottom: 12 }}>{job.desc}</p>
      {result && (
        <div className={`admin-alert${result.ok ? '' : ' error'}`} style={{ marginBottom: 10, fontSize:'0.78rem' }}>
          {result.ok ? '✓ ' : '✗ '}{result.msg}
          {result.data && (
            <span style={{ color:'var(--text-3)', marginLeft:6 }}>
              {result.data.fetched != null && `fetched=${result.data.fetched} `}
              {result.data.deleted != null && `deleted=${result.data.deleted}`}
            </span>
          )}
          <span style={{ color:'var(--text-3)', marginLeft:6 }}>{new Date(result.at).toLocaleTimeString()}</span>
        </div>
      )}
      <button
        type="button"
        className={`admin-btn${job.danger ? '' : ' primary'}`}
        style={job.danger ? { borderColor:'var(--red)', color:'var(--red)' } : {}}
        disabled={isRunning}
        onClick={() => onRun(job)}
      >
        {isRunning ? 'Running…' : job.label}
      </button>
      {job.cron && (
        <p className="admin-job-meta" style={{ marginTop:8 }}>
          Auto-runs: <strong>{job.cron}</strong>
        </p>
      )}
    </div>
  );
}

// ── Events table ──────────────────────────────────────────────────────────────
function EventsTable({ endpoint, columns, filter, onFilterChange, loading, rows, pagination, onPage }) {
  return (
    <>
      <div className="admin-section-head" style={{ marginBottom:12 }}>
        <h3 className="admin-section-title" style={{ margin:0 }}>
          Events <span style={{ color:'var(--text-2)', fontWeight:400, fontSize:'0.85rem' }}>({pagination.total})</span>
        </h3>
        <div style={{ display:'flex', gap:8 }}>
          {['upcoming','past'].map(f => (
            <button key={f} type="button"
              className={`admin-btn${filter===f?' primary':' ghost'}`}
              style={{ textTransform:'capitalize', padding:'5px 12px' }}
              onClick={() => onFilterChange(f)}
            >{f}</button>
          ))}
        </div>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} style={{ textAlign:'center', color:'var(--text-2)', padding:24 }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns.length} style={{ textAlign:'center', color:'var(--text-2)', padding:24 }}>No events found.</td></tr>
            ) : rows.map(ev => (
              <tr key={ev._id}>
                {columns.map(c => <td key={c.key}>{c.render(ev)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="admin-pagination" style={{ marginTop:14 }}>
          <button className="admin-btn ghost" disabled={pagination.page<=1} onClick={() => onPage(pagination.page-1)}>← Prev</button>
          <span style={{ fontSize:'0.82rem', color:'var(--text-2)' }}>
            Page {pagination.page} of {pagination.totalPages} · {pagination.total} total
          </span>
          <button className="admin-btn ghost" disabled={pagination.page>=pagination.totalPages} onClick={() => onPage(pagination.page+1)}>Next →</button>
        </div>
      )}
    </>
  );
}

// ── Section: Crypto Events ────────────────────────────────────────────────────
function CryptoEventsSection() {
  const [stats, setStats]     = useState(null);
  const [rows, setRows]       = useState([]);
  const [pagination, setPag]  = useState({ page:1, totalPages:1, total:0 });
  const [filter, setFilter]   = useState('upcoming');
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState({});
  const [output, setOutput]   = useState({});

  const loadStats = useCallback(async () => {
    try { const r = await api.get('/api/admin/ops/events/stats'); setStats(r.data?.stats); } catch {}
  }, []);

  const loadRows = useCallback(async (pg, ft) => {
    setLoading(true);
    try {
      const r = await api.get(`/api/admin/ops/events/list?page=${pg}&limit=20&filter=${ft}`);
      setRows(r.data?.data?.items || []);
      setPag(r.data?.data?.pagination || { page:pg, totalPages:1, total:0 });
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStats(); loadRows(1, 'upcoming'); }, [loadStats, loadRows]);

  const runJob = async (job) => {
    setRunning(r => ({ ...r, [job.key]: true }));
    setOutput(o => ({ ...o, [job.key]: null }));
    try {
      const r = await api[job.method](job.endpoint);
      setOutput(o => ({ ...o, [job.key]: { ok:true, msg: r.data?.message||'Done', at: new Date(), data: r.data?.data } }));
      loadStats(); loadRows(page, filter);
    } catch (e) {
      setOutput(o => ({ ...o, [job.key]: { ok:false, msg: e?.response?.data?.message||'Failed', at: new Date() } }));
    } finally { setRunning(r => ({ ...r, [job.key]: false })); }
  };

  const JOBS = [
    { key:'sync',    label:'Sync Crypto Events',    desc:'Runs Puppeteer → scrapes CoinMarketCap for today + upcoming events.',       endpoint:'/api/admin/ops/events/sync',    method:'post', cron:'Every 6 hours (00:00, 06:00, 12:00, 18:00 UTC)' },
    { key:'cleanup', label:'Delete Past Events',     desc:'Removes all crypto events whose date has passed.',                          endpoint:'/api/admin/ops/events/cleanup', method:'post', danger:true },
  ];

  const COLUMNS = [
    { key:'date',   label:'Date (UTC)',  render: ev => <span style={{ fontSize:'0.78rem', whiteSpace:'nowrap' }}>{fmtDate(ev.dateEvent)}</span> },
    { key:'coin',   label:'Coin',        render: ev => (
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        {ev.coins?.[0]?.icon && <img src={ev.coins[0].icon} alt="" style={{ width:18, height:18, borderRadius:'50%' }} onError={e=>{e.currentTarget.style.display='none'}}/>}
        <span style={{ fontSize:'0.82rem', fontWeight:600 }}>{ev.coins?.[0]?.fullname||'—'}</span>
        {ev.coins?.length>1 && <span className="muted">+{ev.coins.length-1}</span>}
      </div>
    )},
    { key:'title',  label:'Title',       render: ev => <span style={{ fontWeight:600, fontSize:'0.84rem' }}>{ev.title}</span> },
    { key:'cats',   label:'Categories',  render: ev => (
      <div style={{ display:'flex', flexWrap:'wrap', gap:3 }}>
        {ev.categories?.map(c => <span key={c.categoryId} style={{ fontSize:'0.7rem', padding:'2px 7px', borderRadius:6, border:'1px solid var(--border-md)', color:'var(--text-2)', background:'var(--surface-2)' }}>{c.name}</span>)}
      </div>
    )},
    { key:'votes',  label:'Votes',       render: ev => <span style={{ fontWeight:600 }}>{ev.voteCount||0}</span> },
    { key:'hot',    label:'Hot',         render: ev => ev.isHot ? '🔥' : <span className="muted">—</span> },
    { key:'source', label:'Source',      render: ev => ev.proof ? <a href={ev.proof} target="_blank" rel="noreferrer" style={{ fontSize:'0.78rem', color:'var(--accent)' }}>View ↗</a> : <span className="muted">—</span> },
  ];

  return (
    <div style={{ marginBottom:48 }}>
      <div className="admin-section-head" style={{ marginBottom:16 }}>
        <h2 className="admin-section-title" style={{ margin:0 }}>🪙 Crypto Events</h2>
        <button className="admin-btn ghost" onClick={() => { loadStats(); loadRows(page, filter); }}>Refresh</button>
      </div>

      <StatGrid stats={stats} fields={[
        { key:'total',      label:'Upcoming Total' },
        { key:'today',      label:'Today' },
        { key:'thisWeek',   label:'This Week' },
        { key:'hot',        label:'Hot Events' },
        { key:'lastSynced', label:'Last Synced', small:true, render: v => fmt(v) },
      ]}/>

      <h3 className="admin-section-title">Jobs</h3>
      <div className="admin-job-grid" style={{ marginBottom:28 }}>
        {JOBS.map(j => <JobCard key={j.key} job={j} running={running} output={output} onRun={runJob}/>)}
        <div className="admin-job-card">
          <p className="admin-job-label">Cron Schedule — Crypto</p>
          <p className="admin-job-meta">Runs automatically every 6 hours. Past events deleted on each run.</p>
          <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
            {['00:00 UTC','06:00 UTC','12:00 UTC','18:00 UTC'].map(t => (
              <div key={t} style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.78rem', color:'var(--text-2)' }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)', flexShrink:0 }}/>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      <EventsTable
        filter={filter} loading={loading} rows={rows} pagination={pagination} columns={COLUMNS}
        onFilterChange={ft => { setFilter(ft); setPage(1); loadRows(1, ft); }}
        onPage={pg => { setPage(pg); loadRows(pg, filter); }}
      />
    </div>
  );
}

// ── Section: Tech Conferences ─────────────────────────────────────────────────
function TechEventsSection() {
  const [stats, setStats]     = useState(null);
  const [rows, setRows]       = useState([]);
  const [pagination, setPag]  = useState({ page:1, totalPages:1, total:0 });
  const [filter, setFilter]   = useState('upcoming');
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState({});
  const [output, setOutput]   = useState({});

  const loadStats = useCallback(async () => {
    try { const r = await api.get('/api/admin/ops/tech-events/stats'); setStats(r.data?.stats); } catch {}
  }, []);

  const loadRows = useCallback(async (pg, ft) => {
    setLoading(true);
    try {
      const r = await api.get(`/api/admin/ops/tech-events/list?page=${pg}&limit=20&filter=${ft}`);
      setRows(r.data?.data?.items || []);
      setPag(r.data?.data?.pagination || { page:pg, totalPages:1, total:0 });
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStats(); loadRows(1, 'upcoming'); }, [loadStats, loadRows]);

  const runJob = async (job) => {
    setRunning(r => ({ ...r, [job.key]: true }));
    setOutput(o => ({ ...o, [job.key]: null }));
    try {
      const r = await api[job.method](job.endpoint);
      setOutput(o => ({ ...o, [job.key]: { ok:true, msg: r.data?.message||'Done', at: new Date(), data: r.data?.data } }));
      loadStats(); loadRows(page, filter);
    } catch (e) {
      setOutput(o => ({ ...o, [job.key]: { ok:false, msg: e?.response?.data?.message||'Failed', at: new Date() } }));
    } finally { setRunning(r => ({ ...r, [job.key]: false })); }
  };

  const JOBS = [
    { key:'sync',    label:'Sync Conferences',      desc:'Fetches from GitHub conference-data (91+ events) + dev.events (in-person JSON-LD scraping).', endpoint:'/api/admin/ops/tech-events/sync',    method:'post', cron:'Daily at 02:00 UTC' },
    { key:'cleanup', label:'Delete Past Conferences',desc:'Removes all tech conferences whose start date has passed.',                                    endpoint:'/api/admin/ops/tech-events/cleanup', method:'post', danger:true },
  ];

  const COLUMNS = [
    { key:'date',    label:'Start Date',   render: ev => <span style={{ fontSize:'0.78rem', whiteSpace:'nowrap' }}>{fmtDate(ev.startDate)}</span> },
    { key:'name',    label:'Conference',   render: ev => <span style={{ fontWeight:600, fontSize:'0.84rem' }}>{ev.name}</span> },
    { key:'format',  label:'Format',       render: ev => (
      <span style={{
        fontSize:'0.72rem', padding:'2px 8px', borderRadius:6, fontWeight:600,
        background: ev.format==='in-person' ? 'rgba(16,185,129,0.1)' : ev.format==='hybrid' ? 'rgba(14,165,233,0.1)' : 'rgba(99,102,241,0.1)',
        color: ev.format==='in-person' ? 'var(--green)' : ev.format==='hybrid' ? 'var(--cyan)' : '#818cf8',
        border: `1px solid ${ev.format==='in-person' ? 'rgba(16,185,129,0.3)' : ev.format==='hybrid' ? 'rgba(14,165,233,0.3)' : 'rgba(99,102,241,0.3)'}`,
      }}>
        {ev.format || 'in-person'}
      </span>
    )},
    { key:'location',label:'Location',     render: ev => <span style={{ fontSize:'0.8rem', color:'var(--text-2)' }}>{ev.city && ev.country ? `${ev.city}, ${ev.country}` : ev.city || ev.country || (ev.online ? 'Online' : '—')}</span> },
    { key:'source',  label:'Source',       render: ev => <span style={{ fontSize:'0.72rem', color:'var(--text-3)' }}>{ev.source || 'github'}</span> },
    { key:'cfp',     label:'CFP',          render: ev => ev.cfpUrl && ev.cfpEndDate && new Date(ev.cfpEndDate) >= new Date()
        ? <a href={ev.cfpUrl} target="_blank" rel="noreferrer" style={{ fontSize:'0.78rem', color:'var(--green)' }}>Open ↗</a>
        : <span className="muted">—</span>
    },
    { key:'url',     label:'Website',      render: ev => ev.url ? <a href={ev.url} target="_blank" rel="noreferrer" style={{ fontSize:'0.78rem', color:'var(--accent)' }}>Visit ↗</a> : <span className="muted">—</span> },
  ];

  return (
    <div>
      <div className="admin-section-head" style={{ marginBottom:16 }}>
        <h2 className="admin-section-title" style={{ margin:0 }}>🤖 AI & Tech Conferences</h2>
        <button className="admin-btn ghost" onClick={() => { loadStats(); loadRows(page, filter); }}>Refresh</button>
      </div>

      <StatGrid stats={stats} fields={[
        { key:'total',      label:'Upcoming Total' },
        { key:'inPerson',   label:'In-Person' },
        { key:'online',     label:'Online' },
        { key:'thisWeek',   label:'This Week' },
        { key:'lastSynced', label:'Last Synced', small:true },
      ]}/>

      <h3 className="admin-section-title">Jobs</h3>
      <div className="admin-job-grid" style={{ marginBottom:28 }}>
        {JOBS.map(j => <JobCard key={j.key} job={j} running={running} output={output} onRun={runJob}/>)}
        <div className="admin-job-card">
          <p className="admin-job-label">Data Sources</p>
          <p className="admin-job-meta">Two free sources — no API keys required.</p>
          <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
            {[
              { label:'GitHub conference-data', note:'91+ events · 2025–2027 · General, JS, Python, DevOps, Security', color:'var(--accent)' },
              { label:'dev.events', note:'In-person conferences · JSON-LD scraping · 4 pages', color:'var(--green)' },
            ].map(s => (
              <div key={s.label} style={{ fontSize:'0.78rem' }}>
                <span style={{ color:s.color, fontWeight:700 }}>●</span>
                <span style={{ color:'var(--text)', fontWeight:600, marginLeft:6 }}>{s.label}</span>
                <div style={{ color:'var(--text-3)', marginLeft:14 }}>{s.note}</div>
              </div>
            ))}
          </div>
          <p className="admin-job-meta" style={{ marginTop:12 }}>Cron: <strong>Daily at 02:00 UTC</strong></p>
        </div>
      </div>

      <EventsTable
        filter={filter} loading={loading} rows={rows} pagination={pagination} columns={COLUMNS}
        onFilterChange={ft => { setFilter(ft); setPage(1); loadRows(1, ft); }}
        onPage={pg => { setPage(pg); loadRows(pg, filter); }}
      />
    </div>
  );
}

// ── Main Panel ────────────────────────────────────────────────────────────────
export default function AdminEventsPanel() {
  const [tab, setTab] = useState('crypto');

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display:'flex', gap:8, borderBottom:'1px solid var(--border)', marginBottom:28, paddingBottom:0 }}>
        {[
          { key:'crypto', label:'🪙 Crypto Events' },
          { key:'tech',   label:'🤖 Tech Conferences' },
        ].map(t => (
          <button key={t.key} type="button"
            style={{
              padding:'10px 18px', border:'none', background:'transparent', cursor:'pointer',
              fontWeight:600, fontSize:'0.86rem', borderBottom: tab===t.key ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab===t.key ? 'var(--text)' : 'var(--text-2)', marginBottom:'-1px', transition:'color 140ms',
            }}
            onClick={() => setTab(t.key)}
          >{t.label}</button>
        ))}
      </div>

      {tab === 'crypto' ? <CryptoEventsSection/> : <TechEventsSection/>}
    </div>
  );
}
