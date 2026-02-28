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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Crypto Coins (DB Snapshot)</h2>
        <button type="button" onClick={() => fetchData(page)} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error ? <p style={{ color: '#b00020' }}>{error}</p> : null}

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>Coin</th>
            <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>Price</th>
            <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>24h %</th>
            <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>Market Cap</th>
            <th style={{ textAlign: 'left', padding: '8px 6px', borderBottom: '1px solid #ddd' }}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {coins.map((coin) => {
            const change = Number(coin.priceChange24h || 0);
            return (
              <tr key={coin.coinId}>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee' }}>
                  {coin.name} ({String(coin.symbol || '').toUpperCase()})
                </td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee' }}>{formatCurrency(coin.currentPrice)}</td>
                <td
                  style={{
                    padding: '8px 6px',
                    borderBottom: '1px solid #eee',
                    color: change > 0 ? '#0f766e' : change < 0 ? '#b91c1c' : '#64748b',
                    fontWeight: 600,
                  }}
                >
                  {change > 0 ? '+' : ''}
                  {change.toFixed(2)}%
                </td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee' }}>{formatCurrency(coin.marketCap)}</td>
                <td style={{ padding: '8px 6px', borderBottom: '1px solid #eee' }}>{formatDate(coin.lastUpdated)}</td>
              </tr>
            );
          })}
          {!loading && coins.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: '10px 6px' }}>
                No crypto data available.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <p style={{ margin: 0 }}>
          Page {page} of {totalPages}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>
            Prev
          </button>
          <button
            type="button"
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
