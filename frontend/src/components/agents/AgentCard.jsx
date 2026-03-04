import { useState } from 'react';
import { ExternalLink, GitFork, Star } from 'lucide-react';
import styles from './Agents.module.css';

function fmtNumber(n) {
  const num = Number(n || 0);
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
  return String(num);
}

function getInitials(title) {
  const words = String(title || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'A';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function AgentCard({ item }) {
  const [imgError, setImgError] = useState(false);
  const hasLogo = item.logoUrl && !imgError;
  const tags = Array.isArray(item.tags) ? item.tags.slice(0, 3) : [];

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.cardLogoWrap}>
          {hasLogo ? (
            <img
              src={item.logoUrl}
              alt={item.title}
              className={styles.cardLogo}
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className={styles.cardInitials}>{getInitials(item.title)}</div>
          )}
        </div>

        <div className={styles.cardMeta}>
          <span className={styles.metaStat} title="Stars">
            <Star size={12} />
            {fmtNumber(item.stars)}
          </span>
          <span className={styles.metaStat} title="Forks">
            <GitFork size={12} />
            {fmtNumber(item.forks)}
          </span>
          {item.language ? (
            <span className={styles.langBadge}>{item.language}</span>
          ) : null}
        </div>
      </div>

      <div className={styles.cardBody}>
        <h3 className={styles.cardTitle}>{item.title}</h3>

        {item.description ? (
          <p className={styles.cardDesc}>{item.description}</p>
        ) : null}

        {tags.length > 0 ? (
          <div className={styles.tagRow}>
            {tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.cardFooter}>
        {item.link ? (
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer noopener"
            className={styles.viewBtn}
          >
            View on GitHub
            <ExternalLink size={12} />
          </a>
        ) : (
          <button type="button" className={styles.viewBtn} disabled>
            View on GitHub
          </button>
        )}
        {item.website ? (
          <a
            href={item.website}
            target="_blank"
            rel="noreferrer noopener"
            className={styles.websiteBtn}
          >
            Website
            <ExternalLink size={11} />
          </a>
        ) : null}
      </div>
    </article>
  );
}

export default AgentCard;
