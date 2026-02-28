import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp } from 'lucide-react';
import api from '../api/client';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

const DEFAULT_LIMIT = 20;
const SKELETON_ROWS = 8;
const COIN_FALLBACK = 'https://placehold.co/28x28/141b27/64748b?text=%E2%82%BF';

function formatCurrency(value) {
  const amount = Number(value) || 0;

  if (Math.abs(amount) >= 1) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 8,
  }).format(amount);
}

function formatPercent(value) {
  const amount = Number(value) || 0;
  const abs = Math.abs(amount).toFixed(2);
  return `${amount >= 0 ? '+' : '-'}${abs}%`;
}

function CryptoPage() {
  const [coins, setCoins] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingCoins, setLoadingCoins] = useState(true);
  const [coinsError, setCoinsError] = useState('');

  const [trendingCoins, setTrendingCoins] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [trendingError, setTrendingError] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoadingCoins(true);
    setCoinsError('');

    api
      .get(`/api/crypto/top?page=${page}&limit=${limit}`)
      .then((response) => {
        if (!mounted) return;
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        const pages = Number(response.data?.pagination?.totalPages || 1);
        setCoins(rows);
        setTotalPages(Math.max(1, pages));
      })
      .catch((error) => {
        if (!mounted) return;
        setCoins([]);
        setTotalPages(1);
        setCoinsError(error?.response?.data?.message || 'Failed to load crypto markets.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingCoins(false);
      });

    return () => {
      mounted = false;
    };
  }, [page, limit]);

  useEffect(() => {
    let mounted = true;
    setLoadingTrending(true);
    setTrendingError('');

    api
      .get('/api/crypto/trending')
      .then((response) => {
        if (!mounted) return;
        const rows = Array.isArray(response.data?.data) ? response.data.data : [];
        setTrendingCoins(rows);
      })
      .catch((error) => {
        if (!mounted) return;
        setTrendingCoins([]);
        setTrendingError(error?.response?.data?.message || 'Failed to load trending coins.');
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingTrending(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  const skeletonRows = useMemo(
    () =>
      Array.from({ length: SKELETON_ROWS }, (_, i) => (
        <tr key={`skeleton-${i}`} className="crypto-table-row">
          <td>
            <span className="skeleton crypto-skeleton-rank" />
          </td>
          <td>
            <div className="crypto-coin-cell">
              <span className="skeleton crypto-skeleton-icon" />
              <div className="crypto-coin-meta">
                <span className="skeleton crypto-skeleton-name" />
                <span className="skeleton crypto-skeleton-symbol" />
              </div>
            </div>
          </td>
          <td className="crypto-cell-right">
            <span className="skeleton crypto-skeleton-number" />
          </td>
          <td className="crypto-cell-right">
            <span className="skeleton crypto-skeleton-percent" />
          </td>
          <td className="crypto-cell-right">
            <span className="skeleton crypto-skeleton-number" />
          </td>
          <td className="crypto-cell-right">
            <span className="skeleton crypto-skeleton-number" />
          </td>
        </tr>
      )),
    []
  );

  return (
    <div>
      <Navbar />

      <main className="container crypto-shell">
        <header className="crypto-header">
          <h1 className="crypto-title">Crypto Markets</h1>
          <p className="crypto-subtitle">Live market data powered by CoinGecko</p>
        </header>

        <div className="crypto-layout">
          <section className="crypto-main">
            <div className="crypto-table-panel">
              <div className="crypto-table-wrap">
                <table className="crypto-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Coin</th>
                      <th className="crypto-cell-right">Price</th>
                      <th className="crypto-cell-right">24h %</th>
                      <th className="crypto-cell-right">Market Cap</th>
                      <th className="crypto-cell-right">Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingCoins && skeletonRows}

                    {!loadingCoins && coinsError && (
                      <tr>
                        <td colSpan={6} className="crypto-table-fallback crypto-table-error">
                          {coinsError}
                        </td>
                      </tr>
                    )}

                    {!loadingCoins && !coinsError && coins.length === 0 && (
                      <tr>
                        <td colSpan={6} className="crypto-table-fallback">
                          No market data available.
                        </td>
                      </tr>
                    )}

                    {!loadingCoins &&
                      !coinsError &&
                      coins.map((coin, index) => {
                        const rowNumber = (page - 1) * limit + index + 1;
                        const change = Number(coin.priceChange24h || 0);
                        const changeClass =
                          change > 0 ? 'crypto-positive' : change < 0 ? 'crypto-negative' : 'crypto-neutral';

                        return (
                          <tr key={coin.coinId || rowNumber} className="crypto-table-row">
                            <td>{rowNumber}</td>
                            <td>
                              <div className="crypto-coin-cell">
                                <img
                                  src={coin.image || COIN_FALLBACK}
                                  alt={coin.name || 'Coin'}
                                  className="crypto-coin-logo"
                                  loading="lazy"
                                  onError={(event) => {
                                    event.currentTarget.src = COIN_FALLBACK;
                                  }}
                                />
                                <div className="crypto-coin-meta">
                                  <span className="crypto-coin-name">{coin.name || '-'}</span>
                                  <span className="crypto-coin-symbol">{String(coin.symbol || '').toUpperCase()}</span>
                                </div>
                              </div>
                            </td>
                            <td className="crypto-cell-right">{formatCurrency(coin.currentPrice)}</td>
                            <td className={`crypto-cell-right ${changeClass}`}>{formatPercent(change)}</td>
                            <td className="crypto-cell-right">{formatCurrency(coin.marketCap)}</td>
                            <td className="crypto-cell-right">{formatCurrency(coin.totalVolume)}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              <div className="crypto-pagination">
                <span className="crypto-page-label">Page {page} of {totalPages}</span>
                <div className="crypto-page-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={!canGoPrev || loadingCoins}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={!canGoNext || loadingCoins}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <aside className="crypto-sidebar">
            <div className="crypto-trending-panel">
              <h2 className="crypto-trending-title">
                <TrendingUp size={16} /> Trending Coins
              </h2>

              {loadingTrending && (
                <ul className="crypto-trending-list">
                  {Array.from({ length: 6 }, (_, idx) => (
                    <li key={`trend-skeleton-${idx}`} className="crypto-trending-item">
                      <span className="skeleton crypto-skeleton-icon" />
                      <div className="crypto-coin-meta">
                        <span className="skeleton crypto-skeleton-name" />
                        <span className="skeleton crypto-skeleton-symbol" />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {!loadingTrending && trendingError && (
                <p className="crypto-trending-fallback crypto-table-error">{trendingError}</p>
              )}

              {!loadingTrending && !trendingError && trendingCoins.length === 0 && (
                <p className="crypto-trending-fallback">No trending data available.</p>
              )}

              {!loadingTrending && !trendingError && trendingCoins.length > 0 && (
                <ul className="crypto-trending-list">
                  {trendingCoins.map((coin) => (
                    <li key={coin.coinId || coin.symbol} className="crypto-trending-item">
                      <img
                        src={coin.image || COIN_FALLBACK}
                        alt={coin.name || 'Coin'}
                        className="crypto-coin-logo"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.src = COIN_FALLBACK;
                        }}
                      />
                      <div className="crypto-coin-meta">
                        <span className="crypto-coin-name">{coin.name || '-'}</span>
                        <span className="crypto-coin-symbol">{String(coin.symbol || '').toUpperCase()}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default CryptoPage;
