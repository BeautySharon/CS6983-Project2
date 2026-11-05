import { useEffect, useRef, useState } from 'react';

const MAX_COMMENT = 500;
const action = 'rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50';

// Star picker built from native radio inputs: Tab reaches the group and the
// arrow keys change the rating, with no custom key handling needed.
function StarPicker({ value, onChange, disabled }) {
  return <fieldset disabled={disabled}>
    <legend className="text-sm font-medium text-slate-700">Rating (required)</legend>
    <div className="mt-1 flex gap-1">
      {[1, 2, 3, 4, 5].map(star => <label key={star} className="cursor-pointer rounded-md p-1 text-3xl leading-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-500">
        <input type="radio" name="rating" value={star} checked={value === star} onChange={() => onChange(star)} className="sr-only" aria-label={`${star} of 5 stars`} />
        <span aria-hidden="true" className={star <= value ? 'text-amber-500' : 'text-slate-300'}>★</span>
      </label>)}
    </div>
  </fieldset>;
}

export default function ReviewModal({ task, onSubmit, onClose }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const dialog = useRef(null);

  useEffect(() => {
    dialog.current?.querySelector('input')?.focus();
    function handleKey(event) { if (event.key === 'Escape' && !busy.current) onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (busy.current) return;
    if (rating < 1) { setError('Please choose a rating from 1 to 5 stars.'); return; }
    busy.current = true; setPending(true); setError('');
    try { await onSubmit({ rating, comment: comment.trim() }); }
    catch (failure) { setError(failure.message); busy.current = false; setPending(false); }
  }

  return <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/40 p-4">
    <form ref={dialog} role="dialog" aria-modal="true" aria-labelledby="review-heading" onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
      <h2 id="review-heading" className="text-lg font-semibold">Review your sitter</h2>
      <p className="mt-1 text-sm text-slate-600">{task.petType} Care · {task.location}</p>
      <div className="mt-4"><StarPicker value={rating} onChange={value => { setRating(value); setError(''); }} disabled={pending} /></div>
      <label htmlFor="review-comment" className="mt-4 block text-sm font-medium text-slate-700">Comment (optional)</label>
      <textarea id="review-comment" rows={4} maxLength={MAX_COMMENT} value={comment} disabled={pending} onChange={event => setComment(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-100" />
      <p className="mt-1 text-right text-xs text-slate-500">{comment.length} / {MAX_COMMENT}</p>
      {error && <p role="alert" className="mt-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">{error}</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" disabled={pending} onClick={onClose} className={`${action} bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50`}>Cancel</button>
        <button type="submit" disabled={pending} className={`${action} bg-indigo-600 text-white hover:bg-indigo-700`}>{pending ? 'Submitting…' : 'Submit review'}</button>
      </div>
    </form>
  </div>;
}
