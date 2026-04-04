import { useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { STATIC_CRYPTO_MARKETS } from '../data/cryptoMarkets';

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

function CryptoPage() {
  const coins = useMemo(
    () =>
      [...(Array.isArray(STATIC_CRYPTO_MARKETS) ? STATIC_CRYPTO_MARKETS : [])].sort((a, b) => {
        const rankA = Number(a?.marketCapRank || 999999);
        const rankB = Number(b?.marketCapRank || 999999);
        if (rankA !== rankB) return rankA - rankB;
        return Number(b?.marketCap || 0) - Number(a?.marketCap || 0);
      }),
    []
  );

  return (
    <div>
      <Helmet>
        <title>Crypto Markets Snapshot | wayb</title>
        <meta
          name="description"
          content="Browse a saved crypto market snapshot with coin, price, and market cap."
        />
        <meta property="og:title" content="Crypto Markets Snapshot | wayb" />
        <meta
          property="og:description"
          content="Saved crypto market snapshot with coin, price, and market cap."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://launchradar.io/crypto" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Crypto Markets Snapshot | wayb" />
        <meta
          name="twitter:description"
          content="Saved crypto market snapshot with coin, price, and market cap."
        />
      </Helmet>

      <Navbar />

      <main className="container crypto-shell">
        <header className="crypto-header">
          <h1 className="crypto-title">Crypto Markets</h1>
          <p className="crypto-subtitle">Saved static market snapshot. No live API or dynamic refresh.</p>
        </header>

        <section className="crypto-main">
          <div className="crypto-table-panel">
            <div className="crypto-table-wrap">
              <table className="crypto-table">
                <colgroup>
                  <col style={{ width: '40%' }} />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: '30%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Coin</th>
                    <th className="crypto-cell-right">Price</th>
                    <th className="crypto-cell-right">Market Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {coins.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="crypto-table-fallback">
                        No market data available.
                      </td>
                    </tr>
                  ) : (
                    coins.map((coin) => (
                      <tr key={coin.coinId || coin.symbol || coin.name} className="crypto-table-row">
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
                        <td className="crypto-cell-right">{formatCurrency(coin.marketCap)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default CryptoPage;
