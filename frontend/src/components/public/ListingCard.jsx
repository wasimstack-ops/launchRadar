import { Link } from 'react-router-dom';

const FALLBACK_THUMBNAIL = 'https://placehold.co/640x360/e9f4f1/0f766e?text=LaunchRadar';

function truncate(text, maxLength) {
  const content = String(text || '');
  if (content.length <= maxLength) return content;
  return `${content.slice(0, maxLength).trimEnd()}...`;
}

function ListingCard({ listing, isFavorite, onToggleFavorite }) {
  const description = truncate(listing.description, 120);
  const thumbnail = listing.thumbnail || FALLBACK_THUMBNAIL;
  const ratingText = listing.ratingCount
    ? `${listing.ratingAverage || 0} (${listing.ratingCount})`
    : 'Not rated';

  return (
    <article className="lr-card">
      <img className="lr-card-thumb" src={thumbnail} alt={listing.title} loading="lazy" />
      <div className="lr-card-body">
        <p className="lr-card-category">{listing.category}</p>
        <h3>{listing.title}</h3>
        <p className="lr-card-rating">Rating: {ratingText}</p>
        <p className="lr-card-description">{description}</p>
        <div className="lr-card-tags">
          {(listing.tags || []).slice(0, 5).map((tag) => (
            <span key={`${listing._id}-${tag}`}>#{tag}</span>
          ))}
        </div>
        <div className="lr-card-actions">
          {onToggleFavorite ? (
            <button type="button" className="lr-fav-btn" onClick={() => onToggleFavorite(listing._id)}>
              {isFavorite ? 'Unfavorite' : 'Favorite'}
            </button>
          ) : null}
          <a href={listing.link} target="_blank" rel="noreferrer">
            Visit
          </a>
          <Link to={`/listing/${listing._id}`}>View details</Link>
        </div>
      </div>
    </article>
  );
}

export default ListingCard;
