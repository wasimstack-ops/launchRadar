import { ExternalLink } from 'lucide-react';
import styles from './Airdrops.module.css';

const LOGO_FALLBACK = 'https://placehold.co/64x64/e2e8f0/334155?text=A';

function AirdropCard({ item }) {
  const status = String(item?.status || '').trim().toLowerCase();
  const actionText = String(item?.actionText || '').trim() || 'Open Airdrop';
  const actionUrl = String(item?.actionUrl || item?.sourceUrl || '').trim();
  const rawLogo = String(item?.logo || '').trim();
  const logoSrc = rawLogo && !rawLogo.toLowerCase().startsWith('data:image') ? rawLogo : LOGO_FALLBACK;

  return (
    <article className={styles.card}>
      {status === 'confirmed' ? <span className={`${styles.badge} ${styles.badgeConfirmed}`}>CONFIRMED</span> : null}
      {status === 'hot' ? <span className={`${styles.badge} ${styles.badgeHot}`}>HOT</span> : null}

      <div className={styles.cardHeader}>
        <img
          className={styles.logo}
          src={logoSrc}
          alt={item?.title || 'Airdrop'}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = LOGO_FALLBACK;
          }}
        />
        <h3 className={styles.title}>{item?.title || 'Untitled Airdrop'}</h3>
      </div>

      <p className={styles.description}>{item?.description || 'No description provided.'}</p>

      <div className={styles.actionRow}>
        <p className={styles.actionText}>
          Actions: <span>{actionText}</span>
        </p>

        {actionUrl ? (
          <a className={styles.viewButton} href={actionUrl} target="_blank" rel="noreferrer noopener">
            View Details
            <ExternalLink size={14} />
          </a>
        ) : (
          <button type="button" className={styles.viewButton} disabled>
            View Details
            <ExternalLink size={14} />
          </button>
        )}
      </div>
    </article>
  );
}

export default AirdropCard;
