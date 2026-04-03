import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import styles from '../components/airdrops/Airdrops.module.css';

const LOGO_FALLBACK = 'https://placehold.co/64x64/e2e8f0/334155?text=A';
const STATIC_AIRDROPS_DATA = {
  year: 2026,
  airdrops: [
    {
      month: 'February',
      project: 'Aztec',
      token: 'AZTEC',
      status: 'confirmed',
      sector: 'Privacy Layer 2',
      description: 'Privacy-focused Ethereum Layer 2 with token unlock and governance activation expected in early 2026.',
      url: 'https://aztec.network',
      thumbnail: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    },
    {
      month: 'February',
      project: 'Espresso',
      token: 'ESP',
      status: 'confirmed',
      sector: 'Modular Blockchain',
      description: 'Modular blockchain launching token with airdrop distribution to early users and contributors.',
      url: 'https://www.espressosys.com',
      thumbnail: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    },
    {
      month: 'March',
      project: 'Backpack',
      token: 'BP',
      status: 'confirmed',
      sector: 'Wallet / Exchange',
      description: 'Wallet and exchange ecosystem distributing tokens to traders, points holders, and Mad Lads NFT participants.',
      url: 'https://learn.backpack.exchange/articles/backpack-tge-date',
      thumbnail: 'https://avatars.githubusercontent.com/u/121438012?s=200&v=4',
    },
    {
      month: 'March',
      project: 'OpenSea',
      token: 'SEA',
      status: 'confirmed',
      sector: 'NFT Marketplace',
      description: 'NFT marketplace token launching in Q1 2026 with rewards for historical and active trading users.',
      url: 'https://opensea.io',
      thumbnail: 'https://storage.googleapis.com/opensea-static/Logomark/Logomark-Blue.png',
    },
    {
      month: null,
      project: 'Polymarket',
      token: 'POLY',
      status: 'expected',
      sector: 'Prediction Market',
      description: 'Prediction market token expected following regulatory expansion and increased platform activity.',
      url: 'https://polymarket.com',
      thumbnail: 'https://polymarket.com/favicon.ico',
    },
    {
      month: null,
      project: 'MetaMask',
      token: 'MASK',
      status: 'speculative',
      sector: 'Wallet',
      description: 'Highly anticipated wallet token; potential airdrop based on swaps, bridging, and staking activity.',
      url: 'https://metamask.io',
      thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg',
    },
    {
      month: null,
      project: 'Base',
      token: null,
      status: 'speculative',
      sector: 'Layer 2',
      description: "Potential ecosystem token tied to user activity on Coinbase's Layer 2 network.",
      url: 'https://base.org',
      thumbnail: 'https://avatars.githubusercontent.com/u/108554348?s=200&v=4',
    },
    {
      month: null,
      project: 'LayerZero',
      token: 'ZRO',
      status: 'ongoing',
      sector: 'Cross-chain Infrastructure',
      description: 'Ongoing reward campaigns for cross-chain messaging, bridging, and dApp interactions.',
      url: 'https://layerzero.network',
      thumbnail: 'https://cryptologos.cc/logos/layerzero-zro-logo.png',
    },
    {
      month: null,
      project: 'Hyperliquid',
      token: 'HYPE',
      status: 'ongoing',
      sector: 'Perpetual DEX',
      description: 'Ongoing trading rewards and future token distributions based on liquidity and trading activity.',
      url: 'https://hyperliquid.xyz',
      thumbnail: 'https://hyperliquid.xyz/favicon.ico',
    },
  ],
};
const MONTH_ORDER = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12,
};

function normalizeStatus(value) {
  const status = String(value || '').trim().toLowerCase();
  if (status === 'confirmed') return 'confirmed';
  if (status === 'ongoing') return 'ongoing';
  if (status === 'expected') return 'expected';
  if (status === 'speculative') return 'speculative';
  return 'expected';
}

function badgeLabel(status) {
  if (status === 'confirmed') return 'Confirmed';
  if (status === 'ongoing') return 'Ongoing';
  if (status === 'expected') return 'Expected';
  if (status === 'speculative') return 'Speculative';
  return 'Tracked';
}

function badgeClass(status) {
  if (status === 'confirmed') return styles.badgeConfirmed;
  if (status === 'ongoing') return styles.badgeOngoing;
  if (status === 'expected') return styles.badgeExpected;
  if (status === 'speculative') return styles.badgeSpeculative;
  return '';
}

function sortAirdrops(items) {
  return [...items].sort((a, b) => {
    const monthA = a.month ? MONTH_ORDER[a.month] || 99 : 99;
    const monthB = b.month ? MONTH_ORDER[b.month] || 99 : 99;
    if (monthA !== monthB) return monthA - monthB;
    return a.project.localeCompare(b.project);
  });
}

function AirdropsPage() {
  const allAirdrops = useMemo(() => {
    const rows = Array.isArray(STATIC_AIRDROPS_DATA?.airdrops) ? STATIC_AIRDROPS_DATA.airdrops : [];
    return sortAirdrops(
      rows.map((item, index) => ({
        _id: `${item.project || 'airdrop'}-${index}`,
        ...item,
        status: normalizeStatus(item?.status),
      }))
    );
  }, []);

  const sections = useMemo(() => {
    const grouped = {
      confirmed: allAirdrops.filter((item) => item.status === 'confirmed'),
      ongoing: allAirdrops.filter((item) => item.status === 'ongoing'),
      expected: allAirdrops.filter((item) => item.status === 'expected'),
      speculative: allAirdrops.filter((item) => item.status === 'speculative'),
    };

    return [
      { key: 'confirmed', title: 'Confirmed Airdrops', subtitle: 'Scheduled or publicly signaled distributions.', items: grouped.confirmed },
      { key: 'ongoing', title: 'Ongoing Campaigns', subtitle: 'Live reward activity and continuing user-eligibility programs.', items: grouped.ongoing },
      { key: 'expected', title: 'Expected Drops', subtitle: 'Strong watchlist candidates with credible launch momentum.', items: grouped.expected },
      { key: 'speculative', title: 'Speculative Watchlist', subtitle: 'High-interest names without confirmed distribution timelines yet.', items: grouped.speculative },
    ];
  }, [allAirdrops]);

  const totalCount = allAirdrops.length;
  const yearLabel = STATIC_AIRDROPS_DATA?.year || '2026';

  const renderSection = ({ key, title, subtitle, items }) => (
    <section key={key} className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <p className={styles.sectionMeta}>{subtitle}</p>
      {items.length === 0 ? (
        <p className={styles.empty}>No airdrops available</p>
      ) : (
        <ul className={styles.list}>
          {items.map((item) => {
            const logoSrc = String(item?.thumbnail || '').trim() || LOGO_FALLBACK;
            const sourceUrl = String(item?.url || '').trim();
            const statusText = badgeLabel(item.status);

            return (
              <li key={item._id} className={styles.listRow}>
                <img
                  className={styles.logo}
                  src={logoSrc}
                  alt={item?.project || 'Airdrop'}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = LOGO_FALLBACK;
                  }}
                />

                <div className={styles.mainCol}>
                  <div className={styles.rowTop}>
                    <h3 className={styles.rowTitle}>
                      {item?.project || 'Untitled Project'}
                      {item?.token ? ` (${item.token})` : ''}
                    </h3>
                    <span className={`${styles.rowBadge} ${badgeClass(item.status)}`}>{statusText}</span>
                  </div>
                  <p className={styles.rowSummary}>{item?.description || 'No description available.'}</p>
                  <div className={styles.metaRow}>
                    <span className={`${styles.metaChip} ${styles.monthChip}`}>{item?.month || 'Timing TBD'}</span>
                    {item?.sector ? <span className={`${styles.metaChip} ${styles.sectorChip}`}>{item.sector}</span> : null}
                    {item?.token ? <span className={`${styles.metaChip} ${styles.tokenChip}`}>{item.token}</span> : null}
                  </div>
                </div>

                <div className={styles.actionCol}>
                  {sourceUrl ? (
                    <a className={styles.viewButton} href={sourceUrl} target="_blank" rel="noreferrer noopener">
                      View Project
                      <ExternalLink size={14} />
                    </a>
                  ) : (
                    <button type="button" className={styles.viewButton} disabled>
                      View Project
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
        <title>{`Crypto Airdrops ${yearLabel} | wayb`}</title>
        <meta
          name="description"
          content="Browse a curated 2026 crypto airdrop watchlist with confirmed, ongoing, expected, and speculative opportunities."
        />
        <meta property="og:title" content={`Crypto Airdrops ${yearLabel} | wayb`} />
        <meta
          property="og:description"
          content="Curated crypto airdrop roadmap with status-based grouping and direct project links."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://launchradar.io/airdrops" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`Crypto Airdrops ${yearLabel} | wayb`} />
        <meta
          name="twitter:description"
          content="Confirmed, ongoing, expected, and speculative crypto airdrops for 2026."
        />
      </Helmet>

      <Navbar />

      <main className={styles.page}>
        <div className="container">
          <header className={styles.header}>
            <h1 className={styles.titleMain}>Airdrops {yearLabel}</h1>
            <p className={styles.subtitle}>
              Static curated watchlist with {totalCount} tracked projects. No backend dependency or live API fetch.
            </p>
          </header>

          {sections.map(renderSection)}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default AirdropsPage;
