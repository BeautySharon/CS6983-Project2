// Read-only star display. The label carries the value, so color is never the only signal.
export default function StarRating({ rating, className = '' }) {
  const rounded = Math.round(rating);
  return <span role="img" aria-label={`${rating} of 5 stars`} className={`inline-flex text-amber-500 ${className}`}>
    {[1, 2, 3, 4, 5].map(star => <span key={star} aria-hidden="true" className={star <= rounded ? '' : 'text-slate-300'}>★</span>)}
  </span>;
}
