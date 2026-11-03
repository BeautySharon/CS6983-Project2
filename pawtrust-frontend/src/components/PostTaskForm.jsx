import { useRef, useState } from 'react';
import { inputClass, buttonClass } from './AuthLayout';

const empty = { petType: '', description: '', date: '', duration: '', location: '' };
export default function PostTaskForm({ onSubmit, onCreated }) {
  const [fields, setFields] = useState(empty);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  function change(event) { setFields({ ...fields, [event.target.name]: event.target.value }); setSuccess(''); }
  async function submit(event) {
    event.preventDefault();
    if (busy.current) return;
    setError(''); setSuccess('');
    if (Object.values(fields).some(value => !value.trim())) { setError('Complete all required fields.'); return; }
    if (!Number.isFinite(new Date(fields.date).getTime()) || new Date(fields.date) <= new Date()) { setError('Choose a date and time in the future.'); return; }
    if (!Number.isFinite(Number(fields.duration)) || Number(fields.duration) <= 0) { setError('Duration must be greater than zero.'); return; }
    busy.current = true; setPending(true);
    try {
      await onSubmit({ ...fields, description: fields.description.trim(), location: fields.location.trim(), date: new Date(fields.date).toISOString(), duration: Number(fields.duration) });
      setFields(empty); setSuccess('Task posted.');
      await onCreated();
    } catch (failure) { setError(failure.message); }
    finally { busy.current = false; setPending(false); }
  }
  return <section className="min-w-0 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200" aria-labelledby="post-task-heading">
    <h2 id="post-task-heading" className="mb-4 text-lg font-semibold">Post a New Task</h2>
    <form onSubmit={submit} noValidate className="space-y-4" aria-busy={pending}>
      <fieldset disabled={pending} className="min-w-0 space-y-4">
        <label className="block text-sm font-medium text-slate-700" htmlFor="petType">Pet Type
          <select id="petType" name="petType" value={fields.petType} onChange={change} required className={inputClass}>
            <option value="">Select a pet</option>{['Dog', 'Cat', 'Bird', 'Other'].map(pet => <option key={pet}>{pet}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700" htmlFor="description">Description
          <textarea id="description" name="description" value={fields.description} onChange={change} required rows={4} placeholder="Walk the dog, feed, medication, special notes…" className={inputClass} />
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <label className="block min-w-0 text-sm font-medium text-slate-700" htmlFor="date">Date &amp; Time
            <input id="date" name="date" type="datetime-local" value={fields.date} onChange={change} required aria-describedby="date-hint" className={`${inputClass} min-w-0`} />
          </label>
          <label className="block min-w-0 text-sm font-medium text-slate-700" htmlFor="duration">Duration (hours)
            <input id="duration" name="duration" type="number" step="any" min="0" value={fields.duration} onChange={change} required placeholder="e.g., 1.5" className={inputClass} />
          </label>
        </div>
        <p id="date-hint" className="text-xs text-slate-500">Use your local date and time.</p>
        <label className="block text-sm font-medium text-slate-700" htmlFor="location">Location
          <input id="location" name="location" value={fields.location} onChange={change} required placeholder="e.g., 123 Main St, Boston, MA" className={inputClass} />
        </label>
      </fieldset>
      {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
      <button disabled={pending} className={`${buttonClass} w-full`}>{pending ? 'Posting…' : 'Post Task'}</button>
    </form>
  </section>;
}
