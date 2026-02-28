import styles from './Agents.module.css';

function buildInitials(value) {
  const text = String(value || '').trim();
  if (!text) return 'AI';
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase();
}

function getCategoryLabel(category) {
  return String(category || '').toLowerCase() === 'repo' ? 'Repository' : 'Agent';
}

function AgentCard({ item }) {
  const title = String(item?.title || '').trim() || 'Untitled Agent';
  const description = String(item?.description || '').trim() || 'No description available';
  const link = String(item?.link || '').trim();
  const stars = Number.isFinite(Number(item?.stars)) ? Number(item.stars) : 0;

  return (
    <article className={styles.listItem}>
      <div className={styles.listLeft}>
        <span className={styles.iconCircle}>{buildInitials(title)}</span>
      </div>

      <div className={styles.listMain}>
        <div className={styles.listTop}>
          <h3 className={styles.cardTitle}>{title}</h3>
          <span className={styles.badge}>{getCategoryLabel(item?.category)}</span>
        </div>
        <p className={styles.description}>{description}</p>
      </div>

      <div className={styles.listRight}>
        <p className={styles.stars}>* {stars}</p>
        {link ? (
          <a className={styles.viewButton} href={link} target="_blank" rel="noreferrer noopener">
            View Project
          </a>
        ) : (
          <button type="button" className={styles.viewButton} disabled>
            View Project
          </button>
        )}
      </div>
    </article>
  );
}

export default AgentCard;

