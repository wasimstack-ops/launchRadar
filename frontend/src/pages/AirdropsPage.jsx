import { useEffect, useMemo, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import api from '../api/client';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import styles from '../components/airdrops/Airdrops.module.css';

const LOGO_FALLBACK = 'https://placehold.co/64x64/e2e8f0/334155?text=A';

function normalizeStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (status.includes('confirmed')) return 'confirmed';
  if (status.includes('hot')) return 'hot';
  if (status.includes('updated')) return '';
  return '';
}

function badgeLabel(status) {
  if (status === 'hot') return 'HOT';
  if (status === 'confirmed') return 'CONFIRMED';
  return '';
}

function AirdropsPage() {
  const [airdrops, setAirdrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');

    api
      .get('/api/airdrops')
      .then((response) => {
        if (!mounted) return;

        const payload = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.data)
            ? response.data.data
            : [];

        const normalized = payload.map((item) => ({
          ...item,
          status: normalizeStatus(item?.status),
        }));

        setAirdrops(normalized);
      })
      .catch((requestError) => {
        if (!mounted) return;
        setAirdrops([]);
        setError(requestError?.response?.data?.message || 'Failed to load airdrops.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const confirmed = useMemo(() => airdrops.filter((item) => item.status === 'confirmed'), [airdrops]);
  const latest = useMemo(() => airdrops.filter((item) => !item.status), [airdrops]);

  const renderSection = (title, items) => (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {items.length === 0 ? (
        <p className={styles.empty}>No airdrops available</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => {
            const rawLogo = String(item?.logo || '').trim();
            const logoSrc = rawLogo && !rawLogo.toLowerCase().startsWith('data:image') ? rawLogo : LOGO_FALLBACK;
            const sourceUrl = String(item?.actionUrl || item?.sourceUrl || '').trim();
            const statusBadge = badgeLabel(item?.status);

            return (
              <li key={item._id || item.sourceUrl || item.title} className={styles.listRow}>
                <img
                  className={styles.logo}
                  src={logoSrc}
                  alt={item?.title || 'Airdrop'}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = LOGO_FALLBACK;
                  }}
                />

                <div className={styles.mainCol}>
                  <div className={styles.rowTop}>
                    <h3 className={styles.rowTitle}>{item?.title || 'Untitled Airdrop'}</h3>
                    {statusBadge ? <span className={styles.rowBadge}>{statusBadge}</span> : null}
                  </div>
                </div>

                <div className={styles.actionCol}>
                  {sourceUrl ? (
                    <a className={styles.viewButton} href={sourceUrl} target="_blank" rel="noreferrer noopener">
                      {item?.actionText || 'Join Airdrop'}
                      <ExternalLink size={14} />
                    </a>
                  ) : (
                    <button type="button" className={styles.viewButton} disabled>
                      {item?.actionText || 'Join Airdrop'}
                      <ExternalLink size={14} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  return (
    <div>
      <Helmet>
        <title>Crypto Airdrops — Free Token Campaigns | LaunchRadar</title>
        <meta name="description" content="Discover active and confirmed crypto airdrop campaigns. Find free token opportunities grouped by priority and status." />
        <meta property="og:title" content="Crypto Airdrops — Free Token Campaigns | LaunchRadar" />
        <meta property="og:description" content="Discover active and confirmed crypto airdrop campaigns. Find free token opportunities on LaunchRadar." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://launchradar.io/airdrops" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Crypto Airdrops | LaunchRadar" />
        <meta name="twitter:description" content="Active crypto airdrop campaigns — confirmed and latest opportunities." />
      </Helmet>

      <Navbar />

      <main className={styles.page}>
        <div className="container">
          <header className={styles.header}>
            <h1 className={styles.titleMain}>Airdrops</h1>
            <p className={styles.subtitle}>Discover active campaigns grouped by priority.</p>
          </header>

          {error ? <p className={styles.error}>{error}</p> : null}

          {loading ? (
            <p className={styles.empty}>Loading airdrops...</p>
          ) : (
            <>
              {renderSection('CONFIRMED AIRDROPS', confirmed)}
              {renderSection('LATEST AIRDROPS', latest)}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default AirdropsPage;
