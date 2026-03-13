import { useEffect, useState } from 'react';
import api from '../../api/client';

function formatCurrency(value) {
  const amount = Number(value) || 0;
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: amount >= 1 ? 2 : 8,
  });
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString();
}

function AdminCryptoTable() {
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const PAGE_SIZE = 10;

  const fetchData = async (nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/api/crypto/top?page=${nextPage}&limit=${PAGE_SIZE}`);
      const data = Array.isArray(response.data?.data) ? response.data.data : [];
      const pages = Number(response.data?.pagination?.totalPages || 1);
      setCoins(data);
      setTotalPages(Math.max(1, pages));
    } catch (requestError) {
      setCoins([]);
      setTotalPages(1);
      setError(requestError?.response?.data?.message || 'Failed to load crypto data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(page);
  }, [page]);

  return (
    <section>
      <div className="admin-section-head">
        <h2 className="admin-section-title">Crypto Coins (DB Snapshot)</h2>
        <button type="button" className="admin-btn" onClick={() => fetchData(page)} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? <p className="admin-alert error">{error}</p> : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Coin</th>
              <th>Price</th>
              <th>24h %</th>
              <th>Market Cap</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {coins.map((coin) => {
              const change = Number(coin.priceChange24h || 0);
              const changeClass =
                change > 0 ? 'admin-text-positive' : change < 0 ? 'admin-text-negative' : 'admin-text-neutral';
              return (
                <tr key={coin.coinId}>
                  <td>
                    {coin.name} ({String(coin.symbol || '').toUpperCase()})
                  </td>
                  <td>{formatCurrency(coin.currentPrice)}</td>
                  <td className={changeClass}>
                    {change > 0 ? '+' : ''}
                    {change.toFixed(2)}%
                  </td>
                  <td>{formatCurrency(coin.marketCap)}</td>
                  <td>{formatDate(coin.lastUpdated)}</td>
                </tr>
              );
            })}
            {!loading && coins.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  No crypto data available.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="admin-pagination">
        <p style={{ margin: 0 }}>
          Page {page} of {totalPages}
        </p>
        <div className="admin-actions">
          <button
            type="button"
            className="admin-btn"
            disabled={page <= 1 || loading}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Prev
          </button>
          <button
            type="button"
            className="admin-btn"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  );
}

export default AdminCryptoTable;
