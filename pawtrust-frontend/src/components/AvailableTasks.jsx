import { useRef, useState } from 'react';
import { inputClass } from './AuthLayout';

const control = 'rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-60';
export default function AvailableTasks({ tasks, appliedIds, onApply, disabled = false }) {
  const [page, setPage] = useState(1);
  const [messages, setMessages] = useState({});
  const [errors, setErrors] = useState({});
  const [pending, setPending] = useState({});
  const locks = useRef(new Set());
  const openTasks = tasks.filter(task => task.status === 'open');
  const pages = Math.max(1, Math.ceil(openTasks.length / 3));
  const current = Math.min(page, pages);
  async function apply(event, taskId) {
    event.preventDefault();
    if (disabled || appliedIds.includes(taskId) || locks.current.has(taskId)) return;
    const message = messages[taskId] || '';
    if (message.length > 300) { setErrors(values => ({ ...values, [taskId]: 'Keep your message to 300 characters or fewer.' })); return; }
    locks.current.add(taskId);
    setPending(values => ({ ...values, [taskId]: true }));
    setErrors(values => ({ ...values, [taskId]: '' }));
    try { await onApply(taskId, message.trim()); }
    catch (failure) { setErrors(values => ({ ...values, [taskId]: failure.message })); }
    finally { locks.current.delete(taskId); setPending(values => ({ ...values, [taskId]: false })); }
  }
  return <>
    {openTasks.length === 0 ? <p className="py-8 text-sm text-slate-600">No open tasks right now</p> : <div className="space-y-4">
      {openTasks.slice((current - 1) * 3, current * 3).map(task => {
        const applied = appliedIds.includes(task._id);
        const date = new Date(task.date);
        const messageId = `message-${task._id}`;
        return <article key={task._id} className="min-w-0 rounded-xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3"><h3 className="break-words font-semibold">{task.petType} Care</h3><span className="rounded-full bg-sky-50 px-2 py-1 text-xs text-sky-700 ring-1 ring-sky-200">Open</span></div>
          <p className="mt-2 text-sm text-slate-600">{Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · {task.duration} {task.duration === 1 ? 'hour' : 'hours'}</p>
          <p className="mt-1 break-words text-sm text-slate-600">{task.location}</p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-700">{task.description}</p>
          <form className="mt-4" onSubmit={event => apply(event, task._id)} aria-busy={Boolean(pending[task._id])}>
            <label htmlFor={messageId} className="block text-sm font-medium text-slate-700">Message (optional)</label>
            <textarea id={messageId} value={messages[task._id] || ''} maxLength={300} rows={2} disabled={disabled || applied || pending[task._id]} onChange={event => setMessages(values => ({ ...values, [task._id]: event.target.value }))} aria-describedby={`${messageId}-hint`} placeholder="Share how you can help…" className={`${inputClass} disabled:bg-slate-50`} />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p id={`${messageId}-hint`} className="text-xs text-slate-500">{(messages[task._id] || '').length}/300 characters</p>
              <button disabled={disabled || applied || pending[task._id]} className={`${control} ${applied ? 'bg-slate-100 text-slate-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>{applied ? 'Applied' : pending[task._id] ? 'Applying…' : 'Apply'}</button>
            </div>
            {errors[task._id] && <p role="alert" className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{errors[task._id]}</p>}
          </form>
        </article>;
      })}
    </div>}
    <nav aria-label="Available task pagination" className="mt-4 flex flex-wrap items-center justify-end gap-3 text-sm">
      <button className={`${control} ring-1 ring-slate-300`} disabled={current === 1 || Object.values(pending).some(Boolean)} onClick={() => setPage(current - 1)}>Prev</button>
      <span>Page {current} of {pages}</span>
      <button className={`${control} ring-1 ring-slate-300`} disabled={current === pages || Object.values(pending).some(Boolean)} onClick={() => setPage(current + 1)}>Next</button>
    </nav>
  </>;
}
